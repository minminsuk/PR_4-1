import { useState } from 'react';
import { useLocation } from 'wouter';
import { getApiErrorMessage, predictCar, type PredictionInput, type PredictionResult } from '@/lib/api';
import { useComparison } from '@/contexts/ComparisonContext';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BRANDS = ['현대', '기아', '제네시스', '쉐보레', '르노코리아', 'GM대우', 'KG모빌리티', '삼성', '쌍용', '대우'];
const FUEL_TYPES = ['가솔린', '디젤', '하이브리드', 'LPG'];

const OPTIONS = [
  { key: 'opt_sunroof', label: '썬루프' },
  { key: 'opt_navigation', label: '네비게이션' },
  { key: 'opt_smartkey', label: '스마트키' },
  { key: 'opt_ledheadlamp', label: 'LED/HID 헤드램프' },
  { key: 'opt_heatseat', label: '열선시트' },
  { key: 'opt_ventilationseat', label: '통풍시트' },
  { key: 'opt_rearsensor', label: '후방감지센서' },
  { key: 'opt_rearcamera', label: '후방카메라' },
  { key: 'opt_powermirror', label: '전동사이드미러' },
  { key: 'opt_aluminumwheel', label: '알루미늄휠' },
  { key: 'opt_leatherseat', label: '가죽시트' },
];

function countSelectedOptions(formData: PredictionInput): number {
  return OPTIONS.reduce((count, option) => {
    return count + ((formData[option.key as keyof PredictionInput] as number) === 1 ? 1 : 0);
  }, 0);
}

