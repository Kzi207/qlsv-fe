import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  QrCode, 
  ClipboardCheck, 
  History
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  
  // Only show for students on mobile
  if (user?.role?.toUpperCase() !== 'STUDENT') return null;

  const navItems = [
    { name: 'Trang chủ', path: '/', icon: LayoutDashboard },
    { name: 'Quét mã', path: '/attendance/scan', icon: QrCode, highlight: true },
    { name: 'Kết quả', path: '/training', icon: ClipboardCheck },
    { name: 'Lịch sử', path: '/attendance', icon: History },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-6 py-3 z-50 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className="flex flex-col items-center gap-1 group relative"
          >
            <div className={`p-2 rounded-2xl transition-all ${
              item.highlight 
                ? 'bg-primary-600 text-white -mt-8 shadow-lg shadow-primary-500/40 scale-110 active:scale-95' 
                : isActive 
                  ? 'text-primary-600' 
                  : 'text-slate-400 group-hover:text-slate-600'
            }`}>
              <item.icon size={item.highlight ? 24 : 22} />
            </div>
            {!item.highlight && (
              <span className={`text-[10px] font-bold ${isActive ? 'text-primary-600' : 'text-slate-400'}`}>
                {item.name}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
