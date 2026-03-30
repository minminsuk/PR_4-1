import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SavedCarPrediction {
  id: string;
  brand: string;
  model: string;
  carAge: number;
  mileage: number;
  fuelType: string;
  specPower: number;
  specTorque: number;
  specDisplacement: number;
  specEfficiency: number;
  insuCount: number;
  optionCount: number;
  inputPrice: number;
  predictedPrice: number;
  priceDifference: number;
  priceDifferencePercent: number;
  confidenceScore: number;
  verdict: string;
  verdictColor: string;
  savedAt: number;
}

interface ComparisonContextType {
  savedPredictions: SavedCarPrediction[];
  addPrediction: (prediction: Omit<SavedCarPrediction, 'id' | 'savedAt'>) => void;
  removePrediction: (id: string) => void;
  clearAll: () => void;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const STORAGE_KEY = 'car_fraud_detector_predictions';

export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const [savedPredictions, setSavedPredictions] = useState<SavedCarPrediction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedPredictions(parsed);
      }
    } catch (error) {
      console.error('Failed to load predictions from localStorage:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever predictions change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPredictions));
      } catch (error) {
        console.error('Failed to save predictions to localStorage:', error);
      }
    }
  }, [savedPredictions, isLoaded]);

  const addPrediction = (prediction: Omit<SavedCarPrediction, 'id' | 'savedAt'>) => {
    const newPrediction: SavedCarPrediction = {
      ...prediction,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      savedAt: Date.now(),
    };
    setSavedPredictions(prev => [newPrediction, ...prev]);
  };

  const removePrediction = (id: string) => {
    setSavedPredictions(prev => prev.filter(p => p.id !== id));
  };

  const clearAll = () => {
    setSavedPredictions([]);
  };

  return (
    <ComparisonContext.Provider value={{ savedPredictions, addPrediction, removePrediction, clearAll }}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within ComparisonProvider');
  }
  return context;
}
