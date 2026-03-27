import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INFERENCE_SCRIPT_PATH = path.join(__dirname, "inference.py");
const PYTHON_CMD = process.env.PYTHON_CMD ?? "python";
const INFERENCE_TIMEOUT_MS = 60_000;

export interface PredictionInput {
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
}

export interface PredictionResult {
  predicted_price: number;
  input_price: number;
  price_difference: number;
  price_difference_percent: number;
  confidence_score: number;
  verdict: string;
  verdict_color: string;
}

type InferenceSuccess = PredictionResult;
type InferenceFailure = { error: string };

export async function predictCarPriceDnn(input: PredictionInput): Promise<PredictionResult> {
  const payload = JSON.stringify(input);

  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_CMD, [INFERENCE_SCRIPT_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("DNN 추론 타임아웃이 발생했습니다."));
    }, INFERENCE_TIMEOUT_MS);

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (error) => {
      clearTimeout(timeout);
      reject(new Error(`DNN 추론 프로세스 실행 실패: ${error.message}`));
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        reject(new Error(`DNN 추론 실패 (exit=${code}): ${stderr || stdout || "unknown error"}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim()) as InferenceSuccess | InferenceFailure;

        if ("error" in parsed) {
          reject(new Error(parsed.error));
          return;
        }

        resolve(parsed);
      } catch (error) {
        reject(
          new Error(
            `DNN 추론 결과 파싱 실패: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    });

    proc.stdin.write(payload);
    proc.stdin.end();
  });
}
