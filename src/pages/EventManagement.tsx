import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import type { ClassItem, EventRegistration, ManagedEvent } from '../types';
import { downloadXlsxFile } from '../utils/download';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Eye, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Loader2, 
  Info, 
  Users, 
  X, 
  Search,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventManagement() {
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Registrations Viewer State
  const [selectedEvent, setSelectedEvent] = useState<ManagedEvent | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [searchReg, setSearchReg] = useState('');
  const [classRegFilter, setClassRegFilter] = useState('');

  // Copy state
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (err: any) {
      toast.error('Không thể tải danh sách sự kiện');
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchEvents(), fetchClasses()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên sự kiện');
      return;
    }

    try {
      setCreating(true);
      await api.post('/events', {
        title: title.trim(),
        description: description.trim() || null,
        allowedClasses: selectedClasses,
      });

      toast.success('Tạo sự kiện mới thành công!');
      setTitle('');
      setDescription('');
      setSelectedClasses([]);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tạo sự kiện');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (id: number, eventTitle: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sự kiện "${eventTitle}"? Thao tác này cũng sẽ xóa toàn bộ danh sách sinh viên đã đăng ký!`)) {
      return;
    }

    try {
      await api.delete(`/events/${id}`);
      toast.success('Đã xóa sự kiện thành công');
      if (selectedEvent?.id === id) {
        setSelectedEvent(null);
        setRegistrations([]);
      }
      fetchEvents();
    } catch (err: any) {
      toast.error('Lỗi khi xóa sự kiện');
    }
  };

  const handleViewRegistrations = async (event: ManagedEvent) => {
    setSelectedEvent(event);
    setLoadingRegs(true);
    try {
      const res = await api.get(`/events/${event.id}/registrations`);
      setRegistrations(res.data);
    } catch (err: any) {
      toast.error('Không thể tải danh sách đăng ký');
    } finally {
      setLoadingRegs(false);
    }
  };

  const handleExportExcel = async (eventId: number, eventTitle: string) => {
    const loadToast = toast.loading('Đang khởi tạo file Excel...');
    try {
      const res = await api.get(`/events/${eventId}/registrations/export`, {
        responseType: 'blob'
      });
      downloadXlsxFile(res.data, `danh-sach-dang-ky-${eventTitle.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
      toast.success('Tải danh sách đăng ký dạng Excel thành công!', { id: loadToast });
    } catch (err: any) {
      toast.error('Lỗi khi xuất file Excel', { id: loadToast });
    }
  };

  const handleCopyLink = (eventId: number) => {
    const registrationUrl = `${window.location.origin}/dangky?event=${eventId}`;
    navigator.clipboard.writeText(registrationUrl);
    setCopiedId(eventId);
    toast.success('Đã sao chép link đăng ký vào bộ nhớ tạm!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleClassSelection = (className: string) => {
    if (selectedClasses.includes(className)) {
      setSelectedClasses(selectedClasses.filter(c => c !== className));
    } else {
      setSelectedClasses([...selectedClasses, className]);
    }
  };

  const filteredRegistrations = registrations.filter((r) => {
    const sName = r.studentName || '';
    const sCode = r.studentCode || '';
    const matchesSearch = 
      sName.toLowerCase().includes(searchReg.toLowerCase()) ||
      sCode.toLowerCase().includes(searchReg.toLowerCase());
    const matchesClass = !classRegFilter || r.classId === classRegFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-8 pb-16">
      
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản lý sự kiện & Hội thảo</h2>
        <p className="text-slate-500">Tạo liên kết đăng ký sự kiện công khai và quản lý danh sách sinh viên tham gia</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creation Card */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm h-fit space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg leading-tight">Tạo sự kiện mới</h3>
              <p className="text-xs text-slate-400 mt-0.5">Thêm sự kiện để cấp link đăng ký</p>
            </div>
          </div>

          <form onSubmit={handleCreateEvent} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Tên sự kiện / Hội thảo *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Hội thảo Chuyển đổi số"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Mô tả chi tiết</label>
              <textarea
                placeholder="Nội dung, địa điểm, thời gian..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 placeholder-slate-400 resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">Giới hạn lớp học đăng ký</label>
                {selectedClasses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedClasses([])}
                    className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                  >
                    Bỏ chọn tất cả
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                * Nếu không chọn lớp nào, hệ thống mặc định cho phép tất cả các lớp trong CSDL đăng ký tham gia.
              </p>
              
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded-2xl custom-scrollbar">
                {classes.map((cls) => {
                  const isSelected = selectedClasses.includes(cls.name);
                  return (
                    <button
                      type="button"
                      key={cls.name}
                      onClick={() => toggleClassSelection(cls.name)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border active:scale-95 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <CheckSquare size={12} />}
                      {cls.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-4.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              {creating ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Đang khởi tạo...
                </>
              ) : (
                <>
                  Tạo và kích hoạt sự kiện
                </>
              )}
            </button>
          </form>
        </div>

        {/* List of Events */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">Danh sách sự kiện đang chạy</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Tổng số: {events.length} sự kiện hoạt động</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-400 space-y-3">
                <Loader2 className="animate-spin h-10 w-10 text-blue-500 mx-auto" />
                <p className="text-sm font-bold">Đang tải danh sách sự kiện...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl">
                <Info className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700">Chưa có sự kiện nào được tạo</h4>
                <p className="text-xs text-slate-400 mt-1">Sử dụng biểu mẫu bên trái để kích hoạt sự kiện mới ngay lập tức.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((evt) => (
                  <div 
                    key={evt.id} 
                    className={`border rounded-2xl p-5 hover:border-blue-500 transition-all space-y-4 ${
                      selectedEvent?.id === evt.id ? 'border-blue-500 bg-blue-50/10' : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-black text-slate-900 text-base">{evt.title}</h4>
                        {evt.description && (
                          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed max-w-lg">{evt.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Giới hạn lớp:</span>
                          {evt.allowedClasses ? (
                            evt.allowedClasses.split(';').map((c) => (
                              <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black">
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md text-[10px] font-black">
                              Tất cả các lớp
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-600 rounded-full text-xs font-black">
                          <Users size={12} />
                          {evt._count?.registrations || 0} đăng ký
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1.5">Tạo: {new Date(evt.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>

                    {/* Registration Link Share */}
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between gap-4 border border-slate-100">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Link đăng ký</span>
                        <p className="text-xs font-mono font-bold text-slate-600 truncate mt-0.5">
                          {`${window.location.origin}/dangky?event=${evt.id}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyLink(evt.id)}
                        className="p-2 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-800 transition-all shrink-0 active:scale-90"
                        title="Sao chép link đăng ký"
                      >
                        {copiedId === evt.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-between items-center pt-2">
                      <button
                        onClick={() => handleDeleteEvent(evt.id, evt.title)}
                        className="px-3.5 py-2 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-xl transition-all text-xs font-black uppercase flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Trash2 size={14} />
                        Xóa sự kiện
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExportExcel(evt.id, evt.title)}
                          className="px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all text-xs font-black uppercase flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                          <FileSpreadsheet size={14} />
                          Xuất Excel
                        </button>
                        <button
                          onClick={() => handleViewRegistrations(evt)}
                          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all text-xs font-black uppercase flex items-center gap-1.5 shadow-md shadow-blue-500/10 active:scale-95 cursor-pointer"
                        >
                          <Eye size={14} />
                          Xem danh sách
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Registrations List Drawer/Overlay */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedEvent(null)}
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-2xl h-full md:h-[calc(100vh-2rem)] rounded-none md:rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-50 flex justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    Danh sách đăng ký
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-2 leading-snug">{selectedEvent.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">Tổng cộng: {registrations.length} lượt tham gia</p>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all shrink-0 active:scale-90"
                >
                  <X />
                </button>
              </div>

              {/* Filters */}
              <div className="p-6 pb-2 border-b border-slate-50 bg-slate-50/40 flex flex-col sm:flex-row gap-3 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Tìm sinh viên bằng tên, MSSV..."
                    value={searchReg}
                    onChange={(e) => setSearchReg(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                
                {selectedEvent.allowedClasses ? (
                  <select
                    value={classRegFilter}
                    onChange={(e) => setClassRegFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700 cursor-pointer"
                  >
                    <option value="">Tất cả các lớp</option>
                    {selectedEvent.allowedClasses.split(';').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Lọc lớp..."
                    value={classRegFilter}
                    onChange={(e) => setClassRegFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-700"
                  />
                )}
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {loadingRegs ? (
                  <div className="text-center py-20 text-slate-400 space-y-3">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-500 mx-auto" />
                    <p className="text-xs font-bold">Đang tải danh sách...</p>
                  </div>
                ) : filteredRegistrations.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-slate-100 rounded-2xl">
                    <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <h5 className="font-bold text-slate-700">Chưa có sinh viên nào đăng ký</h5>
                    <p className="text-[10px] text-slate-400 mt-1">Các sinh viên đăng ký sẽ xuất hiện tại đây.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">MSSV</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Họ tên</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Lớp</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Thời gian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs">
                        {filteredRegistrations.map((reg) => (
                          <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-blue-600">{reg.studentCode}</td>
                            <td className="px-4 py-3 font-bold text-slate-700">{reg.studentName}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black">
                                {reg.classId}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 font-medium">
                              {new Date(reg.registeredAt).toLocaleString('vi-VN', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-slate-50 bg-slate-50/30 flex justify-between gap-3 shrink-0">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase transition-all"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleExportExcel(selectedEvent.id, selectedEvent.title)}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase flex items-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  <FileSpreadsheet size={14} />
                  Xuất file Excel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
