import React from 'react';
import { Check, HelpCircle, X } from 'lucide-react';
import FileUpload from './FileUpload';
import ScoreBox from './ScoreBox';

interface CriteriaRowProps {
  criterion: any;
  studentScore?: number;
  adminScore?: number;
  evidence: any[];
  isAdminMode?: boolean;
  onStudentScoreChange?: (val?: number) => void;
  onAdminScoreChange?: (val?: number) => void;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onViewEvidence?: (path: string) => void;
}

const CriteriaRow: React.FC<CriteriaRowProps> = ({
  criterion,
  studentScore,
  adminScore,
  evidence,
  isAdminMode,
  onStudentScoreChange,
  onAdminScoreChange,
  onUpload,
  onViewEvidence,
}) => {
  const canShowGuide = Boolean(criterion.guide);

  return (
    <div className="border-b border-slate-50 last:border-0 bg-white transition-all duration-300">
      {/* Mobile Component */}
      <div className="lg:hidden p-4 space-y-3">
        <div className="flex gap-2.5">
          <div className="h-5 w-5 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
             <span className="text-[9px] font-black text-blue-600">{criterion.id.replace('crit-', '')}</span>
          </div>
          <div className="space-y-0.5 flex-1">
             <h4 className="text-[13px] font-black text-slate-800 leading-tight tracking-tight">{criterion.content}</h4>
             {canShowGuide && <p className="text-[10px] font-bold text-slate-400 italic line-clamp-1">{criterion.guide}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
           <div className="flex-1">
              <FileUpload
                files={evidence}
                onUpload={onUpload!}
                onView={onViewEvidence!}
                disabled={isAdminMode}
                className="!p-0 !border-none !bg-transparent scale-90 origin-left"
              />
           </div>
           
           <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-sm border border-slate-100">
              <ScoreBox
                label="Tự"
                value={studentScore}
                onChange={onStudentScoreChange}
                max={criterion.maxPoints}
                unit=""
                readOnly={isAdminMode}
                className="!w-9 !p-0 border-none shadow-none text-center text-xs"
              />
              <div className="w-px h-5 bg-slate-100" />
              <ScoreBox
                label="Lớp"
                value={adminScore}
                onChange={onAdminScoreChange}
                max={criterion.maxPoints}
                unit=""
                readOnly={!isAdminMode}
                className={`!w-9 !p-0 border-none shadow-none text-center text-xs ${isAdminMode ? 'text-blue-600' : ''}`}
              />
           </div>
        </div>

        {isAdminMode && (
          <div className="flex gap-1.5 pt-0.5">
             <button
               onClick={() => onAdminScoreChange?.(studentScore ?? 0)}
               className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${
                 adminScore === studentScore ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'
               }`}
             >
               <Check size={12} /> DUYỆT
             </button>
             <button
               onClick={() => onAdminScoreChange?.(0)}
               className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${
                 adminScore === 0 ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'
               }`}
             >
               <X size={12} /> KHÔNG
             </button>
          </div>
        )}
      </div>

      {/* Desktop Component */}
      <div className="hidden lg:grid lg:grid-cols-[48px_1fr_320px] items-start gap-6 p-4 hover:bg-slate-50/50 transition-colors group/row">
        {/* ID Column */}
        <div className="h-8 w-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-1">
           <span className="text-[11px] font-black text-blue-600">{criterion.id.replace('crit-', '')}</span>
        </div>

        {/* Content Column */}
        <div className="space-y-3 min-w-0">
          <div className="space-y-1.5">
            <h4 className="text-[14px] font-bold text-slate-800 tracking-tight leading-snug">{criterion.content}</h4>
            {canShowGuide && (
              <div className="flex items-start gap-2 text-[10px] font-medium text-slate-400">
                <HelpCircle size={12} className="shrink-0 mt-0.5 text-blue-400/60" />
                <p className="italic leading-relaxed">{criterion.guide}</p>
              </div>
            )}
          </div>

          <FileUpload
            files={evidence}
            onUpload={onUpload!}
            onView={onViewEvidence!}
            disabled={isAdminMode}
            className="!mt-2"
          />
        </div>

        {/* Score & Actions Column */}
        <div className="flex items-start justify-end gap-3 pt-0.5">
           <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200/60 shadow-sm">
              <ScoreBox
                label="Tự chấm"
                value={studentScore}
                onChange={onStudentScoreChange}
                max={criterion.maxPoints}
                unit="đ"
                readOnly={isAdminMode}
                className="bg-white !p-2 !rounded-xl border-none shadow-none text-xs"
              />
              <div className="h-10 w-px bg-slate-200/60" />
              <ScoreBox
                label="Lớp"
                value={adminScore}
                onChange={onAdminScoreChange}
                max={criterion.maxPoints}
                unit="đ"
                readOnly={!isAdminMode}
                className={`bg-white !p-2 !rounded-xl border-none shadow-none text-xs ${isAdminMode ? 'ring-1 ring-blue-500/10' : ''}`}
              />
           </div>

           {isAdminMode && (
             <div className="flex flex-col gap-1 w-10">
                <button
                  onClick={() => onAdminScoreChange?.(studentScore ?? 0)}
                  title="Duyệt điểm sinh viên"
                  className={`p-2 rounded-xl transition-all shadow-sm flex items-center justify-center ${
                    adminScore === studentScore ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-emerald-500 border border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  <Check size={16} strokeWidth={3} />
                </button>
                <button
                  onClick={() => onAdminScoreChange?.(0)}
                  title="Không chấp nhận"
                  className={`p-2 rounded-xl transition-all shadow-sm flex items-center justify-center ${
                    adminScore === 0 ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-white text-rose-500 border border-slate-200 hover:bg-rose-50'
                  }`}
                >
                  <X size={16} strokeWidth={3} />
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default CriteriaRow;
