import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Eye,
  Loader2,
  MessageSquareText,
  ShieldCheck,
  ShieldX,
  UserRound,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { EVALUATION_DATA } from '../constants/evaluationData';
import {
  getEvidenceUrl,
  type EvidenceFile,
  normalizeEvidenceList,
} from '../utils/evidence';
import { normalizeTrainingActivities } from '../utils/trainingActivities';
import PreviewModal from '../components/drl/PreviewModal';

type PopupState = {
  files: EvidenceFile[];
  activeIndex: number;
} | null;

const STATUS_META: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Cho duyet',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  APPROVED: {
    label: 'Da duyet',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  REJECTED: {
    label: 'Khong duyet',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
};

const TrainingScoreDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [adminScores, setAdminScores] = useState<Record<string, number>>({});
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewEvidence, setReviewEvidence] = useState<{ criterionId: string; item: any } | null>(null);
  const [reviewPoints, setReviewPoints] = useState(0);
  const [reviewTargetCrit, setReviewTargetCrit] = useState('');
  const [evidencePopup, setEvidencePopup] = useState<PopupState>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/training/${id}`);
        const payload = res.data;
        setData(payload);
        setAdminNotes(payload.admin_notes || '');

        const nextAdminScores: Record<string, number> = {};
        EVALUATION_DATA.forEach((section) => {
          section.criteria.forEach((criterion) => {
            const studentValue = Number(payload.details?.[criterion.id]?.score || 0);
            const adminValue = payload.admin_details?.[criterion.id];
            nextAdminScores[criterion.id] = adminValue !== undefined ? Number(adminValue) : studentValue;
          });
        });
        setAdminScores(nextAdminScores);
      } catch (error) {
        toast.error('Khong the tai thong tin phieu diem');
        navigate('/drl');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, navigate]);

  const calculateSectionTotal = (section: (typeof EVALUATION_DATA)[number], scoreSet: Record<string, number>) => {
    let total = 0;
    section.criteria.forEach((criterion) => {
      total += Number(scoreSet[criterion.id] || 0);
    });
    return Math.min(total, section.maxPoints);
  };

  const studentTotal = EVALUATION_DATA.reduce((sum, section) => {
    return sum + calculateSectionTotal(section, Object.fromEntries(
      section.criteria.map((criterion) => [criterion.id, Number(data?.details?.[criterion.id]?.score || 0)]),
    ));
  }, 0);

  const adminTotal = EVALUATION_DATA.reduce((sum, section) => sum + calculateSectionTotal(section, adminScores), 0);

  const buildPayload = (status: 'APPROVED' | 'REJECTED') => ({
    status,
    admin_details: adminScores,
    admin_total: adminTotal,
    admin_y_thuc: calculateSectionTotal(EVALUATION_DATA[0], adminScores),
    admin_hoat_dong: calculateSectionTotal(EVALUATION_DATA[1], adminScores) + calculateSectionTotal(EVALUATION_DATA[2], adminScores),
    admin_ky_luat: calculateSectionTotal(EVALUATION_DATA[3], adminScores) + calculateSectionTotal(EVALUATION_DATA[4], adminScores),
    admin_notes: adminNotes,
    details: data?.details,
    criteria_meta: EVALUATION_DATA.flatMap((section) =>
      section.criteria.map((criterion) => ({
        id: criterion.id,
        content: criterion.content,
        sectionTitle: section.title,
        maxPoints: criterion.maxPoints,
      })),
    ),
  });

  const handleSave = async (status: 'APPROVED' | 'REJECTED') => {
    setSavingStatus(status);
    try {
      await api.patch(`/training/${id}/approve`, buildPayload(status));
      setData((prev: any) => ({
        ...prev,
        status,
        admin_notes: adminNotes,
        admin_details: adminScores,
        admin_total: adminTotal,
      }));
      toast.success(status === 'APPROVED' ? 'Da duyet phieu thanh cong' : 'Da cap nhat ket qua cham');
      navigate('/drl');
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || 'Khong the luu ket qua duyet';
      const detail = error?.response?.data?.error;
      toast.error(detail ? `${errMsg}: ${detail}` : errMsg);
    } finally {
      setSavingStatus(null);
    }
  };

  const handleReviewDecision = (decision: 'APPROVED' | 'REJECTED') => {
    if (!reviewEvidence || !data) return;
    const { criterionId: originalCritId, item } = reviewEvidence;

    // Deep clone details to trigger React state updates accurately
    const updatedDetails = JSON.parse(JSON.stringify(data.details || {}));

    const origCustomList = updatedDetails[originalCritId]?.customEvidence || [];
    const itemIndex = origCustomList.findIndex((x: any) => x.id === item.id);

    if (itemIndex === -1) {
      toast.error('Không tìm thấy thông tin minh chứng cần duyệt');
      return;
    }

    if (decision === 'APPROVED') {
      // Mark original customEvidence as approved
      origCustomList[itemIndex].status = 'APPROVED';
      origCustomList[itemIndex].points = reviewPoints;
      origCustomList[itemIndex].targetCriterionId = reviewTargetCrit;

      // Add files and activities to target criterion
      if (!updatedDetails[reviewTargetCrit]) {
        updatedDetails[reviewTargetCrit] = { score: 0, files: [], activities: [], customEvidence: [] };
      }
      if (!updatedDetails[reviewTargetCrit].files) {
        updatedDetails[reviewTargetCrit].files = [];
      }
      updatedDetails[reviewTargetCrit].files = [
        ...updatedDetails[reviewTargetCrit].files,
        ...(item.files || [])
      ];

      if (!updatedDetails[reviewTargetCrit].activities) {
        updatedDetails[reviewTargetCrit].activities = [];
      }
      updatedDetails[reviewTargetCrit].activities.push({
        source: 'CUSTOM_EVIDENCE',
        activityName: item.activityName,
        points: reviewPoints,
        checkedInAt: new Date().toISOString()
      });

      // Update score state
      setAdminScores((prev) => ({
        ...prev,
        [reviewTargetCrit]: reviewPoints
      }));
    } else {
      origCustomList[itemIndex].status = 'REJECTED';
    }

    // Update details in page data state
    setData((prev: any) => ({
      ...prev,
      details: updatedDetails
    }));

    toast.success(decision === 'APPROVED' ? 'Đã duyệt minh chứng và cộng điểm!' : 'Đã từ chối minh chứng');
    setReviewEvidence(null);
  };

  const openEvidencePopup = (files: EvidenceFile[]) => {
    if (!files.length) return;
    setEvidencePopup({ files, activeIndex: 0 });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
          <p>Dang tai phieu diem...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const status = STATUS_META[data.status] || STATUS_META.PENDING;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <button
            onClick={() => navigate('/drl')}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft size={16} />
            Quay lai danh sach
          </button>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-600">Chi tiet phieu DRL</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Phieu diem ren luyen dang bang</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              So sanh diem sinh vien da nop va diem lop cham tren tung muc, xem minh chung trong popup va duyet tung dong ngay tren bang.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 rounded-[1.5rem] bg-slate-50 p-4">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{data.student?.name}</p>
            <p>MSSV: {data.student?.student_code}</p>
            <p>Lop: {data.student?.class_id}</p>
            <p>Hoc ky: {typeof data.semester === 'object' ? data.semester?.name : data.semester}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
              <UserRound size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Sinh vien</p>
              <p className="text-lg font-black text-slate-900">{data.student?.name}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Tong SV tu cham</p>
          <p className="mt-2 text-4xl font-black text-slate-900">{studentTotal}</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-sky-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-500">Tong lop cham</p>
          <p className="mt-2 text-4xl font-black text-sky-700">{adminTotal}</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Ngay nop</p>
          <p className="mt-2 text-lg font-black text-slate-900">
            {data.createdAt ? new Date(data.createdAt).toLocaleDateString('vi-VN') : '--'}
          </p>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {EVALUATION_DATA.map((section) => {
          const sectionStudentTotal = calculateSectionTotal(
            section,
            Object.fromEntries(section.criteria.map((criterion) => [criterion.id, Number(data.details?.[criterion.id]?.score || 0)])),
          );
          const sectionAdminTotal = calculateSectionTotal(section, adminScores);

          return (
            <section key={section.id} className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-50 bg-slate-50/50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Mục {section.id.replace('sec-', '')}</p>
                  <h2 className="text-sm md:text-lg font-black text-slate-900">{section.title}</h2>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <span className="rounded-full bg-white px-3 py-1 border border-slate-100 text-slate-500">SV: {sectionStudentTotal}đ</span>
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-white shadow-sm">Lớp: {sectionAdminTotal}đ</span>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <th className="px-6 py-4">Mục</th>
                      <th className="min-w-[400px] px-6 py-4">Nội dung</th>
                      <th className="px-6 py-4">Minh chứng</th>
                      <th className="px-6 py-4 text-center">SV</th>
                      <th className="px-6 py-4 text-center w-32">Lớp</th>
                      <th className="px-6 py-4 text-center">Duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {section.criteria.map((criterion) => {
                      const studentScore = Number(data.details?.[criterion.id]?.score || 0);
                      const files = normalizeEvidenceList(data.details?.[criterion.id]?.files || []);
                      const activities = normalizeTrainingActivities(data.details?.[criterion.id]?.activities || []);
                      const currentAdminScore = Number(adminScores[criterion.id] || 0);
                      const customEvidenceList = data.details?.[criterion.id]?.customEvidence || [];

                      return (
                        <tr key={criterion.id} className="align-top hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-5">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                              {criterion.id.replace('crit-', '')}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm font-bold text-slate-800 leading-snug">{criterion.content}</p>
                            {criterion.guide && (
                              <div className="mt-2 text-[11px] leading-relaxed text-slate-600 bg-slate-50 border-l-2 border-slate-300 p-2 rounded-r-lg whitespace-pre-line font-medium">
                                <span className="font-bold text-slate-700 block mb-0.5">💡 Hướng dẫn chấm:</span>
                                {criterion.guide}
                              </div>
                            )}
                            {activities.length > 0 && (
                              <div className="mt-2 space-y-1 rounded-xl border border-emerald-100 bg-emerald-50/60 px-2 py-1.5">
                                {activities.map((activity, activityIndex) => (
                                  <p
                                    key={`${activity.checkedInAt}-${activityIndex}`}
                                    className="text-[10px] font-bold text-emerald-700"
                                  >
                                    +{activity.points}d - {activity.activityName}
                                  </p>
                                ))}
                              </div>
                            )}

                            {customEvidenceList.length > 0 && (
                              <div className="mt-2 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Minh chứng tự nộp</p>
                                <div className="space-y-1.5">
                                  {customEvidenceList.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between p-1.5 rounded-xl bg-white border border-slate-100 gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                            item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                            item.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                            'bg-amber-50 text-amber-600 border border-amber-100'
                                          }`}>
                                            {item.status === 'APPROVED' ? 'Đã duyệt' : item.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                                          </span>
                                          <span className="text-[10px] font-black text-slate-700">+{item.points}đ</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-800 truncate" title={item.activityName}>{item.activityName}</p>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        {item.files && item.files.length > 0 && (
                                          <button
                                            onClick={() => openEvidencePopup(item.files)}
                                            className="p-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-500 hover:text-blue-600 transition-all shadow-sm"
                                            title="Xem ảnh minh chứng"
                                          >
                                            <Eye size={12} />
                                          </button>
                                        )}
                                        {item.status === 'PENDING' && (
                                          <button
                                            onClick={() => {
                                              setReviewEvidence({ criterionId: criterion.id, item });
                                              setReviewPoints(item.points);
                                              setReviewTargetCrit(criterion.id);
                                            }}
                                            className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                                          >
                                            Xét duyệt
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {files.length > 0 ? (
                              <button onClick={() => openEvidencePopup(files)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">
                                <Eye size={14} /> Xem ({files.length})
                              </button>
                            ) : <span className="text-xs text-slate-300 italic">Không có</span>}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="text-lg font-black text-slate-400">{studentScore}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-center rounded-xl border border-blue-100 bg-blue-50/50 p-1">
                               <input
                                 type="number"
                                 min={0}
                                 max={criterion.maxPoints}
                                 value={currentAdminScore}
                                 onChange={(e) => setAdminScores(prev => ({ ...prev, [criterion.id]: Number(e.target.value || 0) }))}
                                 className="w-12 bg-transparent text-center text-lg font-black text-blue-600 outline-none"
                               />
                            </div>
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex flex-col gap-1 w-fit mx-auto">
                                <button onClick={() => setAdminScores(p => ({...p, [criterion.id]: studentScore}))} className={`p-2 rounded-lg transition-all ${currentAdminScore === studentScore ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 text-slate-400'}`}>
                                   <ShieldCheck size={16} />
                                </button>
                                <button onClick={() => setAdminScores(p => ({...p, [criterion.id]: 0}))} className={`p-2 rounded-lg transition-all ${currentAdminScore === 0 ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-50 text-slate-400'}`}>
                                   <ShieldX size={16} />
                                </button>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card-based List */}
              <div className="lg:hidden divide-y divide-slate-50">
                 {section.criteria.map((criterion) => {
                    const studentScore = Number(data.details?.[criterion.id]?.score || 0);
                    const files = normalizeEvidenceList(data.details?.[criterion.id]?.files || []);
                    const activities = normalizeTrainingActivities(data.details?.[criterion.id]?.activities || []);
                    const currentAdminScore = Number(adminScores[criterion.id] || 0);
                    const customEvidenceList = data.details?.[criterion.id]?.customEvidence || [];

                    return (
                       <div key={criterion.id} className="p-4 space-y-3">
                          <div className="flex items-start gap-2.5">
                             <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500 shrink-0">{criterion.id.replace('crit-', '')}</span>
                             <div className="space-y-1.5 min-w-0 flex-1">
                               <h4 className="text-xs font-black text-slate-800 leading-tight">{criterion.content}</h4>
                               {criterion.guide && (
                                 <p className="text-[10px] leading-relaxed text-slate-500 bg-slate-50 border-l border-slate-300 pl-1.5 py-0.5 whitespace-pre-line font-medium">
                                   {criterion.guide}
                                 </p>
                               )}
                             </div>
                           </div>

                           {customEvidenceList.length > 0 && (
                             <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5 my-2">
                               <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Minh chứng tự nộp</p>
                               <div className="space-y-1.5">
                                 {customEvidenceList.map((item: any) => (
                                   <div key={item.id} className="p-2.5 rounded-xl bg-white border border-slate-100 space-y-2">
                                     <div className="flex flex-col gap-1">
                                       <div className="flex items-center justify-between gap-2">
                                         <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                           item.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                           item.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                           'bg-amber-50 text-amber-600 border border-amber-100'
                                         }`}>
                                           {item.status === 'APPROVED' ? 'Đã duyệt' : item.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                                         </span>
                                         <span className="text-[10px] font-black text-slate-700">+{item.points}đ</span>
                                       </div>
                                       <p className="text-xs font-bold text-slate-800 leading-snug">{item.activityName}</p>
                                     </div>

                                     <div className="flex gap-2 pt-1 border-t border-slate-50">
                                       {item.files && item.files.length > 0 && (
                                         <button
                                           onClick={() => openEvidencePopup(item.files)}
                                           className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-500 hover:text-blue-600 text-[10px] font-bold transition-all shadow-sm"
                                         >
                                           <Eye size={12} /> Xem ảnh
                                         </button>
                                       )}
                                       {item.status === 'PENDING' && (
                                         <button
                                           onClick={() => {
                                             setReviewEvidence({ criterionId: criterion.id, item });
                                             setReviewPoints(item.points);
                                             setReviewTargetCrit(criterion.id);
                                           }}
                                           className="flex-1 flex items-center justify-center py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                                         >
                                           Xét duyệt
                                         </button>
                                       )}
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}

                           <div style={{ display: 'none' }}>
                          </div>

                          <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                             <div className="flex-1">
                                {files.length > 0 ? (
                                   <button onClick={() => openEvidencePopup(files)} className="flex items-center gap-2 text-[10px] font-black text-blue-600">
                                      <Eye size={12} /> Xem minh chứng ({files.length})
                                   </button>
                                ) : <span className="text-[10px] text-slate-300">Không minh chứng</span>}
                             </div>
                             <div className="flex items-center gap-1.5">
                                <div className="flex flex-col items-center">
                                   <span className="text-[8px] font-black text-slate-400 uppercase">SV</span>
                                   <span className="text-sm font-black text-slate-400">{studentScore}</span>
                                </div>
                                <div className="w-px h-6 bg-slate-200" />
                                <div className="flex flex-col items-center">
                                   <span className="text-[8px] font-black text-blue-600 uppercase">Lớp</span>
                                   <input
                                     type="number"
                                     value={currentAdminScore}
                                     onChange={(e) => setAdminScores(p => ({...p, [criterion.id]: Number(e.target.value || 0)}))}
                                     className="w-10 text-center font-black text-blue-600 bg-blue-50 rounded-md text-sm outline-none"
                                   />
                                </div>
                             </div>
                          </div>

                          {activities.length > 0 && (
                            <div className="space-y-1 rounded-xl border border-emerald-100 bg-emerald-50/60 p-2">
                              {activities.map((activity, activityIndex) => (
                                <p
                                  key={`${activity.checkedInAt}-${activityIndex}`}
                                  className="text-[10px] font-bold text-emerald-700"
                                >
                                  +{activity.points}d - {activity.activityName}
                                </p>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                             <button onClick={() => setAdminScores(p => ({...p, [criterion.id]: studentScore}))} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentAdminScore === studentScore ? 'bg-emerald-500 text-white shadow-lg' : 'bg-emerald-50 text-emerald-600'}`}>
                                <ShieldCheck size={14} /> Duyệt
                             </button>
                             <button onClick={() => setAdminScores(p => ({...p, [criterion.id]: 0}))} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentAdminScore === 0 ? 'bg-rose-500 text-white shadow-lg' : 'bg-rose-50 text-rose-600'}`}>
                                <ShieldX size={14} /> Không
                             </button>
                          </div>
                       </div>
                    );
                 })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_420px]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
              <MessageSquareText size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Ghi chu admin</p>
              <p className="text-sm text-slate-500">Nhap nhan xet chung hoac ly do khong duyet.</p>
            </div>
          </div>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={5}
            placeholder="Nhap ghi chu xu ly phieu..."
            className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white"
          />
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">Tong hop ket qua</p>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span className="text-sm text-slate-300">Tong SV tu cham</span>
              <span className="text-2xl font-black">{studentTotal}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-sky-500/15 px-4 py-3">
              <span className="text-sm text-sky-100">Tong lop cham</span>
              <span className="text-2xl font-black text-sky-300">{adminTotal}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              onClick={() => handleSave('APPROVED')}
              disabled={savingStatus !== null}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {savingStatus === 'APPROVED' ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Luu va duyet phieu
            </button>
            <button
              onClick={() => handleSave('REJECTED')}
              disabled={savingStatus !== null}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-60"
            >
              {savingStatus === 'REJECTED' ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
              Luu va khong duyet
            </button>
          </div>
        </div>
      </div>

      {reviewEvidence && (() => {
        const selectedCritMeta = EVALUATION_DATA.flatMap(s => s.criteria).find(c => c.id === reviewTargetCrit);
        const maxAllowedPoints = selectedCritMeta ? selectedCritMeta.maxPoints : 10;
        const mainEvidence = normalizeEvidenceList(reviewEvidence.item.files || [])[0];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Xét duyệt minh chứng tự nộp</p>
                  <h3 className="text-lg font-black text-slate-900">Hoạt động: {reviewEvidence.item.activityName}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewEvidence(null)}
                  className="rounded-xl p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {mainEvidence && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Ảnh minh chứng</label>
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                      <img
                        src={getEvidenceUrl(mainEvidence)}
                        alt="Minh chứng"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Duyệt vào Mục/Tiêu chí nào? *</label>
                    <select
                      value={reviewTargetCrit}
                      onChange={(e) => {
                        const newCritId = e.target.value;
                        setReviewTargetCrit(newCritId);
                        const nextMeta = EVALUATION_DATA.flatMap(s => s.criteria).find(c => c.id === newCritId);
                        if (nextMeta) {
                          setReviewPoints(Math.min(nextMeta.maxPoints, reviewPoints));
                        }
                      }}
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white font-bold"
                    >
                      {EVALUATION_DATA.map((sec) => (
                        <optgroup key={sec.id} label={sec.title}>
                          {sec.criteria.map((crit) => (
                            <option key={crit.id} value={crit.id}>
                              Mục {crit.id.replace('crit-', '')} - {crit.content} (Tối đa: {crit.maxPoints}đ)
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {selectedCritMeta?.guide && (
                      <div className="mt-2 rounded-xl bg-sky-50 border border-sky-100 p-2.5 text-[11px] leading-relaxed text-sky-950 whitespace-pre-line font-medium">
                        <span className="font-bold text-sky-800 block mb-0.5">💡 Hướng dẫn chấm:</span>
                        {selectedCritMeta.guide}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Số điểm duyệt cộng *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={maxAllowedPoints}
                      value={reviewPoints}
                      onChange={(e) => setReviewPoints(Math.min(maxAllowedPoints, Math.max(0, Number(e.target.value || 0))))}
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white font-black"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 italic font-bold">Điểm tối đa của mục này: {maxAllowedPoints}đ</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => handleReviewDecision('REJECTED')}
                    className="flex-1 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition border border-rose-200 text-center"
                  >
                    Từ chối duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewDecision('APPROVED')}
                    className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl transition text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    Đồng ý & Duyệt cộng điểm
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <PreviewModal 
        files={evidencePopup?.files || []}
        initialIndex={evidencePopup?.activeIndex}
        onClose={() => setEvidencePopup(null)}
      />
    </div>
  );
};

export default TrainingScoreDetail;
