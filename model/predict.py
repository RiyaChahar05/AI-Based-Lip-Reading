"""
Predict script: load a checkpoint and run predictions on a single image, a session folder, or an entire processed dataset.

Examples:
  # single image
  python model/predict.py --checkpoint model/model_checkpoint_test.pt --image model/processed_test/F05/words/01/01/color_001.jpg

  # predict all processed files and write a CSV
  python model/predict.py --checkpoint model/model_checkpoint_test.pt --data-dir model/processed_test --out predictions.csv

  # predict a session averaging frames
  python model/predict.py --checkpoint model/model_checkpoint_test.pt --session model/processed_test/F05/words/01/01 --average
"""
import argparse
from pathlib import Path
import csv
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
from train import LipDataset, get_items_from_processed, SmallCNN
from train import get_items_from_processed
import numpy as np


def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()


def load_checkpoint(checkpoint_path: Path):
    ckpt = torch.load(checkpoint_path, map_location='cpu')
    if 'label_map' in ckpt:
        label_map = ckpt['label_map']
    else:
        label_map = None
    model_state = ckpt['model_state_dict']
    return model_state, label_map


def prepare_model(checkpoint_path: Path):
    model_state, label_map = load_checkpoint(checkpoint_path)
    num_classes = len(label_map) if label_map else 10
    model = SmallCNN(num_classes=num_classes)
    model.load_state_dict(model_state)
    return model, label_map


def load_and_transform(img_path: Path, size=64):
    transform = transforms.Compose([
        transforms.Resize((size, size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    img = Image.open(img_path).convert('RGB')
    return transform(img)


def predict_on_image(model, img_path: Path, device, topk=3):
    model.eval()
    with torch.no_grad():
        x = load_and_transform(img_path)
        x = x.unsqueeze(0).to(device)
        pred = model(x)
        probs = torch.softmax(pred, dim=1).cpu().numpy()[0]
    return probs


def predict_session(model, session_path: Path, device, average=False):
    # find color_*.jpg frames
    frames = sorted(session_path.glob('color_*.jpg'))
    if not frames:
        return None
    all_probs = []
    for f in frames:
        probs = predict_on_image(model, f, device)
        all_probs.append(probs)
    all_probs = np.stack(all_probs, axis=0)
    if average:
        return all_probs.mean(axis=0)
    else:
        # center frame
        idx = len(all_probs) // 2
        return all_probs[idx]


def predict_dataset(model, data_dir: Path, device, out_csv: Path):
    items, label_map = get_items_from_processed(data_dir)
    reverse_label_map = {v: k for k, v in label_map.items()}
    device = device
    with open(out_csv, 'w', newline='', encoding='utf-8') as csvf:
        writer = csv.writer(csvf)
        writer.writerow(['img_path', 'pred_label', 'pred_idx', 'confidence'])
        for img_path, label in items:
            probs = predict_on_image(model, img_path, device)
            idx = int(probs.argmax())
            label_str = reverse_label_map[idx]
            conf = float(probs[idx])
            writer.writerow([str(img_path), label_str, idx, conf])
    return str(out_csv)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--checkpoint', required=True)
    parser.add_argument('--image', help='Path to a single image (preprocessed)')
    parser.add_argument('--session', help='Path to a session folder with color_*.jpg')
    parser.add_argument('--data-dir', help='Path to processed dataset root to predict all items')
    parser.add_argument('--out', default='predictions.csv', help='CSV output for data-dir predictions')
    parser.add_argument('--topk', type=int, default=3)
    parser.add_argument('--json', action='store_true', help='Print results as JSON')
    parser.add_argument('--average', action='store_true', help='Average scores across frames of a session instead of center-frame')
    args = parser.parse_args()

    ckpt_path = Path(args.checkpoint)
    if not ckpt_path.exists():
        raise SystemExit('Checkpoint path not found: ' + str(ckpt_path))
    model_state, label_map = load_checkpoint(ckpt_path)
    if not label_map:
        print('Warning: checkpoint has no label_map; using numeric labels')
    num_classes = len(label_map) if label_map else 10
    model = SmallCNN(num_classes=num_classes)
    model.load_state_dict(model_state)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)

    reverse_label_map = {v: k for k, v in label_map.items()} if label_map else {i: str(i) for i in range(num_classes)}

    out = {}
    if args.image:
        img_path = Path(args.image)
        if not img_path.exists():
            raise SystemExit('Image path not found: ' + str(img_path))
        probs = predict_on_image(model, img_path, device)
        topk = min(args.topk, len(probs))
        idxs = probs.argsort()[::-1][:topk]
        print(f'Predictions for {img_path}:')
        for idx in idxs:
            print(f'  {reverse_label_map[int(idx)]} (idx={int(idx)}) - {probs[int(idx)]:.4f}')
        if args.json:
            import json
            out['type'] = 'image'
            out['path'] = str(img_path)
            out['topk'] = [{
                'label': reverse_label_map[int(idx)],
                'idx': int(idx),
                'confidence': float(probs[int(idx)])
            } for idx in idxs]
            print(json.dumps(out))
    elif args.session:
        session_path = Path(args.session)
        if not session_path.exists():
            raise SystemExit('Session path not found: ' + str(session_path))
        probs = predict_session(model, session_path, device, average=args.average)
        if probs is None:
            print('No frames found in session')
            return
        idxs = probs.argsort()[::-1][:args.topk]
        print(f'Predictions for session {session_path} (average={args.average})')
        for idx in idxs:
            print(f'  {reverse_label_map[int(idx)]} (idx={int(idx)}) - {probs[int(idx)]:.4f}')
        if args.json:
            import json
            out['type'] = 'session'
            out['path'] = str(session_path)
            out['avg'] = bool(args.average)
            out['topk'] = [{
                'label': reverse_label_map[int(idx)],
                'idx': int(idx),
                'confidence': float(probs[int(idx)])
            } for idx in idxs]
            print(json.dumps(out))
    elif args.data_dir:
        out_csv = Path(args.out)
        csv_path = predict_dataset(model, Path(args.data_dir), device, out_csv)
        if args.json:
            import json
            out['type'] = 'dataset'
            out['path'] = str(args.data_dir)
            out['csv'] = str(csv_path)
            print(json.dumps(out))
        else:
            print('Predictions saved to', csv_path)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
