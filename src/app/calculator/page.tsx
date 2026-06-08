'use client';
import { Calculator } from '@/components/calculator/Calculator';

export default function CalculatorPage() {
  return (
    <div className="max-w-sm mx-auto px-4 pt-5 pb-4">
      <h1 className="text-xl font-bold text-gray-900 mb-5">電卓</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <Calculator />
      </div>
    </div>
  );
}
