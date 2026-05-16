import React from 'react';
import { FileSpreadsheet, Save, XCircle, Loader2 } from 'lucide-react';

interface BottomBarProps {
  grandTotal: number;
  adminGrandTotal: number;
  onSave: () => void;
  onExport?: () => void;
  onClose?: () => void;
  loading?: boolean;
  isAdminMode?: boolean;
}

const BottomBar: React.FC<BottomBarProps> = ({
  grandTotal,
  adminGrandTotal,
  onSave,
  onExport,
  onClose,
  loading,
  isAdminMode,
}) => {
  const percentage = (grandTotal / 100) * 100;
  const adminPercentage = (adminGrandTotal / 100) * 100;

  return (
    <div className="animate-in slide-in-from-bottom fixed bottom-4 lg:left-80 left-0 right-0 z-50 duration-500 px-4 md:px-8">
      <div className="bg-white/80 mx-auto flex max-w-2xl items-center justify-between gap-4 border border-white/20 p-2 md:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-2xl rounded-[1.5rem] md:rounded-[2rem] ring-1 ring-black/[0.05]">
        {/* Progress & Scores Section */}
        <div className="flex items-center gap-4 pl-2">
          {/* Progress Circle (Mini) */}
          <div className="relative h-10 w-10 flex items-center justify-center shrink-0">
             <svg className="h-full w-full -rotate-90 transform">
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                <circle 
                  cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" 
                  className="text-blue-600 transition-all duration-1000"
                  strokeDasharray={100}
                  strokeDashoffset={100 - (isAdminMode ? adminPercentage : percentage)}
                />
             </svg>
             <span className="absolute text-[9px] font-black text-slate-800">{isAdminMode ? adminGrandTotal : grandTotal}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">
              {isAdminMode ? 'Tổng điểm duyệt' : 'Tổng điểm tự chấm'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="tabular-nums text-xl font-black text-slate-900 leading-none">
                {isAdminMode ? adminGrandTotal : grandTotal}
              </span>
              <span className="text-[10px] font-bold text-slate-400">/ 100 điểm</span>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex items-center gap-2 pr-1">
          {onExport && (
            <button
              onClick={onExport}
              title="Xuất báo cáo Excel"
              className="hidden sm:flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95 shadow-sm"
            >
              <FileSpreadsheet size={16} className="text-emerald-500" />
              <span>Excel</span>
            </button>
          )}

          <button
            onClick={onSave}
            disabled={loading}
            className="group relative flex h-11 min-w-[140px] md:min-w-[180px] items-center justify-center gap-3 overflow-hidden rounded-2xl bg-blue-600 px-6 text-xs font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-blue-500/40 active:scale-[0.98] disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Save size={18} className="transition-transform group-hover:scale-110" />
                <span className="uppercase tracking-[0.1em]">{isAdminMode ? 'Xác nhận duyệt' : 'Nộp phiếu ngay'}</span>
              </>
            )}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500 active:scale-95"
            >
              <XCircle size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BottomBar;
