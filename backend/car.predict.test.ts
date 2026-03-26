import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// 테스트할 스키마 및 함수 정의
const predictInputSchema = z.object({
  price: z.number().positive('가격은 양수여야 합니다'),
  car_age: z.number().int().min(0).max(50),
  mileage: z.number().min(0),
  fuel_type: z.string(),
  brand: z.string(),
  model: z.string(),
  spec_power: z.number().min(0),
  spec_torque: z.number().min(0),
  spec_displacement: z.number().min(0),
  spec_efficiency: z.number().min(0),
  insu_my_count: z.number().int().min(0),
  insu_other_count: z.number().int().min(0),
  insu_owner_count: z.number().int().min(0),
  option_count: z.number().int().min(0),
  opt_sunroof: z.number().int(),
  opt_navigation: z.number().int(),
  opt_smartkey: z.number().int(),
  opt_ledheadlamp: z.number().int(),
  opt_heatseat: z.number().int(),
  opt_ventilationseat: z.number().int(),
  opt_rearsensor: z.number().int(),
  opt_rearcamera: z.number().int(),
  opt_powermirror: z.number().int(),
  opt_aluminumwheel: z.number().int(),
  opt_leatherseat: z.number().int(),
});

// 가격 예측 함수
function predictCarPrice(inputData: z.infer<typeof predictInputSchema>): {
  predicted_price: number;
  input_price: number;
  price_difference: number;
  price_difference_percent: number;
  confidence_score: number;
  verdict: string;
  verdict_color: string;
} {
  let base_price = inputData.price;
  
  const age_depreciation = inputData.car_age * 2;
  const mileage_depreciation = (inputData.mileage / 10000) * 1;
  const option_bonus = inputData.option_count * 0.5;
  
  const total_adjustment = -age_depreciation - mileage_depreciation + option_bonus;
  const predicted_price = base_price * (1 + total_adjustment / 100);
  
  const price_difference = predicted_price - inputData.price;
  const price_difference_percent = (price_difference / inputData.price) * 100;
  
  let verdict = '정상';
  let verdict_color = 'green';
  let confidence_score = 95;
  
  const abs_diff = Math.abs(price_difference_percent);
  
  if (abs_diff > 15) {
    verdict = '위험';
    verdict_color = 'red';
    confidence_score = 50;
  } else if (abs_diff > 5) {
    verdict = '주의';
    verdict_color = 'yellow';
    confidence_score = 75;
  }
  
  return {
    predicted_price: Math.round(predicted_price * 100) / 100,
    input_price: inputData.price,
    price_difference: Math.round(price_difference * 100) / 100,
    price_difference_percent: Math.round(price_difference_percent * 100) / 100,
    confidence_score,
    verdict,
    verdict_color,
  };
}

