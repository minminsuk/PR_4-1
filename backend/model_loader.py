"""
PyTorch 기반 중고차 가격 예측 모델 로더
v15 모델을 로드하고 추론을 수행하는 Python 스크립트
"""

import json
import os
import pickle
import numpy as np
import torch
import torch.nn as nn
from pathlib import Path


class CarPricePredictor(nn.Module):
    """중고차 가격 예측 신경망 모델"""
    
    def __init__(self, num_numerical_features, embedding_dims):
        super(CarPricePredictor, self).__init__()
        
        # 임베딩 레이어 (범주형 데이터)
        self.embeddings = nn.ModuleDict()
        total_embedding_dim = 0
        
        for col, dim in embedding_dims.items():
            self.embeddings[col] = nn.Embedding(1000, dim)
            total_embedding_dim += dim
        
        # 입력 차원 계산
        input_dim = num_numerical_features + total_embedding_dim
        
        # 다층 퍼셉트론 (MLP)
        self.fc1 = nn.Linear(input_dim, 128)
        self.bn1 = nn.BatchNorm1d(128)
        self.dropout1 = nn.Dropout(0.3)
        
        self.fc2 = nn.Linear(128, 64)
        self.bn2 = nn.BatchNorm1d(64)
        self.dropout2 = nn.Dropout(0.3)
        
        self.fc3 = nn.Linear(64, 32)
        self.bn3 = nn.BatchNorm1d(32)
        self.dropout3 = nn.Dropout(0.2)
        
        self.fc4 = nn.Linear(32, 1)
        
        self.relu = nn.ReLU()
    
    def forward(self, numerical_features, embedding_inputs):
        """
        Args:
            numerical_features: (batch_size, num_numerical_features)
            embedding_inputs: dict of {col_name: (batch_size,)}
        """
        # 임베딩 처리
        embedded_list = []
        for col_name, indices in embedding_inputs.items():
            if col_name in self.embeddings:
                embedded = self.embeddings[col_name](indices)
                embedded_list.append(embedded)
        
        # 임베딩과 수치형 특성 결합
        if embedded_list:
            embedded_features = torch.cat(embedded_list, dim=1)
            x = torch.cat([numerical_features, embedded_features], dim=1)
        else:
            x = numerical_features
        
        # MLP 통과
        x = self.fc1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.dropout1(x)
        
        x = self.fc2(x)
        x = self.bn2(x)
        x = self.relu(x)
        x = self.dropout2(x)
        
        x = self.fc3(x)
        x = self.bn3(x)
        x = self.relu(x)
        x = self.dropout3(x)
        
        x = self.fc4(x)
        
        return x


