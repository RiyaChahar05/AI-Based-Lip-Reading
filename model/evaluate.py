"""
Load a saved checkpoint and evaluate model performance on a processed dataset.

Usage:
  python model/evaluate.py --data-dir model/processed_test --checkpoint model/model_checkpoint_test.pt

If the dataset is small it will evaluate on all items. If you pass `--test-size`, it will perform a stratified split and evaluate on the test portion.
"""
import argparse
from pathlib import Path
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from train import LipDataset, get_items_from_processed, SmallCNN
from sklearn.model_selection import train_test_split
from tqdm import tqdm


def eval_loop(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    total = 0
    correct = 0
    y_preds = []
    y_true = []
    with torch.no_grad():
        for x, y in tqdm(loader, desc='eval'):
            x = x.to(device)
            y = y.to(device)
            pred = model(x)
            loss = criterion(pred, y)
            running_loss += loss.item() * x.size(0)
            _, t = pred.max(1)
            total += x.size(0)
            correct += (t == y).sum().item()
            y_preds.append(t.cpu())
            y_true.append(y.cpu())
    y_preds = torch.cat(y_preds)
    y_true = torch.cat(y_true)
    return running_loss / total, correct / total, y_true, y_preds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', required=True)
    parser.add_argument('--checkpoint', required=True)
    parser.add_argument('--test-size', type=float, default=0.0, help='If > 0, perform stratified split and evaluate on test portion (e.g., 0.15)')
    parser.add_argument('--batch-size', type=int, default=32)
    args = parser.parse_args()

    items, label_map = get_items_from_processed(Path(args.data_dir))
    print(f'Found {len(items)} samples across {len(label_map)} labels')
    if len(items) == 0:
        print('No data found. Ensure path is correct and images exist.')
        return

    if args.test_size > 0.0 and len(items) >= 10:
        train_items, test_items = train_test_split(items, test_size=args.test_size, stratify=[lab for _, lab in items], random_state=42)
    else:
        test_items = items

    reverse_label_map = {v: k for k, v in label_map.items()}
    ds = LipDataset(test_items, label_map)
    loader = DataLoader(ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    ckpt = torch.load(args.checkpoint, map_location='cpu')
    # if checkpoint saved label_map, use it
    if 'label_map' in ckpt:
        ckpt_label_map = ckpt['label_map']
        label_map = ckpt_label_map
        reverse_label_map = {v: k for k, v in label_map.items()}
    num_classes = len(label_map)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = SmallCNN(num_classes=num_classes)
    model.load_state_dict(ckpt['model_state_dict'])
    model = model.to(device)
    criterion = nn.CrossEntropyLoss()
    loss, acc, y_true, y_preds = eval_loop(model, loader, criterion, device)
    print(f'Test Loss: {loss:.4f}, Test Acc: {acc:.4f} ({y_true.shape[0]} samples)')

    # compute conf matrix and per-class accuracy
    try:
        from sklearn.metrics import confusion_matrix, classification_report
        cm = confusion_matrix(y_true.numpy(), y_preds.numpy())
        print('\nConfusion Matrix:')
        print(cm)
        print('\nClassification Report:')
        print(classification_report(y_true.numpy(), y_preds.numpy(), target_names=[reverse_label_map[i] for i in range(len(reverse_label_map))]))
    except Exception as e:
        print('sklearn not found or error computing report: ', e)


if __name__ == '__main__':
    main()