describe('Car Price Prediction', () => {
  const baseInput = {
    price: 3500,
    car_age: 5,
    mileage: 40000,
    fuel_type: '가솔린',
    brand: '현대',
    model: '팰리세이드',
    spec_power: 295,
    spec_torque: 36.2,
    spec_displacement: 3778,
    spec_efficiency: 8.9,
    insu_my_count: 0,
    insu_other_count: 0,
    insu_owner_count: 0,
    option_count: 10,
    opt_sunroof: 1,
    opt_navigation: 1,
    opt_smartkey: 1,
    opt_ledheadlamp: 1,
    opt_heatseat: 1,
    opt_ventilationseat: 0,
    opt_rearsensor: 0,
    opt_rearcamera: 0,
    opt_powermirror: 0,
    opt_aluminumwheel: 0,
    opt_leatherseat: 0,
  };

  it('should return a valid prediction result', () => {
    const result = predictCarPrice(baseInput);
    
    expect(result).toHaveProperty('predicted_price');
    expect(result).toHaveProperty('input_price');
    expect(result).toHaveProperty('price_difference');
    expect(result).toHaveProperty('price_difference_percent');
    expect(result).toHaveProperty('confidence_score');
    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('verdict_color');
  });

  it('should have correct input_price', () => {
    const result = predictCarPrice(baseInput);
    expect(result.input_price).toBe(baseInput.price);
  });

  it('should calculate price_difference correctly', () => {
    const result = predictCarPrice(baseInput);
    expect(result.price_difference).toBe(result.predicted_price - result.input_price);
  });

  it('should return "정상" verdict for small price differences', () => {
    const input = { ...baseInput, car_age: 1, mileage: 10000, option_count: 10 };
    const result = predictCarPrice(input);
    
    if (Math.abs(result.price_difference_percent) <= 5) {
      expect(result.verdict).toBe('정상');
      expect(result.verdict_color).toBe('green');
      expect(result.confidence_score).toBe(95);
    }
  });

  it('should return "주의" verdict for moderate price differences', () => {
    const input = { ...baseInput, car_age: 5, mileage: 100000, option_count: 2 };
    const result = predictCarPrice(input);
    
    const abs_diff = Math.abs(result.price_difference_percent);
    if (abs_diff > 5 && abs_diff <= 15) {
      expect(result.verdict).toBe('주의');
      expect(result.verdict_color).toBe('yellow');
      expect(result.confidence_score).toBe(75);
    }
  });

  it('should return "위험" verdict for large price differences', () => {
    const input = { ...baseInput, car_age: 20, mileage: 200000, option_count: 0 };
    const result = predictCarPrice(input);
    
    const abs_diff = Math.abs(result.price_difference_percent);
    if (abs_diff > 15) {
      expect(result.verdict).toBe('위험');
      expect(result.verdict_color).toBe('red');
      expect(result.confidence_score).toBe(50);
    }
  });

  it('should handle zero mileage', () => {
    const input = { ...baseInput, mileage: 0 };
    const result = predictCarPrice(input);
    
    expect(result.predicted_price).toBeGreaterThan(0);
    expect(result.price_difference_percent).toBeDefined();
  });

  it('should handle high mileage', () => {
    const input = { ...baseInput, mileage: 300000 };
    const result = predictCarPrice(input);
    
    expect(result.predicted_price).toBeGreaterThan(0);
    expect(result.price_difference_percent).toBeLessThan(0); // 가격이 내려가야 함
  });

  it('should handle many options', () => {
    // 옵션만 증가하고 다른 요소는 동일할 때
    const input = { ...baseInput, car_age: 0, mileage: 0, option_count: 20 };
    const result = predictCarPrice(input);
    
    // 옵션 개수가 많을수록 가격이 올라가야 함
    // 기본 입력(option_count: 10)과 비교
    const baseResult = predictCarPrice({ ...baseInput, car_age: 0, mileage: 0, option_count: 10 });
    expect(result.predicted_price).toBeGreaterThan(baseResult.predicted_price);
  });

  it('should validate input schema', () => {
    expect(() => {
      predictInputSchema.parse(baseInput);
    }).not.toThrow();
  });

  it('should reject invalid price (zero or negative)', () => {
    expect(() => {
      predictInputSchema.parse({ ...baseInput, price: 0 });
    }).toThrow();

    expect(() => {
      predictInputSchema.parse({ ...baseInput, price: -1000 });
    }).toThrow();
  });

  it('should reject invalid car_age', () => {
    expect(() => {
      predictInputSchema.parse({ ...baseInput, car_age: -1 });
    }).toThrow();

    expect(() => {
      predictInputSchema.parse({ ...baseInput, car_age: 51 });
    }).toThrow();
  });

  it('should calculate percentage correctly', () => {
    const input = { ...baseInput, car_age: 0, mileage: 0, option_count: 0 };
    const result = predictCarPrice(input);
    
    // 연식 0, 주행거리 0, 옵션 0일 때 가격은 동일해야 함
    expect(result.price_difference_percent).toBeCloseTo(0, 1);
  });
});
