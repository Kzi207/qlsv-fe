import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock3, Filter, Laptop, Loader2, RefreshCcw, Search, ShieldCheck, User } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';

type ActivityLogItem = {
  id: number;
  action: string;
  category: string;
  targetType: string | null;
  targetId: string | null;
  summary: string;
  details: unknown;
  username: string | null;
  userName: string | null;
  role: string | null;
  studentId: number | null;
  classId: string | null;
  ipAddress: string | null;
  deviceId: string | null;
  userAgent: string | null;
  createdAt: string;
};

type ActivityResponse = {
  items: ActivityLogItem[];
  total: number;
  page: number;
  limit: number;
};

const categoryLabel: Record<string, string> = {
  AUTH: 'Đăng nhập',
  DRL: 'Điểm rèn luyện',
  ATTENDANCE: 'Điểm danh',
};

const actionLabel: Record<string, string> = {
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  PROFILE_UPDATE: 'Cập nhật hồ sơ',
  PASSWORD_CHANGE: 'Đổi mật khẩu',
  TRAINING_SUBMISSION_CREATE: 'Nộp phiếu DRL',
  TRAINING_SUBMISSION_UPDATE: 'Cập nhật phiếu DRL',
  TRAINING_APPROVAL_UPDATE: 'Duyệt DRL',
  CUSTOM_EVIDENCE_SUBMIT: 'Nộp minh chứng',
  CUSTOM_EVIDENCE_REVIEW: 'Duyệt minh chứng',
  ATTENDANCE_MANUAL_CREATE: 'Tạo điểm danh',
  ATTENDANCE_MANUAL_UPDATE: 'Sửa điểm danh',
  ATTENDANCE_SESSION_CREATE: 'Tạo phiên QR',
  ATTENDANCE_SESSION_END: 'Kết thúc phiên QR',
  QR_CHECK_IN: 'Quét QR',
  ATTENDANCE_MANUAL_REMOVE: 'Xóa điểm danh',
  ATTENDANCE_MANUAL_CHECK_IN: 'Điểm danh thủ công',
};

const categoryClass: Record<string, string> = {
  AUTH: 'border-sky-200 bg-sky-50 text-sky-700',
  DRL: 'border-violet-200 bg-violet-50 text-violet-700',
  ATTENDANCE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const formatDetails = (details: unknown) => {
  if (!details || typeof details !== 'object') return '';
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return '';
  }
};

const ActivityHistory = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    category: '',
    keyword: '',
    classId: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get<ActivityResponse>('/activity-logs', {
        params: {
          limit: 100,
          category: filters.category || undefined,
          keyword: filters.keyword || undefined,
          classId: isAdmin && filters.classId ? filters.classId : undefined,
        },
      });
      setLogs(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      toast.error('Không thể tải lịch sử hoạt động');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters.category]);

  const stats = useMemo(() => {
    return logs.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [logs]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">Minh bạch hệ thống</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">Lịch sử hoạt động</h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi đăng nhập, nộp/chấm điểm rèn luyện, điểm danh và các thao tác cần truy vết.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <RefreshCcw size={16} />
          Làm mới
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Tổng bản ghi</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{total}</p>
        </div>
        {Object.entries(categoryLabel).map(([key, label]) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats[key] || 0}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_180px_auto]">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={filters.keyword}
            onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') fetchLogs();
            }}
            placeholder="Tìm theo nội dung, tài khoản, IP, mã máy..."
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Filter size={18} className="text-slate-400" />
          <select
            value={filters.category}
            onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
          >
            <option value="">Tất cả nhóm</option>
            <option value="AUTH">Đăng nhập</option>
            <option value="DRL">Điểm rèn luyện</option>
            <option value="ATTENDANCE">Điểm danh</option>
          </select>
        </label>

        {isAdmin ? (
          <input
            value={filters.classId}
            onChange={(event) => setFilters((prev) => ({ ...prev, classId: event.target.value }))}
            placeholder="Lọc lớp"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        ) : (
          <div className="hidden lg:block" />
        )}

        <button
          onClick={fetchLogs}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <Search size={16} />
          Tìm
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-2 animate-spin" size={20} />
            Đang tải lịch sử...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <ShieldCheck className="mx-auto mb-3 text-slate-400" size={28} />
            Chưa có lịch sử phù hợp.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((item) => {
              const detailsText = formatDetails(item.details);
              return (
                <div key={item.id} className="grid gap-4 p-5 lg:grid-cols-[220px_1fr_300px]">
                  <div className="space-y-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${categoryClass[item.category] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                      {categoryLabel[item.category] || item.category}
                    </span>
                    <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Clock3 size={14} />
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900">{actionLabel[item.action] || item.action}</p>
                      {item.classId && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          Lớp {item.classId}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{item.summary}</p>
                    {detailsText && (
                      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-slate-500">
                          Chi tiết thay đổi
                        </summary>
                        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                          {detailsText}
                        </pre>
                      </details>
                    )}
                  </div>

                  <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                    <p className="flex items-center gap-2 font-bold text-slate-800">
                      <User size={14} />
                      {item.userName || item.username || 'Không xác định'}
                    </p>
                    <p>Vai trò: {item.role || '--'}</p>
                    <p>IP: {item.ipAddress || '--'}</p>
                    <p className="flex items-start gap-2">
                      <Laptop size={14} className="mt-0.5 shrink-0" />
                      <span className="break-all">Mã máy: {item.deviceId || '--'}</span>
                    </p>
                    {item.userAgent && <p className="break-words text-slate-500">Thiết bị: {item.userAgent}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityHistory;
