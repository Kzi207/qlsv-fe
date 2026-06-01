import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, X, UserX, Loader2, ClipboardCheck, FileSpreadsheet, Download, Key, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadXlsxFile } from '../utils/download';

const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    student_code: '',
    email: '',
    class_id: '',
  });
  const [classOptions, setClassOptions] = useState<any[]>([]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClassOptions(res.data);
    } catch (error) {
      console.error('Không thể tải danh sách lớp');
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students', {
        params: { class_id: classFilter || undefined }
      });
      setStudents(res.data);
    } catch (error) {
      toast.error('Không thể tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [classFilter]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const loadingToast = toast.loading('Đang xử lý file...');
    try {
      const res = await api.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message, { id: loadingToast });
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể nhập file', { id: loadingToast });
    } finally {
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/students/template', {
        responseType: 'blob'
      });
      downloadXlsxFile(response.data, 'mau-nhap-sinh-vien.xlsx');
    } catch (error) {
      toast.error('Không thể tải file mẫu');
    }
  };

  const handleDeleteAccount = async (student: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản của sinh viên ${student.name}? Chú ý: Thao tác này chỉ xóa tài khoản đăng nhập, không xóa thông tin sinh viên.`)) return;

    try {
      await api.delete(`/students/${student.id}/account`);
      toast.success('Đã xóa tài khoản thành công');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa tài khoản');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentStudent) {
        await api.put(`/students/${currentStudent.id}`, formData);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/students', formData);
        toast.success('Thêm sinh viên thành công');
      }
      setIsModalOpen(false);
      fetchStudents();
      setFormData({ name: '', student_code: '', email: '', class_id: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleCreateAccount = async (student: any) => {
    const password = prompt(`Nhập mật khẩu cho tài khoản ${student.student_code} (Để trống để dùng mặc định: 1234):`, '1234');
    if (password === null) return;

    try {
      await api.post(`/students/${student.id}/account`, { password });
      toast.success('Đã tạo/cập nhật tài khoản thành công');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tạo tài khoản');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sinh viên này?')) {
      try {
        await api.delete(`/students/${id}`);
        toast.success('Đã xóa sinh viên');
        fetchStudents();
      } catch (error) {
        toast.error('Không thể xóa sinh viên');
      }
    }
  };

  const openModal = (student: any = null) => {
    if (student) {
      setCurrentStudent(student);
      setFormData({
        name: student.name,
        student_code: student.student_code,
        email: student.email,
        class_id: student.class_id,
      });
    } else {
      setCurrentStudent(null);
      setFormData({ name: '', student_code: '', email: '', class_id: '' });
    }
    setIsModalOpen(true);
  };

  const filteredStudents = students.filter((s: any) => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Quản lý sinh viên</h2>
          <p className="text-slate-500">Xem và quản lý thông tin sinh viên</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center justify-center space-x-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
          >
            <Download size={20} />
            <span>Tải file mẫu</span>
          </button>
          <label className="flex items-center justify-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer">
            <FileSpreadsheet size={20} />
            <span>Nhập Excel</span>
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
          </label>
          <button
            onClick={() => openModal()}
            className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 active:scale-95"
          >
            <Plus size={20} />
            <span>Thêm sinh viên</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-[2]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm sinh viên bằng tên hoặc mã số..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-slate-700"
          >
            <option value="">Tất cả các lớp</option>
            {classOptions.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã SV</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Họ tên</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy sinh viên nào
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student: any) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-primary-600 text-sm">{student.student_code}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{student.name}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{student.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                        {student.class_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/evaluation/${student.id}`)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-all"
                        title="Chấm điểm rèn luyện"
                      >
                        <ClipboardCheck size={18} />
                      </button>
                      <>
                        <button
                          onClick={() => handleCreateAccount(student)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Đặt lại mật khẩu"
                        >
                          <Key size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(student)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                          title="Xóa tài khoản đăng nhập"
                        >
                          <UserX size={18} />
                        </button>
                      </>

                      <button
                        onClick={() => openModal(student)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                        title="Sửa thông tin"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Xóa sinh viên"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-50">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="animate-spin mx-auto mb-2" />
              Đang tải dữ liệu...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Không tìm thấy sinh viên nào
            </div>
          ) : (
            filteredStudents.map((student: any) => (
              <div key={student.id} className="p-5 space-y-4 active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900">{student.name}</h4>
                    <p className="text-sm font-mono font-bold text-primary-600 mt-0.5">{student.student_code}</p>
                  </div>
                  <span className="px-2 py-1 bg-primary-50 text-primary-600 rounded-lg text-[10px] font-bold border border-primary-100 uppercase">
                    {student.class_id}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-slate-500">
                  <Mail size={14} className="mr-2 text-slate-400" />
                  <span className="truncate">{student.email}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button 
                    onClick={() => navigate(`/evaluation/${student.id}`)}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs"
                  >
                    <ClipboardCheck size={14} /> Chấm điểm
                  </button>
                  <button 
                    onClick={() => openModal(student)}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 bg-primary-50 text-primary-600 rounded-xl font-bold text-xs"
                  >
                    <Edit2 size={14} /> Sửa
                  </button>
                  <button 
                    onClick={() => handleCreateAccount(student)}
                    className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"
                    title="Mật khẩu"
                  >
                    <Key size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(student.id)}
                    className="p-2.5 bg-red-50 text-red-600 rounded-xl"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg p-8 rounded-[2rem] shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900">
                  {currentStudent ? 'Chỉnh sửa sinh viên' : 'Thêm sinh viên mới'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Họ tên</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Mã sinh viên</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      value={formData.student_code}
                      onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Lớp</label>
                    <select
                      required
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      value={formData.class_id}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    >
                      <option value="" disabled>Chọn lớp</option>
                      {classOptions.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 mt-4 active:scale-95 transition-all"
                >
                  {currentStudent ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Students;
