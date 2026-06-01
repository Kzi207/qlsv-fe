import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  Clock3,
  CheckCircle2,
  Link as LinkIcon,
  Loader2,
  MapPin,
  Navigation,
  Play,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { EVALUATION_DATA } from '../constants/evaluationData';
import { downloadXlsxFile } from '../utils/download';

interface ClassOption {
  name: string;
  studentCount: number;
  active_semester_id?: string | null;
}

interface SessionItem {
  id: number;
  session_type?: 'QR_CLASS' | 'ACTIVITY' | string;
  title: string;
  subject: string;
  class_id: string;
  sessionDate: string;
  qrToken: string;
  lat: number;
  lng: number;
  radius: number;
  check_in_start_at?: string | null;
  check_in_end_at?: string | null;
  drl_section_id?: string | null;
  drl_criterion_id?: string | null;
  drl_points?: number | null;
  drl_semester_id?: string | null;
  isActive: boolean;
  createdAt: string;
  endedAt?: string | null;
  attendeeCount: number;
}

interface SessionSummaryStats {
  totalStudents: number;
  checkedIn: number;
  absentCount: number;
  attendanceRate: number;
  baselineCreatedCount: number;
  verifiedIpCount: number;
  verifiedLocationCount: number;
}

interface SessionSummaryStudent {
  id: number;
  name: string;
  student_code: string;
  class_id: string;
  order_number?: number | null;
  attendance: null | {
    id: number;
    status: string;
    checkedInAt: string;
    ipAddress?: string | null;
    baselineCreated: boolean;
    verifiedIp?: boolean | null;
    verifiedLocation?: boolean | null;
    profileDistance?: number | null;
    sessionDistance?: number | null;
  };
  profile: null | {
    firstIpAddress: string;
    firstLatitude: number;
    firstLongitude: number;
    firstCheckInAt: string;
    lastCheckInAt?: string | null;
    totalVerifiedCheckIns: number;
  };
}

interface SessionSummaryResponse {
  session: SessionItem;
  stats: SessionSummaryStats;
  students: SessionSummaryStudent[];
}

