import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { Calendar, User, CreditCard, BookOpen, CheckCircle, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ClassItem, EventSummary } from '../types';

export default function PublicEventRegister() {
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get('event');

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [classId, setClassId] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch public events
        const eventRes = await api.get('/events/public');
        setEvents(eventRes.data);

        // Preselect event if query parameter exists
        if (eventIdParam && eventRes.data.some((e: EventSummary) => e.id.toString() === eventIdParam)) {
          setSelectedEventId(eventIdParam);
        } else if (eventRes.data.length > 0) {
          setSelectedEventId(eventRes.data[0].id.toString());
        }

        // Fetch classes list for dropdown
        const classRes = await api.get('/classes/public');
        setClasses(classRes.data);
      } catch (err: any) {
        console.error(err);
        toast.error('Không thể tải thông tin sự kiện từ hệ thống');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventIdParam]);

  const activeEvent = events.find(e => e.id.toString() === selectedEventId);

  // Filter classes if the event restricts allowed classes
  const displayedClasses = () => {
    if (!activeEvent || !activeEvent.allowedClasses) {
      return classes;
    }
    const allowed = activeEvent.allowedClasses.split(';').map(c => c.trim().toUpperCase());
    if (allowed.length === 0 || (allowed.length === 1 && !allowed[0])) {
      return classes;
    }
    // Filter classes to only include those in allowed list
    const filtered = classes.filter(c => allowed.includes(c.name.toUpperCase()));
    // Fallback: If no classes match from database but there are allowed classes, 
    // let's manually construct items matching allowed classes so they can still be selected!
    if (filtered.length === 0) {
      return allowed.map(name => ({ name }));
    }
    return filtered;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEventId) {
      toast.error('Vui lòng chọn sự kiện tham gia');
      return;
    }
    if (!studentName.trim()) {
      toast.error('Vui lòng nhập Họ tên');
      return;
    }
    if (!studentCode.trim()) {
      toast.error('Vui lòng nhập Mã số sinh viên (MSSV)');
      return;
    }
    if (!classId) {
      toast.error('Vui lòng chọn Lớp học');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/events/public/${selectedEventId}/register`, {
        studentName: studentName.trim(),
        studentCode: studentCode.trim().toUpperCase(),
        classId: classId,
      });

      toast.success(res.data.message || 'Đăng ký sự kiện thành công!');
      setSuccessData({
        studentName: studentName.trim(),
        studentCode: studentCode.trim().toUpperCase(),
        classId: classId,
        eventTitle: activeEvent?.title,
      });
      setRegisteredSuccess(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi gửi đăng ký');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
          <p className="text-slate-400 font-bold text-sm tracking-wide">Đang tải thông tin sự kiện...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-8 max-w-md w-full text-center space-y-6 backdrop-blur-xl shadow-2xl">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Không có sự kiện mở đăng ký</h2>
            <p className="text-slate-400 text-sm leading-relaxed">Hiện tại hệ thống chưa có sự kiện nào được tạo hoặc cho phép đăng ký trực tuyến. Vui lòng quay lại sau.</p>
          </div>
        </div>
      </div>
    );
  }

  if (registeredSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 antialiased">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-[2.5rem] p-8 max-w-lg w-full text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 to-teal-400" />
          
          <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Đăng ký tham gia thành công!</h1>
            <p className="text-slate-400 text-sm font-medium">Hệ thống đã ghi nhận thông tin đăng ký sự kiện của bạn.</p>
          </div>

          <div className="bg-slate-950/40 rounded-2xl p-6 border border-slate-800 text-left space-y-4">
            <div className="border-b border-slate-800/80 pb-3">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Sự kiện tham gia</span>
              <p className="text-sm font-black text-white mt-0.5">{successData.eventTitle}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Họ tên</span>
                <p className="text-sm font-bold text-slate-200 mt-0.5">{successData.studentName}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Mã số sinh viên</span>
                <p className="text-sm font-bold text-slate-200 mt-0.5">{successData.studentCode}</p>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Lớp đăng ký</span>
              <p className="text-sm font-bold text-blue-400 mt-0.5">{successData.classId}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setRegisteredSuccess(false);
              setStudentName('');
              setStudentCode('');
              setClassId('');
            }}
            className="w-full py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-black uppercase text-xs tracking-widest border border-slate-700/60 transition-all"
          >
            Đăng ký cho sinh viên khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between py-12 px-4 antialiased">
      <div className="max-w-xl w-full mx-auto space-y-8 my-auto">
        
        {/* Branding header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 bg-blue-600/10 border border-blue-500/30 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/5">
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase">Đăng Ký Sự Kiện</h1>
            <p className="text-slate-400 text-sm font-medium mt-1">Cổng thông tin đăng ký tham gia hoạt động & sự kiện CTUT</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-[2.5rem] p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

          <form onSubmit={handleRegister} className="space-y-6">
            
            {/* Event selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">
                Chọn sự kiện tham gia
              </label>
              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setClassId('');
                  }}
                  className="w-full bg-slate-950/60 border border-slate-700/60 rounded-2xl py-4 pl-4 pr-10 text-sm font-bold text-white focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id} className="bg-slate-900 text-white font-bold">
                      {evt.title}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Calendar size={18} />
                </div>
              </div>
            </div>

            {/* Event Description Box if any */}
            {activeEvent?.description && (
              <div className="bg-blue-950/20 border border-blue-500/15 rounded-2xl p-4 text-xs text-blue-300 leading-relaxed font-medium">
                <strong className="text-blue-200 block mb-1">Mô tả sự kiện:</strong>
                {activeEvent.description}
              </div>
            )}

            {/* Student Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">
                Họ và tên
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-700/60 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <User size={18} />
                </div>
              </div>
            </div>

            {/* Student Code (MSSV) */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">
                Mã số sinh viên (MSSV)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Nhập MSSV (ví dụ: B2100001)"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-700/60 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <CreditCard size={18} />
                </div>
              </div>
            </div>

            {/* Class Dropdown Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">
                Lớp học
              </label>
              <div className="relative">
                <select
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-700/60 rounded-2xl py-4 pl-12 pr-10 text-sm font-bold text-white focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-slate-500">-- Chọn lớp học của bạn --</option>
                  {displayedClasses().map((cls) => (
                    <option key={cls.name} value={cls.name} className="bg-slate-900 text-white font-bold">
                      {cls.name}
                    </option>
                  ))}
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <BookOpen size={18} />
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ArrowRight size={14} className="rotate-90" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic mt-1 leading-snug">
                * Chọn chính xác lớp học để được cộng điểm rèn luyện. Nếu bạn chưa có trong danh sách lớp, hệ thống sẽ tự động thêm bạn vào lớp này.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang ghi nhận đăng ký...
                </>
              ) : (
                <>
                  Xác nhận đăng ký tham gia
                  <ArrowRight size={16} />
                </>
              )}
            </button>

          </form>
        </div>

      </div>

      {/* Footer */}
      <div className="text-center py-6">
        <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
          © {new Date().getFullYear()} Trường Đại học Kỹ thuật - Công nghệ Cần Thơ (CTUT)
        </p>
      </div>
    </div>
  );
}
