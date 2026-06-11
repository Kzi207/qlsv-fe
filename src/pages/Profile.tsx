import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { User, Lock, Mail, Shield, Save, Loader2, Sparkles, Phone, AtSign } from 'lucide-react';

const Profile = () => {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setFormData({
      username: user?.username || '',
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch('/auth/profile', formData);
      setUser(user ? { ...user, ...res.data } : res.data);
      toast.success('Cập nhật thông tin thành công');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      return toast.error('Mật khẩu xác nhận không khớp');
    }
    setPassLoading(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword,
      });
      toast.success('Đổi mật khẩu thành công');
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể đổi mật khẩu');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 md:space-y-8 animate-fade-in pb-20">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-widest">
           <User size={10} />
           Account Settings
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Thông tin cá nhân</h2>
        <p className="text-slate-500 text-xs md:text-sm font-medium">Quản lý thông tin tài khoản và bảo mật</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Basic Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-6 md:p-8">
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
              <Shield size={16} className="text-blue-600" /> Thông tin cơ bản
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên đăng nhập</label>
                <div className="relative group">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <AtSign size={16} />
                   </div>
                   <input
                     type="text"
                     value={formData.username}
                     onChange={e => setFormData({ ...formData, username: e.target.value })}
                     className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm transition-all bg-slate-50/50 focus:bg-white"
                     placeholder="Tên đăng nhập"
                     required
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên hiển thị</label>
                <div className="relative group">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <User size={16} />
                   </div>
                   <input
                     type="text"
                     value={formData.name}
                     onChange={e => setFormData({ ...formData, name: e.target.value })}
                     className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm transition-all bg-slate-50/50 focus:bg-white"
                     placeholder="Tên hiển thị của bạn"
                     required
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <div className="relative group">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Mail size={16} />
                   </div>
                   <input
                     type="email"
                     value={formData.email}
                     onChange={e => setFormData({ ...formData, email: e.target.value })}
                     className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm transition-all bg-slate-50/50 focus:bg-white"
                     placeholder="Email liên hệ"
                   />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                <div className="relative group">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Phone size={16} />
                   </div>
                   <input
                     type="text"
                     value={formData.phone}
                     onChange={e => setFormData({ ...formData, phone: e.target.value })}
                     className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm transition-all bg-slate-50/50 focus:bg-white"
                     placeholder="Số điện thoại liên hệ"
                   />
                </div>
              </div>

              <div className="pt-2">
                 <button
                   type="submit"
                   disabled={loading}
                   className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20 disabled:opacity-50"
                 >
                   {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                   Lưu thay đổi
                 </button>
              </div>
            </form>
          </div>

          {/* Account Status Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all duration-700" />
             <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Sparkles size={20} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Vai trò hiện tại</p>
                      <p className="text-sm font-black uppercase tracking-tight">
                         {user?.role?.toUpperCase() === 'ADMIN' ? 'Administrator' : user?.role?.toUpperCase() === 'BCH' ? 'Ban Cán Sự' : 'Sinh viên'}
                      </p>
                   </div>
                </div>
                <div className="pt-2">
                   <p className="text-[10px] text-blue-100 font-medium">Tài khoản của bạn đã được xác thực và bảo vệ bởi hệ thống QLSV Pro.</p>
                </div>
             </div>
          </div>
        </div>

        {/* Password Management */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-6 md:p-8">
           <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
             <Lock size={16} className="text-indigo-600" /> Đổi mật khẩu
           </h3>
           <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={passData.currentPassword}
                  onChange={e => setPassData({ ...passData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm transition-all bg-slate-50/50 focus:bg-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                <input
                  type="password"
                  value={passData.newPassword}
                  onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm transition-all bg-slate-50/50 focus:bg-white"
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={passData.confirmPassword}
                  onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm transition-all bg-slate-50/50 focus:bg-white"
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>

              <div className="pt-2">
                 <button
                   type="submit"
                   disabled={passLoading}
                   className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                 >
                   {passLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                   Cập nhật mật khẩu
                 </button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
