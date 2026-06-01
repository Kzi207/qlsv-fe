import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Calendar, Trash2, Loader2, Edit2, X, Globe, Lock, Clock, AlertTriangle } from 'lucide-react';


const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const offsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
};

const isValidTime24h = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());

const getDatePart = (value: string) => value.split('T')[0] || '';

const getTimePart = (value: string) => value.split('T')[1]?.slice(0, 5) || '';

const updateDateTimePart = (value: string, part: 'date' | 'time', nextValue: string) => {
  const datePart = part === 'date' ? nextValue : getDatePart(value);
  const timePart = part === 'time' ? nextValue : getTimePart(value);
  if (!datePart && !timePart) return '';
  return `${datePart || new Date().toISOString().slice(0, 10)}T${timePart || '00:00'}`;
};

const Semesters = () => {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSemester, setEditingSemester] = useState<any | null>(null);

  const [dangerSemester, setDangerSemester] = useState<string>('');
  const [confirmStep, setConfirmStep] = useState<number>(0);
  const [typedSemesterName, setTypedSemesterName] = useState<string>('');
  const [deletingData, setDeletingData] = useState<boolean>(false);
  
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isGlobal: true,
    classNames: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [semRes, classRes] = await Promise.all([
        api.get('/semesters'),
        api.get('/classes')
      ]);
      setSemesters(semRes.data);
      setClasses(classRes.data);
    } catch (e) {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenAdd = () => {
    setEditingSemester(null);
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      isGlobal: true,
      classNames: []
    });
    setShowModal(true);
  };

  const handleOpenEdit = (s: any) => {
    setEditingSemester(s);
    setFormData({
      name: s.name,
      startDate: toDateTimeInputValue(s.startDate),
      endDate: toDateTimeInputValue(s.endDate),
      isGlobal: s.isGlobal,
      classNames: s.scopeClasses?.map((c: any) => c.name) || []
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const name = formData.name.trim().toUpperCase();
    if (!name) return toast.error('Tên học kỳ không được để trống');
    
    // 1. Check for duplicates
    const isDuplicate = semesters.some(s => s.name === name && (!editingSemester || editingSemester.name !== name));
    if (isDuplicate) return toast.error('Học kỳ này đã tồn tại trong hệ thống');

    // 2. Validate date range
    if (formData.startDate && !isValidTime24h(getTimePart(formData.startDate))) {
      return toast.error('Gio bat dau phai dung dinh dang 24 gio HH:mm');
    }
    if (formData.endDate && !isValidTime24h(getTimePart(formData.endDate))) {
      return toast.error('Gio ket thuc phai dung dinh dang 24 gio HH:mm');
    }
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate).getTime();
      const end = new Date(formData.endDate).getTime();
      if (start > end) {
        return toast.error('Thời gian bắt đầu phải nhỏ hơn hoặc bằng thời gian kết thúc');
      }
    }

    // 3. Validate class selection for class-scoped semesters
    if (!formData.isGlobal && formData.classNames.length === 0) {
      return toast.error('Học kỳ áp dụng theo lớp phải chọn ít nhất 1 lớp');
    }
    
    try {
      if (editingSemester) {
        await api.put(`/semesters/${editingSemester.name}`, {
          newName: name,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          isGlobal: formData.isGlobal,
          classNames: formData.isGlobal ? [] : formData.classNames
        });
        toast.success('Đã cập nhật học kỳ');
      } else {
        await api.post('/semesters', {
          name: name,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          isGlobal: formData.isGlobal,
          classNames: formData.isGlobal ? [] : formData.classNames
        });
        toast.success('Đã thêm học kỳ mới');
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa học kỳ ${name}?`)) return;

    try {
      await api.delete(`/semesters/${name}`);
      toast.success(`Đã xóa học kỳ ${name}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa học kỳ');
    }
  };

  const handleDangerDelete = async () => {
    if (typedSemesterName !== dangerSemester) {
      return toast.error('Tên học kỳ xác nhận không khớp');
    }
    
    setDeletingData(true);
    try {
      const res = await api.post(`/semesters/${dangerSemester}/danger-zone/clear-all`);
      toast.success(res.data?.message || `Đã xóa sạch dữ liệu học kỳ ${dangerSemester}`);
      setDangerSemester('');
      setConfirmStep(0);
      setTypedSemesterName('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa sạch dữ liệu học kỳ');
    } finally {
      setDeletingData(false);
    }
  };

  const toggleClass = (className: string) => {
    setFormData(prev => ({
      ...prev,
      classNames: prev.classNames.includes(className)
        ? prev.classNames.filter(c => c !== className)
        : [...prev.classNames, className]
    }));
  };

  return (
    <div className="max-w-6xl space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Quản lý học kỳ</h2>
          <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider">Cấu hình thời gian và phạm vi áp dụng</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={16} /> Thêm học kỳ
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center text-slate-400">
          <Loader2 className="animate-spin w-8 h-8 mb-3 text-blue-400" />
          <p className="text-[10px] font-bold uppercase tracking-widest">Đang tải...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {semesters.map(s => (
            <div key={s.name} className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/20 overflow-hidden group hover:border-blue-200 transition-all">
              <div className="p-4 md:p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-slate-900 truncate">{s.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        {s.isGlobal ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                            <Globe size={10} /> Toàn bộ
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1">
                            <Lock size={10} /> {s.scopeClasses?.length || 0} Lớp
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEdit(s)} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.name)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mt-auto">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Clock size={12} className="text-slate-400" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thời gian</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                       <div className="flex flex-col">
                          <span className="text-[8px] text-slate-400 uppercase">Bắt đầu</span>
                          <span>{s.startDate ? new Date(s.startDate).toLocaleDateString('vi-VN') : '--'}</span>
                       </div>
                       <div className="h-4 w-px bg-slate-200" />
                       <div className="flex flex-col text-right">
                          <span className="text-[8px] text-slate-400 uppercase">Kết thúc</span>
                          <span>{s.endDate ? new Date(s.endDate).toLocaleDateString('vi-VN') : '--'}</span>
                       </div>
                    </div>
                  </div>
                  
                  {!s.isGlobal && s.scopeClasses?.length > 0 && (
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto scrollbar-hide">
                       {s.scopeClasses.map((c: any) => (
                         <span key={c.name} className="px-1.5 py-0.5 bg-white text-slate-500 text-[8px] font-black rounded-md border border-slate-100 uppercase">
                            {c.name}
                         </span>
                       ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {semesters.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Trống</p>
            </div>
          )}
        </div>
      )}

      {/* Vùng nguy hiểm (Danger Zone) */}
      <div className="mt-12 bg-rose-50/50 backdrop-blur-sm border border-rose-100 rounded-[2rem] p-6 md:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0 shadow-inner">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-rose-950 tracking-tight">Vùng Nguy Hiểm (Danger Zone)</h3>
            <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
              Nơi đây cho phép xóa toàn bộ dữ liệu điểm rèn luyện, lịch sử điểm danh, các tập tin minh chứng hình ảnh liên quan đến một học kỳ. Hành động này không thể khôi phục.
            </p>
          </div>
        </div>

        <div className="bg-white border border-rose-100/50 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Chọn học kỳ cần xóa sạch</label>
              <select
                value={dangerSemester}
                onChange={(e) => {
                  setDangerSemester(e.target.value);
                  setConfirmStep(0);
                  setTypedSemesterName('');
                }}
                className="w-full px-5 py-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 font-bold text-slate-900 transition-all bg-slate-50 hover:bg-slate-100/50"
              >
                <option value="">-- Chọn học kỳ --</option>
                {semesters.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {dangerSemester && confirmStep === 0 && (
              <button
                type="button"
                onClick={() => setConfirmStep(1)}
                className="w-full px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-500/20 active:scale-95 text-center cursor-pointer"
              >
                Xóa toàn bộ dữ liệu & hình ảnh
              </button>
            )}
          </div>

          {confirmStep === 1 && dangerSemester && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200/50 animate-in slide-in-from-top-2 duration-300 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest">Xác nhận lần 1: Nhập lại tên học kỳ</span>
                <p className="text-slate-600 text-xs font-medium">
                  Vui lòng nhập chính xác cụm từ <span className="font-extrabold text-rose-600 bg-rose-100/50 px-2 py-0.5 rounded border border-rose-200">{dangerSemester}</span> để xác nhận hành động hủy diệt dữ liệu này.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <input
                  type="text"
                  placeholder={`Nhập đúng: ${dangerSemester}`}
                  value={typedSemesterName}
                  onChange={(e) => setTypedSemesterName(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl border border-rose-200 outline-none focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500 font-black text-rose-900 transition-all uppercase placeholder:normal-case"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmStep(0);
                      setTypedSemesterName('');
                    }}
                    className="flex-1 px-4 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={typedSemesterName !== dangerSemester || deletingData}
                    onClick={handleDangerDelete}
                    className={`flex-[2] px-4 py-3.5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      typedSemesterName === dangerSemester && !deletingData
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/25 active:scale-95'
                        : 'bg-slate-300 cursor-not-allowed text-slate-400'
                    }`}
                  >
                    {deletingData ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4 shrink-0" />
                        Đang xóa...
                      </>
                    ) : (
                      'Xác nhận lần 2: Xóa vĩnh viễn'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingSemester ? 'Chỉnh sửa học kỳ' : 'Thêm học kỳ mới'}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">Cung cấp đầy đủ thông tin bên dưới</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Tên học kỳ</label>
                  <input
                    type="text"
                    placeholder="VD: 2024-HK1"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-black text-slate-900 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Ngày bắt đầu</label>
                    <div className="grid grid-cols-[1fr_96px] gap-2">
                      <input
                        type="date"
                        value={getDatePart(formData.startDate)}
                        onChange={e => setFormData({...formData, startDate: updateDateTimePart(formData.startDate, 'date', e.target.value)})}
                        className="w-full px-4 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-900 transition-all"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                        placeholder="08:00"
                        value={getTimePart(formData.startDate)}
                        onChange={e => setFormData({...formData, startDate: updateDateTimePart(formData.startDate, 'time', e.target.value)})}
                        className="w-full px-3 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-900 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Ngày kết thúc</label>
                    <div className="grid grid-cols-[1fr_96px] gap-2">
                      <input
                        type="date"
                        value={getDatePart(formData.endDate)}
                        onChange={e => setFormData({...formData, endDate: updateDateTimePart(formData.endDate, 'date', e.target.value)})}
                        className="w-full px-4 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-900 transition-all"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                        placeholder="17:00"
                        value={getTimePart(formData.endDate)}
                        onChange={e => setFormData({...formData, endDate: updateDateTimePart(formData.endDate, 'time', e.target.value)})}
                        className="w-full px-3 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-900 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Phạm vi áp dụng</label>
                   <div className="flex gap-4">
                      <button 
                        onClick={() => setFormData({...formData, isGlobal: true})}
                        className={`flex-1 p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${
                          formData.isGlobal ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                         <Globe size={20} />
                         <span className="font-black text-sm uppercase tracking-widest">Tất cả lớp</span>
                      </button>
                      <button 
                        onClick={() => setFormData({...formData, isGlobal: false})}
                        className={`flex-1 p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${
                          !formData.isGlobal ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                         <Lock size={20} />
                         <span className="font-black text-sm uppercase tracking-widest">Lớp cụ thể</span>
                      </button>
                   </div>
                </div>

                {!formData.isGlobal && (
                  <div className="animate-in slide-in-from-top-4 duration-300">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Chọn các lớp áp dụng ({formData.classNames.length})</label>
                    <div className="max-h-40 overflow-y-auto pr-2 grid grid-cols-2 md:grid-cols-3 gap-2 scrollbar-hide">
                      {classes.map(c => (
                        <button
                          key={c.name}
                          onClick={() => toggleClass(c.name)}
                          className={`px-4 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                            formData.classNames.includes(c.name)
                              ? 'border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/20'
                              : 'border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-10">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-8 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleSubmit}
                  className="flex-[2] px-8 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 active:scale-95"
                >
                  {editingSemester ? 'Cập nhật học kỳ' : 'Lưu học kỳ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Semesters;