const GOOGLE_MAP_PATTERNS = [
  /@([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/,
  /!3d([+-]?\d+(?:\.\d+)?)[^!]*!4d([+-]?\d+(?:\.\d+)?)/,
  /[?&]q=([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/,
  /[?&]ll=([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/,
  /([+-]?\d+(?:\.\d+)?),\s*([+-]?\d+(?:\.\d+)?)/,
];

const parseCoordinatesFromText = (input: string) => {
  const text = input.trim();
  if (!text) return null;

  for (const pattern of GOOGLE_MAP_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  return null;
};

const isValidTime24h = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());

const buildLocalDateTime = (date: string, time: string) => {
  const trimmedTime = time.trim();
  if (!trimmedTime) return undefined;
  return `${date}T${trimmedTime}:00`;
};

const formatDateTime24h = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--';

const QRAttendanceManager = ({ type }: { type?: 'QR_CLASS' | 'ACTIVITY' }) => {
  const sectionOptions = EVALUATION_DATA.map((section) => ({
    id: section.id,
    title: section.title,
  }));

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [summary, setSummary] = useState<SessionSummaryResponse | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [markingManual, setMarkingManual] = useState<number | null>(null);
  const [mapInput, setMapInput] = useState('');
  const [resolvingMap, setResolvingMap] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [sessionTypeFilter, setSessionTypeFilter] = useState<'ALL' | 'QR_CLASS' | 'ACTIVITY'>(type || 'ALL');
  const [showLargeQr, setShowLargeQr] = useState(false);
  const [newSession, setNewSession] = useState({
    sessionType: type || 'QR_CLASS',
    title: '',
    subject: '',
    class_id: '',
    sessionDate: new Date().toISOString().slice(0, 10),
    checkInStartAt: '',
    checkInEndAt: '',
    sectionId: EVALUATION_DATA[0]?.id || 'sec-1',
    criterionId: EVALUATION_DATA[0]?.criteria?.[0]?.id || '',
    drlPoints: 0,
    drlSemesterId: '',
    radius: 100,
    lat: 0,
    lng: 0,
  });

  const isActivitySession = type === 'ACTIVITY' || (!type && newSession.sessionType === 'ACTIVITY');

  const criteriaOptions = useMemo(() => {
    const section = EVALUATION_DATA.find((item) => item.id === newSession.sectionId) || EVALUATION_DATA[0];
    return section?.criteria || [];
  }, [newSession.sectionId]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [selectedSessionId, sessions],
  );

  const selectedClass = useMemo(
    () => classes.find((item) => item.name === newSession.class_id) || null,
    [classes, newSession.class_id],
  );

  const previewGoogleMapsUrl = useMemo(() => {
    if (!newSession.lat || !newSession.lng) return '';
    return `https://www.google.com/maps?q=${newSession.lat},${newSession.lng}`;
  }, [newSession.lat, newSession.lng]);

  const selectedSessionQrUrl = useMemo(() => {
    if (!selectedSession?.qrToken) return '';
    if (typeof window === 'undefined') return selectedSession.qrToken;
    return `${window.location.origin}/attendance/scan?qrToken=${encodeURIComponent(selectedSession.qrToken)}`;
  }, [selectedSession?.qrToken]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
      setNewSession((prev) => ({
        ...prev,
        class_id: prev.class_id || res.data?.[0]?.name || '',
      }));
    } catch (error) {
      console.error('Failed to fetch classes', error);
      toast.error('Khong the tai danh sach lop');
    }
  };

  const fetchSemesters = async () => {
    try {
      const res = await api.get('/semesters');
      setSemesters(res.data);
      if (res.data?.length > 0) {
        setNewSession((prev) => ({
          ...prev,
          drlSemesterId: prev.drlSemesterId || res.data[0].name || '',
        }));
      }
    } catch (error) {
      console.error('Failed to fetch semesters', error);
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await api.get('/attendance/sessions', {
        params: {
          classId: sessionTypeFilter === 'ACTIVITY' ? undefined : classFilter || undefined,
          sessionType: sessionTypeFilter === 'ALL' ? undefined : sessionTypeFilter,
          limit: 30,
        },
      });
      setSessions(res.data);
    } catch (error) {
      console.error('Failed to fetch sessions', error);
      toast.error('Khong the tai danh sach phien diem danh');
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchSummary = async (sessionId: number, silent = false) => {
    if (!silent) setSummaryLoading(true);
    try {
      const res = await api.get(`/attendance/sessions/${sessionId}/summary`);
      setSummary(res.data);
    } catch (error) {
      console.error('Failed to fetch summary', error);
      if (!silent) {
        toast.error('Khong the tai thong ke phien diem danh');
      }
    } finally {
      if (!silent) setSummaryLoading(false);
    }
  };

  const refreshSelectedSession = async (sessionId: number) => {
    await Promise.all([fetchSummary(sessionId), fetchSessions()]);
  };

  useEffect(() => {
    fetchClasses();
    fetchSemesters();
    fetchSessions();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (!type) return;
    setNewSession((prev) => ({ ...prev, sessionType: type }));
    setSessionTypeFilter(type);
  }, [type]);

  // Support Escape key to close the large QR Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLargeQr(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [classFilter, sessionTypeFilter, type]);

  useEffect(() => {
    if (sessionTypeFilter === 'ACTIVITY' && classFilter) {
      setClassFilter('');
    }
  }, [classFilter, sessionTypeFilter]);

  useEffect(() => {
    if (!criteriaOptions.length) return;
    const exists = criteriaOptions.some((item) => item.id === newSession.criterionId);
    if (exists) return;

    setNewSession((prev) => ({
      ...prev,
      criterionId: criteriaOptions[0]?.id || '',
    }));
  }, [criteriaOptions, newSession.criterionId]);

  useEffect(() => {
    if (sessions.length === 0) {
      setSelectedSessionId(null);
      setSummary(null);
      return;
    }

    const sessionStillExists = sessions.some((session) => session.id === selectedSessionId);
    if (!selectedSessionId || !sessionStillExists) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (!selectedSessionId) return;
    fetchSummary(selectedSessionId);
  }, [selectedSessionId]);

  const updateCoordinates = (lat: number, lng: number) => {
    setNewSession((prev) => ({ ...prev, lat, lng }));
  };

  const applyGoogleMapsInput = async () => {
    const parsed = parseCoordinatesFromText(mapInput);
    if (parsed) {
      updateCoordinates(parsed.lat, parsed.lng);
      toast.success('Da ap dung toa do tu Google Maps');
      return;
    }

    setResolvingMap(true);
    try {
      const res = await api.post('/attendance/maps/resolve', { url: mapInput });
      const lat = Number(res.data?.lat);
      const lng = Number(res.data?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast.error('Khong doc duoc toa do tu du lieu da dan');
        return;
      }
      updateCoordinates(lat, lng);
      toast.success('Da lay toa do tu link Google Maps');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Khong doc duoc toa do tu link Google Maps');
    } finally {
      setResolvingMap(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Trinh duyet khong ho tro dinh vi');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateCoordinates(pos.coords.latitude, pos.coords.longitude);
        setGpsAccuracy(typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : null);
        toast.success('Da lay vi tri hien tai');
      },
      () => toast.error('Khong the lay GPS. Vui long cap quyen hoac nhap link Google Maps'),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  const handleManualCheckIn = async (studentId: number, targetStatus: 'present' | 'absent') => {
    if (!selectedSessionId) return;
    setMarkingManual(studentId);
    try {
      await api.post('/attendance/sessions/manual', {
        sessionId: selectedSessionId,
        studentId,
        status: targetStatus,
      });
      toast.success(targetStatus === 'present' ? 'Điểm danh thủ công thành công!' : 'Đã hủy điểm danh!');
      await fetchSummary(selectedSessionId, true);
      await fetchSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi điểm danh thủ công');
    } finally {
      setMarkingManual(null);
    }
  };

  const handleCreateSession = async (event: React.FormEvent) => {
    event.preventDefault();

    const isActivitySession = type === 'ACTIVITY' || (!type && newSession.sessionType === 'ACTIVITY');
    if (!isActivitySession && !newSession.class_id) {
      toast.error('Vui long chon lop cho phien diem danh');
      return;
    }
    if (isActivitySession) {
      if (!newSession.criterionId) {
        toast.error('Vui long chon muc DRL can cong diem');
        return;
      }
      if (!newSession.drlPoints || newSession.drlPoints <= 0) {
        toast.error('Vui long nhap diem cong DRL lon hon 0');
        return;
      }
    }

    if (newSession.checkInStartAt && !isValidTime24h(newSession.checkInStartAt)) {
      toast.error('Gio bat dau phai dung dinh dang 24 gio HH:mm');
      return;
    }
    if (newSession.checkInEndAt && !isValidTime24h(newSession.checkInEndAt)) {
      toast.error('Gio ket thuc phai dung dinh dang 24 gio HH:mm');
      return;
    }

    if (!newSession.lat || !newSession.lng) {
      toast.error('Vui long nhap vi tri GPS hoac Google Maps truoc khi tao phien');
      return;
    }

    const hasClass = !isActivitySession && !!newSession.class_id;

    const semesterId = hasClass
      ? (selectedClass?.active_semester_id || '')
      : newSession.drlSemesterId;

    if (!hasClass && !semesterId && isActivitySession) {
      toast.error('Vui lòng chọn học kỳ cho hoạt động.');
      return;
    }

    if (hasClass && !semesterId) {
      toast.error('Lớp này chưa được gán học kỳ hiện hành. Vui lòng cập nhật trong trang Lớp học trước.');
      return;
    }

    const payload = {
      sessionType: type || newSession.sessionType,
      title: isActivitySession ? newSession.title : `Diem danh ${newSession.subject || 'hoc phan'}`,
      subject: isActivitySession ? undefined : newSession.subject,
      class_id: hasClass ? newSession.class_id : undefined,
      sessionDate: newSession.sessionDate,
      radius: newSession.radius,
      lat: newSession.lat,
      lng: newSession.lng,
      checkInStartAt: buildLocalDateTime(newSession.sessionDate, newSession.checkInStartAt),
      checkInEndAt: buildLocalDateTime(newSession.sessionDate, newSession.checkInEndAt),
      drlSectionId: isActivitySession ? newSession.sectionId : undefined,
      drlCriterionId: isActivitySession ? newSession.criterionId : undefined,
      drlPoints: isActivitySession ? newSession.drlPoints : undefined,
      drlSemesterId: isActivitySession ? semesterId : undefined,
    };

    setCreating(true);
    try {
      await api.post('/attendance/session', payload);
      toast.success('Da tao phien diem danh QR moi');
      setNewSession((prev) => ({
        ...prev,
        title: '',
        subject: '',
        checkInStartAt: '',
        checkInEndAt: '',
      }));
      await fetchSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Khong the tao phien diem danh');
    } finally {
      setCreating(false);
    }
  };

  const handleEndSession = async (sessionId: number) => {
    try {
      await api.patch(`/attendance/sessions/${sessionId}/end`);
      toast.success('Đã kết thúc phien diem danh');
      await fetchSessions();
      if (selectedSessionId === sessionId) {
        await fetchSummary(sessionId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Khong the ket thuc phien');
    }
  };

  const handleExportExcel = async (sessionId: number, sessionTitle: string) => {
    const loadToast = toast.loading('Đang khởi tạo file Excel...');
    try {
      const res = await api.get(`/attendance/sessions/${sessionId}/export`, {
        responseType: 'blob'
      });
      downloadXlsxFile(res.data, `diem-danh-${sessionTitle.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
      toast.success('Tải danh sách điểm danh dạng Excel thành công!', { id: loadToast });
    } catch (err: any) {
      toast.error('Lỗi khi xuất file Excel', { id: loadToast });
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner Tiêu Đề Premium */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-6 text-white shadow-xl md:p-8">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"></div>

        <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
              {type === 'ACTIVITY' ? 'Điểm danh Hoạt động' : 'Điểm danh Lớp học'}
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              {type === 'ACTIVITY' ? 'Điểm Danh Hoạt Động QR' : type === 'QR_CLASS' ? 'Điểm Danh QR Học Phần' : 'Quản Lý Điểm Danh QR'}
            </h2>
            <p className="max-w-2xl text-xs text-slate-300 sm:text-sm leading-relaxed">
              {type === 'ACTIVITY'
                ? 'Tạo nhanh mã điểm danh cho các hoạt động Đoàn - Hội, Ngoại khóa hoặc hội thảo toàn trường. Tự động ghi nhận điểm rèn luyện (DRL) cho sinh viên tham gia.'
                : 'Mỗi phiên QR được thiết kế để điểm danh sinh viên trong lớp học phần. Hệ thống tự động đối chiếu IP & GPS chống gian lận.'}
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-md self-start md:self-auto">
            <QrCode className="h-10 w-10 text-emerald-400 animate-bounce" />
          </div>
        </div>
      </div>

      {/* Form Thiết Lập Cấu Hình 3 Bước Cực Dễ Dùng */}
      <div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/20 md:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-50 p-3.5 text-indigo-600">
            <Play className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800">Thiết Lập Phiên Quét QR</h3>
            <p className="text-sm text-slate-500">Hoàn tất cấu hình 3 bước đơn giản dưới đây để bắt đầu.</p>
          </div>
        </div>

        <form onSubmit={handleCreateSession} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            {/* BƯỚC 1: THÔNG TIN CƠ BẢN */}
            <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5 space-y-4 hover:border-slate-200 transition-all">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">1</span>
                <h4 className="font-bold text-slate-800 text-base">Thông tin phiên</h4>
              </div>

              {/* Loại phiên (nếu không được chỉ định ở props) */}
              {!type && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Loại phiên</label>
                  <select
                    required
                    value={newSession.sessionType}
                    onChange={(event) =>
                      setNewSession((prev) => ({ ...prev, sessionType: event.target.value as 'QR_CLASS' | 'ACTIVITY' }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="QR_CLASS">Điểm danh QR học phần</option>
                    <option value="ACTIVITY">Điểm danh hoạt động</option>
                  </select>
                </div>
              )}

              {/* Tên Hoạt Động / Lớp học */}
              {isActivitySession ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tên hoạt động hiển thị</label>
                  <input
                    type="text"
                    required
                    value={newSession.title}
                    onChange={(event) => setNewSession((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="VD: Hội thảo khoa học cấp khoa..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Lớp học</label>
                    <select
                      required
                      value={newSession.class_id}
                      onChange={(event) => setNewSession((prev) => ({ ...prev, class_id: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Chọn lớp</option>
                      {classes.map((classItem) => (
                        <option key={classItem.name} value={classItem.name}>
                          {classItem.name} ({classItem.studentCount} SV)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Môn học</label>
                    <input
                      type="text"
                      value={newSession.subject}
                      onChange={(event) => setNewSession((prev) => ({ ...prev, subject: event.target.value }))}
                      placeholder="VD: Công nghệ phần mềm"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              {/* Ngày hoạt động */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ngày diễn ra</label>
                <input
                  type="date"
                  required
                  value={newSession.sessionDate}
                  onChange={(event) => setNewSession((prev) => ({ ...prev, sessionDate: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Giờ bắt đầu - Giờ kết thúc */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Bắt đầu quét lúc</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                    placeholder="08:00"
                    value={newSession.checkInStartAt}
                    onChange={(event) => setNewSession((prev) => ({ ...prev, checkInStartAt: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Kết thúc quét lúc</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                    placeholder="11:30"
                    value={newSession.checkInEndAt}
                    onChange={(event) => setNewSession((prev) => ({ ...prev, checkInEndAt: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* BƯỚC 2: CẤU HÌNH ĐIỂM RÈN LUYỆN */}
            <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5 space-y-4 hover:border-slate-200 transition-all">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">2</span>
                <h4 className="font-bold text-slate-800 text-base">Cấu hình ĐRL</h4>
              </div>

              {isActivitySession ? (
                <>
                  {/* Học kỳ áp dụng */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Học kỳ áp dụng ĐRL</label>
                    <select
                      required
                      value={newSession.drlSemesterId}
                      onChange={(event) => setNewSession((prev) => ({ ...prev, drlSemesterId: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Chọn học kỳ</option>
                      {semesters.map((sem) => (
                        <option key={sem.name} value={sem.name}>
                          {sem.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mục lớn ĐRL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Mục lớn ĐRL</label>
                    <select
                      required
                      value={newSession.sectionId}
                      onChange={(event) => setNewSession((prev) => ({ ...prev, sectionId: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {sectionOptions.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mục nhỏ ĐRL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Mục nhỏ ĐRL</label>
                    <select
                      required
                      value={newSession.criterionId}
                      onChange={(event) => setNewSession((prev) => ({ ...prev, criterionId: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {criteriaOptions.map((criterion) => (
                        <option key={criterion.id} value={criterion.id}>
                          {criterion.id} - {criterion.content}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Điểm cộng + preset chips */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Điểm cộng hoạt động</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={50}
                      value={newSession.drlPoints}
                      onChange={(event) =>
                        setNewSession((prev) => ({ ...prev, drlPoints: Number(event.target.value) || 0 }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[2, 3, 5, 8, 10].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setNewSession((prev) => ({ ...prev, drlPoints: pts }))}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                            newSession.drlPoints === pts
                              ? 'bg-indigo-600 text-white shadow-sm scale-105'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          +{pts}đ
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
                  <p className="text-xs font-bold">Điểm danh học phần</p>
                  <p className="text-[11px] max-w-[180px] mt-1 leading-normal">Không áp dụng tính năng cộng điểm rèn luyện tự động.</p>
                </div>
              )}
            </div>

            {/* BƯỚC 3: ĐỊNH VỊ GPS & BÁN KÍNH */}
            <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-5 space-y-4 hover:border-slate-200 transition-all">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">3</span>
                <h4 className="font-bold text-slate-800 text-base">Định vị & Bán kính</h4>
              </div>

              {/* Bán kính + preset chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Bán kính quét mã (m)</label>
                <input
                  type="number"
                  required
                  min={10}
                  max={9999999}
                  value={newSession.radius}
                  onChange={(event) =>
                    setNewSession((prev) => ({ ...prev, radius: Number(event.target.value) || 0 }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '50m (Nhỏ)', val: 50 },
                    { label: '100m (Vừa)', val: 100 },
                    { label: '300m (Rộng)', val: 300 },
                    { label: 'Bỏ qua GPS 🌍', val: 9999999 }
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setNewSession((prev) => ({ ...prev, radius: item.val }))}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                        newSession.radius === item.val
                          ? 'bg-emerald-600 text-white shadow-sm scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dán Google Maps */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                  <LinkIcon size={12} className="text-indigo-600" />
                  Dán nhanh Google Maps / Tọa độ
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mapInput}
                    onChange={(event) => setMapInput(event.target.value)}
                    placeholder="Dán link Maps hoặc tọa độ..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={applyGoogleMapsInput}
                    disabled={resolvingMap}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-50 px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-100 whitespace-nowrap disabled:opacity-60"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>

              {/* Bảng tọa độ GPS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-inner">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-500 uppercase tracking-wider">TỌA ĐỘ GPS PHIÊN:</span>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    <Navigation size={10} />
                    Tải GPS máy tôi
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[9px]">VĨ ĐỘ (LAT)</span>
                    <span className="font-bold text-slate-700">{newSession.lat ? newSession.lat.toFixed(6) : '0.000000'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">KINH ĐỘ (LNG)</span>
                    <span className="font-bold text-slate-700">{newSession.lng ? newSession.lng.toFixed(6) : '0.000000'}</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Độ chính xác định vị:</span>
                  <span className="font-bold text-slate-700">{gpsAccuracy !== null ? `~ ${gpsAccuracy} m` : 'Chưa định vị'}</span>
                </div>
                {previewGoogleMapsUrl && (
                  <div className="pt-1 text-center border-t border-slate-100">
                    <a
                      href={previewGoogleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      <LinkIcon size={10} />
                      Xem vị trí trên bản đồ ↗
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Nút submit */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={creating}
              className="w-full md:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-10 py-4 font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-600/30 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang thiết lập phiên điểm danh...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 fill-current" />
                  BẮT ĐẦU PHIÊN QUÉT QR
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-5 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Thống kê điểm danh theo lớp</h3>
            <p className="text-sm text-slate-500">Chọn lớp va phien de xem ti le diem danh va danh sach sinh vien.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tất cả các lớp</option>
              {classes.map((classItem) => (
                <option key={classItem.name} value={classItem.name}>
                  {classItem.name}
                </option>
              ))}
            </select>

            {!type && (
              <select
                value={sessionTypeFilter}
                onChange={(event) => setSessionTypeFilter(event.target.value as 'ALL' | 'QR_CLASS' | 'ACTIVITY')}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">Tất cả loại phiên</option>
                <option value="QR_CLASS">Điểm danh QR học phần</option>
                <option value="ACTIVITY">Điểm danh hoạt động</option>
              </select>
            )}

            <select
              value={selectedSessionId || ''}
              onChange={(event) => setSelectedSessionId(Number(event.target.value) || null)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500"
              disabled={sessions.length === 0}
            >
              <option value="">Chọn phiên</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  [{session.class_id || 'Toàn trường'}] {session.title} - {new Date(session.sessionDate).toLocaleDateString('vi-VN')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sessionsLoading ? (
          <div className="rounded-3xl border border-slate-100 bg-slate-50 py-16 text-center text-slate-400">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
            Đang tải danh sách phiên điểm danh...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400">
            <QrCode className="mx-auto mb-4 h-16 w-16 opacity-20" />
            <p className="font-medium">Chưa có phiên điểm danh nào phù hợp bộ lọc hiện tại</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              {selectedSession && (
                <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 inline-flex rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700">
                        {selectedSession.session_type === 'ACTIVITY' ? 'Hoạt động' : 'QR học phần'}
                      </div>
                      <div className="mb-2 inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary-700">
                        {selectedSession.class_id || 'Toàn trường'}
                      </div>
                      <h4 className="text-xl font-bold text-slate-800">{selectedSession.title}</h4>
                      <p className="mt-1 text-sm text-slate-500">{selectedSession.subject || 'Không có môn học'}</p>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        selectedSession.isActive
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {selectedSession.isActive ? 'Đang hoạt động' : 'Đã kết thúc'}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary-500" />
                      {new Date(selectedSession.sessionDate).toLocaleDateString('vi-VN')}
                    </p>
                    {(selectedSession.check_in_start_at || selectedSession.check_in_end_at) && (
                      <p className="flex items-center gap-2">
                        <Clock3 size={14} className="text-primary-500" />
                        {formatDateTime24h(selectedSession.check_in_start_at)}{' '}
                        {' -> '}
                        {' '}
                        {formatDateTime24h(selectedSession.check_in_end_at)}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <MapPin size={14} className="text-primary-500" />
                      Bán kính cho phép: {selectedSession.radius}m
                    </p>
                    <p className="flex items-center gap-2">
                      <Users size={14} className="text-primary-500" />
                      Đã điểm danh: {selectedSession.attendeeCount}
                    </p>
                    {selectedSession.drl_criterion_id && (
                      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                        Cộng ĐRL: {selectedSession.drl_criterion_id} (+{selectedSession.drl_points || 0}d)
                        {selectedSession.drl_semester_id ? ` - ${selectedSession.drl_semester_id}` : ''}
                      </p>
                    )}
                  </div>

                  {selectedSession.isActive && (
                    <div 
                      onClick={() => setShowLargeQr(true)}
                      className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-inner cursor-pointer hover:border-indigo-400 group transition-all duration-300 relative overflow-hidden"
                      title="Bấm để phóng to mã QR"
                    >
                      <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                        <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 active:scale-95 transition-transform">
                          🔍 Phóng to QR
                        </span>
                      </div>
                      <QRCodeSVG value={selectedSessionQrUrl || selectedSession.qrToken} size={190} level="H" includeMargin />
                      <p className="mt-3 break-all text-[11px] font-mono text-slate-500 group-hover:text-indigo-600 transition-colors">{selectedSessionQrUrl || selectedSession.qrToken}</p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => refreshSelectedSession(selectedSession.id)}
                      className="inline-flex flex-1 min-w-[100px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      Làm mới
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportExcel(selectedSession.id, selectedSession.title)}
                      className="inline-flex flex-1 min-w-[100px] items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer shadow-sm"
                    >
                      <FileSpreadsheet size={14} />
                      Xuất Excel
                    </button>
                    {selectedSession.isActive && (
                      <button
                        type="button"
                        onClick={() => handleEndSession(selectedSession.id)}
                        className="inline-flex flex-1 min-w-[100px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 transition-all cursor-pointer"
                      >
                        <XCircle size={14} />
                        Kết thúc
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {summaryLoading || !summary ? (
                <div className="rounded-[2rem] border border-slate-100 bg-slate-50 py-20 text-center text-slate-400">
                  <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
                  Đang tải thống kê phiên...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Đã điểm danh</p>
                      <p className="mt-2 text-3xl font-black text-emerald-700">{summary.stats.checkedIn}</p>
                    </div>
                    <div className="rounded-3xl border border-red-100 bg-red-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-red-600">Chưa điểm danh</p>
                      <p className="mt-2 text-3xl font-black text-red-700">{summary.stats.absentCount}</p>
                    </div>
                    <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Tổng sinh viên</p>
                      <p className="mt-2 text-3xl font-black text-blue-700">{summary.stats.totalStudents}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tỉ lệ</p>
                      <p className="mt-2 text-3xl font-black text-slate-700">{summary.stats.attendanceRate}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="rounded-3xl border border-slate-100 bg-white p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <ShieldCheck size={16} className="text-primary-500" />
                        Hồ sơ lần đầu
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-800">{summary.stats.baselineCreatedCount}</p>
                      <p className="text-sm text-slate-500">Số sinh viên được lưu mốc IP/tọa độ lần đầu trong phiên này.</p>
                    </div>
                    <div className="rounded-3xl border border-slate-100 bg-white p-4">
                      <p className="text-sm font-bold text-slate-700">Xác minh IP</p>
                      <p className="mt-2 text-2xl font-black text-slate-800">{summary.stats.verifiedIpCount}</p>
                      <p className="text-sm text-slate-500">Số lần điểm danh hợp lệ theo IP hồ sơ.</p>
                    </div>
                    <div className="rounded-3xl border border-slate-100 bg-white p-4">
                      <p className="text-sm font-bold text-slate-700">Xác minh vị trí</p>
                      <p className="mt-2 text-2xl font-black text-slate-800">{summary.stats.verifiedLocationCount}</p>
                      <p className="text-sm text-slate-500">Số lần điểm danh hợp lệ theo tọa độ hồ sơ.</p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/20">
                      <h4 className="font-bold text-slate-800">
                        {summary.session.class_id ? `Danh sách sinh viên của lớp ${summary.session.class_id}` : 'Danh sách sinh viên tham gia'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleExportExcel(summary.session.id, summary.session.title)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4.5 py-2 text-xs font-black text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-md shadow-emerald-500/10 active:scale-95 whitespace-nowrap self-start sm:self-auto uppercase tracking-widest"
                      >
                        <FileSpreadsheet size={13} />
                        Xuất file Excel
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold text-slate-500">Sinh viên</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-500">Trạng thái</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-500">Thời gian</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-500">Xác minh</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {summary.students.map((student) => (
                            <tr key={student.id} className="align-top">
                              <td className="px-4 py-4">
                                <div>
                                  <p className="font-semibold text-slate-800">{student.name}</p>
                                  <p className="text-xs font-mono text-primary-600">{student.student_code}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                {student.attendance ? (
                                  <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                      <CheckCircle2 size={14} />
                                      Đã điểm danh
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleManualCheckIn(student.id, 'absent')}
                                      disabled={markingManual === student.id}
                                      className="rounded-lg bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 text-[11px] font-bold transition-all disabled:opacity-50"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                                      <XCircle size={14} />
                                      Chưa điểm danh
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleManualCheckIn(student.id, 'present')}
                                      disabled={markingManual === student.id}
                                      className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2.5 py-1 text-[11px] font-bold transition-all disabled:opacity-50"
                                    >
                                      Điểm danh
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 text-slate-500">
                                {student.attendance ? formatDateTime24h(student.attendance.checkedInAt) : '--'}
                              </td>
                              <td className="px-4 py-4">
                                {student.attendance ? (
                                  <div className="space-y-1 text-xs text-slate-600">
                                    <p>{student.attendance.baselineCreated ? 'Lần đầu lưu hồ sơ' : 'Khớp hồ sơ đã lưu'}</p>
                                    <p>IP: {student.attendance.verifiedIp ? 'Hợp lệ' : 'Không hợp lệ'}</p>
                                    <p>Vị trí: {student.attendance.verifiedLocation ? 'Hợp lệ' : 'Không hợp lệ'}</p>
                                    {student.attendance.sessionDistance !== null && student.attendance.sessionDistance !== undefined && (
                                      <p>Lệch tâm phiên: {Math.round(student.attendance.sessionDistance)}m</p>
                                    )}
                                    {student.attendance.profileDistance !== null && student.attendance.profileDistance !== undefined && (
                                      <p>Lệch hồ sơ: {Math.round(student.attendance.profileDistance)}m</p>
                                    )}
                                  </div>
                                ) : student.profile ? (
                                  <div className="space-y-1 text-xs text-slate-500">
                                    <p>Đã có hồ sơ xác minh</p>
                                    <p>Check-in hợp lệ: {student.profile.totalVerifiedCheckIns}</p>
                                  </div>
                                ) : (
                                  <span className="text-xs italic text-slate-400">Chưa có hồ sơ QR</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal QR Code Phóng To Premium */}
      {showLargeQr && selectedSession && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
          onClick={() => setShowLargeQr(false)}
        >
          <div 
            className="relative max-w-xl w-full rounded-[2.5rem] bg-white p-6 md:p-8 border border-slate-100 shadow-2xl text-center flex flex-col items-center justify-center transform scale-100 transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng góc phải */}
            <button 
              type="button"
              onClick={() => setShowLargeQr(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-red-500 hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <XCircle className="h-8 w-8" />
            </button>

            {/* Chi tiết hoạt động */}
            <div className="mb-6 space-y-2">
              <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-700">
                {selectedSession.class_id || 'Toàn trường'}
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-slate-800">{selectedSession.title}</h3>
              <p className="text-sm font-semibold text-slate-500">{selectedSession.subject || 'Không có môn học'}</p>
              <p className="text-xs text-slate-400">Quét mã QR dưới đây bằng camera hoặc trình duyệt để tiến hành điểm danh.</p>
            </div>

            {/* Mã QR cực to */}
            <div className="rounded-[2rem] border-2 border-indigo-100 bg-white p-4 shadow-xl shadow-indigo-100/50">
              <QRCodeSVG value={selectedSessionQrUrl || selectedSession.qrToken} size={320} level="H" includeMargin />
            </div>

            {/* Đường dẫn */}
            <div className="mt-6 w-full">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">ĐƯỜNG DẪN ĐIỂM DANH:</p>
              <p 
                className="break-all rounded-2xl bg-slate-50 p-3.5 font-mono text-xs text-indigo-600 border border-slate-100 select-all cursor-pointer hover:bg-slate-100 transition-colors"
                title="Bôi đen hoặc nhấp đúp để chọn tất cả"
              >
                {selectedSessionQrUrl || selectedSession.qrToken}
              </p>
            </div>

            {/* Nút đóng chân trang */}
            <button
              type="button"
              onClick={() => setShowLargeQr(false)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              ĐÓNG CỬA SỔ [ESC]
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default QRAttendanceManager;
