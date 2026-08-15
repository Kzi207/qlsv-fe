import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Search,
  Trash2,
  Download,
  Loader2,
  RefreshCw,
  Star,
  Users,
  MessageSquare,
  ThumbsUp,
  Layout,
  Zap,
  GraduationCap,
  ArrowLeft,
  LogOut,
  AlertCircle,
  BarChart3,
  ListFilter,
  CheckCircle2,
  Copy,
  Layers,
  Filter,
  Settings,
  Plus,
  Type,
  ListChecks,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { setFallbackAuthToken } from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';
import { normalizeUserRole } from '../utils/auth';

interface SurveySummary {
  totalCount: number;
  avgUI: number;
  avgSpeed: number;
  avgUsability: number;
  avgUsefulness: number;
  overallAvg: number;
  ratingBreakdown: {
    UI: Record<number, number>;
    Speed: Record<number, number>;
    Usability: Record<number, number>;
    Usefulness: Record<number, number>;
  };
  recommendBreakdown: Record<string, number>;
}

interface SurveyItem {
  id: number;
  ratingUI: number;
  ratingSpeed: number;
  ratingUsability: number;
  ratingUsefulness: number;
  recommend: string;
  feedback: string | null;
  userRole: string | null;
  fullName: string | null;
  studentCode: string | null;
  ipAddress: string | null;
  createdAt: string;
}

type TabType = 'overview' | 'responses' | 'feedbacks' | 'settings';

