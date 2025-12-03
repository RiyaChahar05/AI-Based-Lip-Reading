"""
Simple PyTorch training script for lip reading (single-frame classifier baseline)

Dataset expected layout (preprocessed):
data-dir/subject/words/<wordId>/<session>/color_*.jpg (processed images)

Each session constitutes one sample; the script picks the center frame and uses the <wordId> as label.
"""
import argparse
from pathlib import Path
import random
from typing import List, Tuple

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms
from PIL import Image
from sklearn.model_selection import train_test_split
import numpy as np
from tqdm import tqdm


class LipDataset(Dataset):
    def __init__(self, items: List[Tuple[Path, str]], label_map: dict, size=64):
        self.items = items
        self.label_map = label_map
        self.transform = transforms.Compose([
            transforms.Resize((size, size)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        img_path, label = self.items[idx]
        img = Image.open(img_path).convert('RGB')
        x = self.transform(img)
        y = torch.tensor(self.label_map[label], dtype=torch.long)
        return x, y


def get_items_from_processed(data_dir: Path) -> Tuple[List[Tuple[Path, str]], dict]:
    items = []
    labels = set()
    # data_dir/subject/words/<wordId>/<session>/color_*.jpg
    for subject in data_dir.glob('*'):
        words = subject / 'words'
        if not words.exists():
            continue
        for wordId in words.glob('*'):
            if not wordId.is_dir():
                continue
            for session in wordId.glob('*'):
                if not session.is_dir():
                    continue
                frames = sorted(session.glob('color_*.jpg'))
                if not frames:
                    continue
                # pick center frame
                center = frames[len(frames) // 2]
                items.append((center, wordId.name))
                labels.add(wordId.name)
    labels = sorted(list(labels))
    label_map = {lab: i for i, lab in enumerate(labels)}
    return items, label_map


class SmallCNN(nn.Module):
    def __init__(self, num_classes=10):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, 3, stride=1, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((1, 1)),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128, 256),
            nn.ReLU(inplace=True),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x


def train_loop(model, loader, optimizer, criterion, device):
    model.train()
    running_loss = 0.0
    total = 0
    correct = 0
    for x, y in tqdm(loader, desc='train'):
        x = x.to(device)
        y = y.to(device)
        optimizer.zero_grad()
        pred = model(x)
        loss = criterion(pred, y)
        loss.backward()
        optimizer.step()
        running_loss += loss.item() * x.size(0)
        _, t = pred.max(1)
        total += x.size(0)
        correct += (t == y).sum().item()
    return running_loss / total, correct / total


def eval_loop(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    total = 0
    correct = 0
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
    return running_loss / total, correct / total


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', required=True, help='Path to processed preprocessed images (out-dir of preprocess.py)')
    parser.add_argument('--epochs', type=int, default=10)
    parser.add_argument('--batch-size', type=int, default=32)
    parser.add_argument('--lr', type=float, default=1e-3)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--out', default='model_checkpoint.pt')
    args = parser.parse_args()

    random.seed(args.seed)
    torch.manual_seed(args.seed)
    data_dir = Path(args.data_dir)
    items, label_map = get_items_from_processed(data_dir)
    print(f'Found {len(items)} samples across {len(label_map)} labels')
    if len(items) < 10:
        print('Not enough samples to train; ensure preprocessing succeeded and dataset path is correct.')
        return
    train_items, val_items = train_test_split(items, test_size=0.15, stratify=[lab for _, lab in items], random_state=args.seed)
    train_ds = LipDataset(train_items, label_map)
    val_ds = LipDataset(val_items, label_map)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = SmallCNN(num_classes=len(label_map)).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    criterion = nn.CrossEntropyLoss()

    best_val_acc = 0.0
    for epoch in range(1, args.epochs + 1):
        print(f'Epoch {epoch}/{args.epochs}')
        train_loss, train_acc = train_loop(model, train_loader, optimizer, criterion, device)
        val_loss, val_acc = eval_loop(model, val_loader, criterion, device)
        print(f'Train loss: {train_loss:.4f}, acc: {train_acc:.4f} | Val loss: {val_loss:.4f}, acc: {val_acc:.4f}')
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            print('Saving best model...')
            torch.save({
                'model_state_dict': model.state_dict(),
                'label_map': label_map,
            }, args.out)


if __name__ == '__main__':
    main()
