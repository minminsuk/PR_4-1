import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import json
import os

# ==========================================
# 1. 데이터 로드 및 전처리 클래스
# ==========================================
class CarDataProcessor:
    def __init__(self, data_path):
        self.data_path = data_path
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.categorical_features = ['fuel', 'brand', 'model']
        self.numerical_features = []
        
    def load_and_preprocess(self):
        # 데이터 로드 (한글 깨짐 방지 인코딩 적용)
        df = pd.read_csv(self.data_path, encoding='utf-8-sig')
        
        # 타겟 변수 로그 변환
        df['price_log'] = np.log1p(df['price'])
        
        # 특성 분리
        self.numerical_features = [col for col in df.columns if col not in self.categorical_features + ['price', 'price_log']]
        
        # 범주형 데이터 인코딩
        for col in self.categorical_features:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            self.label_encoders[col] = le
            
        # 수치형 데이터 스케일링
        df[self.numerical_features] = self.scaler.fit_transform(df[self.numerical_features])
        
        return df

# ==========================================
# 2. PyTorch 모델 정의
# ==========================================
class CarPricePredictor(nn.Module):
    def __init__(self, cat_dims, num_features):
        super(CarPricePredictor, self).__init__()
        # 범주형 특성을 위한 임베딩 레이어
        self.embeddings = nn.ModuleList([nn.Embedding(dim, min(50, (dim + 1) // 2)) for dim in cat_dims])
        total_emb_dim = sum([emb.embedding_dim for emb in self.embeddings])
        
        self.network = nn.Sequential(
            nn.Linear(total_emb_dim + num_features, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(64, 1)
        )
        
    def forward(self, x_cat, x_num):
        embs = [emb(x_cat[:, i]) for i, emb in enumerate(self.embeddings)]
        x = torch.cat(embs + [x_num], dim=1)
        return self.network(x)

# ==========================================
# 3. 데이터셋 클래스
# ==========================================
class CarDataset(Dataset):
    def __init__(self, X_cat, X_num, y):
        self.X_cat = torch.tensor(X_cat.values, dtype=torch.long)
        self.X_num = torch.tensor(X_num.values, dtype=torch.float32)
        self.y = torch.tensor(y.values, dtype=torch.float32).view(-1, 1)
        
    def __len__(self):
        return len(self.y)
    
    def __getitem__(self, idx):
        return self.X_cat[idx], self.X_num[idx], self.y[idx]

# ==========================================
# 4. 메인 실행 로직 (학습 및 저장)
# ==========================================
def main():
    data_path = 'car_data_full_preprocessed_v15.csv'
    if not os.path.exists(data_path):
        print(f"Error: {data_path} 파일이 없습니다. 전처리 스크립트를 먼저 실행하세요.")
        return

    # 데이터 전처리
    processor = CarDataProcessor(data_path)
    df = processor.load_and_preprocess()
    
    # 데이터 분할
    X_cat = df[processor.categorical_features]
    X_num = df[processor.numerical_features]
    y = df['price_log']
    
    X_cat_train, X_cat_val, X_num_train, X_num_val, y_train, y_val = train_test_split(
        X_cat, X_num, y, test_size=0.2, random_state=42
    )
    
    # 데이터로더 생성
    train_loader = DataLoader(CarDataset(X_cat_train, X_num_train, y_train), batch_size=32, shuffle=True)
    val_loader = DataLoader(CarDataset(X_cat_val, X_num_val, y_val), batch_size=32)
    
    # 모델 초기화
    cat_dims = [len(processor.label_encoders[col].classes_) for col in processor.categorical_features]
    model = CarPricePredictor(cat_dims, len(processor.numerical_features))
    
    # 학습 설정
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    # 학습 루프
    epochs = 100
    best_val_loss = float('inf')
    print("학습 시작...")
    
    for epoch in range(epochs):
        model.train()
        for x_cat, x_num, target in train_loader:
            optimizer.zero_grad()
            output = model(x_cat, x_num)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()
            
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for x_cat, x_num, target in val_loader:
                output = model(x_cat, x_num)
                val_loss += criterion(output, target).item()
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}/{epochs}, Val Loss: {val_loss/len(val_loader):.4f}")
            
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), 'best_model_v15.pth')
            
    # 전처리 객체 저장
    joblib.dump(processor.scaler, 'scaler_v15.pkl')
    joblib.dump(processor.label_encoders, 'label_encoders_v15.pkl')
    with open('model_config_v15.json', 'w') as f:
        json.dump({
            'categorical_features': processor.categorical_features,
            'numerical_features': processor.numerical_features,
            'cat_dims': cat_dims
        }, f)
        
    print("학습 완료 및 파일 저장 성공!")

if __name__ == "__main__":
    main()
