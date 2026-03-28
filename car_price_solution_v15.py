import pandas as pd
import numpy as np
import random
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import json
import os

RANDOM_SEED = 42
TEST_SIZE = 0.2


def set_global_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    # 가능한 연산에 대해 결정론 모드를 강제하여 실행마다 동일 결과를 보장합니다.
    os.environ.setdefault('CUBLAS_WORKSPACE_CONFIG', ':4096:8')
    torch.use_deterministic_algorithms(True)
    if torch.backends.cudnn.is_available():
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False

# ==========================================
# 1. 데이터 로드 및 전처리 클래스
# ==========================================
class CarDataProcessor:
    def __init__(self, data_path):
        self.data_path = data_path
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.categorical_features = ['fuel', 'brand', 'model', 'price_segment']
        self.numerical_features = []
        self.price_segment_bins = []
        
    def load_and_preprocess(self):
        # 데이터 로드 (한글 깨짐 방지 인코딩 적용)
        df = pd.read_csv(self.data_path, encoding='utf-8-sig')

        # 서비스 입력가 원본을 캘리브레이션용으로 보존
        df['input_price_raw'] = df['price']
        
        # 타겟 변수 로그 변환
        df['price_log'] = np.log1p(df['price'])

        # 가격 구간(저가/중가/고가) 생성: 1번 전략(구간 기반) 적용
        q1, q2 = df['price'].quantile([0.33, 0.66]).tolist()
        self.price_segment_bins = [float(q1), float(q2)]

        def to_price_segment(price):
            if price <= q1:
                return 'low'
            if price <= q2:
                return 'mid'
            return 'high'

        df['price_segment'] = df['price'].apply(to_price_segment)
        
        # API에서 실제 전달되는 필드와 맞는 피처만 사용
        self.numerical_features = [
            'price',
            'car_age',
            'mileage',
            'spec_hp',
            'spec_torque',
            'spec_cc',
            'spec_efficiency',
            'insu_count',
            'option_count',
            'opt_썬루프',
            'opt_네비게이션',
            'opt_스마트키',
            'opt_통풍시트',
            'opt_가죽시트',
            'opt_열선시트',
            'opt_후방카메라',
        ]
        
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
            nn.Linear(total_emb_dim + num_features, 256),
            nn.ReLU(),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1)
        )
        # 모델이 입력 price 신호를 직접 활용하도록 skip 경로를 둡니다.
        self.price_skip = nn.Linear(1, 1, bias=False)
        
    def forward(self, x_cat, x_num):
        embs = [emb(x_cat[:, i]) for i, emb in enumerate(self.embeddings)]
        x = torch.cat(embs + [x_num], dim=1)
        price_feature = x_num[:, :1]
        return self.network(x) + self.price_skip(price_feature)

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
    set_global_seed(RANDOM_SEED)

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
        X_cat, X_num, y, test_size=TEST_SIZE, random_state=RANDOM_SEED
    )

    input_price_val = df.loc[y_val.index, 'input_price_raw'].values.astype(np.float64)
    
    # 데이터로더 생성
    train_generator = torch.Generator().manual_seed(RANDOM_SEED)
    train_loader = DataLoader(
        CarDataset(X_cat_train, X_num_train, y_train),
        batch_size=32,
        shuffle=True,
        generator=train_generator,
    )
    val_loader = DataLoader(CarDataset(X_cat_val, X_num_val, y_val), batch_size=32)
    
    # 모델 초기화
    cat_dims = [len(processor.label_encoders[col].classes_) for col in processor.categorical_features]
    model = CarPricePredictor(cat_dims, len(processor.numerical_features))
    
    # 학습 설정
    criterion = nn.SmoothL1Loss()
    optimizer = optim.Adam(model.parameters(), lr=0.0007)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode='min',
        factor=0.5,
        patience=8,
        min_lr=1e-5,
    )
    
    # 학습 루프
    epochs = 180
    best_val_loss = float('inf')
    best_state_dict = None
    patience = 20
    patience_counter = 0
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

        val_loss = val_loss / len(val_loader)
        scheduler.step(val_loss)
        
        if (epoch + 1) % 10 == 0:
            current_lr = optimizer.param_groups[0]['lr']
            print(f"Epoch {epoch+1}/{epochs}, Val Loss: {val_loss:.4f}, LR: {current_lr:.6f}")
            
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            best_state_dict = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            torch.save(model.state_dict(), 'best_model_v15.pth')
        else:
            patience_counter += 1

        if patience_counter >= patience:
            print(f"Early stopping at epoch {epoch+1}")
            break

    if best_state_dict is not None:
        model.load_state_dict(best_state_dict)

    # 검증셋 기반 2차 보정 계수 학습(누수 방지): y = a*raw_pred + c
    model.eval()
    with torch.no_grad():
        x_cat_val_tensor = torch.tensor(X_cat_val.values, dtype=torch.long)
        x_num_val_tensor = torch.tensor(X_num_val.values, dtype=torch.float32)
        y_val_log_pred = model(x_cat_val_tensor, x_num_val_tensor).numpy().flatten()

    raw_pred_val = np.expm1(y_val_log_pred)
    y_val_true = np.expm1(y_val.values)

    design = np.column_stack([raw_pred_val, np.ones_like(raw_pred_val)])
    calibration_coeffs, *_ = np.linalg.lstsq(design, y_val_true, rcond=None)
    calibration_coeffs = calibration_coeffs.tolist()
            
    # 전처리 객체 저장
    joblib.dump(processor.scaler, 'scaler_v15.pkl')
    joblib.dump(processor.label_encoders, 'label_encoders_v15.pkl')
    with open('model_config_v15.json', 'w', encoding='utf-8') as f:
        json.dump({
            'categorical_features': processor.categorical_features,
            'numerical_features': processor.numerical_features,
            'cat_dims': cat_dims,
            'price_segment_bins': processor.price_segment_bins,
            'calibration_coeffs': calibration_coeffs,
            'random_seed': RANDOM_SEED,
            'test_size': TEST_SIZE,
        }, f, ensure_ascii=False)
        
    print("학습 완료 및 파일 저장 성공!")

if __name__ == "__main__":
    main()
