import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CalendarCheck, Award, ClipboardList,
  BookOpen, Bell, ChevronDown,
  TrendingUp, TrendingDown, Minus,
  Clock, Info,
  CalendarDays, UserCheck, FileText, Zap,
  RefreshCw, Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardStats {
  totalStudents: number;
  pendingDRL: number;
  activeSessions: number;
  avgDRL: number | null;
}

interface ActivityItem {
  id: string;
  type: 'attendance' | 'drl' | 'student' | 'class' | 'event';
  title: string;
  subtitle: string;
  time: string;
  color: string;
}

interface NotificationItem {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  time: string;
}

interface ChartPoint { date: string; value: number }

interface DashboardPayload {
  stats: DashboardStats;
  activeSemester: string;
  activities: ActivityItem[];
  notifications: NotificationItem[];
  chartData: ChartPoint[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'Chào buổi sáng';
  if (h >= 11 && h < 14) return 'Chào buổi trưa';
  if (h >= 14 && h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

const formatDate = () =>
  new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date());

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  trend?: { value: number; label: string } | null;
  to?: string;
  delay?: number;
  loading?: boolean;
}

const StatCard = ({ title, value, icon: Icon, gradient, iconBg, trend, to, delay = 0, loading }: StatCardProps) => {
  const TrendIcon = trend ? (trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus) : null;
  const trendColor = trend ? (trend.value > 0 ? 'text-emerald-600' : trend.value < 0 ? 'text-red-500' : 'text-slate-400') : '';

  if (loading) return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
      <Skeleton className="h-12 w-12 rounded-2xl" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="group relative bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
    >
      {/* gradient accent */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${gradient}`} />

      <div className="relative flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${iconBg}`}>
          <Icon size={22} className="text-white" />
        </div>
        {TrendIcon && trend && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trendColor} bg-slate-50 rounded-full px-2 py-1`}>
            <TrendIcon size={12} />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-black text-slate-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
      </h3>
      {trend && (
        <p className="text-xs text-slate-400">{trend.label}</p>
      )}

      {to && (
        <Link
          to={to}
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 group/link"
        >
          Xem chi tiết
          <span className="group-hover/link:translate-x-0.5 transition-transform duration-200">→</span>
        </Link>
      )}
    </motion.div>
  );
};

// ─── Quick Action Card ────────────────────────────────────────────────────────
interface QuickActionProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  to: string;
  iconBg: string;
}

const QuickAction = ({ title, subtitle, icon: Icon, to, iconBg }: QuickActionProps) => (
  <Link
    to={to}
    className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5"
  >
    <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>
      <Icon size={18} className="text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-white font-bold text-sm truncate">{title}</p>
      <p className="text-blue-100 text-xs truncate">{subtitle}</p>
    </div>
    <div className="ml-auto text-white/40 group-hover:text-white/80 transition-colors shrink-0">→</div>
  </Link>
);

// ─── Activity Item ────────────────────────────────────────────────────────────
const ActivityRow = ({ item, delay }: { item: ActivityItem; delay: number }) => {
  const icons: Record<string, React.ElementType> = {
    attendance: CalendarCheck, drl: FileText,
    student: UserCheck, class: BookOpen, event: CalendarDays,
  };
  const ItemIcon = icons[item.type] || Bell;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-start gap-3 group"
    >
      <div className={`mt-0.5 p-2 rounded-xl ${item.color} shrink-0`}>
        <ItemIcon size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
        <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>
      </div>
      <span className="text-xs text-slate-400 shrink-0 mt-0.5 flex items-center gap-1">
        <Clock size={10} /> {item.time}
      </span>
    </motion.div>
  );
};

// ─── Notification Item ────────────────────────────────────────────────────────
const NotifRow = ({ item, delay }: { item: NotificationItem; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors group"
  >
    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
      <Info size={14} className="text-blue-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
      <p className="text-xs text-slate-400">{item.time}</p>
    </div>
    <span className={`text-[10px] font-black px-2 py-1 rounded-full shrink-0 ${item.badgeColor}`}>
      {item.badge}
    </span>
  </motion.div>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-black text-slate-900">{payload[0].value} phiên</p>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [activeSemester, setActiveSemester] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get<DashboardPayload>('/students/dashboard-stats');
      setStats(res.data.stats);
      setActiveSemester(res.data.activeSemester || '');
      setActivities(res.data.activities || []);
      setNotifications(res.data.notifications || []);
      setChartData(res.data.chartData || []);

    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ─── Stat Cards config (only show if value > 0 or not null) ───
  const statCards = [
    {
      key: 'students',
      title: 'Tổng sinh viên',
      value: stats?.totalStudents ?? 0,
      icon: Users,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
      iconBg: 'bg-blue-500',
      trend: { value: 12, label: 'so với tuần trước' },
      to: '/students',
      show: true,
    },
    {
      key: 'drl',
      title: 'Phiếu DRL chờ duyệt',
      value: stats?.pendingDRL ?? 0,
      icon: ClipboardList,
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
      iconBg: 'bg-amber-500',
      trend: { value: -4, label: 'so với tuần trước' },
      to: '/drl',
      show: true,
    },
    {
      key: 'sessions',
      title: 'Phiên điểm danh mở',
      value: stats?.activeSessions ?? 0,
      icon: CalendarCheck,
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-500',
      trend: { value: 8, label: 'so với tuần trước' },
      to: '/attendance/manage/class',
      show: true,
    },
    {
      key: 'drl-avg',
      title: 'Điểm DRL TB',
      value: stats?.avgDRL !== null && stats?.avgDRL !== undefined ? `${stats.avgDRL}đ` : '—',
      icon: Award,
      gradient: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      iconBg: 'bg-purple-500',
      trend: null,
      to: undefined,
      show: true,
    },
  ];

  const quickActions: QuickActionProps[] = [
    { title: 'Tạo phiên điểm danh', subtitle: 'Tạo mới phiên điểm danh', icon: CalendarCheck, to: '/attendance/manage/class', iconBg: 'bg-white/20' },
    { title: 'Duyệt phiếu DRL', subtitle: 'Xem và duyệt phiếu DRL', icon: ClipboardList, to: '/drl', iconBg: 'bg-white/20' },
    { title: 'Quản lý sinh viên', subtitle: 'Quản lý thông tin sinh viên', icon: Users, to: '/students', iconBg: 'bg-white/20' },
    { title: 'Quản lý lớp học', subtitle: 'Quản lý danh sách lớp học', icon: BookOpen, to: '/classes', iconBg: 'bg-white/20' },
  ];

  const showChart = chartData.length > 0 && chartData.some(d => d.value > 0);
  const showActivities = activities.length > 0;
  const showNotifications = notifications.length > 0;

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {getGreeting()}, <span className="text-blue-600">{user?.name?.split(' ').slice(-2).join(' ')}</span> 👋
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Đây là tổng quan hoạt động học tập của bạn hôm nay.</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Refresh button */}
          <button
            onClick={() => fetchDashboard(true)}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm hover:shadow-md transition-all"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {/* Active semester badge */}
          {activeSemester && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 shadow-sm text-xs font-bold text-blue-600">
              <Sparkles size={13} className="text-blue-500" />
              <span>{activeSemester}</span>
            </div>
          )}

          {/* Date badge */}
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm text-xs font-bold text-slate-600">
            <CalendarDays size={13} className="text-blue-500" />
            <span className="hidden sm:inline">{formatDate()}</span>
            <span className="sm:hidden">{new Date().toLocaleDateString('vi-VN')}</span>
            <ChevronDown size={12} className="text-slate-400" />
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.filter(c => c.show).map((card, i) => (
          <StatCard
            key={card.key}
            title={card.title}
            value={card.value}
            icon={card.icon}
            gradient={card.gradient}
            iconBg={card.iconBg}
            trend={card.trend}
            to={card.to}
            delay={i * 0.08}
            loading={loading}
          />
        ))}
      </div>

      {/* ── Chart + Quick Actions ───────────────────────────────── */}
      <div className={`grid gap-5 ${showChart ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>

        {/* Chart */}
        <AnimatePresence>
          {showChart && (
            <motion.div
              key="chart"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-black text-slate-900">Biểu đồ thống kê hoạt động</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Số phiên điểm danh theo ngày</p>
                </div>
                <div className="flex gap-2">
                  {['7 ngày', '30 ngày', 'Học kỳ'].map(label => (
                    <button key={label} className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${label === '7 ngày' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#areaGrad)"
                    dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }}
                    activeDot={{ fill: '#3b82f6', r: 6, strokeWidth: 3, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className={`bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 space-y-3 ${!showChart ? 'lg:col-span-1 max-w-sm' : ''}`}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-blue-200" />
            <h3 className="font-black text-white text-sm uppercase tracking-widest">Thao tác nhanh</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {quickActions.map(action => (
              <QuickAction key={action.to} {...action} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Activities + Notifications ──────────────────────────── */}
      <AnimatePresence>
        {(showActivities || showNotifications) && (
          <div className={`grid gap-5 ${showActivities && showNotifications ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

            {/* Activities */}
            {showActivities && (
              <motion.div
                key="activities"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-black text-slate-900">Hoạt động gần đây</h3>
                  <Link to="/attendance/manage/class" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                    Xem tất cả →
                  </Link>
                </div>
                <div className="space-y-4">
                  {activities.map((item, i) => (
                    <ActivityRow key={item.id} item={item} delay={0.5 + i * 0.05} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Notifications */}
            {showNotifications && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900">Thông báo</h3>
                    <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                      {notifications.length}
                    </span>
                  </div>
                  <Link to="/drl" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                    Xem tất cả →
                  </Link>
                </div>
                <div className="space-y-1">
                  {notifications.map((item, i) => (
                    <NotifRow key={item.id} item={item} delay={0.6 + i * 0.05} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* ── Last updated ────────────────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-xs text-slate-300 font-medium"
      >
        Cập nhật lần cuối: {lastUpdated.toLocaleTimeString('vi-VN')}
      </motion.p>
    </div>
  );
};

export default Dashboard;
