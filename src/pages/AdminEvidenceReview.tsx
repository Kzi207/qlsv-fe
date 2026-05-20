import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  Search, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  ChevronDown,
  Filter,
  Check,
  X,
  ShieldCheck
} from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';
import { EVALUATION_DATA } from '../constants/evaluationData';
import { getEvidenceUrl, type EvidenceFile } from '../utils/evidence';
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

export default function AdminEvidenceReview() {
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('PENDING'); // Default to PENDING for actionability
  
  // Review modal state
  const [reviewItem, setReviewItem] = useState<any | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewPoints, setReviewPoints] = useState('');
  const [reviewSection, setReviewSection] = useState('sec-1');
  const [reviewCriterion, setReviewCriterion] = useState('');
  
  // Preview modal state
  const [previewFiles, setPreviewFiles] = useState<EvidenceFile[] | null>(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/training/evidence/all');
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
    } catch (error: any) {
      console.error('Không thể tải học kỳ');
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data || []);
    } catch (error: any) {
      console.error('Không thể tải lớp học');
    }
  };

  useEffect(() => {
    fetchSemesters();
    fetchClasses();
    fetchSubmissions();
  }, []);

  const handleOpenReview = (item: any) => {
    setReviewItem(item);
    setReviewPoints(String(item.points));
    
    // Automatically resolve parent section based on criterionId
    const critPrefix = item.criterionId.split('.')[0];
    const section = EVALUATION_DATA.find(s => s.id === `sec-${critPrefix}` || s.id === critPrefix);
    if (section) {
      setReviewSection(section.id);
    } else {
      setReviewSection('sec-1');
    }
    setReviewCriterion(item.criterionId);
  };

  const handleSectionChange = (sectionId: string) => {
    setReviewSection(sectionId);
    const sect = EVALUATION_DATA.find(s => s.id === sectionId);
    if (sect && sect.criteria.length > 0) {
      setReviewCriterion(sect.criteria[0].id);
    } else {
      setReviewCriterion('');
    }
  };

  const handleReviewAction = async (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewItem) return;
    if (status === 'APPROVED' && (!reviewPoints || Number(reviewPoints) <= 0)) {
      return toast.error('Số điểm phê duyệt phải lớn hơn 0');
    }

    setReviewing(true);
    try {
      await api.post('/training/evidence/review', {
        trainingScoreId: reviewItem.trainingScoreId,
        evidenceId: reviewItem.id,
        status,
        points: status === 'APPROVED' ? Number(reviewPoints) : undefined,
        criterionId: status === 'APPROVED' ? reviewCriterion : undefined
      });

      toast.success(status === 'APPROVED' ? 'Đã phê duyệt và cộng điểm rèn luyện!' : 'Đã từ chối minh chứng.');
      setReviewItem(null);
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Thao tác phê duyệt thất bại');
    } finally {
      setReviewing(false);
    }
  };

  // Filter logic
  const filteredSubmissions = submissions.filter(item => {
    const matchesSearch = 
      item.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.activityName.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesSemester = filterSemester ? item.semester_id === filterSemester : true;
    const matchesClass = filterClass ? String(item.class_id).toUpperCase() === String(filterClass).toUpperCase() : true;
    const matchesStatus = filterStatus ? item.status === filterStatus : true;
    
    return matchesSearch && matchesSemester && matchesClass && matchesStatus;
  });

  const selectedSectionObj = EVALUATION_DATA.find(s => s.id === reviewSection);
  const selectedCriterionObj = selectedSectionObj?.criteria.find(c => c.id === reviewCriterion);

  const roleLabel = user?.role === 'BCH' ? `Lớp ${user.class_id}` : 'Toàn trường';

  return (
    <div className="max-w-7xl space-y-6 md:space-y-8 pb-20 animate-fade-up">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-widest">
            <ShieldCheck size={10} />
            Hệ thống quản lý xét duyệt
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Xét duyệt Minh chứng DRL</h1>
          <p className="text-slate-400 font-bold text-xs">
            Phê duyệt, chỉnh sửa điểm và mục cộng cho minh chứng tự kê khai ({roleLabel})
          </p>
        </div>
      </header>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
        <div className="card-premium p-6 flex flex-col justify-between space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang chờ duyệt</p>
          <p className="text-3xl font-black text-amber-500">
            {submissions.filter(s => s.status === 'PENDING').length}
          </p>
        </div>
        <div className="card-premium p-6 flex flex-col justify-between space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã phê duyệt</p>
          <p className="text-3xl font-black text-emerald-600">
            {submissions.filter(s => s.status === 'APPROVED').length}
          </p>
        </div>
        <div className="card-premium p-6 flex flex-col justify-between space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã từ chối</p>
          <p className="text-3xl font-black text-rose-500">
            {submissions.filter(s => s.status === 'REJECTED').length}
          </p>
        </div>
        <div className="card-premium p-6 flex flex-col justify-between space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng minh chứng</p>
          <p className="text-3xl font-black text-slate-900">{submissions.length}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card-premium p-6 bg-slate-50/50 border border-slate-100 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-blue-600" />
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Bộ lọc tìm kiếm</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="MSSV, tên sinh viên, hoạt động..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-bold text-xs transition-all shadow-sm"
            />
          </div>

          {/* Status select */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-bold text-xs appearance-none cursor-pointer shadow-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chờ duyệt (Chờ xử lý)</option>
              <option value="APPROVED">Đã duyệt (Thành công)</option>
              <option value="REJECTED">Từ chối (Không hợp lệ)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>

          {/* Semester select */}
          <div className="relative">
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-bold text-xs appearance-none cursor-pointer shadow-sm"
            >
              <option value="">Tất cả học kỳ</option>
              {semesters.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>

          {/* Class select */}
          <div className="relative">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              disabled={user?.role === 'BCH'}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-bold text-xs appearance-none cursor-pointer shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
            >
              {user?.role === 'BCH' ? (
                <option value={user.class_id || ''}>{user.class_id}</option>
              ) : (
                <>
                  <option value="">Tất cả lớp học</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                </>
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="card-premium overflow-hidden">
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
              <p className="text-sm font-black text-slate-700">Không tìm thấy yêu cầu xét duyệt nào</p>
              <p className="text-xs text-slate-400 font-bold">Các yêu cầu kê khai của sinh viên sẽ xuất hiện tại đây</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="py-4 px-6">Sinh viên</th>
                  <th className="py-4 px-6">Hoạt động / Minh chứng</th>
                  <th className="py-4 px-6">Học kỳ</th>
                  <th className="py-4 px-6">Mục/Tiêu chí</th>
                  <th className="py-4 px-6 text-center">Đề xuất</th>
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
                      {/* Student Info */}
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-black text-slate-800 text-xs">{sub.student_name}</div>
                          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{sub.student_code}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="uppercase text-blue-600 font-black">{sub.class_id}</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Activity Name */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 text-xs max-w-xs truncate">{sub.activityName}</div>
                      </td>
                      
                      {/* Semester */}
                      <td className="py-4 px-6 text-xs font-bold text-slate-500">{sub.semester_id}</td>
                      
                      {/* Target Criterion */}
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-[10px] font-black text-slate-600">
                          {sub.criterionId}
                        </div>
                      </td>
                      
                      {/* Points */}
                      <td className="py-4 px-6 text-center">
                        <span className="text-xs font-black text-blue-600">+{sub.points}đ</span>
                      </td>
                      
                      {/* Submission Date */}
                      <td className="py-4 px-6 text-xs font-bold text-slate-400">
                        {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                      </td>
                      
                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${Badge.className}`}>
                          <Badge.icon size={11} className="mr-1" />
                          {Badge.label}
                        </span>
                      </td>
                      
                      {/* Action */}
                      <td className="py-4 px-6 text-center">
                        {sub.status === 'PENDING' ? (
                          <button 
                            onClick={() => handleOpenReview(sub)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-[10px] font-black text-white uppercase tracking-widest hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/10 cursor-pointer"
                          >
                            Duyệt
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleOpenReview(sub)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-black text-slate-600 uppercase tracking-wider hover:bg-slate-50 cursor-pointer"
                          >
                            Xem lại
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REVIEW MODAL */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-scale-up border border-slate-100 flex flex-col h-[90vh] md:h-[80vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-blue-600" size={20} />
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                  {reviewItem.status === 'PENDING' ? 'XÉT DUYỆT MINH CHỨNG' : 'CHI TIẾT MINH CHỨNG'}
                </h3>
              </div>
              <button 
                onClick={() => setReviewItem(null)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Layout */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Side: Certificate Viewer */}
              <div className="w-full md:w-1/2 p-6 bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-4 left-4 bg-white/10 backdrop-blur px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest">
                  Ảnh chứng nhận
                </div>
                
                {reviewItem.files && reviewItem.files.length > 0 ? (
                  <div className="w-full h-full max-h-[40vh] md:max-h-full flex items-center justify-center">
                    <img 
                      src={getEvidenceUrl(reviewItem.files[0])} 
                      alt="Certificate"
                      className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10 hover:scale-105 duration-300 cursor-pointer"
                      onClick={() => setPreviewFiles(reviewItem.files)}
                    />
                  </div>
                ) : (
                  <div className="text-slate-500 font-bold text-xs text-center space-y-2">
                    <FileText size={40} className="mx-auto text-slate-600" />
                    <p>Không tìm thấy file đính kèm</p>
                  </div>
                )}
                
                {reviewItem.files && reviewItem.files.length > 0 && (
                  <button 
                    onClick={() => setPreviewFiles(reviewItem.files)}
                    className="absolute bottom-4 right-4 px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-black uppercase tracking-wider hover:bg-slate-100 flex items-center gap-1.5 transition-all shadow-lg"
                  >
                    <Eye size={14} />
                    Xem cỡ lớn
                  </button>
                )}
              </div>

              {/* Right Side: Approval and Editing controls */}
              <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-6">
                
                {/* Student details card */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinh viên khai báo</p>
                        <p className="font-black text-slate-900 text-sm mt-0.5">{reviewItem.student_name}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-blue-100 text-[10px] font-black text-blue-700 uppercase tracking-wide">
                        {reviewItem.class_id}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-500 border-t border-slate-100 pt-2">
                      <div>Mã sinh viên: <span className="text-slate-800">{reviewItem.student_code}</span></div>
                      <div>Học kỳ: <span className="text-slate-800">{reviewItem.semester_id}</span></div>
                    </div>
                  </div>

                  {/* Activity and details */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tên hoạt động đề xuất</label>
                    <p className="font-bold text-slate-800 text-sm">{reviewItem.activityName}</p>
                  </div>

                  {reviewItem.status === 'PENDING' ? (
                    <>
                      {/* Adjust Section & Criterion */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {/* Adjust section */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chỉnh mục lớn</label>
                          <div className="relative">
                            <select
                              value={reviewSection}
                              onChange={(e) => handleSectionChange(e.target.value)}
                              className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl outline-none font-bold text-xs appearance-none transition-all shadow-inner"
                            >
                              {EVALUATION_DATA.map(s => (
                                <option key={s.id} value={s.id}>
                                  Mục {s.id.replace('sec-', '')} - {s.title.substring(0, 30)}...
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                          </div>
                        </div>

                        {/* Adjust criterion */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chỉnh tiêu chí cộng</label>
                          <div className="relative">
                            <select
                              value={reviewCriterion}
                              onChange={(e) => setReviewCriterion(e.target.value)}
                              className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl outline-none font-bold text-xs appearance-none transition-all shadow-inner"
                            >
                              {EVALUATION_DATA.find(s => s.id === reviewSection)?.criteria.map(c => (
                                <option key={c.id} value={c.id}>
                                  Tiêu chí {c.id} - {c.content.substring(0, 35)}...
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                          </div>
                        </div>
                      </div>

                      {/* Adjust points */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Chỉnh sửa điểm phê duyệt</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={reviewPoints}
                            onChange={(e) => setReviewPoints(e.target.value)}
                            placeholder="Nhập số điểm duyệt"
                            min="1"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl outline-none font-bold text-xs transition-all shadow-inner"
                            required
                          />
                          <span className="text-slate-400 text-xs font-bold shrink-0">
                            (Đề xuất ban đầu: <strong className="text-slate-700">+{reviewItem.points}đ</strong>)
                          </span>
                        </div>
                      </div>

                      {/* Criteria Guideline Card */}
                      {selectedCriterionObj && (
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-xs text-blue-700">
                          <FileText className="shrink-0 text-blue-500" size={16} />
                          <div className="space-y-1">
                            <p className="font-black uppercase tracking-wider text-[9px] text-blue-600">Thang điểm chuẩn mực</p>
                            <p className="font-bold whitespace-pre-line leading-relaxed">{selectedCriterionObj.guide}</p>
                            <p className="text-[10px] font-black text-blue-500 mt-1">Cấp độ tối đa: {selectedCriterionObj.maxPoints} điểm</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 rounded-2xl border bg-slate-50 border-slate-100 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                        <span>Trạng thái:</span>
                        <span className={`inline-flex items-center gap-1.2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_BADGES[reviewItem.status].className}`}>
                          {reviewItem.status === 'APPROVED' ? 'Đã phê duyệt' : 'Từ chối'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500 border-t border-slate-100 pt-2">
                        <span>Tiêu chí đã cộng:</span>
                        <span className="font-black text-slate-800">{reviewItem.criterionId}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500 border-t border-slate-100 pt-2">
                        <span>Điểm cộng:</span>
                        <span className="font-black text-blue-600">{reviewItem.points}đ</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom buttons */}
                {reviewItem.status === 'PENDING' ? (
                  <div className="pt-6 flex items-center justify-end gap-3 border-t border-slate-100 bg-white">
                    <button
                      type="button"
                      disabled={reviewing}
                      onClick={() => handleReviewAction('REJECTED')}
                      className="px-5 py-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-black text-rose-600 uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <X size={14} />
                      Từ chối
                    </button>
                    <button
                      type="button"
                      disabled={reviewing}
                      onClick={() => handleReviewAction('APPROVED')}
                      className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-emerald-500/10"
                    >
                      {reviewing ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                      {reviewing ? 'Đang duyệt...' : 'Phê duyệt cộng điểm'}
                    </button>
                  </div>
                ) : (
                  <div className="pt-6 flex justify-end border-t border-slate-100 bg-white">
                    <button
                      type="button"
                      onClick={() => setReviewItem(null)}
                      className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Đóng
                    </button>
                  </div>
                )}
              </div>

            </div>

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
