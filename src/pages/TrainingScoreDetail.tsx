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
  type EvidenceFile,
  normalizeEvidenceList,
} from '../utils/evidence';
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
                      const currentAdminScore = Number(adminScores[criterion.id] || 0);

                      return (
                        <tr key={criterion.id} className="align-top hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-5">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                              {criterion.id.replace('crit-', '')}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm font-bold text-slate-800 leading-snug">{criterion.content}</p>
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{criterion.guide}</p>
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
                    const currentAdminScore = Number(adminScores[criterion.id] || 0);

                    return (
                       <div key={criterion.id} className="p-4 space-y-3">
                          <div className="flex items-start gap-2.5">
                             <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500 shrink-0">{criterion.id.replace('crit-', '')}</span>
                             <h4 className="text-xs font-black text-slate-800 leading-tight">{criterion.content}</h4>
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

      <PreviewModal 
        files={evidencePopup?.files || []}
        initialIndex={evidencePopup?.activeIndex}
        onClose={() => setEvidencePopup(null)}
      />
    </div>
  );
};

export default TrainingScoreDetail;
