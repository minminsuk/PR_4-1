import { describe, it, expect } from 'vitest';
import { predictCarPrice } from './model_predictor';

describe('Model Predictor (TypeScript)', () => {
  const baseInput = {
    price: 3500,
    car_age: 5,
    mileage: 40000,
    fuel_type: '가솔린',
    brand: '현대',
    model: '팰리세이드',
    spec_power: 295,
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

  it('should return valid prediction result', () => {
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
    expect(result.price_difference).toBeCloseTo(
      result.predicted_price - result.input_price,
      2
    );
  });

  it('should return valid verdict values', () => {
    const result = predictCarPrice(baseInput);

    expect(['정상', '주의', '위험']).toContain(result.verdict);
    expect(['green', 'yellow', 'red']).toContain(result.verdict_color);
  });

  it('should have confidence_score between 0 and 100', () => {
    const result = predictCarPrice(baseInput);

    expect(result.confidence_score).toBeGreaterThanOrEqual(0);
    expect(result.confidence_score).toBeLessThanOrEqual(100);
  });

  it('should handle different car brands', () => {
    const brands = ['현대', 'KIA', 'BMW', 'GENESIS'];

    for (const brand of brands) {
      const input = { ...baseInput, brand };
      const result = predictCarPrice(input);

      expect(result.predicted_price).toBeGreaterThan(0);
      expect(result.verdict).toBeDefined();
    }
  });

  it('should handle zero mileage', () => {
    const input = { ...baseInput, mileage: 0 };
    const result = predictCarPrice(input);

    expect(result.predicted_price).toBeGreaterThan(0);
    expect(result.verdict).toBeDefined();
  });

  it('should handle high mileage', () => {
    const input = { ...baseInput, mileage: 300000 };
    const result = predictCarPrice(input);

    expect(result.predicted_price).toBeGreaterThan(0);
    expect(result.verdict).toBeDefined();
  });

  it('should handle new car (car_age = 0)', () => {
    const input = { ...baseInput, car_age: 0 };
    const result = predictCarPrice(input);

    expect(result.predicted_price).toBeGreaterThan(0);
    expect(result.verdict).toBeDefined();
  });

  it('should handle old car (car_age = 20)', () => {
    const input = { ...baseInput, car_age: 20 };
    const result = predictCarPrice(input);

    expect(result.predicted_price).toBeGreaterThan(0);
    expect(result.verdict).toBeDefined();
  });

  it('should handle different fuel types', () => {
    const fuelTypes = ['가솔린', '디젤', 'LPG', '하이브리드'];

    for (const fuelType of fuelTypes) {
      const input = { ...baseInput, fuel_type: fuelType };
      const result = predictCarPrice(input);

      expect(result.predicted_price).toBeGreaterThan(0);
      expect(result.verdict).toBeDefined();
    }
  });

  it('should handle different option counts', () => {
    const optionCounts = [0, 5, 10, 15, 20];

    for (const count of optionCounts) {
      const input = { ...baseInput, option_count: count };
      const result = predictCarPrice(input);

      expect(result.predicted_price).toBeGreaterThan(0);
      expect(result.verdict).toBeDefined();
    }
  });

  it('should reflect brand premium in prediction', () => {
    const hyundaiResult = predictCarPrice({ ...baseInput, brand: '현대' });
    const genesisResult = predictCarPrice({ ...baseInput, brand: 'GENESIS' });

    // GENESIS should have higher predicted price than Hyundai for same specs
    expect(genesisResult.predicted_price).toBeGreaterThan(hyundaiResult.predicted_price);
  });

  it('should reflect fuel type premium in prediction', () => {
    const gasolineResult = predictCarPrice({ ...baseInput, fuel_type: '가솔린' });
    const hybridResult = predictCarPrice({ ...baseInput, fuel_type: '하이브리드' });

    // Hybrid should have higher predicted price than gasoline for same specs
    expect(hybridResult.predicted_price).toBeGreaterThan(gasolineResult.predicted_price);
  });

  it('should apply depreciation for older cars', () => {
    const newCarResult = predictCarPrice({ ...baseInput, car_age: 0 });
    const oldCarResult = predictCarPrice({ ...baseInput, car_age: 10 });

    // Older car should have lower predicted price
    expect(oldCarResult.predicted_price).toBeLessThan(newCarResult.predicted_price);
  });

  it('should apply depreciation for high mileage', () => {
    const lowMileageResult = predictCarPrice({ ...baseInput, mileage: 10000 });
    const highMileageResult = predictCarPrice({ ...baseInput, mileage: 200000 });

    // High mileage car should have lower predicted price
    expect(highMileageResult.predicted_price).toBeLessThan(lowMileageResult.predicted_price);
  });

  it('should apply bonus for options', () => {
    const noOptionsResult = predictCarPrice({ ...baseInput, option_count: 0, opt_sunroof: 0, opt_navigation: 0 });
    const withOptionsResult = predictCarPrice(baseInput);

    // Car with options should have higher predicted price
    expect(withOptionsResult.predicted_price).toBeGreaterThan(noOptionsResult.predicted_price);
  });

  it('should calculate percentage correctly', () => {
    const result = predictCarPrice(baseInput);
    const expectedPercent = (result.price_difference / result.input_price) * 100;

    expect(result.price_difference_percent).toBeCloseTo(expectedPercent, 1);
  });
});