export default function PricePredictor() {
  const { addPrediction } = useComparison();
  const [, setLocation] = useLocation();
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [formData, setFormData] = useState<PredictionInput>({
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
    insu_count: 0,
    option_count: 5,
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
  });

  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const predictMutation = useMutation({
    mutationFn: predictCar,
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err) => {
      setError(getApiErrorMessage(err, '예측에 실패했습니다'));
      setResult(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    predictMutation.mutate(formData);
  };

  const handleOptionChange = (key: string, checked: boolean) => {
    setFormData(prev => {
      const next = {
        ...prev,
        [key]: checked ? 1 : 0,
      } as PredictionInput;

      next.option_count = countSelectedOptions(next);
      return next;
    });
  };

  const handleSavePrediction = () => {
    if (!result) return;
    
    addPrediction({
      brand: formData.brand,
      model: formData.model,
      carAge: formData.car_age,
      mileage: formData.mileage,
      fuelType: formData.fuel_type,
      specPower: formData.spec_power,
      specTorque: formData.spec_torque,
      specDisplacement: formData.spec_displacement,
      specEfficiency: formData.spec_efficiency,
      insuCount: formData.insu_count,
      optionCount: formData.option_count,
      inputPrice: result.input_price,
      predictedPrice: result.predicted_price,
      priceDifference: result.price_difference,
      priceDifferencePercent: result.price_difference_percent,
      confidenceScore: result.confidence_score,
      verdict: result.verdict,
      verdictColor: result.verdict_color,
    });
    
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const chartData = result ? [
    { name: '입력 가격', value: result.input_price, fill: '#3b82f6' },
    { name: '예측 가격', value: result.predicted_price, fill: '#10b981' },
  ] : [];

  const verdictConfig = {
    '정상': { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    '주의': { icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    '위험': { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  };

  const currentVerdictConfig = result ? verdictConfig[result.verdict as keyof typeof verdictConfig] : null;
  const VerdictIcon = currentVerdictConfig?.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">🚗 중고차 가격 판별 시스템</h1>
            <p className="text-lg text-slate-600">AI 모델을 활용한 정확한 중고차 가격 예측 및 허위매물 판별</p>
          </div>
          <Button 
            onClick={() => setLocation('/comparison')}
            variant="outline"
            className="whitespace-nowrap"
          >
            📊 비교하기
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 입력 폼 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>차량 정보 입력</CardTitle>
                <CardDescription>차량의 상세 정보를 입력해주세요</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 기본 정보 */}
                  <div>
                    <Label htmlFor="price" className="text-sm font-medium">
                      매물 가격 (만원)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="brand" className="text-sm font-medium">
                      브랜드
                    </Label>
                    <Select value={formData.brand} onValueChange={(value) => setFormData({ ...formData, brand: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANDS.map(brand => (
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="model" className="text-sm font-medium">
                      모델명
                    </Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="mt-1"
                      placeholder="예: 팰리세이드"
                    />
                  </div>

                  <div>
                    <Label htmlFor="car_age" className="text-sm font-medium">
                      연식: {formData.car_age}년
                    </Label>
                    <Slider
                      value={[formData.car_age]}
                      onValueChange={(value) => setFormData({ ...formData, car_age: value[0] })}
                      min={0}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="mileage" className="text-sm font-medium">
                      주행거리 (km)
                    </Label>
                    <Input
                      id="mileage"
                      type="number"
                      value={formData.mileage}
                      onChange={(e) => setFormData({ ...formData, mileage: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fuel_type" className="text-sm font-medium">
                      연료
                    </Label>
                    <Select value={formData.fuel_type} onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FUEL_TYPES.map(fuel => (
                          <SelectItem key={fuel} value={fuel}>{fuel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 제원 정보 */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-sm mb-3">제원 정보</h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">마력 (hp)</Label>
                        <Input
                          type="number"
                          value={formData.spec_power}
                          onChange={(e) => setFormData({ ...formData, spec_power: parseFloat(e.target.value) })}
                          className="mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">토크 (Nm)</Label>
                        <Input
                          type="number"
                          value={formData.spec_torque}
                          onChange={(e) => setFormData({ ...formData, spec_torque: parseFloat(e.target.value) })}
                          className="mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">배기량 (cc)</Label>
                        <Input
                          type="number"
                          value={formData.spec_displacement}
                          onChange={(e) => setFormData({ ...formData, spec_displacement: parseFloat(e.target.value) })}
                          className="mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">연비 (km/L)</Label>
                        <Input
                          type="number"
                          value={formData.spec_efficiency}
                          onChange={(e) => setFormData({ ...formData, spec_efficiency: parseFloat(e.target.value) })}
                          className="mt-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 보험이력 */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-sm mb-3">보험이력</h3>
                    
                    <div>
                      <Label className="text-xs">보험사고 횟수</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.insu_count}
                        onChange={(e) => setFormData({ ...formData, insu_count: parseInt(e.target.value) || 0 })}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>

                  {/* 옵션 */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold text-sm mb-3">옵션</h3>
                    <div className="space-y-2">
                      {OPTIONS.map(option => (
                        <div key={option.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={option.key}
                            checked={formData[option.key as keyof typeof formData] === 1}
                            onCheckedChange={(checked) => handleOptionChange(option.key, checked as boolean)}
                          />
                          <Label htmlFor={option.key} className="text-sm cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 제출 버튼 */}
                  <Button
                    type="submit"
                    disabled={predictMutation.isPending}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                  >
                    {predictMutation.isPending ? '분석 중...' : '가격 예측 분석'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* 결과 표시 */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {saveSuccess && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <p>예측 결과가 저장되었습니다. <button onClick={() => setLocation('/comparison')} className="underline font-semibold">비교하기</button></p>
                  </div>
                </CardContent>
              </Card>
            )}

            {result && (
              <>
                {/* 판별 결과 카드 */}
                <Card className={`border-2 ${currentVerdictConfig?.borderColor} ${currentVerdictConfig?.bgColor}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {VerdictIcon && <VerdictIcon className={`w-8 h-8 ${currentVerdictConfig?.color} flex-shrink-0 mt-1`} />}
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2">{result.verdict}</h3>
                        <p className="text-sm text-slate-600 mb-4">
                          {result.verdict === '정상' && '이 매물 가격은 모델예측가와 유사한 정상 범위입니다.'}
                          {result.verdict === '주의' && '이 매물 가격은 모델예측가와 다소 차이가 있습니다. 추가 확인을 권장합니다.'}
                          {result.verdict === '위험' && '이 매물 가격은 모델예측가와 크게 차이가 있습니다. 신중한 검토가 필요합니다.'}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">신뢰도:</span>
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                result.verdict_color === 'green' ? 'bg-green-500' :
                                result.verdict_color === 'yellow' ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${result.confidence_score}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">{result.confidence_score.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 저장 버튼 */}
                <div className="flex gap-3">
                  <Button 
                    onClick={handleSavePrediction}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    💾 이 예측 저장하기
                  </Button>
                  <Button 
                    onClick={() => setLocation('/comparison')}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    📊 저장된 예측 비교하기
                  </Button>
                </div>

                {/* 가격 비교 */}
                <Card>
                  <CardHeader>
                    <CardTitle>가격 분석</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-slate-600 mb-1">매물 가격</p>
                        <p className="text-2xl font-bold text-blue-600">{result.input_price.toLocaleString()}만원</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-slate-600 mb-1">예측 가격</p>
                        <p className="text-2xl font-bold text-green-600">{result.predicted_price.toLocaleString()}만원</p>
                      </div>
                      <div className={`p-4 rounded-lg ${result.price_difference > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className="text-sm text-slate-600 mb-1">가격 차이</p>
                        <div className="flex items-center gap-2">
                          {result.price_difference > 0 ? (
                            <TrendingUp className="w-5 h-5 text-red-600" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-green-600" />
                          )}
                          <p className={`text-2xl font-bold ${result.price_difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {Math.abs(result.price_difference).toLocaleString()}만원
                          </p>
                        </div>
                        <p className={`text-sm mt-1 ${result.price_difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {result.price_difference_percent > 0 ? '+' : ''}{result.price_difference_percent.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* 차트 */}
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value.toLocaleString()}만원`} />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 차량 제원 요약 */}
                <Card>
                  <CardHeader>
                    <CardTitle>차량 제원</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border-l-4 border-blue-500 pl-4">
                        <p className="text-sm text-slate-600">브랜드</p>
                        <p className="font-semibold">{formData.brand}</p>
                      </div>
                      <div className="border-l-4 border-blue-500 pl-4">
                        <p className="text-sm text-slate-600">모델</p>
                        <p className="font-semibold">{formData.model}</p>
                      </div>
                      <div className="border-l-4 border-green-500 pl-4">
                        <p className="text-sm text-slate-600">연식</p>
                        <p className="font-semibold">{formData.car_age}년</p>
                      </div>
                      <div className="border-l-4 border-green-500 pl-4">
                        <p className="text-sm text-slate-600">주행거리</p>
                        <p className="font-semibold">{formData.mileage.toLocaleString()} km</p>
                      </div>
                      <div className="border-l-4 border-purple-500 pl-4">
                        <p className="text-sm text-slate-600">배기량</p>
                        <p className="font-semibold">{formData.spec_displacement.toLocaleString()} cc</p>
                      </div>
                      <div className="border-l-4 border-purple-500 pl-4">
                        <p className="text-sm text-slate-600">마력</p>
                        <p className="font-semibold">{formData.spec_power} hp</p>
                      </div>
                      <div className="border-l-4 border-purple-500 pl-4">
                        <p className="text-sm text-slate-600">토크</p>
                        <p className="font-semibold">{formData.spec_torque} Nm</p>
                      </div>
                      <div className="border-l-4 border-orange-500 pl-4">
                        <p className="text-sm text-slate-600">보험사고</p>
                        <p className="font-semibold">{formData.insu_count}회</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
