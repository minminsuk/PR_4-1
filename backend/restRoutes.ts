import { COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { predictCarPrice } from "./model_predictor";

const predictInputSchema = z.object({
  price: z.number().positive("가격은 양수여야 합니다"),
  car_age: z.number().int().min(0).max(50),
  mileage: z.number().min(0),
  fuel_type: z.string(),
  brand: z.string(),
  model: z.string(),
  spec_power: z.number().min(0),
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

export function registerRestRoutes(app: Express) {
  const router = Router();

  router.get("/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json(user);
      return;
    } catch {
      // Unauthenticated requests return null.
      res.json(null);
      return;
    }
  });

  router.post("/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true } as const);
  });

  router.post("/cars/predict", (req: Request, res: Response) => {
    const parsedInput = predictInputSchema.safeParse(req.body);

    if (!parsedInput.success) {
      res.status(400).json({
        error: "요청 값이 올바르지 않습니다.",
        details: parsedInput.error.flatten(),
      });
      return;
    }

    try {
      const result = predictCarPrice(parsedInput.data);
      res.json(result);
    } catch (error) {
      console.error("예측 오류:", error);
      res.status(500).json({
        error: "가격 예측에 실패했습니다. 다시 시도해주세요.",
      });
    }
  });

  app.use("/api", router);
}
