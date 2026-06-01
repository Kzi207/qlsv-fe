import React from 'react';
import { Check, HelpCircle, X, Eye } from 'lucide-react';
import FileUpload from './FileUpload';
import ScoreBox from './ScoreBox';

interface CriteriaRowProps {
  criterion: any;
  studentScore?: number;
  studentInputMax?: number;
  studentPlaceholder?: string;
  adminScore?: number;
  evidence: any[];
  customEvidence?: any[];
  onAddCustomEvidence?: () => void;
  activities?: Array<{ activityName: string; points: number; checkedInAt: string }>;
  isAdminMode?: boolean;
  onStudentScoreChange?: (val?: number) => void;
  onAdminScoreChange?: (val?: number) => void;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onViewEvidence?: (path: string) => void;
}

const CriteriaRow: React.FC<CriteriaRowProps> = ({
  criterion,
  studentScore,
  studentInputMax,
  studentPlaceholder,
  adminScore,
  evidence,
  customEvidence = [],
  activities = [],
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
          <div className="space-y-1.5 flex-1 min-w-0">
             <h4 className="text-[13px] font-black text-slate-800 leading-tight tracking-tight">{criterion.content}</h4>
             {canShowGuide && (
               <div className="flex items-start gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] font-medium leading-relaxed text-slate-500">
                 <HelpCircle size={11} className="mt-0.5 shrink-0 text-blue-400/70" />
                 <p className="whitespace-pre-line break-words italic">{criterion.guide}</p>
               </div>
             )}
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
                max={studentInputMax ?? criterion.maxPoints}
                placeholder={studentPlaceholder}
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


        {activities.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Hoat dong da cong diem</p>
            {activities.map((activity, idx) => (
              <p key={`${activity.checkedInAt}-${idx}`} className="text-[10px] font-semibold text-emerald-800">
                +{activity.points}d - {activity.activityName}
              </p>
            ))}
          </div>
        )}

        {customEvidence && customEvidence.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Minh chứng hoạt động đã nộp</p>
            <div className="space-y-1.5">
              {customEvidence.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                        item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        item.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {item.status === 'APPROVED' ? 'Đã duyệt' : item.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                      </span>
                      <span className="text-[10px] font-black text-slate-700">+{item.points}đ</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800 truncate">{item.activityName}</p>
                  </div>
                  {item.files && item.files.length > 0 && (
                    <button
                      onClick={() => onViewEvidence?.(item.files[0].path)}
                      className="p-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-500 hover:text-blue-600 transition-all shrink-0"
                    >
                      <Eye size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}



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

          {activities.length > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Hoat dong da cong diem</p>
              <div className="mt-1 space-y-1">
                {activities.map((activity, idx) => (
                  <p key={`${activity.checkedInAt}-${idx}`} className="text-[11px] font-semibold text-emerald-800">
                    +{activity.points}d - {activity.activityName}
                  </p>
                ))}
              </div>
            </div>
          )}

          {customEvidence && customEvidence.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Minh chứng hoạt động đã nộp</p>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                {customEvidence.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                          item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          item.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {item.status === 'APPROVED' ? 'Đã duyệt' : item.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                        </span>
                        <span className="text-[10px] font-black text-slate-700">+{item.points}đ</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-800 truncate" title={item.activityName}>{item.activityName}</p>
                    </div>
                    {item.files && item.files.length > 0 && (
                      <button
                        onClick={() => onViewEvidence?.(item.files[0].path)}
                        className="p-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-500 hover:text-blue-600 transition-all shrink-0"
                      >
                        <Eye size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>

        {/* Score & Actions Column */}
        <div className="flex items-start justify-end gap-3 pt-0.5">
           <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200/60 shadow-sm">
              <ScoreBox
                label="Tự chấm"
                value={studentScore}
                onChange={onStudentScoreChange}
                max={studentInputMax ?? criterion.maxPoints}
                placeholder={studentPlaceholder}
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
