#!/usr/bin/env python3
"""
PyTorch v15 모델을 사용한 중고차 가격 예측 추론 스크립트
Node.js에서 호출되어 JSON 입력을 받고 JSON 출력을 반환합니다.
"""

import sys
import json
import numpy as np
import torch
import torch.nn as nn
import joblib
from pathlib import Path

# ==========================================
# 1. 모델 정의
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
# 2. 추론 클래스
# ==========================================
class ModelInference:
    def __init__(self, model_dir="/home/ubuntu/car_fraud_detector/server"):
        self.model_dir = Path(model_dir)
        self.device = torch.device("cpu")
        
        # 모델 파일 로드
        self.config = json.load(open(self.model_dir / "model_config_v15.json"))
        self.scaler = joblib.load(self.model_dir / "scaler_v15.pkl")
        self.label_encoders = joblib.load(self.model_dir / "label_encoders_v15.pkl")
        
        # 모델 초기화 및 로드
        cat_dims = self.config['cat_dims']
        num_features = len(self.config['numerical_features'])
        
        self.model = CarPricePredictor(cat_dims, num_features)
        checkpoint = torch.load(self.model_dir / "best_model_v15.pth", map_location=self.device)
        self.model.load_state_dict(checkpoint)
        self.model.to(self.device)
        self.model.eval()
    
    def predict(self, input_data):
        """
        차량 정보를 입력받아 가격을 예측합니다.
        
        Args:
            input_data: {
                'price': float,  # 입력 가격 (만원)
                'car_age': int,  # 차량 연식
                'mileage': float,  # 주행거리 (km)
                'fuel_type': str,  # 연료 타입 (가솔린, 디젤, LPG, 하이브리드)
                'brand': str,  # 브랜드
                'model': str,  # 모델명
                'spec_power': float,  # 마력
                'spec_torque': float,  # 토크
                'spec_displacement': float,  # 배기량
                'spec_efficiency': float,  # 연비
                ... (기타 특성들)
            }
        """
        try:
            # 범주형 특성 매핑
            categorical_mapping = {
                'fuel_type': 'fuel',
                'brand': 'brand',
                'model': 'model'
            }
            
            # 범주형 데이터 인코딩
            x_cat_list = []
            for input_key, config_key in categorical_mapping.items():
                value = input_data.get(input_key, '')
                if config_key in self.label_encoders:
                    try:
                        encoded = self.label_encoders[config_key].transform([value])[0]
                    except:
                        # 알 수 없는 값은 0으로 인코딩
                        encoded = 0
                    x_cat_list.append(encoded)
            
            # 수치형 특성 추출
            x_num_list = []
            for col in self.config['numerical_features']:
                # 입력 데이터의 키를 config의 컬럼명과 매핑
                if col in input_data:
                    x_num_list.append(input_data[col])
                else:
                    x_num_list.append(0)
            
            # 수치형 데이터 스케일링
            x_num_array = np.array([x_num_list])
            x_num_scaled = self.scaler.transform(x_num_array)
            
            # 텐서로 변환
            x_cat = torch.tensor([x_cat_list], dtype=torch.long).to(self.device)
            x_num = torch.tensor(x_num_scaled, dtype=torch.float32).to(self.device)
            
            # 모델 추론
            with torch.no_grad():
                log_pred = self.model(x_cat, x_num)
                predicted_price_log = log_pred.cpu().numpy()[0][0]
                predicted_price = np.expm1(predicted_price_log)
            
            # 결과 계산
            input_price = input_data.get('price', 0)
            price_difference = predicted_price - input_price
            price_difference_percent = (price_difference / input_price * 100) if input_price > 0 else 0
            
            # 신뢰도 점수 및 판별 결과 계산
            abs_diff_percent = abs(price_difference_percent)
            if abs_diff_percent <= 5:
                confidence_score = 95
                verdict = '정상'
                verdict_color = 'green'
            elif abs_diff_percent <= 15:
                confidence_score = 75
                verdict = '주의'
                verdict_color = 'yellow'
            else:
                confidence_score = 50
                verdict = '위험'
                verdict_color = 'red'
            
            return {
                'predicted_price': float(predicted_price),
                'input_price': float(input_price),
                'price_difference': float(price_difference),
                'price_difference_percent': float(price_difference_percent),
                'confidence_score': float(confidence_score),
                'verdict': verdict,
                'verdict_color': verdict_color,
            }
        
        except Exception as e:
            raise Exception(f"추론 실패: {str(e)}")


# ==========================================
# 3. 메인 실행 (Node.js에서 호출)
# ==========================================
if __name__ == "__main__":
    try:
        # stdin에서 JSON 입력 받기
        input_json = sys.stdin.read()
        input_data = json.loads(input_json)
        
        # 모델 로드 및 추론
        inference = ModelInference()
        result = inference.predict(input_data)
        
        # 결과를 JSON으로 출력
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)
    
    except json.JSONDecodeError as e:
        error_result = {
            'error': f'JSON 파싱 오류: {str(e)}'
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
    
    except Exception as e:
        error_result = {
            'error': str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
