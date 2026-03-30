import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { ArrowRight, BarChart3, Shield, Zap } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* 네비게이션 */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-blue-500">🚗</div>
            <h1 className="text-xl font-bold text-white">허위매물 감별사</h1>
          </div>

        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
              AI로 중고차 가격을 <span className="text-blue-500">정확하게</span><br />판별하세요
            </h2>
            <p className="text-xl text-slate-400 mb-8">
              딥러닝 기반의 가격 예측 모델로 중고차 매물의 적정 가격을 분석하고, 허위매물을 쉽게 판별할 수 있습니다.
            </p>
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={() => setLocation("/predict")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                지금 시작하기
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                자세히 알아보기
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-xl opacity-20"></div>
  
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h3 className="text-3xl font-bold text-white mb-12 text-center">주요 기능</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle className="text-white">정확한 가격 예측</CardTitle>
              <CardDescription>PyTorch 기반 딥러닝 모델로 중고차 적정 가격을 정확하게 예측합니다</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-green-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <CardTitle className="text-white">허위매물 판별</CardTitle>
              <CardDescription>예측 가격과 입력 가격을 비교하여 허위매물을 즉시 판별합니다</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-purple-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
              <CardTitle className="text-white">실시간 분석</CardTitle>
              <CardDescription>차량 정보를 입력하면 1초 이내에 결과를 확인할 수 있습니다</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-12 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">지금 바로 시작하세요</h3>
          <p className="text-lg text-blue-100 mb-8">
            중고차 구매 시 정확한 가격 정보로 현명한 결정을 내리세요
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/predict")}
            className="bg-white text-blue-600 hover:bg-slate-100 font-semibold"
          >
            가격 예측 시작하기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-slate-400">
          <p>&copy; 2026 Car Fraud Detector. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
