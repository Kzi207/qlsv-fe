import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const MainLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar isOpen={isSidebarOpen} toggle={() => setSidebarOpen(!isSidebarOpen)} />
      
      <div className="lg:ml-80 min-h-screen flex flex-col transition-all duration-500">
        {/* Mobile Header - Ultra Clean */}
        <header className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="h-11 w-11 shrink-0 flex items-center justify-center bg-slate-50 text-slate-600 rounded-xl active:scale-90 transition-all border border-slate-100 shadow-sm"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
               <div className="h-10 w-10 shrink-0 flex items-center justify-center overflow-hidden">
                  <img src="/logo-qlsv.png" alt="Logo" className="w-full h-full object-contain" />
               </div>
               <div className="flex flex-col min-w-0">
                 <p className="text-[10px] font-extrabold uppercase tracking-tight text-slate-800 truncate leading-none">
                   ĐH Kỹ Thuật - Công Nghệ Cần Thơ
                 </p>
                 <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-0.5 leading-none">
                   Khoa Kỹ Thuật Cơ Khí
                 </span>
               </div>
            </div>
          </div>
          
          <div className="h-11 w-11 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-blue-600 text-sm shadow-sm">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
        </header>

        <main className="flex-1 p-3 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
