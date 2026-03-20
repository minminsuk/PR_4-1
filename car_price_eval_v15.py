import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import joblib
import json
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import os

# 한글 폰트 설정 (Linux 환경용, VS Code 로컬 실행 시에는 해당 환경의 폰트 설정 필요)
plt.rcParams['font.family'] = 'NanumGothic' if os.path.exists('/usr/share/fonts/truetype/nanum/NanumGothic.ttf') else 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

# ==========================================
# 1. 모델 정의 (학습 시와 동일해야 함)
# ==========================================
class CarPricePredictor(nn.Module):
    def __init__(self, cat_dims, num_features):
        super(CarPricePredictor, self).__init__()
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
# 2. 평가 함수
# ==========================================
def evaluate_model():
    # 파일 로드
    data_path = 'car_data_full_preprocessed_v15.csv'
    model_path = 'best_model_v15.pth'
    config_path = 'model_config_v15.json'
    scaler_path = 'scaler_v15.pkl'
    le_path = 'label_encoders_v15.pkl'

    if not all(os.path.exists(f) for f in [data_path, model_path, config_path, scaler_path, le_path]):
        print("Error: 필요한 파일이 부족합니다. 학습을 먼저 완료하세요.")
        return

    # 설정 및 객체 로드
    with open(config_path, 'r') as f:
        config = json.load(f)
    scaler = joblib.load(scaler_path)
    label_encoders = joblib.load(le_path)
    
    # 데이터 로드 및 전처리
    df = pd.read_csv(data_path, encoding='utf-8-sig')
    y_true = df['price'].values
    
    X_cat_raw = df[config['categorical_features']]
    X_num_raw = df[config['numerical_features']]
    
    # 인코딩 및 스케일링
    X_cat = X_cat_raw.copy()
    for col in config['categorical_features']:
        X_cat[col] = label_encoders[col].transform(X_cat[col].astype(str))
    
    X_num = scaler.transform(X_num_raw)
    
    # 텐서 변환
    X_cat_tensor = torch.tensor(X_cat.values, dtype=torch.long)
    X_num_tensor = torch.tensor(X_num, dtype=torch.float32)
    
    # 모델 로드
    model = CarPricePredictor(config['cat_dims'], len(config['numerical_features']))
    model.load_state_dict(torch.load(model_path))
    model.eval()
    
    # 예측
    with torch.no_grad():
        y_pred_log = model(X_cat_tensor, X_num_tensor).numpy().flatten()
        y_pred = np.expm1(y_pred_log) # 로그 변환 역산
    
    # 성능 지표 계산
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100

    print("\n" + "="*30)
    print(" 모델 성능 평가 결과 (v15)")
    print("="*30)
    print(f"1. 평균 절대 오차 (MAE): {mae:.2f} 만원")
    print(f"2. 평균 제곱근 오차 (RMSE): {rmse:.2f} 만원")
    print(f"3. 결정 계수 (R² Score): {r2:.4f} (1에 가까울수록 정확)")
    print(f"4. 평균 절대 백분율 오차 (MAPE): {mape:.2f} %")
    print("="*30)

    # 시각화: 실제값 vs 예측값
    plt.figure(figsize=(10, 6))
    plt.scatter(y_true, y_pred, alpha=0.5, color='blue')
    plt.plot([y_true.min(), y_true.max()], [y_true.min(), y_true.max()], 'r--', lw=2)
    plt.xlabel('실제 가격 (만원)')
    plt.ylabel('예측 가격 (만원)')
    plt.title('실제 가격 vs 모델 예측 가격 비교')
    plt.grid(True)
    plt.savefig('model_performance_v15.png')
    print("\n시각화 차트가 'model_performance_v15.png'로 저장되었습니다.")
    
    # 오차 분석 샘플
    results_df = pd.DataFrame({
        'Brand': df['brand'],
        'Model': df['model'],
        'Actual': y_true,
        'Predicted': y_pred.round(2),
        'Error': (y_true - y_pred).round(2),
        'Error_Rate(%)': (np.abs(y_true - y_pred) / y_true * 100).round(2)
    })
    
    print("\n[오차 분석 샘플 (상위 10개)]")
    print(results_df.head(10).to_string(index=False))
    
    # 결과 저장
    results_df.to_csv('evaluation_results_v15.csv', index=False, encoding='utf-8-sig')
    print("\n상세 평가 결과가 'evaluation_results_v15.csv'로 저장되었습니다.")

if __name__ == "__main__":
    evaluate_model()
