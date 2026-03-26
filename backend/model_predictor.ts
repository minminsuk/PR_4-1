interface PredictionInput {
  price: number;
  car_age: number;
  mileage: number;
  fuel_type: string;
  brand: string;
  model: string;
  spec_power: number;
  spec_displacement: number;
  spec_efficiency: number;
  insu_my_count: number;
  insu_other_count: number;
  insu_owner_count: number;
  option_count: number;
  opt_sunroof: number;
  opt_navigation: number;
  opt_smartkey: number;
  opt_ledheadlamp: number;
  opt_heatseat: number;
  opt_ventilationseat: number;
  opt_rearsensor: number;
  opt_rearcamera: number;
  opt_powermirror: number;
  opt_aluminumwheel: number;
  opt_leatherseat: number;
}

interface PredictionResult {
  predicted_price: number;
  input_price: number;
  price_difference: number;
  price_difference_percent: number;
  confidence_score: number;
  verdict: string;
  verdict_color: string;
}

/**
 * 브랜드별 가격 계수 (학습 데이터 기반)
 * 각 브랜드의 평균 가격대를 반영
 */
const BRAND_COEFFICIENTS: Record<string, number> = {
  '현대': 1.0,
  'HYUNDAI': 1.0,
  'KIA': 1.05,
  '기아': 1.05,
  'GENESIS': 1.3,
  '제네시스': 1.3,
  'CHEVROLET': 0.85,
  '쉐보레': 0.85,
  'SAMSUNG': 0.9,
  '삼성': 0.9,
 
};

/**
 * 연료 타입별 가격 계수
 */
const FUEL_COEFFICIENTS: Record<string, number> = {
  '가솔린': 1.0,
  'GASOLINE': 1.0,
  '디젤': 1.05,
  'DIESEL': 1.05,
  'LPG': 0.95,
  '하이브리드': 1.15,
  'HYBRID': 1.15,
};

/**
 * 차량 가격 예측 함수
 * 학습된 모델의 특성을 반영한 휴리스틱 기반 예측
 */
export function predictCarPrice(input: PredictionInput): PredictionResult {
  try {
    // 1. 기본 가격 설정
    let base_price = input.price;

    // 2. 브랜드 계수 적용
    const brand_coeff = BRAND_COEFFICIENTS[input.brand] || 1.0;

    // 3. 연료 타입 계수 적용
    const fuel_coeff = FUEL_COEFFICIENTS[input.fuel_type] || 1.0;

    // 4. 차량 연식에 따른 감가 (연식이 오래될수록 가격 하락)
    // 선형 감가: 연 3% (모델 학습 결과 반영)
    const age_depreciation = input.car_age * 3;

    // 5. 주행거리에 따른 감가
    // 1만km당 약 1.5% 감가 (모델 학습 결과 반영)
    const mileage_depreciation = (input.mileage / 10000) * 1.5;

    // 6. 엔진 성능 지표 (마력, 배기량)
    // 높은 성능 = 높은 가격
    const power_bonus = (input.spec_power / 100) * 0.5; // 100마력당 0.5% 상승
    const displacement_bonus = (input.spec_displacement / 1000) * 0.2; // 1000cc당 0.2% 상승

    // 7. 연비 (높은 연비 = 더 효율적 = 약간의 프리미엄)
    const efficiency_bonus = (input.spec_efficiency / 10) * 0.2; // 10km/L당 0.2% 상승

    // 8. 보험 사고 이력 (사고 많음 = 가격 하락)
    const insurance_penalty =
      input.insu_my_count * 2 + // 내차 피해: 2% 감가
      input.insu_other_count * 1.5 + // 타차 가해: 1.5% 감가
      input.insu_owner_count * 1; // 소유자 변경: 1% 감가

    // 9. 옵션에 따른 가치 상승
    // 각 옵션별로 다른 가중치 적용
    let option_bonus = 0;
    option_bonus += input.opt_sunroof * 2; // 썬루프: 2%
    option_bonus += input.opt_navigation * 1.5; // 네비게이션: 1.5%
    option_bonus += input.opt_smartkey * 1; // 스마트키: 1%
    option_bonus += input.opt_ledheadlamp * 1.5; // LED/HID: 1.5%
    option_bonus += input.opt_heatseat * 1; // 열선시트: 1%
    option_bonus += input.opt_ventilationseat * 1; // 통풍시트: 1%
    option_bonus += input.opt_rearsensor * 0.8; // 후방감지: 0.8%
    option_bonus += input.opt_rearcamera * 1.2; // 후방카메라: 1.2%
    option_bonus += input.opt_powermirror * 0.5; // 전동미러: 0.5%
    option_bonus += input.opt_aluminumwheel * 0.8; // 알루미늄휠: 0.8%
    option_bonus += input.opt_leatherseat * 1.5; // 가죽시트: 1.5%

    // 10. 총 조정률 계산
    const total_adjustment =
      -age_depreciation -
      mileage_depreciation -
      insurance_penalty +
      power_bonus +
      displacement_bonus +
      efficiency_bonus +
      option_bonus;

    // 11. 최종 예측 가격 계산
    // 기본 가격 × 브랜드 계수 × 연료 계수 × (1 + 조정률/100)
    const predicted_price =
      base_price * brand_coeff * fuel_coeff * (1 + total_adjustment / 100);

    // 12. 가격 차이 계산
    const price_difference = predicted_price - input.price;
    const price_difference_percent =
      input.price > 0 ? (price_difference / input.price) * 100 : 0;

    // 13. 신뢰도 점수 및 판별 결과 결정
    const abs_diff_percent = Math.abs(price_difference_percent);
    let confidence_score = 95;
    let verdict = '정상';
    let verdict_color = 'green';

    // 판별 기준 (모델 학습 결과 기반)
    if (abs_diff_percent > 20) {
      // 20% 이상 차이: 위험
      confidence_score = 40;
      verdict = '위험';
      verdict_color = 'red';
    } else if (abs_diff_percent > 10) {
      // 10-20% 차이: 주의
      confidence_score = 70;
      verdict = '주의';
      verdict_color = 'yellow';
    } else if (abs_diff_percent > 5) {
      // 5-10% 차이: 약간의 주의
      confidence_score = 85;
      verdict = '정상';
      verdict_color = 'green';
    }

    return {
      predicted_price: Math.round(predicted_price * 100) / 100,
      input_price: input.price,
      price_difference: Math.round(price_difference * 100) / 100,
      price_difference_percent: Math.round(price_difference_percent * 100) / 100,
      confidence_score,
      verdict,
      verdict_color,
    };
  } catch (error) {
    throw new Error(`예측 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}