const SurveyAdmin = () => {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  const isAdmin = isAuthenticated && normalizeUserRole(user?.role) === 'ADMIN';

  // Admin login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Survey data state
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SurveySummary | null>(null);
  const [responses, setResponses] = useState<SurveyItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Survey questions config state
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterHasFeedback, setFilterHasFeedback] = useState(false);
  const [filterMinScore, setFilterMinScore] = useState<number>(0);

  const handleAddChoiceQuestion = () => {
    const nextNum = questions.length + 1;
    const newKey = `Q${nextNum}`;
    const newQuestion = {
      key: newKey,
      title: `Câu hỏi trắc nghiệm số ${nextNum}`,
      type: 'CHOICE',
      choices: [
        { key: 'A', score: 5, label: 'Rất tốt / Rất hài lòng' },
        { key: 'B', score: 4, label: 'Tốt / Hài lòng' },
        { key: 'C', score: 3, label: 'Bình thường / Tạm ổn' },
        { key: 'D', score: 2, label: 'Cần cải thiện' },
      ],
    };
    setQuestions([...questions, newQuestion]);
    toast.success(`Đã thêm câu hỏi trắc nghiệm ${newKey}`);
  };

  const handleAddTextQuestion = () => {
    const nextNum = questions.length + 1;
    const newKey = `Q${nextNum}`;
    const newQuestion = {
      key: newKey,
      title: `Câu hỏi tự luận số ${nextNum} (Ý kiến đóng góp)`,
      type: 'TEXT',
      choices: [],
    };
    setQuestions([...questions, newQuestion]);
    toast.success(`Đã thêm câu hỏi tự luận ${newKey}`);
  };

  const handleDeleteQuestion = (qIndex: number) => {
    if (questions.length <= 1) {
      toast.error('Phải giữ lại ít nhất 1 câu hỏi khảo sát');
      return;
    }
    const updated = questions.filter((_, idx) => idx !== qIndex);
    const reindexed = updated.map((q, idx) => ({
      ...q,
      key: `Q${idx + 1}`,
    }));
    setQuestions(reindexed);
    toast.success('Đã xóa câu hỏi khỏi danh sách');
  };

  const fetchSurveyData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await api.get('/survey/responses');
      setSummary(res.data.summary);
      setResponses(res.data.responses || []);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Không thể tải danh sách khảo sát';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    if (!isAdmin) return;
    setLoadingQuestions(true);
    try {
      const res = await api.get('/survey/questions');
      setQuestions(res.data || []);
    } catch (error: any) {
      console.error(error);
      toast.error('Không thể tải cấu hình câu hỏi');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleUpdateQuestions = async () => {
    setSavingQuestions(true);
    try {
      await api.put('/survey/questions', { questions });
      toast.success('Cập nhật cấu hình câu hỏi thành công!');
      fetchQuestions();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Không thể cập nhật câu hỏi';
      toast.error(msg);
    } finally {
      setSavingQuestions(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSurveyData();
      fetchQuestions();
    }
  }, [isAdmin]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      return toast.error('Vui lòng nhập đầy đủ tài khoản và mật khẩu admin');
    }

    setLoggingIn(true);
    try {
      const res = await api.post('/auth/login', { username: username.trim(), password });
      if (res.data?.accessToken) {
        setFallbackAuthToken(res.data.accessToken, true);
      }
      login(res.data.user);
      toast.success('Đăng nhập quản trị viên thành công!');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Tài khoản hoặc mật khẩu không chính xác';
      toast.error(msg);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phản hồi khảo sát này?')) return;
    try {
      await api.delete(`/survey/responses/${id}`);
      toast.success('Đã xóa phản hồi thành công');
      setResponses((prev) => prev.filter((item) => item.id !== id));
      if (summary) {
        setSummary((prev) => (prev ? { ...prev, totalCount: Math.max(0, prev.totalCount - 1) } : null));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa phản hồi');
    }
  };

  const handleCopyFeedback = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã chép nội dung góp ý vào bộ nhớ đệm!');
  };

  const handleExportCSV = () => {
    if (filteredResponses.length === 0) {
      return toast.error('Không có dữ liệu để xuất');
    }

    const headers = [
      'STT',
      'Họ và tên',
      'MSSV',
      'Vai trò',
      'Đánh giá UI (1-5)',
      'Đánh giá Tốc độ (1-5)',
      'Đánh giá Dễ dùng (1-5)',
      'Đánh giá Hữu ích (1-5)',
      'Giới thiệu',
      'Góp ý thay đổi câu 6',
      'Thời gian gửi',
      'Địa chỉ IP',
    ];

    const rows = filteredResponses.map((item, idx) => [
      idx + 1,
      `"${item.fullName || 'Ẩn danh'}"`,
      `"${item.studentCode || ''}"`,
      `"${item.userRole || 'GUEST'}"`,
      item.ratingUI,
      item.ratingSpeed,
      item.ratingUsability,
      item.ratingUsefulness,
      `"${item.recommend}"`,
      `"${(item.feedback || '').replace(/"/g, '""')}"`,
      `"${new Date(item.createdAt).toLocaleString('vi-VN')}"`,
      `"${item.ipAddress || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `khao-sat-y-kien-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Đã xuất CSV cho ${filteredResponses.length} bản ghi!`);
  };

  // Filter responses
  const filteredResponses = responses.filter((item) => {
    if (filterRole !== 'ALL' && item.userRole !== filterRole) return false;
    if (filterHasFeedback && !item.feedback?.trim()) return false;
    if (filterMinScore > 0) {
      const avg = (item.ratingUI + item.ratingSpeed + item.ratingUsability + item.ratingUsefulness) / 4;
      if (avg < filterMinScore) return false;
    }

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (item.fullName || '').toLowerCase().includes(term) ||
      (item.studentCode || '').toLowerCase().includes(term) ||
      (item.feedback || '').toLowerCase().includes(term) ||
      (item.recommend || '').toLowerCase().includes(term) ||
      (item.userRole || '').toLowerCase().includes(term)
    );
  });

  const feedbackResponses = responses.filter((item) => item.feedback && item.feedback.trim().length > 0);

  // If user is not logged in as Admin, show Admin Login Card
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl space-y-6 shadow-2xl animate-fade-in relative overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 absolute top-0 left-0 right-0" />

          <div className="text-center space-y-2 pt-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-md">
              <ShieldCheck size={36} />
            </div>
            <h1 className="text-2xl font-black text-white">Quản Trị Hệ Thống Khảo Sát</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vui lòng đăng nhập bằng tài khoản Quản trị viên (Admin) để truy cập bảng điều khiển phân tích dữ liệu
            </p>
          </div>

          {isAuthenticated && !isAdmin && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                Tài khoản hiện tại <strong>{user?.name}</strong> (Role: <strong>{user?.role}</strong>) không có quyền Admin. Vui lòng chuyển sang tài khoản Admin.
              </div>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tên tài khoản (Admin)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập admin..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-sky-500/25 transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loggingIn ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang xác thực...
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Đăng Nhập Quản Trị Viên
                </>
              )}
            </button>
          </form>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800">
            <Link to="/khaosat" className="hover:text-sky-400 transition flex items-center gap-1">
              <ArrowLeft size={14} /> Trở lại làm khảo sát
            </Link>
            {isAuthenticated && (
              <button
                onClick={() => logout()}
                className="text-rose-400 hover:text-rose-300 transition flex items-center gap-1"
              >
                <LogOut size={14} /> Đăng xuất
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 selection:bg-sky-500 selection:text-white">
      {/* Top Header Bar */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-inner">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                BẢNG QUẢN TRỊ KHẢO SÁT & Ý KIẾN NGUỜI DÙNG
                <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                  Admin Dashboard
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Thống kê trực quan bài trắc nghiệm ABCD và danh sách ý kiến đóng góp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition"
            >
              <ArrowLeft size={15} /> Trang chủ
            </Link>

            <button
              onClick={fetchSurveyData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
              title="Tải lại dữ liệu khảo sát"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-sky-400' : ''} />
            </button>

            <button
              onClick={handleExportCSV}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
            >
              <Download size={15} /> Xuất Báo Cáo Excel/CSV
            </button>

            <Link
              to="/khaosat"
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-2 transition border border-slate-700"
            >
              <ArrowLeft size={15} /> Xem Form Khảo Sát
            </Link>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 border-t border-slate-800/80 pt-2 pb-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'overview'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BarChart3 size={16} />
            Thống Kê Tổng Quan & Biểu Đồ
          </button>

          <button
            onClick={() => setActiveTab('responses')}
            className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'responses'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ListFilter size={16} />
            Tất Cả Lượt Phản Hồi ({responses.length})
          </button>

          <button
            onClick={() => setActiveTab('feedbacks')}
            className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'feedbacks'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <MessageSquare size={16} className="text-pink-400" />
            Ý Kiến Đóng Góp Mở ({feedbackResponses.length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'settings'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Settings size={16} className="text-amber-400" />
            Cấu hình câu hỏi
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* --- TAB 1: OVERVIEW & CHART BREAKDOWNS --- */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <span>Tổng phản hồi</span>
                    <Users size={18} className="text-sky-400" />
                  </div>
                  <p className="text-3xl font-black text-white">{summary.totalCount}</p>
                  <p className="text-[11px] text-slate-500">Bài làm đã ghi nhận</p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <span>Đánh giá chung</span>
                    <Star size={18} className="text-amber-400 fill-amber-400" />
                  </div>
                  <p className="text-3xl font-black text-amber-400">
                    {summary.overallAvg} <span className="text-sm text-slate-500 font-normal">/ 5.0</span>
                  </p>
                  <p className="text-[11px] text-slate-500">Điểm hài lòng trung bình</p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <span>Giao diện (UI)</span>
                    <Layout size={18} className="text-indigo-400" />
                  </div>
                  <p className="text-3xl font-black text-indigo-400">
                    {summary.avgUI} <span className="text-sm text-slate-500 font-normal">/ 5.0</span>
                  </p>
                  <p className="text-[11px] text-slate-500">Thiết kế & Bố cục</p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <span>Tốc độ</span>
                    <Zap size={18} className="text-emerald-400" />
                  </div>
                  <p className="text-3xl font-black text-emerald-400">
                    {summary.avgSpeed} <span className="text-sm text-slate-500 font-normal">/ 5.0</span>
                  </p>
                  <p className="text-[11px] text-slate-500">Mượt mà & Phản hồi</p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <span>Tính Hữu Ích</span>
                    <GraduationCap size={18} className="text-purple-400" />
                  </div>
                  <p className="text-3xl font-black text-purple-400">
                    {summary.avgUsefulness} <span className="text-sm text-slate-500 font-normal">/ 5.0</span>
                  </p>
                  <p className="text-[11px] text-slate-500">Hỗ trợ công việc học tập</p>
                </div>
              </div>
            )}

            {/* Detailed Rating Breakdown Bars */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* UI Breakdown */}
                <RatingBreakdownCard
                  title="Câu 1: Giao diện và Thiết kế (UI/UX)"
                  icon={<Layout size={18} className="text-indigo-400" />}
                  avg={summary.avgUI}
                  breakdown={summary.ratingBreakdown.UI}
                  total={summary.totalCount}
                  barColor="bg-indigo-500"
                />

                {/* Speed Breakdown */}
                <RatingBreakdownCard
                  title="Câu 2: Tốc độ xử lý & Phản hồi hệ thống"
                  icon={<Zap size={18} className="text-emerald-400" />}
                  avg={summary.avgSpeed}
                  breakdown={summary.ratingBreakdown.Speed}
                  total={summary.totalCount}
                  barColor="bg-emerald-500"
                />

                {/* Usability Breakdown */}
                <RatingBreakdownCard
                  title="Câu 3: Mức độ Dễ sử dụng & Bố trí chức năng"
                  icon={<Layers size={18} className="text-sky-400" />}
                  avg={summary.avgUsability}
                  breakdown={summary.ratingBreakdown.Usability}
                  total={summary.totalCount}
                  barColor="bg-sky-500"
                />

                {/* Usefulness Breakdown */}
                <RatingBreakdownCard
                  title="Câu 4: Mức độ Hữu ích thực tế"
                  icon={<GraduationCap size={18} className="text-purple-400" />}
                  avg={summary.avgUsefulness}
                  breakdown={summary.ratingBreakdown.Usefulness}
                  total={summary.totalCount}
                  barColor="bg-purple-500"
                />
              </div>
            )}

            {/* Recommendation Breakdown Card */}
            {summary && summary.recommendBreakdown && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
                  <ThumbsUp size={18} className="text-sky-400" />
                  <span>Câu 5: Tỷ lệ sẵn lòng Giới thiệu ứng dụng cho bạn bè</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(summary.recommendBreakdown).map(([label, count]) => {
                    const pct = summary.totalCount > 0 ? Math.round((count / summary.totalCount) * 100) : 0;
                    return (
                      <div key={label} className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2">
                        <span className="text-xs font-bold text-slate-400 block truncate">{label}</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-black text-white">{count}</span>
                          <span className="text-xs font-bold text-sky-400">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-sky-500 h-1.5 transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: RESPONSES LIST WITH ADVANCED FILTERS --- */}
        {(activeTab === 'responses' || activeTab === 'overview') && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-2 text-sky-400">
                  <Filter size={16} /> Bộ lọc tìm kiếm phản hồi
                </span>
                <span>Tìm thấy: <strong className="text-white">{filteredResponses.length}</strong> kết quả</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search Input */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên, MSSV, góp ý..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-sky-500 transition"
                >
                  <option value="ALL">Tất cả vai trò</option>
                  <option value="STUDENT">Sinh viên</option>
                  <option value="BCH">Ban Cán Sự</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>

                {/* Score filter */}
                <select
                  value={filterMinScore}
                  onChange={(e) => setFilterMinScore(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-sky-500 transition"
                >
                  <option value={0}>Tất cả điểm số</option>
                  <option value={4.5}>Chỉ bài đánh giá cao (≥ 4.5★)</option>
                  <option value={3.5}>Bài trung bình khá (≥ 3.5★)</option>
                  <option value={2.5}>Bài đánh giá chưa đạt (&lt; 3.0★)</option>
                </select>

                {/* Toggle Has Feedback */}
                <label className="flex items-center justify-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:border-slate-700 transition">
                  <input
                    type="checkbox"
                    checked={filterHasFeedback}
                    onChange={(e) => setFilterHasFeedback(e.target.checked)}
                    className="rounded text-sky-500 focus:ring-0"
                  />
                  <span>Chỉ bài có góp ý mở (Câu 6)</span>
                </label>
              </div>
            </div>

            {/* Response Cards Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                <Loader2 size={32} className="animate-spin text-sky-500" />
                <p className="text-xs font-medium">Đang tải danh sách bài khảo sát...</p>
              </div>
            ) : filteredResponses.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-2">
                <MessageSquare size={36} className="mx-auto opacity-30" />
                <p className="text-sm font-medium">Không tìm thấy bài khảo sát nào phù hợp với bộ lọc.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredResponses.map((item) => {
                  const avgScore = ((item.ratingUI + item.ratingSpeed + item.ratingUsability + item.ratingUsefulness) / 4).toFixed(1);

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 sm:p-6 space-y-4 transition shadow-lg relative overflow-hidden"
                    >
                      {/* Header info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-black text-sm shrink-0">
                            {(item.fullName || item.studentCode || 'A')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-white text-sm sm:text-base">
                                {item.fullName || 'Thí sinh ẩn danh'}
                              </h3>
                              {item.studentCode && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-sky-400 text-xs font-mono">
                                  MSSV: {item.studentCode}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase">
                                {item.userRole || 'GUEST'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Thời gian: {new Date(item.createdAt).toLocaleString('vi-VN')} • IP: {item.ipAddress || 'Không rõ'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-400 text-xs font-black flex items-center gap-1">
                            <Star size={13} className="fill-current" />
                            <span>{avgScore} / 5.0</span>
                          </div>

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                            title="Xóa bài làm này"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Ratings Pill Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-slate-500 text-[10px] font-bold block">1. UI/UX</span>
                          <span className="text-indigo-400 font-black">{item.ratingUI} điểm ★</span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-slate-500 text-[10px] font-bold block">2. Tốc độ</span>
                          <span className="text-emerald-400 font-black">{item.ratingSpeed} điểm ★</span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-slate-500 text-[10px] font-bold block">3. Dễ sử dụng</span>
                          <span className="text-sky-400 font-black">{item.ratingUsability} điểm ★</span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-slate-500 text-[10px] font-bold block">4. Hữu ích</span>
                          <span className="text-purple-400 font-black">{item.ratingUsefulness} điểm ★</span>
                        </div>

                        <div className="space-y-0.5 col-span-2 sm:col-span-1">
                          <span className="text-slate-500 text-[10px] font-bold block">5. Giới thiệu</span>
                          <span className="text-slate-300 font-bold truncate block">{item.recommend}</span>
                        </div>
                      </div>

                      {/* Feedback box */}
                      {item.feedback && item.feedback.trim().length > 0 ? (
                        <div className="bg-pink-950/20 border border-pink-900/40 p-4 rounded-2xl space-y-1.5 relative group">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                              <MessageSquare size={14} /> Góp ý thay đổi & bổ sung (Câu 6):
                            </span>
                            <button
                              onClick={() => handleCopyFeedback(item.feedback!)}
                              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 transition"
                            >
                              <Copy size={12} /> Sa chép
                            </button>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {item.feedback}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-600 italic">Không gửi góp ý ở Câu 6.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: DEDICATED FEEDBACKS ONLY VIEW --- */}
        {activeTab === 'feedbacks' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare size={18} className="text-pink-400" />
                  Danh Sách Lời Góp Ý & Đề Xuất Nâng Cấp (Câu 6)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tổng hợp tất cả {feedbackResponses.length} ý kiến góp ý mở của người dùng
                </p>
              </div>
            </div>

            {feedbackResponses.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-2">
                <CheckCircle2 size={36} className="mx-auto opacity-30" />
                <p className="text-sm font-medium">Chưa có người dùng nào để lại lời góp ý ở Câu 6.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {feedbackResponses.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{item.fullName || 'Thí sinh ẩn danh'}</span>
                        {item.studentCode && (
                          <span className="text-[10px] font-mono bg-slate-800 text-sky-400 px-2 py-0.5 rounded-md">
                            {item.studentCode}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                          {item.userRole || 'GUEST'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </span>
                        <button
                          onClick={() => handleCopyFeedback(item.feedback!)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Chép góp ý"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-wrap bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                      "{item.feedback}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 4: SETTING QUESTIONS --- */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <ListChecks size={20} className="text-amber-400" />
                  Thiết lập danh sách câu hỏi khảo sát
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Thêm bớt số lượng câu hỏi trắc nghiệm (ABCD) hoặc câu hỏi tự luận mở, tùy chỉnh nội dung và loại câu hỏi.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleAddChoiceQuestion}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Plus size={16} />
                  Thêm câu Trắc nghiệm
                </button>
                <button
                  onClick={handleAddTextQuestion}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Type size={16} />
                  Thêm câu Tự luận
                </button>
                <button
                  onClick={handleUpdateQuestions}
                  disabled={savingQuestions || loadingQuestions}
                  className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
                >
                  {savingQuestions ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Lưu tất cả
                    </>
                  )}
                </button>
              </div>
            </div>

            {loadingQuestions ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={36} className="animate-spin text-amber-400" />
                <p className="text-xs text-slate-500 font-bold">Đang tải cấu hình câu hỏi...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, qIndex) => {
                  const isChoiceType = q.type !== 'TEXT' && q.choices && q.choices.length > 0;
                  return (
                    <div key={q.key || qIndex} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-slate-700 transition relative">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-black">
                            {q.key}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                            isChoiceType 
                              ? 'bg-amber-950/40 text-amber-400 border-amber-800/40' 
                              : 'bg-sky-950/40 text-sky-400 border-sky-800/40'
                          }`}>
                            {isChoiceType ? 'Trắc nghiệm ABCD' : 'Tự luận (Văn bản)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={q.type || (isChoiceType ? 'CHOICE' : 'TEXT')}
                            onChange={(e) => {
                              const updated = [...questions];
                              const newType = e.target.value;
                              updated[qIndex].type = newType;
                              if (newType === 'CHOICE' && (!updated[qIndex].choices || updated[qIndex].choices.length === 0)) {
                                updated[qIndex].choices = [
                                  { key: 'A', score: 5, label: 'Rất tốt / Rất hài lòng' },
                                  { key: 'B', score: 4, label: 'Tốt / Hài lòng' },
                                  { key: 'C', score: 3, label: 'Bình thường / Tạm ổn' },
                                  { key: 'D', score: 2, label: 'Cần cải thiện' },
                                ];
                              }
                              setQuestions(updated);
                            }}
                            className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
                          >
                            <option value="CHOICE">Trắc nghiệm (Có đáp án)</option>
                            <option value="TEXT">Tự luận (Nhập ý kiến)</option>
                          </select>

                          <button
                            onClick={() => handleDeleteQuestion(qIndex)}
                            className="p-2 rounded-lg bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                            title="Xóa câu hỏi này"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiêu đề câu hỏi</label>
                        <input
                          type="text"
                          value={q.title}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[qIndex].title = e.target.value;
                            setQuestions(updated);
                          }}
                          placeholder="Nhập tiêu đề câu hỏi..."
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition"
                        />
                      </div>

                      {isChoiceType ? (
                        <div className="space-y-3 pt-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Các phương án lựa chọn trắc nghiệm</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {q.choices.map((choice: any, choiceIdx: number) => (
                              <div key={choice.key || choiceIdx} className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                                  <span className="text-xs font-black text-amber-400">Đáp án {choice.key}</span>
                                  {choice.score !== undefined && (
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-bold">
                                      Điểm: {choice.score}
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={choice.label}
                                  onChange={(e) => {
                                    const updated = [...questions];
                                    updated[qIndex].choices[choiceIdx].label = e.target.value;
                                    setQuestions(updated);
                                  }}
                                  placeholder={`Nhập nhãn đáp án ${choice.key}...`}
                                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 transition"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 flex items-center gap-3">
                          <Type size={18} className="text-sky-400 shrink-0" />
                          <p className="text-xs text-slate-400">
                            Đây là câu hỏi tự luận. Người khảo sát sẽ thấy một ô nhập văn bản lớn (Textarea) để viết câu trả lời.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAddChoiceQuestion}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus size={16} />
                      Thêm câu Trắc nghiệm
                    </button>
                    <button
                      onClick={handleAddTextQuestion}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Type size={16} />
                      Thêm câu Tự luận
                    </button>
                  </div>

                  <button
                    onClick={handleUpdateQuestions}
                    disabled={savingQuestions || loadingQuestions}
                    className="py-3 px-8 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition"
                  >
                    {savingQuestions ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Lưu tất cả cấu hình câu hỏi
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* --- RATING BREAKDOWN CARD COMPONENT --- */
const RatingBreakdownCard = ({
  title,
  icon,
  avg,
  breakdown,
  total,
  barColor,
}: {
  title: string;
  icon: React.ReactNode;
  avg: number;
  breakdown: Record<number, number>;
  total: number;
  barColor: string;
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs sm:text-sm font-bold text-white">{title}</h3>
        </div>
        <span className="text-sm font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          {avg} ★
        </span>
      </div>

      <div className="space-y-2.5 pt-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = breakdown[star] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={star} className="flex items-center gap-3 text-xs">
              <span className="w-10 font-bold text-slate-400 flex items-center gap-1 shrink-0">
                {star} <Star size={12} className="text-amber-400 fill-amber-400" />
              </span>

              <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`${barColor} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <span className="w-14 text-right font-mono font-bold text-slate-300 text-[11px] shrink-0">
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SurveyAdmin;
