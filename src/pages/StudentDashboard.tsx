import { Link } from 'react-router-dom';
import { 
  QrCode, 
  Award, 
  TrendingUp, 
  Users, 
  Sparkles, 
  ArrowRight 
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useEffect, useState } from 'react';
import api from '../api/axios';

const StudentDashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/students/stats');
        setStats(res.data);
      } catch (error) {
        console.error('Không thể tải thống kê');
      }
    };
    fetchStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <div className="max-w-4xl space-y-6 md:space-y-8 animate-fade-up">
      {/* Compact Greeting Card */}
      <div className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 p-6 md:p-8 shadow-xl shadow-slate-200/20 group">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-50/50 blur-3xl group-hover:bg-blue-100/50 transition-colors duration-1000" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-widest">
              <Sparkles size={10} />
              Student Portal
            </div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {getGreeting()}, <span className="text-blue-600">{user?.name?.split(' ').pop()}</span> 👋
            </h1>
            <p className="text-slate-400 font-bold text-xs">Chào mừng bạn trở lại với hệ thống quản lý sinh viên.</p>
          </div>

          <div className="flex gap-3">
             <div className="bg-slate-50 p-3 md:p-4 rounded-2xl flex items-center gap-3 min-w-[140px]">
                <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-500 border border-slate-100">
                   <TrendingUp size={18} />
                </div>
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Điểm ĐRL</p>
                   <p className="text-lg font-black text-slate-900 leading-none mt-0.5">{stats?.drl || 0}<span className="text-[10px] text-slate-400 ml-0.5">đ</span></p>
                </div>
             </div>
             <div className="bg-slate-50 p-3 md:p-4 rounded-2xl flex items-center gap-3 min-w-[140px]">
                <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500 border border-slate-100">
                   <Users size={18} />
                </div>
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vắng mặt</p>
                   <p className="text-lg font-black text-slate-900 leading-none mt-0.5">{stats?.attendance || 0}<span className="text-[10px] text-slate-400 ml-0.5">b</span></p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Feature Sections */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900 tracking-tight pl-2">Tính năng chính</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
           <Link to="/attendance" className="card-premium p-4 md:p-5 flex items-center gap-4 card-premium-hover border-none bg-white shadow-lg shadow-slate-200/20 group">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                 <QrCode size={20} />
              </div>
              <div className="flex-1 min-w-0">
                 <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight">Điểm danh ngay</h3>
                 <p className="text-[10px] md:text-xs font-bold text-slate-400">Quét mã QR tại lớp để xác nhận có mặt</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                 <ArrowRight size={16} />
              </div>
           </Link>

           <Link to="/training" className="card-premium p-4 md:p-5 flex items-center gap-4 card-premium-hover border-none bg-white shadow-lg shadow-slate-200/20 group">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                 <Award size={20} />
              </div>
              <div className="flex-1 min-w-0">
                 <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight">Phiếu điểm ĐRL</h3>
                 <p className="text-[10px] md:text-xs font-bold text-slate-400">Kê khai & theo dõi kết quả rèn luyện</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
                 <ArrowRight size={16} />
              </div>
           </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