class ModelManager:
    """모델 로드 및 추론 관리 클래스"""
    
    def __init__(self, model_dir="/home/ubuntu/car_fraud_detector/server"):
        self.model_dir = Path(model_dir)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # 모델 파일 경로
        self.model_path = self.model_dir / "best_model_v15.pth"
        self.scaler_path = self.model_dir / "scaler_v15.pkl"
        self.label_encoders_path = self.model_dir / "label_encoders_v15.pkl"
        self.config_path = self.model_dir / "model_config_v15.json"
        
        # 모델 및 전처리 객체
        self.model = None
        self.scaler = None
        self.label_encoders = None
        self.config = None
        
        self._load_model()
    
    def _load_model(self):
        """모델 및 전처리 객체 로드"""
        try:
            # 설정 파일 로드
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
            
            # 스케일러 로드
            with open(self.scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)
            
            # 레이블 인코더 로드
            with open(self.label_encoders_path, 'rb') as f:
                self.label_encoders = pickle.load(f)
            
            # 모델 로드
            embedding_dims = self.config.get('embedding_dims', {})
            num_numerical_features = len(self.config.get('numerical_cols', []))
            
            self.model = CarPricePredictor(
                num_numerical_features=num_numerical_features,
                embedding_dims=embedding_dims
            )
            
            checkpoint = torch.load(self.model_path, map_location=self.device)
            self.model.load_state_dict(checkpoint)
            self.model.to(self.device)
            self.model.eval()
            
            print(f"✅ 모델 로드 완료 (Device: {self.device})")
            
        except Exception as e:
            print(f"❌ 모델 로드 실패: {str(e)}")
            raise
    
    def predict(self, input_data):
        """
        차량 정보를 입력받아 가격 예측
        
        Args:
            input_data: {
                'price': float,  # 입력 가격 (만원)
                'car_age': int,  # 차량 연식
                'mileage': float,  # 주행거리 (km)
                'fuel_type': str,  # 연료 타입
                'brand': str,  # 브랜드
                'model': str,  # 모델명
                'spec_power': float,  # 마력
                'spec_torque': float,  # 토크
                'spec_displacement': float,  # 배기량
                'spec_efficiency': float,  # 연비
                'insu_my_count': int,  # 내차 피해
                'insu_other_count': int,  # 타차 가해
                'insu_owner_count': int,  # 소유자 변경
                'option_count': int,  # 옵션 개수
                'opt_sunroof': int,  # 썬루프
                'opt_navigation': int,  # 네비게이션
                'opt_smartkey': int,  # 스마트키
                'opt_ledheadlamp': int,  # LED/HID 헤드램프
                'opt_heatseat': int,  # 열선시트
                'opt_ventilationseat': int,  # 통풍시트
                'opt_rearsensor': int,  # 후방감지센서
                'opt_rearcamera': int,  # 후방카메라
                'opt_powermirror': int,  # 전동사이드미러
                'opt_aluminumwheel': int,  # 알루미늄휠
                'opt_leatherseat': int,  # 가죽시트
            }
        
        Returns:
            {
                'predicted_price': float,  # 예측 가격 (만원)
                'input_price': float,  # 입력 가격 (만원)
                'price_difference': float,  # 가격 차이 (만원)
                'price_difference_percent': float,  # 가격 차이 (%)
                'confidence_score': float,  # 신뢰도 점수 (0-100)
                'verdict': str,  # 판별 결과 ('정상', '주의', '위험')
                'verdict_color': str,  # 판별 결과 색상 ('green', 'yellow', 'red')
            }
        """
        try:
            with torch.no_grad():
                # 수치형 특성 추출 및 스케일링
                numerical_cols = self.config.get('numerical_cols', [])
                numerical_data = np.array([[input_data.get(col, 0) for col in numerical_cols]])
                numerical_scaled = self.scaler.transform(numerical_data)
                numerical_tensor = torch.FloatTensor(numerical_scaled).to(self.device)
                
                # 범주형 특성 추출 및 인코딩
                categorical_cols = self.config.get('categorical_cols', [])
                embedding_inputs = {}
                
                for col in categorical_cols:
                    value = input_data.get(col, '')
                    if col in self.label_encoders:
                        try:
                            encoded = self.label_encoders[col].transform([value])[0]
                        except:
                            encoded = 0
                        embedding_inputs[col] = torch.LongTensor([encoded]).to(self.device)
                
                # 모델 추론
                log_pred = self.model(numerical_tensor, embedding_inputs)
                predicted_price = np.expm1(log_pred.cpu().numpy()[0][0])
                
                # 결과 계산
                input_price = input_data.get('price', 0)
                price_difference = predicted_price - input_price
                price_difference_percent = (price_difference / input_price * 100) if input_price > 0 else 0
                
                # 신뢰도 점수 계산 (가격 차이 기반)
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
            print(f"❌ 예측 실패: {str(e)}")
            raise


# 글로벌 모델 인스턴스
_model_manager = None


def get_model_manager():
    """모델 매니저 싱글톤 인스턴스 반환"""
    global _model_manager
    if _model_manager is None:
        _model_manager = ModelManager()
    return _model_manager


if __name__ == "__main__":
    # 테스트
    manager = get_model_manager()
    
    test_input = {
        'price': 3500,
        'car_age': 5,
        'mileage': 40000,
        'fuel_type': '가솔린',
        'brand': '현대',
        'model': '팰리세이드',
        'spec_power': 295,
        'spec_torque': 36.2,
        'spec_displacement': 3778,
        'spec_efficiency': 8.9,
        'insu_my_count': 0,
        'insu_other_count': 0,
        'insu_owner_count': 0,
        'option_count': 10,
        'opt_sunroof': 1,
        'opt_navigation': 1,
        'opt_smartkey': 1,
        'opt_ledheadlamp': 1,
        'opt_heatseat': 1,
        'opt_ventilationseat': 0,
        'opt_rearsensor': 0,
        'opt_rearcamera': 0,
        'opt_powermirror': 0,
        'opt_aluminumwheel': 0,
        'opt_leatherseat': 0,
    }
    
    result = manager.predict(test_input)
    print("\n🚗 예측 결과:")
    print(f"입력 가격: {result['input_price']:.0f}만원")
    print(f"예측 가격: {result['predicted_price']:.0f}만원")
    print(f"가격 차이: {result['price_difference']:.0f}만원 ({result['price_difference_percent']:.1f}%)")
    print(f"신뢰도: {result['confidence_score']:.0f}%")
    print(f"판별: {result['verdict']} ({result['verdict_color']})")
