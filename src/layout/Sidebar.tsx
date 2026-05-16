import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  QrCode, 
  LogOut, 
  Award, 
  CalendarCheck,
  BookOpen,
  ClipboardCheck,
  Calendar,
  UserCheck,
  ChevronRight,
  User
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isOpen, toggle }: { isOpen: boolean; toggle: () => void }) => {
  const location = useLocation();
  const { logout, user } = useAuthStore();

  const role = user?.role?.toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isBch = role === 'BCH';

  const menuGroups = [
    {
      label: 'Chính',
      items: [
        { name: 'Trang chủ', path: '/', icon: LayoutDashboard, roles: ['STUDENT', 'ADMIN', 'BCH'] },
        { name: 'Cá nhân', path: '/profile', icon: User, roles: ['STUDENT', 'ADMIN', 'BCH'] },
      ]
    },
    {
      label: 'Hoạt động',
      items: [
        { name: 'Điểm danh QR', path: isAdmin || isBch ? '/attendance/manage' : '/attendance/scan', icon: QrCode, roles: ['STUDENT', 'ADMIN', 'BCH'] },
        { name: 'Nộp phiếu DRL', path: '/training/evaluation/self', icon: ClipboardCheck, roles: ['STUDENT'] },
        { name: 'Quản lý DRL', path: '/drl', icon: ClipboardCheck, roles: ['ADMIN', 'BCH'] },
      ]
    },
    {
      label: 'Kết quả',
      items: [
        { name: 'Chuyên cần', path: '/attendance', icon: CalendarCheck, roles: ['STUDENT'] },
        { name: 'Điểm rèn luyện', path: '/training', icon: Award, roles: ['STUDENT'] },
      ]
    },
    {
      label: 'Hệ thống',
      items: [
        { name: 'Sinh viên', path: '/students', icon: Users, roles: ['ADMIN', 'BCH'] },
        { name: 'Lớp học', path: '/classes', icon: BookOpen, roles: ['ADMIN', 'BCH'] },
        { name: 'Học kỳ', path: '/semesters', icon: Calendar, roles: ['ADMIN', 'BCH'] },
        { name: 'Tài khoản', path: '/accounts', icon: UserPlus, roles: ['ADMIN'] },
        { name: 'Ban Cán Sự', path: '/bch', icon: UserCheck, roles: ['ADMIN'] },
      ]
    }
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" 
            onClick={toggle} 
          />
        )}
      </AnimatePresence>
      
      <aside className={`fixed top-0 left-0 z-50 h-screen w-80 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 bg-white border-r border-slate-100 shadow-2xl lg:shadow-none`}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-8 pb-4 shrink-0">
             <div className="flex items-center gap-4 group cursor-pointer">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110 duration-500 shadow-lg shadow-slate-200/50">
                   <img src="/logo-qlsv.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-800 leading-tight">Hệ thống quản lý sinh viên</p>
                </div>
             </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar py-4">
             {menuGroups.map((group, idx) => {
               const visibleItems = group.items.filter(item => item.roles.includes(role || ''));
               if (visibleItems.length === 0) return null;

               return (
                 <div key={idx} className="space-y-2">
                    <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.label}</p>
                    <div className="space-y-1">
                       {visibleItems.map((item) => {
                         const active = location.pathname === item.path;
                         return (
                           <Link
                             key={item.path}
                             to={item.path}
                             onClick={() => window.innerWidth < 1024 && toggle()}
                             className={`group flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 ${
                               active 
                                 ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 translate-x-1' 
                                 : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                             }`}
                           >
                             <div className="flex items-center gap-3">
                                <item.icon size={20} className={active ? 'text-white' : 'text-slate-400 group-hover:text-blue-600 transition-colors'} />
                                <span className="text-sm font-black tracking-tight">{item.name}</span>
                             </div>
                             {active && <ChevronRight size={14} className="opacity-50" />}
                           </Link>
                         );
                       })}
                    </div>
                 </div>
               );
             })}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 mt-auto">
             <div className="bg-slate-50 rounded-[2rem] p-4 border border-slate-100 space-y-4">
                <div className="flex items-center gap-3 px-1">
                   <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 border border-slate-100">
                      <span className="font-black text-sm">{user?.name?.[0]?.toUpperCase()}</span>
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-xs truncate">{user?.name}</p>
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
                         {isAdmin ? 'Administrator' : isBch ? 'Ban Cán Sự' : 'Sinh viên'}
                      </p>
                   </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-slate-100 transition-all text-[10px] font-black uppercase tracking-widest group"
                >
                  <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
                  Đăng xuất
                </button>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
