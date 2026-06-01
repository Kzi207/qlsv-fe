import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  QrCode, Award, CalendarCheck,
  Bell, LogOut, TrendingUp, Users,
  ChevronRight, Sparkles, X, CheckCheck, Trash2, Inbox,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import api from '../api/axios';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StudentStats {
  drl: number | null;
  absences: number;
  submitted: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Sk = ({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) => (
  <div className={`animate-pulse bg-slate-100 rounded-lg ${w} ${h}`} />
);

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({
  label, value, unit, icon, bgIcon, loading, delay
}: {
  label: string; value: string | number; unit?: string;
  icon: React.ReactNode; bgIcon: string; loading?: boolean; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay ?? 0, duration: 0.4, ease: 'easeOut' }}
    className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-300"
  >
    <div className="flex justify-between items-start mb-3">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        {loading ? <Sk w="w-16" h="h-8" /> : (
          <p className="text-3xl font-black text-slate-900 leading-none">
            {value}
            {unit && <span className="text-sm text-slate-400 ml-1 font-bold">{unit}</span>}
          </p>
        )}
      </div>
      <div className={`p-2.5 rounded-2xl ${bgIcon}`}>
        {icon}
      </div>
    </div>
    <p className="text-[11px] text-slate-400 font-medium">Cập nhật mới nhất</p>
  </motion.div>
);

// ─── Feature Card ──────────────────────────────────────────────────────────────
const FeatureCard = ({
  title, subtitle, tag, icon, iconBg, arrowBg, arrowColor, to, delay
}: {
  title: string; subtitle: string; tag: string;
  icon: React.ReactNode; iconBg: string;
  arrowBg: string; arrowColor: string;
  to: string; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay ?? 0, duration: 0.4 }}
  >
    <Link
      to={to}
      className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 flex items-center gap-5"
    >
      <div className={`w-16 h-16 ${iconBg} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-black text-slate-900">{title}</h4>
        <p className="text-xs text-slate-400 font-medium mt-1">{subtitle}</p>
        <span className={`mt-2 inline-block px-3 py-1 text-[10px] font-black rounded-full ${arrowBg} ${arrowColor}`}>
          {tag}
        </span>
      </div>
      <div className={`w-9 h-9 rounded-full ${arrowBg} flex items-center justify-center ${arrowColor} group-hover:scale-110 transition-all duration-200 shrink-0`}>
        <ChevronRight size={18} />
      </div>
    </Link>
  </motion.div>
);

// ─── Main StudentDashboard ─────────────────────────────────────────────────────
interface NotificationItem {
  id: string;
  title: string;
  content: string;
  time: string;
  type: 'attendance' | 'evaluation' | 'system' | 'event';
  read: boolean;
}

const StudentDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [activeSemester, setActiveSemester] = useState<string>('Đang tải...');
  const [loading, setLoading] = useState(true);
  
  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const firstName = user?.name?.split(' ').pop() ?? '';
  const firstChar = user?.name?.[0]?.toUpperCase() ?? 'S';

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, semestersRes, activeSessionsRes] = await Promise.allSettled([
        api.get('/students/stats'),
        api.get('/semesters'),
        api.get('/attendance/sessions/active'),
      ]);
      
      let hasSubmitted = false;
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
        hasSubmitted = statsRes.value.data.submitted;
      } else {
        setStats({ drl: null, absences: 0, submitted: false });
      }

      if (semestersRes.status === 'fulfilled' && semestersRes.value.data.length > 0) {
        setActiveSemester(semestersRes.value.data[0].name);
      } else {
        setActiveSemester('Chưa có học kỳ');
      }

      // Generate dynamic notifications from real endpoints
      const list: NotificationItem[] = [];
      
      if (activeSessionsRes.status === 'fulfilled' && Array.isArray(activeSessionsRes.value.data)) {
        activeSessionsRes.value.data.forEach((s: any, idx: number) => {
          list.push({
            id: `session-${s.id || idx}`,
            title: 'Phiên điểm danh mới!',
            content: `Điểm danh môn học/hoạt động "${s.title || 'Điểm danh'}" đang mở. Quét mã QR để điểm danh ngay!`,
            time: 'Mới',
            type: 'attendance',
            read: false,
          });
        });
      }

      list.push({
        id: 'portal-eval',
        title: 'Cổng đánh giá ĐRL',
        content: hasSubmitted
          ? 'Phiếu tự đánh giá ĐRL của bạn đã được ghi nhận thành công và đang chờ duyệt.'
          : 'Hãy nhanh chóng hoàn thiện phiếu tự đánh giá ĐRL trực tuyến của học kỳ này.',
        time: 'Hôm nay',
        type: 'evaluation',
        read: hasSubmitted,
      });

      list.push({
        id: 'system-intro',
        title: 'Chào mừng thành viên mới',
        content: 'Apex Academic OS đã cập nhật giao diện SaaS Premium hoàn toàn mới. Hãy bắt đầu trải nghiệm!',
        time: 'Hôm qua',
        type: 'system',
        read: true,
      });

      setNotifications(list);
    } catch {
      setStats({ drl: null, absences: 0, submitted: false });
      setActiveSemester('Lỗi học kỳ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = notifications.filter(n => {
    if (notifTab === 'unread') return !n.read;
    return true;
  });

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    /* pb-24 lg:pb-8 — padding bottom đủ chỗ cho bottom nav ở mobile */
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-8">

      {/* ── Top App Bar ────────────────────────────────────────────
          Hiển thị trên mọi màn hình; sidebar desktop đã có trong MainLayout    */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="flex justify-between items-center px-4 md:px-6 h-16 w-full max-w-6xl mx-auto">
          {/* Left: Avatar + Greeting */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20 shrink-0">
              {firstChar}
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Xin chào,</p>
              <p className="text-sm font-black text-blue-600 leading-tight">{firstName}</p>
            </div>
          </div>

          {/* Right: Notif + Semester tag */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative p-2.5 rounded-2xl hover:bg-slate-50 transition-colors active:scale-95 duration-200"
            >
              <Bell size={20} className="text-blue-600" />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>

            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5 text-xs font-bold text-slate-600">
              <Sparkles size={12} className="text-blue-500" />
              {activeSemester}
            </div>

            {/* Desktop logout (sidebar has it too, this is extra shortcut) */}
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 px-3 py-2 rounded-xl transition-all"
            >
              <LogOut size={14} />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* ── Page Content ──────────────────────────────────────────── */}
      <main className="w-full max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-8">

        {/* Welcome */}
        <motion.section
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {getGreeting()}, <span className="text-blue-600">{firstName.toUpperCase()}</span> 👋
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Chúc bạn một ngày học tập hiệu quả!
          </p>
        </motion.section>

        {/* Hero Banner + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Hero Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 md:p-8 min-h-[180px] flex flex-col justify-between group"
          >
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-white/5" />
            <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 mb-3">
                <Sparkles size={12} className="text-blue-200" />
                <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Student Portal</span>
              </div>
              <h2 className="text-white text-lg md:text-xl font-black max-w-xs leading-snug">
                Cố gắng hôm nay vì<br />một tương lai tốt đẹp! 🚀
              </h2>
            </div>

            <div className="relative z-10 flex items-center gap-3 mt-4">
              <Link
                to="/attendance/scan"
                className="flex items-center gap-2 bg-white text-blue-700 font-black text-sm px-4 py-2.5 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg shadow-blue-900/20"
              >
                <QrCode size={16} />
                Điểm danh ngay
              </Link>
              <Link
                to="/training/evaluation/self"
                className="flex items-center gap-2 bg-white/15 text-white font-bold text-sm px-4 py-2.5 rounded-2xl hover:bg-white/25 transition-colors border border-white/20"
              >
                Nộp DRL
              </Link>
            </div>
          </motion.div>

          {/* Stats column */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <StatCard
              label="Điểm DRL"
              value={stats?.drl !== null && stats?.drl !== undefined ? stats.drl : '—'}
              unit={stats?.drl !== null && stats?.drl !== undefined ? 'đ' : undefined}
              icon={<TrendingUp size={20} className="text-emerald-600" />}
              bgIcon="bg-emerald-50"
              loading={loading}
              delay={0.2}
            />
            <StatCard
              label="Vắng mặt"
              value={stats?.absences ?? 0}
              unit="buổi"
              icon={<Users size={20} className="text-blue-600" />}
              bgIcon="bg-blue-50"
              loading={loading}
              delay={0.3}
            />
          </div>
        </div>

        {/* Feature Cards */}
        <section className="space-y-4">
          <h3 className="text-lg font-black text-slate-900">Tính năng chính</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard
              title="Điểm danh ngay"
              subtitle="Quét mã QR tại lớp để xác nhận có mặt"
              tag="Nhanh chóng • Chính xác"
              icon={<QrCode size={32} className="text-blue-600" />}
              iconBg="bg-blue-50"
              arrowBg="bg-blue-50"
              arrowColor="text-blue-600"
              to="/attendance/scan"
              delay={0.4}
            />
            <FeatureCard
              title="Phiếu điểm DRL"
              subtitle="Kê khai & theo dõi kết quả rèn luyện"
              tag="Minh bạch • Dễ dàng"
              icon={<Award size={32} className="text-purple-600" />}
              iconBg="bg-purple-50"
              arrowBg="bg-purple-50"
              arrowColor="text-purple-600"
              to="/training/evaluation/self"
              delay={0.5}
            />
            <FeatureCard
              title="Chuyên cần"
              subtitle="Xem lịch sử điểm danh và thống kê vắng mặt"
              tag="Theo dõi • Cập nhật"
              icon={<CalendarCheck size={32} className="text-emerald-600" />}
              iconBg="bg-emerald-50"
              arrowBg="bg-emerald-50"
              arrowColor="text-emerald-600"
              to="/attendance"
              delay={0.55}
            />
            <FeatureCard
              title="Nộp minh chứng"
              subtitle="Upload tài liệu hỗ trợ điểm rèn luyện"
              tag="Bằng chứng • Minh bạch"
              icon={<Sparkles size={32} className="text-amber-600" />}
              iconBg="bg-amber-50"
              arrowBg="bg-amber-50"
              arrowColor="text-amber-600"
              to="/evidence/submit"
              delay={0.6}
            />
          </div>
        </section>

        {/* DRL submission status */}
        <AnimatePresence>
          {stats && !loading && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${stats.submitted ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                <Award size={24} className={stats.submitted ? 'text-emerald-600' : 'text-amber-600'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 text-sm">
                  Phiếu DRL học kỳ này
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {stats.submitted ? 'Bạn đã nộp phiếu DRL. Đang chờ duyệt.' : 'Bạn chưa nộp phiếu DRL học kỳ này.'}
                </p>
              </div>
              <Link
                to="/training/evaluation/self"
                className={`text-xs font-black px-4 py-2 rounded-xl transition-all shrink-0 ${
                  stats.submitted
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
                }`}
              >
                {stats.submitted ? 'Xem lại' : 'Nộp ngay'}
              </Link>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* ── Notification Slide-over Drawer ────────────────────────── */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Backdrop with elegant glassmorphism */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Sidebar drawer panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Trung tâm thông báo</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {unreadCount} thông báo mới
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick Actions & Tabs */}
              <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex gap-2">
                  {(['all', 'unread'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setNotifTab(tab)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-black transition-all ${
                        notifTab === tab
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {tab === 'all' ? 'Tất cả' : 'Chưa đọc'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {notifications.length > 0 && (
                    <>
                      <button
                        onClick={markAllAsRead}
                        title="Đánh dấu tất cả đã đọc"
                        className="p-1.5 rounded-lg bg-white border border-slate-100 text-slate-500 hover:text-blue-600 active:scale-95 transition-all"
                      >
                        <CheckCheck size={14} />
                      </button>
                      <button
                        onClick={clearAllNotifications}
                        title="Xóa tất cả thông báo"
                        className="p-1.5 rounded-lg bg-white border border-slate-100 text-slate-500 hover:text-rose-600 active:scale-95 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Notification feed list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                {filteredNotifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
                      <Inbox size={28} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">Hộp thư trống</p>
                      <p className="text-xs text-slate-400 font-medium max-w-[200px] mt-1 mx-auto">
                        Bạn chưa nhận được thông báo mới nào hoặc đã lọc hết.
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredNotifications.map(notif => (
                    <motion.div
                      layout
                      key={notif.id}
                      onClick={() => {
                        toggleRead(notif.id);
                        if (notif.type === 'attendance') navigate('/attendance/scan');
                        if (notif.type === 'evaluation') navigate('/training/evaluation/self');
                        setShowNotifications(false);
                      }}
                      className={`group p-4 rounded-2xl border text-left cursor-pointer transition-all duration-300 relative overflow-hidden ${
                        notif.read
                          ? 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                          : 'bg-blue-50/20 border-blue-100/50 hover:border-blue-100 shadow-sm'
                      }`}
                    >
                      {/* Unread indicator */}
                      {!notif.read && (
                        <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-600 rounded-full" />
                      )}

                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          notif.type === 'attendance' ? 'bg-blue-50 text-blue-600' :
                          notif.type === 'evaluation' ? 'bg-purple-50 text-purple-600' :
                          notif.type === 'event' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-50 text-slate-600'
                        }`}>
                          {notif.type === 'attendance' ? <QrCode size={16} /> :
                           notif.type === 'evaluation' ? <Award size={16} /> :
                           notif.type === 'event' ? <Sparkles size={16} /> :
                           <Bell size={16} />}
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className={`text-xs font-black tracking-tight ${notif.read ? 'text-slate-900' : 'text-blue-900'}`}>
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                            {notif.content}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold mt-2">
                            {notif.time}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDashboard;
