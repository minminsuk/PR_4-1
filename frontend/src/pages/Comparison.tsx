import { useLocation } from 'wouter';
import { useComparison, SavedCarPrediction } from '@/contexts/ComparisonContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

export default function Comparison() {
  const { savedPredictions, removePrediction, clearAll } = useComparison();
  const [, setLocation] = useLocation();

  if (savedPredictions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">📊 차량 비교 분석</h1>
            <p className="text-lg text-slate-600">저장된 예측 결과를 비교하고 분석합니다</p>
          </div>

          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">저장된 예측이 없습니다</h2>
              <p className="text-slate-600 mb-6">차량 정보를 입력하고 예측 결과를 저장하면 여기에 표시됩니다.</p>
              <Button 
                onClick={() => setLocation('/predict')}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                가격 예측하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 가격 비교 데이터
  const priceComparisonData = savedPredictions.map((pred, idx) => ({
    name: `${pred.brand} ${pred.model}`,
    입력가격: pred.inputPrice,
    예측가격: pred.predictedPrice,
  }));

  // 판별 결과 분포
  const verdictCounts = {
    정상: savedPredictions.filter(p => p.verdict === '정상').length,
    주의: savedPredictions.filter(p => p.verdict === '주의').length,
    위험: savedPredictions.filter(p => p.verdict === '위험').length,
  };

  const verdictData = [
    { name: '정상', value: verdictCounts.정상, fill: '#10b981' },
    { name: '주의', value: verdictCounts.주의, fill: '#f59e0b' },
    { name: '위험', value: verdictCounts.위험, fill: '#ef4444' },
  ].filter(d => d.value > 0);

  // 신뢰도 vs 가격 차이
  const confidenceData = savedPredictions.map((pred, idx) => ({
    name: `${pred.brand} ${pred.model}`,
    신뢰도: pred.confidenceScore,
    가격차이: Math.abs(pred.priceDifferencePercent),
  }));

  // 통계
  const stats = {
    총개수: savedPredictions.length,
    평균입력가격: Math.round(savedPredictions.reduce((sum, p) => sum + p.inputPrice, 0) / savedPredictions.length),
    평균예측가격: Math.round(savedPredictions.reduce((sum, p) => sum + p.predictedPrice, 0) / savedPredictions.length),
    평균신뢰도: Math.round(savedPredictions.reduce((sum, p) => sum + p.confidenceScore, 0) / savedPredictions.length),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">📊 차량 비교 분석</h1>
            <p className="text-lg text-slate-600">저장된 예측 결과를 비교하고 분석합니다</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setLocation('/predict')}
              variant="outline"
            >
              ➕ 새 예측 추가
            </Button>
            <Button 
              onClick={clearAll}
              variant="destructive"
            >
              🗑️ 모두 삭제
            </Button>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600 mb-1">총 저장된 차량</p>
              <p className="text-3xl font-bold text-blue-600">{stats.총개수}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600 mb-1">평균 입력 가격</p>
              <p className="text-3xl font-bold text-slate-900">{stats.평균입력가격.toLocaleString()}만원</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600 mb-1">평균 예측 가격</p>
              <p className="text-3xl font-bold text-green-600">{stats.평균예측가격.toLocaleString()}만원</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600 mb-1">평균 신뢰도</p>
              <p className="text-3xl font-bold text-purple-600">{stats.평균신뢰도}%</p>
            </CardContent>
          </Card>
        </div>

        {/* 차트 */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* 가격 비교 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>입력 가격 vs 예측 가격</CardTitle>
              <CardDescription>각 차량의 입력 가격과 예측 가격 비교</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priceComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toLocaleString()}만원`} />
                  <Legend />
                  <Bar dataKey="입력가격" fill="#3b82f6" />
                  <Bar dataKey="예측가격" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 판별 결과 분포 */}
          <Card>
            <CardHeader>
              <CardTitle>판별 결과 분포</CardTitle>
              <CardDescription>정상/주의/위험 비율</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {verdictData.map(item => (
                  <div key={item.name}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-slate-600">{item.value}개</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${(item.value / savedPredictions.length) * 100}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 신뢰도 vs 가격 차이 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>신뢰도 vs 가격 차이</CardTitle>
            <CardDescription>신뢰도와 가격 차이의 관계</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="신뢰도" name="신뢰도 (%)" />
                <YAxis dataKey="가격차이" name="가격 차이 (%)" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="차량" data={confidenceData} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 상세 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>저장된 예측 목록</CardTitle>
            <CardDescription>각 차량의 상세 정보</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">차량</th>
                    <th className="text-left py-3 px-4 font-semibold">연식</th>
                    <th className="text-right py-3 px-4 font-semibold">입력 가격</th>
                    <th className="text-right py-3 px-4 font-semibold">예측 가격</th>
                    <th className="text-right py-3 px-4 font-semibold">차이</th>
                    <th className="text-center py-3 px-4 font-semibold">판별</th>
                    <th className="text-center py-3 px-4 font-semibold">신뢰도</th>
                    <th className="text-center py-3 px-4 font-semibold">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {savedPredictions.map((pred) => (
                    <tr key={pred.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{pred.brand} {pred.model}</div>
                        <div className="text-xs text-slate-500">{pred.fuelType} · {pred.mileage.toLocaleString()}km</div>
                      </td>
                      <td className="py-3 px-4">{pred.carAge}년</td>
                      <td className="py-3 px-4 text-right font-medium">{pred.inputPrice.toLocaleString()}만원</td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">{pred.predictedPrice.toLocaleString()}만원</td>
                      <td className={`py-3 px-4 text-right font-medium ${pred.priceDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {pred.priceDifference > 0 ? '+' : ''}{pred.priceDifference.toLocaleString()}만원
                        <div className="text-xs">{pred.priceDifferencePercent > 0 ? '+' : ''}{pred.priceDifferencePercent.toFixed(1)}%</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          pred.verdict === '정상' ? 'bg-green-100 text-green-800' :
                          pred.verdict === '주의' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {pred.verdict}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{pred.confidenceScore}%</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => removePrediction(pred.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
