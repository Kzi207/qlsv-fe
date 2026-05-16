import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ScoreBoxProps {
  label: string;
  value?: number;
  onChange?: (val?: number) => void;
  max?: number;
  unit?: string;
  className?: string;
  readOnly?: boolean;
  hasError?: boolean;
  errorText?: string;
  placeholder?: string;
}

const ScoreBox: React.FC<ScoreBoxProps> = ({
  label,
  value,
  onChange,
  max,
  unit,
  className = '',
  readOnly,
  hasError,
  errorText,
  placeholder = '',
}) => {
  const hasValue = value !== undefined && value !== null;

  return (
    <div
      className={`relative flex flex-col items-center rounded-xl md:rounded-2xl border bg-white p-1.5 md:p-3 transition-all ${
        hasError ? 'border-red-300 bg-red-50' : 'border-slate-200'
      } ${className}`}
    >
      <span className={`mb-0.5 text-[8px] md:text-[10px] font-bold uppercase tracking-wider ${hasError ? 'text-red-500' : 'text-slate-400'}`}>
        {label}
      </span>

      <div className="flex items-center gap-1">
        {readOnly ? (
          <span className={`text-lg md:text-2xl font-black ${hasValue ? 'text-slate-800' : 'text-slate-300'}`}>{hasValue ? value : '—'}</span>
        ) : (
          <input
            type="number"
            value={hasValue ? value : ''}
            min={0}
            max={max}
            placeholder={placeholder}
            onChange={(e) => onChange?.(e.target.value === '' ? undefined : Number(e.target.value))}
            className="w-10 md:w-12 bg-transparent text-center text-xl md:text-2xl font-black text-blue-600 transition-colors placeholder:text-slate-200 focus:outline-none"
          />
        )}
        {unit && <span className="mb-0.5 self-end text-[10px] md:text-xs font-bold text-slate-400">{unit}</span>}
      </div>

      {hasError && (
        <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-1 whitespace-nowrap text-[10px] font-bold text-red-400">
          <AlertCircle size={10} />
          {errorText}
        </div>
      )}
    </div>
  );
};

export default ScoreBox;
