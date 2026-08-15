import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Send,
  CheckCircle2,
  User,
  ArrowLeft,
  Loader2,
  Check,
  Grid,
  HelpCircle,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';
import { normalizeUserRole } from '../utils/auth';



const PublicSurvey = () => {
  const { user } = useAuthStore();
  const normalizedRole = normalizeUserRole(user?.role);

  const [fullName, setFullName] = useState(user?.name || '');
  const [studentCode, setStudentCode] = useState(
    (user as any)?.student?.student_code || (user as any)?.student_code || ''
  );
  const [userRole, setUserRole] = useState<string>(user?.role || 'STUDENT');

  // Dynamic answers state maps
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMobileMatrix, setShowMobileMatrix] = useState(false);

  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  useEffect(() => {
    if (user) {
      if (user.name) setFullName(user.name);
      const code = (user as any)?.student?.student_code || (user as any)?.student_code || user.username || '';
      if (code) setStudentCode(code);
      if (user.role) setUserRole(user.role);
    }
  }, [user]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await api.get('/survey/questions');
        const data = res.data || [];
        const sorted = [...data].sort((a: any, b: any) => {
          const isTextA = a.type === 'TEXT' || !a.choices || a.choices.length === 0;
          const isTextB = b.type === 'TEXT' || !b.choices || b.choices.length === 0;
          if (isTextA === isTextB) return (a.order ?? 0) - (b.order ?? 0);
          return isTextA ? 1 : -1;
        });
        setQuestions(sorted);
      } catch (error) {
        console.error('Lỗi tải câu hỏi khảo sát:', error);
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, []);

  if (normalizedRole === 'ADMIN' || normalizedRole === 'BCH') {
    return <Navigate to="/khaosat/admin" replace />;
  }

  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-bold">Đang tải biểu mẫu khảo sát...</p>
      </div>
    );
  }

  const choiceQuestions = questions.filter((q) => q.type !== 'TEXT' && q.choices && q.choices.length > 0);
  const totalQuestions = questions.length;
  const answeredChoiceCount = choiceQuestions.filter((q) => Boolean(answers[q.key])).length;
  const answeredTextCount = questions.filter((q) => (q.type === 'TEXT' || !q.choices || q.choices.length === 0) && Boolean(textAnswers[q.key]?.trim())).length;
  const answeredCount = answeredChoiceCount + answeredTextCount;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const scrollToQuestion = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowMobileMatrix(false);
  };

  const handleOpenSubmitModal = () => {
    const unansweredIndex = questions.findIndex((q) => {
      const isChoice = q.type !== 'TEXT' && q.choices && q.choices.length > 0;
      return isChoice && !answers[q.key];
    });

    if (unansweredIndex !== -1) {
      const qNum = unansweredIndex + 1;
      toast.error(`Vui lòng chọn đáp án cho Câu ${qNum} trước khi nộp bài!`);
      scrollToQuestion(`question-${qNum}`);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    const q1 = questions.find((q) => q.key === 'Q1');
    const q2 = questions.find((q) => q.key === 'Q2');
    const q3 = questions.find((q) => q.key === 'Q3');
    const q4 = questions.find((q) => q.key === 'Q4');
    const q5 = questions.find((q) => q.key === 'Q5');

    const score1 = q1?.choices?.find((c: any) => c.key === answers['Q1'])?.score || 5;
    const score2 = q2?.choices?.find((c: any) => c.key === answers['Q2'])?.score || 5;
    const score3 = q3?.choices?.find((c: any) => c.key === answers['Q3'])?.score || 5;
    const score4 = q4?.choices?.find((c: any) => c.key === answers['Q5'])?.score || 5;
    const recLabel = q5?.choices?.find((c: any) => c.key === answers['Q5'])?.label || 'Chắc chắn có';

    const firstTextKey = Object.keys(textAnswers)[0];
    const firstTextVal = firstTextKey ? textAnswers[firstTextKey] : '';

    try {
      await api.post('/survey', {
        ratingUI: score1,
        ratingSpeed: score2,
        ratingUsability: score3,
        ratingUsefulness: score4,
        recommend: recLabel,
        feedback: firstTextVal || feedback,
        answers: { ...answers, ...textAnswers },
        fullName: fullName.trim() || undefined,
        studentCode: studentCode.trim() || undefined,
        userRole: userRole || undefined,
      });

      setSubmitted(true);
      toast.success('Nộp bài khảo sát Azota thành công!');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Không thể gửi khảo sát. Vui lòng thử lại!';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] text-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-2xl text-center space-y-6 shadow-2xl animate-fade-in relative overflow-hidden">
          <div className="h-2 bg-[#0066FF] absolute top-0 left-0 right-0" />

          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={48} className="animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#0066FF] font-bold text-xs">
              AZOTA EXAM VERIFIED
            </span>
            <h2 className="text-2xl font-black text-slate-900">ĐÃ NỘP BÀI THÀNH CÔNG</h2>
            <p className="text-slate-600 text-xs leading-relaxed">
              Hệ thống Azota đã tiếp nhận phiếu khảo sát ý kiến đánh giá ứng dụng của bạn. Cảm ơn bạn đã tham gia đóng góp ý kiến!
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Họ và tên:</span>
              <span className="font-bold text-slate-800">{fullName || 'Thí sinh ẩn danh'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Mã sinh viên:</span>
              <span className="font-bold text-slate-800">{studentCode || 'Không có'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Số câu đã trả lời:</span>
              <span className="font-bold text-emerald-600">5/5 câu trắc nghiệm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thời gian nộp:</span>
              <span className="font-bold text-slate-800">{new Date().toLocaleTimeString('vi-VN')}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => {
                setSubmitted(false);
                setFeedback('');
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs"
            >
              Làm lại khảo sát khác
            </button>
            <Link
              to="/"
              className="w-full py-3 px-4 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white font-bold transition text-xs inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <ArrowLeft size={16} />
              Trở về Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-800 font-sans pb-24 selection:bg-[#0066FF] selection:text-white">
      {/* --- AZOTA HEADER BAR --- */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo & Exam Title */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-full bg-white p-0.5 shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden">
              <img
                src={import.meta.env.VITE_LOGIN_LOGO_URL || '/logo-qlsv.png'}
                alt="Logo CTUT"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase text-slate-900 leading-none tracking-tight">
                ĐH KỸ THUẬT - CÔNG NGHỆ CẦN THƠ
              </h2>
              <div className="mt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                  KHOA KỸ THUẬT CƠ KHÍ
                </span>
              </div>
            </div>
          </div>

          {/* Action Header Items */}
          <div className="flex items-center gap-3">
            {/* Home Navigation Button */}
            <Link
              to="/"
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Trang chủ</span>
            </Link>

            {/* Answer Progress Pill */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 border border-slate-200">
              <CheckCircle2 size={15} className="text-[#0066FF]" />
              <span>Đã làm: <strong className="text-[#0066FF]">{answeredCount}/5</strong> ({progressPercent}%)</span>
            </div>

            {/* Mobile Question Matrix Trigger */}
            <button
              onClick={() => setShowMobileMatrix(true)}
              className="lg:hidden p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200"
            >
              <Grid size={18} />
              <span>Ma trận</span>
            </button>

            {/* Top Submit Button */}
            <button
              type="button"
              onClick={handleOpenSubmitModal}
              disabled={submitting}
              className="py-2.5 px-5 rounded-xl bg-[#0066FF] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Nộp bài
            </button>
          </div>
        </div>

        {/* Top Progress Bar */}
        <div className="w-full bg-slate-200 h-1">
          <div
            className="bg-[#0066FF] h-1 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* --- MAIN AZOTA LAYOUT CONTAINER --- */}
      <div className="max-w-7xl mx-auto px-4 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Test Paper (Trang làm bài) */}
        <main className="lg:col-span-8 space-y-6">
          {/* User Info Paper Block */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold uppercase tracking-wider text-[#0066FF]">
              <User size={16} />
              THÔNG TIN THÍ SINH / NGƯỜI THỰC HIỆN
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Họ và tên</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập đầy đủ họ và tên..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0066FF] focus:bg-white transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Mã sinh viên (MSSV)</label>
                <input
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="Nhập mã sinh viên..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0066FF] focus:bg-white transition"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-xs font-bold text-slate-600">Vai trò của bạn</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'STUDENT', label: 'Sinh viên' },
                  { key: 'BCH', label: 'Ban Cán Sự' },
                  { key: 'ADMIN', label: 'Quản trị viên' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setUserRole(item.key)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      userRole === item.key
                        ? 'bg-blue-50 border-[#0066FF] text-[#0066FF]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DYNAMIC QUESTIONS LIST */}
          {questions.map((q, idx) => {
            const qNum = idx + 1;
            const isChoice = q.type !== 'TEXT' && q.choices && q.choices.length > 0;

            if (!isChoice) {
              return (
                <div key={q.key || idx} id={`question-${qNum}`} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <span className="px-3 py-1 rounded-lg bg-pink-50 text-pink-600 border border-pink-200 text-xs font-black uppercase">
                      Câu {qNum} (Tự luận)
                    </span>
                    <span className="text-xs font-bold text-slate-500">Đóng góp ý kiến tự do</span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-relaxed">
                      {q.title}
                    </h3>
                    <textarea
                      value={textAnswers[q.key] || ''}
                      onChange={(e) => setTextAnswers({ ...textAnswers, [q.key]: e.target.value })}
                      rows={4}
                      placeholder="Nhập câu trả lời ý kiến đóng góp chi tiết của bạn tại đây..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0066FF] focus:bg-white transition leading-relaxed resize-none"
                    />
                  </div>
                </div>
              );
            }

            return (
              <div key={q.key || idx} id={`question-${qNum}`}>
                <AzotaQuestionBlock
                  number={qNum}
                  title={q.title}
                  choices={q.choices}
                  selectedKey={answers[q.key] || null}
                  onSelect={(choiceKey) => setAnswers({ ...answers, [q.key]: choiceKey })}
                />
              </div>
            );
          })}
        </main>

        {/* RIGHT COLUMN: Question Matrix Sidebar (Thanh ma trận câu hỏi Azota) */}
        <aside className="hidden lg:block lg:col-span-4 space-y-5">
          <div className="sticky top-20 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Grid size={16} className="text-[#0066FF]" />
                DANH SÁCH CÂU HỎI ({totalQuestions} CÂU)
              </h2>
              <span className="text-xs font-bold text-[#0066FF] bg-blue-50 px-2.5 py-1 rounded-full">
                {answeredCount}/{totalQuestions} Đã trả lời
              </span>
            </div>

            {/* Status indicators legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#0066FF]" />
                <span>Đã trả lời</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 bg-white" />
                <span>Chưa trả lời</span>
              </div>
            </div>

            {/* Question matrix button grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {questions.map((q, idx) => {
                const qNum = idx + 1;
                const isChoice = q.type !== 'TEXT' && q.choices && q.choices.length > 0;
                const isDone = isChoice ? Boolean(answers[q.key]) : Boolean(textAnswers[q.key]?.trim());

                return (
                  <button
                    key={q.key || idx}
                    type="button"
                    onClick={() => scrollToQuestion(`question-${qNum}`)}
                    className={`h-11 rounded-xl font-black text-xs transition flex flex-col items-center justify-center gap-0.5 border ${
                      isDone
                        ? 'bg-[#0066FF] text-white border-[#0066FF] shadow-sm shadow-blue-500/30'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>Câu {qNum}</span>
                    {!isChoice && <span className="text-[9px] opacity-80 font-normal">Tự luận</span>}
                  </button>
                );
              })}
            </div>

            {/* Sidebar Submit Button */}
            <button
              type="button"
              onClick={handleOpenSubmitModal}
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-[#0066FF] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              <Send size={16} />
              Nộp Bài Khảo Sát
            </button>
          </div>
        </aside>
      </div>

      {/* --- AZOTA BOTTOM FLOATING BAR (For easy mobile submission) --- */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 p-3 shadow-lg lg:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-slate-500 block">Đã hoàn thành</span>
            <span className="font-bold text-[#0066FF]">{answeredCount}/{totalQuestions} câu</span>
          </div>

          <button
            type="button"
            onClick={handleOpenSubmitModal}
            disabled={submitting}
            className="py-2.5 px-6 rounded-xl bg-[#0066FF] text-white font-bold text-xs shadow-md flex items-center gap-2"
          >
            <Send size={16} />
            Nộp bài ngay
          </button>
        </div>
      </div>

      {/* --- MOBILE QUESTION MATRIX MODAL --- */}
      {showMobileMatrix && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 space-y-4 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Danh sách câu hỏi làm bài</h3>
              <button
                onClick={() => setShowMobileMatrix(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {questions.map((q, idx) => {
                const qNum = idx + 1;
                const isChoice = q.type !== 'TEXT' && q.choices && q.choices.length > 0;
                const isDone = isChoice ? Boolean(answers[q.key]) : Boolean(textAnswers[q.key]?.trim());

                return (
                  <button
                    key={q.key || idx}
                    type="button"
                    onClick={() => scrollToQuestion(`question-${qNum}`)}
                    className={`h-12 rounded-xl font-bold text-xs transition flex flex-col items-center justify-center gap-0.5 border ${
                      isDone
                        ? 'bg-[#0066FF] text-white border-[#0066FF]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>Câu {qNum}</span>
                    {!isChoice && <span className="text-[9px] opacity-80 font-normal">Tự luận</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- AZOTA CONFIRM SUBMIT MODAL --- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 space-y-5 animate-fade-in shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center font-bold">
                <HelpCircle size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">XÁC NHẬN NỘP BÀI KHẢO SÁT</h3>
                <p className="text-xs text-slate-500">Hệ thống Azota Survey Engine</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Số câu đã hoàn thành:</span>
                <span className="font-bold text-[#0066FF]">{answeredCount} / {totalQuestions} câu</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn nộp kết quả phiếu khảo sát này không?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
              >
                Hủy bỏ (Làm tiếp)
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="py-2.5 px-5 rounded-xl bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-bold transition shadow-md shadow-blue-500/20"
              >
                Xác nhận nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* --- AZOTA QUESTION BLOCK COMPONENT --- */
const AzotaQuestionBlock = ({
  number,
  title,
  choices,
  selectedKey,
  onSelect,
}: {
  number: number;
  title: string;
  choices: { key: string; label: string }[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 transition hover:shadow-md">
      {/* Question Header Pill */}
      <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
        <span className="px-3 py-1 rounded-lg bg-[#0066FF] text-white text-xs font-black shrink-0 shadow-sm shadow-blue-500/20">
          Câu {number}
        </span>
        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
          {title}
        </h3>
      </div>

      {/* Choice Items list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {choices.map((choice) => {
          const isSelected = selectedKey === choice.key;

          return (
            <button
              key={choice.key}
              type="button"
              onClick={() => onSelect(choice.key)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? 'bg-blue-50/70 border-[#0066FF] text-slate-900 ring-1 ring-[#0066FF]'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {/* Option Letter Badge (A, B, C, D) */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                  isSelected
                    ? 'bg-[#0066FF] text-white shadow-sm shadow-blue-500/30'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {choice.key}
              </div>

              {/* Label Text */}
              <span className="text-xs sm:text-sm font-semibold leading-relaxed pt-0.5 flex-1">
                {choice.label}
              </span>

              {/* Active Check Circle */}
              {isSelected && (
                <div className="w-4 h-4 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0 mt-1">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PublicSurvey;
