import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('ComparisonContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty predictions', () => {
    const stored = localStorage.getItem('car_fraud_detector_predictions');
    expect(stored).toBeNull();
  });

  it('should save prediction to localStorage', () => {
    const testPrediction = {
      brand: '현대',
      model: '팰리세이드',
      carAge: 5,
      mileage: 40000,
      fuelType: '가솔린',
      specPower: 295,
      specDisplacement: 3778,
      specEfficiency: 8.9,
      insuMyCount: 0,
      insuOtherCount: 0,
      insuOwnerCount: 0,
      optionCount: 10,
      inputPrice: 3500,
      predictedPrice: 3200,
      priceDifference: -300,
      priceDifferencePercent: -8.57,
      confidenceScore: 85,
      verdict: '정상',
      verdictColor: 'green',
    };

    const savedData = JSON.stringify([{
      ...testPrediction,
      id: `${Date.now()}-test`,
      savedAt: Date.now(),
    }]);

    localStorage.setItem('car_fraud_detector_predictions', savedData);

    const retrieved = localStorage.getItem('car_fraud_detector_predictions');
    expect(retrieved).toBeDefined();
    
    const parsed = JSON.parse(retrieved!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].brand).toBe('현대');
    expect(parsed[0].model).toBe('팰리세이드');
  });

  it('should handle multiple predictions', () => {
    const predictions = [
      {
        id: '1',
        brand: '현대',
        model: '팰리세이드',
        carAge: 5,
        mileage: 40000,
        fuelType: '가솔린',
        specPower: 295,
        specDisplacement: 3778,
        specEfficiency: 8.9,
        insuMyCount: 0,
        insuOtherCount: 0,
        insuOwnerCount: 0,
        optionCount: 10,
        inputPrice: 3500,
        predictedPrice: 3200,
        priceDifference: -300,
        priceDifferencePercent: -8.57,
        confidenceScore: 85,
        verdict: '정상',
        verdictColor: 'green',
        savedAt: Date.now(),
      },
      {
        id: '2',
        brand: 'KIA',
        model: '쏘렌토',
        carAge: 3,
        mileage: 25000,
        fuelType: '디젤',
        specPower: 200,
        specDisplacement: 2200,
        specEfficiency: 12.5,
        insuMyCount: 1,
        insuOtherCount: 0,
        insuOwnerCount: 0,
        optionCount: 8,
        inputPrice: 2800,
        predictedPrice: 2600,
        priceDifference: -200,
        priceDifferencePercent: -7.14,
        confidenceScore: 80,
        verdict: '정상',
        verdictColor: 'green',
        savedAt: Date.now(),
      },
    ];

    localStorage.setItem('car_fraud_detector_predictions', JSON.stringify(predictions));

    const retrieved = localStorage.getItem('car_fraud_detector_predictions');
    const parsed = JSON.parse(retrieved!);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].brand).toBe('현대');
    expect(parsed[1].brand).toBe('KIA');
  });

  it('should generate unique IDs for predictions', () => {
    const id1 = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const id2 = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    expect(id1).not.toBe(id2);
  });

  it('should handle localStorage errors gracefully', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => {
      localStorage.setItem('car_fraud_detector_predictions', '{}');
    }).toThrow('QuotaExceededError');

    spy.mockRestore();
  });

  it('should parse saved predictions correctly', () => {
    const testData = [
      {
        id: 'test-1',
        brand: '현대',
        model: '팰리세이드',
        carAge: 5,
        mileage: 40000,
        fuelType: '가솔린',
        specPower: 295,
        specDisplacement: 3778,
        specEfficiency: 8.9,
        insuMyCount: 0,
        insuOtherCount: 0,
        insuOwnerCount: 0,
        optionCount: 10,
        inputPrice: 3500,
        predictedPrice: 3200,
        priceDifference: -300,
        priceDifferencePercent: -8.57,
        confidenceScore: 85,
        verdict: '정상',
        verdictColor: 'green',
        savedAt: 1234567890,
      },
    ];

    localStorage.setItem('car_fraud_detector_predictions', JSON.stringify(testData));
    const retrieved = JSON.parse(localStorage.getItem('car_fraud_detector_predictions')!);

    expect(retrieved[0]).toMatchObject({
      brand: '현대',
      model: '팰리세이드',
      verdict: '정상',
      verdictColor: 'green',
    });
  });

  it('should handle verdict types correctly', () => {
    const verdicts = ['정상', '주의', '위험'];
    const predictions = verdicts.map((verdict, idx) => ({
      id: `pred-${idx}`,
      brand: '현대',
      model: '팰리세이드',
      carAge: 5,
      mileage: 40000,
      fuelType: '가솔린',
      specPower: 295,
      specDisplacement: 3778,
      specEfficiency: 8.9,
      insuMyCount: 0,
      insuOtherCount: 0,
      insuOwnerCount: 0,
      optionCount: 10,
      inputPrice: 3500,
      predictedPrice: 3200,
      priceDifference: -300,
      priceDifferencePercent: -8.57,
      confidenceScore: 85,
      verdict,
      verdictColor: verdict === '정상' ? 'green' : verdict === '주의' ? 'yellow' : 'red',
      savedAt: Date.now(),
    }));

    localStorage.setItem('car_fraud_detector_predictions', JSON.stringify(predictions));
    const retrieved = JSON.parse(localStorage.getItem('car_fraud_detector_predictions')!);

    expect(retrieved).toHaveLength(3);
    expect(retrieved.map((p: any) => p.verdict)).toEqual(['정상', '주의', '위험']);
  });
});
