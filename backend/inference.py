#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PyTorch v15 모델을 사용한 중고차 가격 예측 추론 스크립트
Node.js에서 호출되어 JSON 입력을 받고 JSON 출력을 반환합니다.
"""

import sys
import io
import json
import numpy as np
import torch
import torch.nn as nn
import joblib
from pathlib import Path

# stdin/stdout UTF-8 인코딩 보장
if sys.platform == 'win32':
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=False)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

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
            nn.Linear(total_emb_dim + num_features, 256),
            nn.ReLU(),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1)
        )
        self.price_skip = nn.Linear(1, 1, bias=False)
        
    def forward(self, x_cat, x_num):
        embs = [emb(x_cat[:, i]) for i, emb in enumerate(self.embeddings)]
        x = torch.cat(embs + [x_num], dim=1)
        price_feature = x_num[:, :1]
        return self.network(x) + self.price_skip(price_feature)


# ==========================================
# 2. 추론 클래스
# ==========================================
class ModelInference:
    def __init__(self, model_dir=None):
        self.model_dir = Path(model_dir) if model_dir else Path(__file__).resolve().parent
        self.device = torch.device("cpu")
        
        # 모델 파일 로드
        with open(self.model_dir / "model_config_v15.json", "r", encoding="utf-8") as f:
            self.config = json.load(f)
        self.scaler = joblib.load(self.model_dir / "scaler_v15.pkl")
        self.label_encoders = joblib.load(self.model_dir / "label_encoders_v15.pkl")
        # 누락된 수치 피처는 학습 데이터 평균으로 채웁니다.
        self.numeric_feature_defaults = {
            feature: float(mean)
            for feature, mean in zip(self.config['numerical_features'], self.scaler.mean_)
        }
        
        # 모델 초기화 및 로드
        cat_dims = self.config['cat_dims']
        num_features = len(self.config['numerical_features'])
        
        self.model = CarPricePredictor(cat_dims, num_features)
        checkpoint = torch.load(self.model_dir / "best_model_v15.pth", map_location=self.device)
        self.model.load_state_dict(checkpoint)
        self.model.to(self.device)
        self.model.eval()

    def _get_price_segment(self, price):
        bins = self.config.get('price_segment_bins', [])
        if len(bins) != 2:
            return 'mid'

        q1, q2 = bins
        if price <= q1:
            return 'low'
        if price <= q2:
            return 'mid'
        return 'high'

    def _map_numeric_feature(self, col, input_data):
        """API 입력 키를 학습 시 사용한 피처명으로 매핑합니다."""
        feature_key_map = {
            'spec_hp': 'spec_power',
            'spec_torque': 'spec_torque',
            'spec_cc': 'spec_displacement',
            'spec_efficiency': 'spec_efficiency',
            'spec_weight': 'spec_weight',
            'spec_length': 'spec_length',
            'spec_width': 'spec_width',
            'spec_height': 'spec_height',
            'opt_썬루프': 'opt_sunroof',
            'opt_네비게이션': 'opt_navigation',
            'opt_스마트키': 'opt_smartkey',
            'opt_통풍시트': 'opt_ventilationseat',
            'opt_어라운드뷰': 'opt_aroundview',
            'opt_HUD': 'opt_hud',
            'opt_가죽시트': 'opt_leatherseat',
            'opt_열선시트': 'opt_heatseat',
            'opt_후방카메라': 'opt_rearcamera',
            'opt_블랙박스': 'opt_blackbox',
            'opt_하이패스': 'opt_hipass',
        }

        default_value = self.numeric_feature_defaults.get(col, 0.0)

        # price 피처는 학습 데이터 평균값을 사용 (사용자 입력 가격 무시)
        # 이렇게 하면 다른 피처들(브랜드, 모델, 연식 등)만 기반으로 정확히 예측
        if col == 'price':
            return float(default_value)

        if col in input_data:
            return float(input_data[col])

        mapped_key = feature_key_map.get(col)
        if mapped_key and mapped_key in input_data:
            return float(input_data[mapped_key])

        return default_value
    
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
            reference_price = float(self.numeric_feature_defaults.get('price', 0.0))

            # 범주형 데이터 인코딩
            x_cat_list = []
            for config_key in self.config['categorical_features']:
                if config_key == 'fuel':
                    value = input_data.get('fuel_type', '')
                elif config_key == 'brand':
                    value = input_data.get('brand', '')
                elif config_key == 'model':
                    value = input_data.get('model', '')
                elif config_key == 'price_segment':
                    # 입력 가격 대신 학습 평균 가격으로 구간을 고정해 가격 영향 제거
                    value = self._get_price_segment(reference_price)
                else:
                    value = ''

                if config_key in self.label_encoders:
                    try:
                        encoded = self.label_encoders[config_key].transform([value])[0]
                    except Exception:
                        encoded = 0
                    x_cat_list.append(encoded)
            
            # 수치형 특성 추출
            x_num_list = []
            for col in self.config['numerical_features']:
                x_num_list.append(self._map_numeric_feature(col, input_data))
            
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

            coeffs = self.config.get('calibration_coeffs')
            if coeffs and len(coeffs) == 2:
                a, c = coeffs
                predicted_price = a * predicted_price + c
                predicted_price = max(float(predicted_price), 1.0)
            
            # 결과 계산
            input_price = float(input_data.get('price', 0))
            price_difference = predicted_price - input_price
            price_difference_percent = (price_difference / input_price * 100) if input_price > 0 else 0
            
            # 신뢰도 점수 및 판별 결과 계산
            # 정상: 15% 이내, 주의: 15~30%, 위험: 30% 초과
            abs_diff_percent = abs(price_difference_percent)
            if abs_diff_percent <= 15:
                confidence_score = 96  # 모델의 R² Score 기반
                verdict = '정상'
                verdict_color = 'green'
            elif abs_diff_percent <= 30:
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
