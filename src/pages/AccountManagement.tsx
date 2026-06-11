import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Search, Shield, Key, Loader2, UserCheck, UserX, FileDown } from 'lucide-react';
import { downloadXlsxFile } from '../utils/download';

const AccountManagement = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    fetchData();
    fetchClasses();
  }, [classFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students', {
        params: {
          class_id: classFilter || undefined,
          include_user: true,
        }
      });
      setStudents(res.data);
    } catch (error) {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClassOptions(res.data);
    } catch (error) {
      console.error('Không thể tải danh sách lớp');
    }
  };

  const handleResetPassword = async (student: any) => {
    const password = prompt(`Nhập mật khẩu mới cho ${student.name} (MSSV: ${student.student_code}). Để trống để dùng: 1234:`, '1234');
    if (password === null) return;

    try {
      await api.post(`/students/${student.id}/account`, { password });
      toast.success('Đã cập nhật mật khẩu thành công');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDeleteAccount = async (student: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản đăng nhập của ${student.name}? Chú ý: Chỉ xóa tài khoản, không xóa thông tin sinh viên.`)) return;

    try {
      await api.delete(`/students/${student.id}/account`);
      toast.success('Đã xóa tài khoản thành công');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleExportAccounts = async () => {
    const params: any = {};
    if (selectedIds.length > 0) {
      params.ids = selectedIds.join(',');
    }
    if (classFilter) {
      params.class_id = classFilter;
    }

    try {
      const res = await api.get('/students/export-accounts', {
        params,
        responseType: 'blob',
      });

      downloadXlsxFile(
        res.data,
        `tai-khoan-sv-${selectedIds.length > 0 ? 'da-chon' : (classFilter || 'tat-ca')}.xlsx`,
      );
    } catch (error: any) {
      console.error('Export error:', error);
      if (error.response?.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const result = JSON.parse(reader.result as string);
            toast.error(result.message || 'Lỗi khi xuất danh sách');
          } catch {
            toast.error('Lỗi khi xuất danh sách tài khoản');
          }
        };
        reader.readAsText(error.response.data);
      } else {
        toast.error(error.response?.data?.message || 'Không thể xuất danh sách tài khoản');
      }
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(s => s.id));
    }
  };

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.student_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl space-y-4 md:space-y-8 animate-fade-in pb-10">
      {/* Refined Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Quản lý tài khoản</h2>
          <p className="text-slate-500 text-xs md:text-sm font-medium">Cấp quyền và đặt lại mật khẩu cho sinh viên</p>
        </div>
        <button
          onClick={handleExportAccounts}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-xs md:text-sm"
        >
          <FileDown size={18} />
          <span>{selectedIds.length > 0 ? `Xuất ${selectedIds.length} bản` : 'Xuất danh sách'}</span>
        </button>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm MSSV hoặc tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all text-sm"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all font-bold text-slate-700 text-sm appearance-none"
          >
            <option value="">Tất cả các lớp</option>
            {classOptions.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Card List / Desktop Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinh viên</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quyền hạn</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                     <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={24} />
                     <p className="text-slate-400 text-sm">Đang tải danh sách...</p>
                  </td>
                </tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(s.id) ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                         <UserCircle size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{s.student_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                       <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <UserCheck size={10} /> Hoạt động
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Shield size={12} className="text-blue-500" />
                      <span className="text-xs font-bold uppercase tracking-widest">{s.user?.role === 'ADMIN' ? 'Quản trị' : 'Sinh viên'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleResetPassword(s)}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all active:scale-90 border border-indigo-100"
                        title="Đặt lại mật khẩu"
                      >
                        <Key size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(s)}
                        className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all active:scale-90 border border-rose-100"
                        title="Xóa tài khoản"
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-slate-100">
           {loading ? (
              <div className="p-10 text-center">
                 <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={24} />
                 <p className="text-xs text-slate-400">Đang tải...</p>
              </div>
           ) : filtered.map((s) => (
              <div key={s.id} className={`p-4 space-y-4 ${selectedIds.includes(s.id) ? 'bg-blue-50/30' : ''}`}>
                 <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                       <input
                         type="checkbox"
                         checked={selectedIds.includes(s.id)}
                         onChange={() => toggleSelect(s.id)}
                         className="w-5 h-5 rounded border-slate-300 text-blue-600"
                       />
                       <div>
                          <p className="font-black text-slate-900 text-sm leading-tight">{s.name}</p>
                          <p className="text-[10px] font-black text-blue-600 tracking-widest uppercase">{s.student_code}</p>
                       </div>
                    </div>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                       Hoạt động
                    </span>
                 </div>
                 
                 <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-slate-500">
                       <Shield size={12} className="text-blue-500" />
                       <span className="text-[10px] font-bold uppercase tracking-widest">{s.user?.role === 'ADMIN' ? 'Quản trị' : 'Sinh viên'}</span>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleResetPassword(s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          <Key size={12} /> MK
                       </button>
                       <button onClick={() => handleDeleteAccount(s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          <UserX size={12} /> XÓA
                       </button>
                    </div>
                 </div>
              </div>
           ))}
        </div>
      </div>

      <div className="p-8 bg-primary-600 rounded-[2.5rem] text-white relative overflow-hidden group shadow-2xl shadow-primary-500/20">
         <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Shield size={120} />
         </div>
         <div className="relative z-10 max-w-xl space-y-4">
            <h4 className="text-2xl font-black">Chính sách bảo mật tài khoản</h4>
            <p className="text-primary-100 leading-relaxed font-medium">
              Mật khẩu mặc định sau khi được hệ thống tự động cấp là `1234`. Sinh viên nên được khuyến khích đổi mật khẩu ngay sau khi đăng nhập lần đầu để đảm bảo an toàn thông tin cá nhân.
            </p>
         </div>
      </div>
    </div>
  );
};

const UserCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default AccountManagement;
