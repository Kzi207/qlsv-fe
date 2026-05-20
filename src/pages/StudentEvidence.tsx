import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  Award, 
  Plus, 
  Calendar, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Eye,
  ChevronDown
} from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';
import { EVALUATION_DATA } from '../constants/evaluationData';
import { normalizeEvidenceList, type EvidenceFile } from '../utils/evidence';
import PreviewModal from '../components/drl/PreviewModal';

const STATUS_BADGES: Record<string, { label: string; className: string; icon: any }> = {
  PENDING: {
    label: 'Chờ duyệt',
    className: 'bg-amber-50 border border-amber-200 text-amber-700',
    icon: Clock
  },
  APPROVED: {
    label: 'Đã duyệt',
    className: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
    icon: CheckCircle2
  },
  REJECTED: {
    label: 'Từ chối',
    className: 'bg-rose-50 border border-rose-200 text-rose-700',
    icon: XCircle
  }
};

export default function StudentEvidence() {
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  
  // Submit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalSemester, setModalSemester] = useState('');
  const [activityName, setActivityName] = useState('');
  const [selectedSection, setSelectedSection] = useState('sec-1');
  const [selectedCriterion, setSelectedCriterion] = useState('');
  const [points, setPoints] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  // Preview modal state
  const [previewFiles, setPreviewFiles] = useState<EvidenceFile[] | null>(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/training/evidence/student');
      setSubmissions(res.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tải danh sách minh chứng');
    } finally {
      setLoading(false);
    }
  };

  const fetchSemesters = async () => {
    try {
      const res = await api.get('/semesters');
      setSemesters(res.data || []);
      if (res.data.length > 0) {
        setSelectedSemester(res.data[0].name);
        setModalSemester(res.data[0].name);
      }
    } catch (error: any) {
      console.error('Không thể tải học kỳ');
    }
  };

  useEffect(() => {
    fetchSemesters();
    fetchSubmissions();
  }, []);

  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    const sect = EVALUATION_DATA.find(s => s.id === sectionId);
    if (sect && sect.criteria.length > 0) {
      setSelectedCriterion(sect.criteria[0].id);
    } else {
      setSelectedCriterion('');
    }
  };

  // Set default criterion when modal opens or section changes
  useEffect(() => {
    if (isModalOpen && !selectedCriterion) {
      const firstSection = EVALUATION_DATA[0];
      if (firstSection && firstSection.criteria.length > 0) {
        setSelectedCriterion(firstSection.criteria[0].id);
      }
    }
  }, [isModalOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSemester) return toast.error('Vui lòng chọn học kỳ');
    if (!activityName.trim()) return toast.error('Vui lòng nhập tên hoạt động');
    if (!selectedCriterion) return toast.error('Vui lòng chọn tiêu chí');
    if (!points || Number(points) <= 0) return toast.error('Điểm cộng phải lớn hơn 0');
    if (!file) return toast.error('Vui lòng tải lên ảnh hoặc file minh chứng');
    if (!user?.studentId) return toast.error('Không xác định được mã sinh viên');

    setSubmitting(true);
    try {
      // 1. Upload files first
      const formData = new FormData();
      formData.append('files', file);
      formData.append('criterionId', selectedCriterion);
      formData.append('semester', modalSemester);
      formData.append('student_id', String(user.studentId));

      const uploadRes = await api.post('/training/upload-evidence', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedFiles = normalizeEvidenceList(uploadRes.data.files);
      if (!uploadedFiles.length) {
        throw new Error('Upload minh chứng không thành công');
      }

      // 2. Submit the custom evidence record
      await api.post('/training/evidence/submit', {
        semester: modalSemester,
        activityName: activityName.trim(),
        sectionId: selectedSection,
        criterionId: selectedCriterion,
        points: Number(points),
        files: uploadedFiles
      });

      toast.success('Nộp minh chứng thành công! Đang chờ duyệt.');
      setIsModalOpen(false);
      resetForm();
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Gặp lỗi trong quá trình nộp');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setActivityName('');
    setPoints('');
    setFile(null);
    if (semesters.length > 0) {
      setModalSemester(semesters[0].name);
    }
    setSelectedSection('sec-1');
    const firstSection = EVALUATION_DATA[0];
    if (firstSection && firstSection.criteria.length > 0) {
      setSelectedCriterion(firstSection.criteria[0].id);
    }
  };

  const filteredSubmissions = selectedSemester
    ? submissions.filter(s => s.semester_id === selectedSemester)
    : submissions;

  const currentSectionObj = EVALUATION_DATA.find(s => s.id === selectedSection);
  const currentCriterionObj = currentSectionObj?.criteria.find(c => c.id === selectedCriterion);

  return (
    <div className="max-w-6xl space-y-6 md:space-y-8 pb-20 animate-fade-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-widest">
            <Award size={10} />
            Chứng nhận DRL riêng biệt
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Khai báo & Nộp minh chứng</h1>
          <p className="text-slate-400 font-bold text-xs">Nộp minh chứng hoạt động ngoại khóa để cộng điểm rèn luyện trực tiếp</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98] transition-all shadow-md shadow-blue-500/10"
        >
          <Plus size={16} />
          Nộp minh chứng mới
        </button>
      </header>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-6 flex flex-col justify-between space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng lượt nộp</p>
          <p className="text-3xl font-black text-slate-900">{filteredSubmissions.length}</p>
        </div>
        <div className="card-premium p-6 flex flex-col justify-between space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã duyệt</p>
          <p className="text-3xl font-black text-emerald-600">
            {filteredSubmissions.filter(s => s.status === 'APPROVED').length}
          </p>
        </div>
        <div className="card-premium p-6 flex flex-col justify-between space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang chờ</p>
          <p className="text-3xl font-black text-amber-500">
            {filteredSubmissions.filter(s => s.status === 'PENDING').length}
          </p>
        </div>
        <div className="card-premium p-6 flex flex-col justify-between space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Từ chối</p>
          <p className="text-3xl font-black text-rose-500">
            {filteredSubmissions.filter(s => s.status === 'REJECTED').length}
          </p>
        </div>
      </div>

      {/* Main List */}
      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Danh sách minh chứng đã nộp</h2>
          </div>
          
          <div className="relative min-w-[160px]">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-bold text-xs appearance-none shadow-sm cursor-pointer"
            >
              <option value="">Tất cả học kỳ</option>
              {semesters.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <p className="text-xs font-bold text-slate-400">Đang tải dữ liệu minh chứng...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <FileText size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-700">Không tìm thấy minh chứng nào</p>
              <p className="text-xs text-slate-400 font-bold">Hãy nhấp nút "Nộp minh chứng mới" để bắt đầu nộp</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="py-4 px-6">Tên hoạt động</th>
                  <th className="py-4 px-6">Học kỳ</th>
                  <th className="py-4 px-6">Mục/Tiêu chí</th>
                  <th className="py-4 px-6 text-center">Điểm cộng</th>
                  <th className="py-4 px-6">Ngày nộp</th>
                  <th className="py-4 px-6 text-center">Trạng thái</th>
                  <th className="py-4 px-6 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {filteredSubmissions.map((sub: any) => {
                  const Badge = STATUS_BADGES[sub.status] || STATUS_BADGES.PENDING;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 text-xs max-w-xs sm:max-w-sm truncate">{sub.activityName}</div>
                      </td>
                      <td className="py-4 px-6 text-xs font-bold text-slate-500">{sub.semester_id}</td>
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-[10px] font-black text-slate-600">
                          {sub.criterionId}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="text-xs font-black text-blue-600">+{sub.points}đ</span>
                      </td>
                      <td className="py-4 px-6 text-xs font-bold text-slate-400">
                        {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${Badge.className}`}>
                          <Badge.icon size={11} className="mr-1" />
                          {Badge.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button 
                          onClick={() => setPreviewFiles(sub.files)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-black text-slate-600 uppercase tracking-wider hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer"
                        >
                          <Eye size={12} />
                          Xem minh chứng
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SUBMIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-600" size={20} />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">KÊ KHAI MINH CHỨNG MỚI</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Semester */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Học kỳ nộp</label>
                  <div className="relative">
                    <select
                      value={modalSemester}
                      onChange={(e) => setModalSemester(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl outline-none font-bold text-xs appearance-none transition-all shadow-inner"
                    >
                      {semesters.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>

                {/* Score */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điểm cộng đề xuất</label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    placeholder="Nhập số điểm cần cộng"
                    min="1"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl outline-none font-bold text-xs transition-all shadow-inner"
                    required
                  />
                </div>
              </div>

              {/* Activity Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên hoạt động / Chứng chỉ</label>
                <input
                  type="text"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  placeholder="Ví dụ: Tham gia hiến máu tình nguyện đợt 1 năm 2024"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl outline-none font-bold text-xs transition-all shadow-inner"
                  required
                />
              </div>

              {/* Target Location DRL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Section selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Mục Lớn DRL</label>
                  <div className="relative">
                    <select
                      value={selectedSection}
                      onChange={(e) => handleSectionChange(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl outline-none font-bold text-xs appearance-none transition-all shadow-inner"
                    >
                      {EVALUATION_DATA.map(s => (
                        <option key={s.id} value={s.id}>
                          Mục {s.id.replace('sec-', '')} - {s.title.substring(0, 45)}...
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>

                {/* Criterion selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Tiêu Chí Cộng</label>
                  <div className="relative">
                    <select
                      value={selectedCriterion}
                      onChange={(e) => setSelectedCriterion(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl outline-none font-bold text-xs appearance-none transition-all shadow-inner"
                    >
                      {EVALUATION_DATA.find(s => s.id === selectedSection)?.criteria.map(c => (
                        <option key={c.id} value={c.id}>
                          Tiêu chí {c.id} - {c.content.substring(0, 50)}...
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>
              </div>

              {/* Criterion details guide card */}
              {currentCriterionObj && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-xs text-blue-700">
                  <HelpCircle className="shrink-0 text-blue-500" size={16} />
                  <div className="space-y-1">
                    <p className="font-black uppercase tracking-wider text-[9px] text-blue-600">Hướng dẫn chấm điểm</p>
                    <p className="font-bold whitespace-pre-line leading-relaxed">{currentCriterionObj.guide}</p>
                    <p className="text-[10px] font-black text-blue-500 mt-1">Cấp độ tối đa: {currentCriterionObj.maxPoints} điểm</p>
                  </div>
                </div>
              )}

              {/* Upload Certificate file */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tải lên tệp chứng nhận (Hình ảnh / PDF)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50/50 hover:border-blue-400 transition-all bg-slate-50/20 group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
                      {file ? (
                        <>
                          <ImageIcon className="text-emerald-500 mb-2 group-hover:scale-110 duration-300" size={28} />
                          <p className="text-xs font-black text-emerald-600 max-w-xs truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mb-2 group-hover:-translate-y-1 duration-300" size={28} />
                          <p className="text-xs font-black text-slate-600 group-hover:text-blue-600">Chọn ảnh hoặc tài liệu minh chứng</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-1">PNG, JPG, JPEG, PDF tối đa 10MB</p>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-slate-700 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-blue-500/10"
                >
                  {submitting && <Loader2 className="animate-spin" size={14} />}
                  {submitting ? 'Đang nộp...' : 'Nộp minh chứng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFiles && (
        <PreviewModal
          files={previewFiles}
          initialIndex={0}
          onClose={() => setPreviewFiles(null)}
        />
      )}
    </div>
  );
}
