import { useEffect, useState } from 'react';
import { Users, CalendarCheck, Award, ClipboardList, TrendingUp, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, delay, to }: any) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm card-hover">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-900">{value}</h3>
      </div>
      <div className={`p-4 rounded-2xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    {to && (
      <Link to={to} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline">
        Xem chi tiết →
      </Link>
    )}
  </motion.div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingScores: 0,
    approvedScores: 0,
    activeSessions: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [studentRes, scoreRes, sessionRes] = await Promise.all([
          api.get('/students'),
          api.get('/training?status=PENDING'),
          api.get('/attendance/sessions/active'),
        ]);
        setStats({
          totalStudents: studentRes.data.length,
          pendingScores: Array.isArray(scoreRes.data) ? scoreRes.data.length : 0,
          approvedScores: 0,
          activeSessions: Array.isArray(sessionRes.data) ? sessionRes.data.length : 0,
        });
      } catch (e) { /* silent */ }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 mt-4">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-1">Thống kê hệ thống</h2>
        <p className="text-slate-500">Tổng quan toàn bộ hoạt động học tập hôm nay</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Tổng sinh viên" value={stats.totalStudents} icon={Users} color="bg-blue-500" delay={0.1} to="/students" />
        <StatCard title="Phiếu DRL chờ duyệt" value={stats.pendingScores} icon={ClipboardList} color="bg-amber-500" delay={0.2} to="/drl" />
        <StatCard title="Phiên điểm danh đang mở" value={stats.activeSessions} icon={CalendarCheck} color="bg-emerald-500" delay={0.3} to="/attendance/manage" />
        <StatCard title="Điểm DRL TB" value="—" icon={Award} color="bg-purple-500" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-64 flex flex-col justify-center items-center text-slate-400 border-dashed">
          <TrendingUp size={48} className="mb-4 opacity-20" />
          <p className="font-medium">Biểu đồ thống kê sẽ được cập nhật trong phiên bản tiếp theo</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-primary-600 to-primary-800 p-6 rounded-3xl text-white space-y-4">
          <h4 className="font-bold text-primary-100 text-sm uppercase tracking-widest">Thao tác nhanh</h4>
          <div className="space-y-3">
            <Link to="/attendance/manage" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-all text-sm font-bold">
              <CalendarCheck size={16} /> Tạo phiên điểm danh
            </Link>
            <Link to="/drl" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-all text-sm font-bold">
              <ClipboardList size={16} /> Duyệt phiếu DRL
            </Link>
            <Link to="/students" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-all text-sm font-bold">
              <Users size={16} /> Quản lý sinh viên
            </Link>
            <Link to="/classes" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-all text-sm font-bold">
              <BookOpen size={16} /> Quản lý lớp học
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
