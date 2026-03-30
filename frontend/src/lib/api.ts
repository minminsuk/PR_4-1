import type { User } from "@shared/types";
import axios from "axios";

export type PredictionInput = {
  price: number;
  car_age: number;
  mileage: number;
  fuel_type: string;
  brand: string;
  model: string;
  spec_power: number;
  spec_torque: number;
  spec_displacement: number;
  spec_efficiency: number;
  insu_count: number;
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
};

export type PredictionResult = {
  predicted_price: number;
  input_price: number;
  price_difference: number;
  price_difference_percent: number;
  confidence_score: number;
  verdict: string;
  verdict_color: string;
};

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export async function getCurrentUser() {
  const response = await api.get<User | null>("/auth/me");
  return response.data;
}

export async function logout() {
  const response = await api.post<{ success: true }>("/auth/logout");
  return response.data;
}

export async function predictCar(payload: PredictionInput) {
  const response = await api.post<PredictionResult>("/cars/predict", payload);
  return response.data;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "요청 처리 중 오류가 발생했습니다"
) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { error?: string } | undefined;
    if (responseData?.error) return responseData.error;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
