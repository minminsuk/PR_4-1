import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { predictCarPriceDnn } from "./dnn_predictor";

// 가격 예측 입력 스키마
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
  insu_count: z.number().int().min(0),
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

// 모델 기반 가격 예측 함수
function predictPrice(inputData: z.infer<typeof predictInputSchema>) {
  return predictCarPriceDnn({
    price: inputData.price,
    car_age: inputData.car_age,
    mileage: inputData.mileage,
    fuel_type: inputData.fuel_type,
    brand: inputData.brand,
    model: inputData.model,
    spec_power: inputData.spec_power,
    spec_torque: inputData.spec_torque,
    spec_displacement: inputData.spec_displacement,
    spec_efficiency: inputData.spec_efficiency,
    insu_count: inputData.insu_count,
    option_count: inputData.option_count,
    opt_sunroof: inputData.opt_sunroof,
    opt_navigation: inputData.opt_navigation,
    opt_smartkey: inputData.opt_smartkey,
    opt_ledheadlamp: inputData.opt_ledheadlamp,
    opt_heatseat: inputData.opt_heatseat,
    opt_ventilationseat: inputData.opt_ventilationseat,
    opt_rearsensor: inputData.opt_rearsensor,
    opt_rearcamera: inputData.opt_rearcamera,
    opt_powermirror: inputData.opt_powermirror,
    opt_aluminumwheel: inputData.opt_aluminumwheel,
    opt_leatherseat: inputData.opt_leatherseat,
  });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 차량 가격 예측 라우터
  car: router({
    predict: publicProcedure
      .input(predictInputSchema)
      .mutation(async ({ input }) => {
        try {
          const result = await predictPrice(input);
          return result;
        } catch (error) {
          console.error('예측 오류:', error);
          throw new Error('가격 예측에 실패했습니다. 다시 시도해주세요.');
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
