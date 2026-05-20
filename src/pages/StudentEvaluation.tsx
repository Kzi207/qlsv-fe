import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, ChevronDown, Award } from 'lucide-react';
import api from '../api/axios';
import DetailedEvaluationForm from '../components/DetailedEvaluationForm';
import { useAuthStore } from '../store/useAuthStore';

const parseDetails = (raw: any): Record<string, { score: number; files: any[]; activities?: any[] }> => {
  let parsed = raw;
  for (let i = 0; i < 3; i += 1) {
    if (typeof parsed !== 'string') break;
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }
  if (!parsed || typeof parsed !== 'object') return {};
  return parsed as Record<string, { score: number; files: any[]; activities?: any[] }>;
};

export default function StudentEvaluation() {
  const { user } = useAuthStore();
  const [semester, setSemester] = useState('');
  const [semesterOptions, setSemesterOptions] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<any>(null);
  const [savedDetails, setSavedDetails] = useState<Record<string, { score: number; files: any[]; activities?: any[] }> | null>(null);
  const [savedAdminDetails, setSavedAdminDetails] = useState<Record<string, number> | null>(null);
  const [submissionWindow, setSubmissionWindow] = useState<{ isOpen: boolean; deadline: string | null } | null>(null);
  const [checkingWindow, setCheckingWindow] = useState(false);

  const loadSavedEvaluation = async (semesterName: string) => {
    if (!user?.studentId || !semesterName) {
      setSavedDetails(null);
      setSavedAdminDetails(null);
      return;
    }
    try {
      const res = await api.get(`/training/student/${user.studentId}`);
      const records = Array.isArray(res.data) ? res.data : [];
      const matched = records.find((item: any) => item.semester_id === semesterName || item.semester?.name === semesterName);
      if (matched) {
        setSavedDetails(parseDetails(matched.details));
        setSavedAdminDetails(matched.admin_details || null);
      } else {
        setSavedDetails(null);
        setSavedAdminDetails(null);
      }
    } catch (_error) {
      setSavedDetails(null);
      setSavedAdminDetails(null);
    }
  };

  const loadSubmissionWindow = async (semesterName: string) => {
    if (!semesterName) return;
    setCheckingWindow(true);
    try {
      const res = await api.get('/training/submission-status', { params: { semester: semesterName } });
      setSubmissionWindow({
        isOpen: Boolean(res.data?.isOpen),
        deadline: res.data?.deadline || null,
      });
    } catch (_error) {
      setSubmissionWindow({ isOpen: true, deadline: null });
    } finally {
      setCheckingWindow(false);
    }
  };

  const fetchSemesters = async () => {
    try {
      const res = await api.get('/semesters');
      setSemesterOptions(res.data);
      if (res.data.length > 0) {
        setSemester(res.data[0].name);
      }
    } catch (error: any) {
      console.error('Không thể tải danh sách học kỳ');
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (!semester) return;
    loadSavedEvaluation(semester);
    loadSubmissionWindow(semester);
  }, [semester, user?.studentId]);

  const handleSubmit = async (payload: any) => {
    if (!semester) return toast.error('Vui lòng chọn học kỳ');
    if (!user?.studentId) return toast.error('Không tìm thấy thông tin sinh viên');
    if (submissionWindow && !submissionWindow.isOpen) {
      return toast.error('Đã hết hạn nộp phiếu cho học kỳ này');
    }
    setSubmitting(true);
    try {
      const res = await api.post('/training', {
        student_id: user.studentId,
        semester,
        ...payload,
        status: 'PENDING',
      });
      setSavedDetails(parseDetails(res.data?.details || payload.details));
      setSubmitted(res.data);
      toast.success('Đã nộp phiếu rèn luyện thành công');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToForm = () => {
    setSubmitted(null);
    loadSavedEvaluation(semester);
    loadSubmissionWindow(semester);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center animate-fade-up">
        <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6 shadow-inner">
           <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Nộp phiếu thành công!</h2>
        <p className="text-slate-500 text-sm max-w-sm mb-8">
           Phiếu rèn luyện của bạn đã được ghi nhận và đang chờ BCH xét duyệt.
        </p>
        <div className="card-premium p-6 w-full max-w-xs space-y-4">
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Điểm tự chấm</p>
              <p className="text-4xl font-black text-slate-900">{submitted.total}<span className="text-sm font-bold text-slate-400">/100</span></p>
           </div>
           <div className="py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-600">
              Học kỳ: {semester}
           </div>
        </div>
        <button onClick={handleBackToForm} className="mt-8 text-xs font-black text-blue-600 hover:underline uppercase tracking-widest">
           Quay lại xem chi tiết
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6 md:space-y-8 pb-20 animate-fade-up">
      {/* Compact Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-widest">
            <Award size={10} />
            Hệ thống nộp phiếu ĐRL
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Kê khai điểm rèn luyện</h1>
          <p className="text-slate-400 font-bold text-xs">Điền đầy đủ thông tin và minh chứng để được xét duyệt</p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
           <div className="relative group">
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-bold text-xs appearance-none min-w-[140px] shadow-sm"
              >
                {semesterOptions.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
           </div>
           {!checkingWindow && submissionWindow && (
             <div className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border shadow-sm ${
               submissionWindow.isOpen ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
             }`}>
                <div className={`h-1.5 w-1.5 rounded-full ${submissionWindow.isOpen ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                {submissionWindow.isOpen ? 'Hệ thống mở' : 'Hệ thống đóng'}
             </div>
           )}
        </div>
      </header>

      <DetailedEvaluationForm
        isAdminMode={false}
        studentId={Number(user?.studentId || 0)}
        semester={semester}
        studentDetails={savedDetails || undefined}
        adminData={savedAdminDetails || undefined}
        onSubmit={handleSubmit}
        loading={submitting || checkingWindow || Boolean(submissionWindow && !submissionWindow.isOpen)}
      />
    </div>
  );
}
