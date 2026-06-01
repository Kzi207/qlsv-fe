import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, X, Loader2, UserCheck, Phone, Mail, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadXlsxFile } from '../utils/download';

interface Assignment {
  classId: string;
  fromOrder: number;
  toOrder: number;
}

const BCHManagement = () => {
  const [bchList, setBchList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [currentBch, setCurrentBch] = useState<any>(null);
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [selectedClassForExport, setSelectedClassForExport] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    class_id: '',
  });

  const [assignments, setAssignments] = useState<Assignment[]>([
    { classId: '', fromOrder: 1, toOrder: 10 }
  ]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClassOptions(res.data);
    } catch (error) {
      console.error('Không thể tải danh sách lớp');
    }
  };

  const fetchBchAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bch');
      setBchList(res.data);
    } catch (error) {
      toast.error('Không thể tải danh sách BCH');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBchAccounts();
    fetchClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentBch) {
        await api.put(`/bch/${currentBch.id}`, formData);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/bch', formData);
        toast.success('Thêm tài khoản BCH thành công');
      }
      setIsModalOpen(false);
      fetchBchAccounts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/bch/assign', {
        bchUserId: currentBch.id,
        assignments: assignments.filter(a => a.classId && a.fromOrder > 0 && a.toOrder >= a.fromOrder)
      });
      toast.success('Phân công thành công');
      setIsAssignModalOpen(false);
      fetchBchAccounts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể thực hiện phân công');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản BCH này?')) {
      try {
        await api.delete(`/bch/${id}`);
        toast.success('Đã xóa tài khoản');
        fetchBchAccounts();
      } catch (error) {
        toast.error('Không thể xóa tài khoản');
      }
    }
  };

  const handleExportAssignments = async () => {
    if (!selectedClassForExport) {
      toast.error('Vui lòng chọn lớp để xuất file');
      return;
    }

    try {
      const res = await api.get('/bch/export-assignments', {
        params: { class_id: selectedClassForExport },
        responseType: 'blob',
      });

      downloadXlsxFile(res.data, `phan-cong-${selectedClassForExport}.xlsx`);
    } catch (_error) {
      toast.error('Khong the xuat file phan cong');
    }
  };

  const openEditModal = (bch: any = null) => {
    if (bch) {
      setCurrentBch(bch);
      setFormData({
        username: bch.username,
        password: '',
        name: bch.name,
        email: bch.email || '',
        phone: bch.phone || '',
        class_id: bch.class_id || '',
      });
    } else {
      setCurrentBch(null);
      setFormData({
        username: '',
        password: '',
        name: '',
        email: '',
        phone: '',
        class_id: '',
      });
    }
    setIsModalOpen(true);
  };

  const openAssignModal = (bch: any) => {
    setCurrentBch(bch);
    if (bch.assignments && bch.assignments.length > 0) {
      setAssignments(bch.assignments.map((a: any) => ({
        classId: a.classId,
        fromOrder: a.fromOrder,
        toOrder: a.toOrder
      })));
    } else {
      setAssignments([{ classId: bch.class_id || '', fromOrder: 1, toOrder: 10 }]);
    }
    setIsAssignModalOpen(true);
  };

  const filteredBch = bchList.filter((b: any) => 
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.username.toLowerCase().includes(search.toLowerCase()) ||
    (b.class_id && b.class_id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Quản lý Ban Cán Sự (BCH)</h2>
          <p className="text-slate-500">Cấp tài khoản và phân công nhiệm vụ chấm điểm theo lớp</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-3 py-1 shadow-sm">
            <select
              value={selectedClassForExport}
              onChange={(e) => setSelectedClassForExport(e.target.value)}
              className="bg-transparent border-none outline-none py-2 text-sm font-semibold text-slate-700 min-w-[150px]"
            >
              <option value="">-- Chọn lớp --</option>
              {classOptions.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={handleExportAssignments}
              disabled={!selectedClassForExport}
              className="ml-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:bg-slate-300"
              title="Xuất file phân công"
            >
              <FileDown size={18} />
            </button>
          </div>

          <button
            onClick={() => openEditModal()}
            className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 active:scale-95"
          >
            <Plus size={20} />
            <span>Cấp tài khoản BCH</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Tìm kiếm theo tên, tên đăng nhập hoặc lớp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">BCH / Lớp</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tên đăng nhập</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thông tin liên hệ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phân công</th>
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
              ) : filteredBch.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Chưa có tài khoản BCH nào
                  </td>
                </tr>
              ) : (
                filteredBch.map((bch: any) => (
                  <tr key={bch.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{bch.name}</span>
                        <span className="text-xs text-primary-600 font-bold uppercase">{bch.class_id || 'Tất cả'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{bch.username}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm text-slate-500 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail size={14} className="text-slate-400" />
                          <span>{bch.email || '---'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone size={14} className="text-slate-400" />
                          <span>{bch.phone || '---'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {bch.assignments && bch.assignments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {bch.assignments.map((a: any, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">
                              STT {a.fromOrder}-{a.toOrder}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Chấm toàn lớp</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openAssignModal(bch)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Phân công chấm điểm"
                      >
                        <UserCheck size={18} />
                      </button>
                      <button
                        onClick={() => openEditModal(bch)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                        title="Sửa tài khoản"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(bch.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Xóa tài khoản"
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
          ) : filteredBch.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              Chưa có tài khoản BCH nào
            </div>
          ) : (
            filteredBch.map((bch: any) => (
              <div key={bch.id} className="p-5 space-y-4 active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900">{bch.name}</h4>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{bch.username}</p>
                  </div>
                  <span className="px-2 py-1 bg-primary-50 text-primary-600 rounded-lg text-[10px] font-bold border border-primary-100 uppercase">
                    {bch.class_id || 'Quản lý chung'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    <span className="truncate">{bch.email || '---'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span>{bch.phone || '---'}</span>
                  </div>
                </div>

                <div className="py-2">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Phân công nhiệm vụ</p>
                   {bch.assignments && bch.assignments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {bch.assignments.map((a: any, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">
                          STT {a.fromOrder}-{a.toOrder}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Chấm toàn lớp</span>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => openAssignModal(bch)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs"
                  >
                    <UserCheck size={14} /> Phân công
                  </button>
                  <button
                    onClick={() => openEditModal(bch)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-50 text-primary-600 rounded-xl font-bold text-xs"
                  >
                    <Edit2 size={14} /> Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(bch.id)}
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

      {/* Account Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                  {currentBch ? 'Cập nhật tài khoản BCH' : 'Tạo tài khoản BCH mới'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Tên đăng nhập</label>
                    <input
                      type="text" required
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={!!currentBch}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Mật khẩu {currentBch && '(Để trống nếu không đổi)'}</label>
                    <input
                      type="password"
                      placeholder={currentBch ? '********' : 'Mặc định 1234'}
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Họ tên hiển thị</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Lớp quản lý</label>
                    <select
                      required
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={formData.class_id}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    >
                      <option value="" disabled>Chọn lớp</option>
                      {classOptions.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Số điện thoại</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email liên hệ</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <button type="submit" className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 shadow-lg mt-4 active:scale-95 transition-all">
                  {currentBch ? 'Lưu thay đổi' : 'Cấp tài khoản'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assignment Modal */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsAssignModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg p-8 rounded-[2rem] shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Phân công chấm điểm</h3>
                  <p className="text-sm text-slate-500">BCH: <span className="font-bold text-primary-600">{currentBch?.name}</span></p>
                </div>
                <button onClick={() => setIsAssignModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X />
                </button>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-6">
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  {assignments.map((assign, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phần {index + 1}</span>
                        {assignments.length > 1 && (
                          <button
                            type="button" onClick={() => setAssignments(assignments.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600">Lớp</label>
                          <select
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                            value={assign.classId}
                            onChange={(e) => {
                              const newAssigns = [...assignments];
                              newAssigns[index].classId = e.target.value;
                              setAssignments(newAssigns);
                            }}
                          >
                            <option value="">Chọn lớp</option>
                            {classOptions.map(c => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">Từ STT</label>
                            <input
                              type="number"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                              value={assign.fromOrder}
                              onChange={(e) => {
                                const newAssigns = [...assignments];
                                newAssigns[index].fromOrder = parseInt(e.target.value);
                                setAssignments(newAssigns);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">Đến STT</label>
                            <input
                              type="number"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                              value={assign.toOrder}
                              onChange={(e) => {
                                const newAssigns = [...assignments];
                                newAssigns[index].toOrder = parseInt(e.target.value);
                                setAssignments(newAssigns);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setAssignments([...assignments, { classId: currentBch?.class_id || '', fromOrder: 1, toOrder: 10 }])}
                  className="flex items-center justify-center space-x-2 w-full py-3 border-2 border-dashed border-slate-200 text-slate-500 rounded-2xl hover:border-primary-500 hover:text-primary-500 transition-all font-bold text-sm"
                >
                  <Plus size={18} />
                  <span>Thêm dải STT</span>
                </button>

                <button type="submit" className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 shadow-lg active:scale-95 transition-all">
                  Lưu phân công
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BCHManagement;



