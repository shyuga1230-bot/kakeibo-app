'use client';
import { useState } from 'react';
import { Delete } from 'lucide-react';

interface CalculatorProps {
  onUseAmount?: (amount: number) => void;
  compact?: boolean;
}

export function Calculator({ onUseAmount, compact = false }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [justCalculated, setJustCalculated] = useState(false);

  const handleNumber = (num: string) => {
    if (justCalculated) {
      setDisplay(num);
      setExpression('');
      setJustCalculated(false);
      return;
    }
    if (display === '0' && num !== '.') {
      setDisplay(num);
    } else if (num === '.' && display.includes('.')) {
      return;
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    setJustCalculated(false);
    setExpression(display + ' ' + op);
    setDisplay('0');
  };

  const handleEqual = () => {
    if (!expression) return;
    try {
      const parts = expression.trim().split(' ');
      const left = parseFloat(parts[0]);
      const operator = parts[1];
      const right = parseFloat(display);
      let result = 0;
      switch (operator) {
        case '+': result = left + right; break;
        case '-': result = left - right; break;
        case '×': result = left * right; break;
        case '÷': result = right !== 0 ? left / right : 0; break;
      }
      const resultStr = Number.isInteger(result) ? result.toString() : result.toFixed(2);
      setDisplay(resultStr);
      setExpression('');
      setJustCalculated(true);
    } catch {
      setDisplay('エラー');
      setExpression('');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setJustCalculated(false);
  };

  const handleDelete = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const btnBase = compact
    ? 'h-12 rounded-xl font-medium text-base transition-all active:scale-95'
    : 'h-14 rounded-2xl font-medium text-lg transition-all active:scale-95';

  const numBtn = `${btnBase} bg-white text-gray-800 shadow-sm hover:bg-gray-50 border border-gray-100`;
  const opBtn = `${btnBase} bg-indigo-50 text-indigo-600 hover:bg-indigo-100`;
  const clearBtn = `${btnBase} bg-red-50 text-red-500 hover:bg-red-100`;
  const eqBtn = `${btnBase} bg-indigo-500 text-white hover:bg-indigo-600 shadow-md`;

  return (
    <div className={compact ? 'p-3' : 'p-4'}>
      {/* Display */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-4 text-right">
        <div className="text-xs text-gray-400 h-5 overflow-hidden">{expression || ' '}</div>
        <div className="text-3xl font-bold text-gray-900 truncate">{display}</div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button className={clearBtn} onClick={handleClear}>C</button>
        <button className={opBtn} onClick={handleDelete}><Delete size={18} className="mx-auto" /></button>
        <button className={opBtn} onClick={() => handleOperator('÷')}>÷</button>
        <button className={opBtn} onClick={() => handleOperator('×')}>×</button>

        {['7', '8', '9'].map((n) => (
          <button key={n} className={numBtn} onClick={() => handleNumber(n)}>{n}</button>
        ))}
        <button className={opBtn} onClick={() => handleOperator('-')}>−</button>

        {['4', '5', '6'].map((n) => (
          <button key={n} className={numBtn} onClick={() => handleNumber(n)}>{n}</button>
        ))}
        <button className={opBtn} onClick={() => handleOperator('+')}>+</button>

        {['1', '2', '3'].map((n) => (
          <button key={n} className={numBtn} onClick={() => handleNumber(n)}>{n}</button>
        ))}
        <button className={eqBtn} onClick={handleEqual} style={{ gridRow: 'span 2 / span 2' }}>=</button>

        <button className={`${numBtn} col-span-2`} onClick={() => handleNumber('0')}>0</button>
        <button className={numBtn} onClick={() => handleNumber('.')}>.</button>
      </div>

      {onUseAmount && (
        <button
          onClick={() => {
            const val = parseFloat(display);
            if (!isNaN(val) && val > 0) onUseAmount(val);
          }}
          className="w-full mt-3 py-3 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors"
        >
          この金額を使用する
        </button>
      )}
    </div>
  );
}
