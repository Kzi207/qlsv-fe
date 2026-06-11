import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Clock3,
  Eye,
  Filter,
  Laptop,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
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

type HistoryType = 'AUTH' | 'TRAINING_SUBMISSION' | 'TRAINING_CHANGE';

type HistoryTypeOption = {
  key: HistoryType;
  label: string;
  description: string;
  badgeClass: string;
  iconClass: string;
};

const HISTORY_TYPES: HistoryTypeOption[] = [
  {
    key: 'AUTH',
    label: 'Dang nhap',
    description: 'Dang nhap, doi mat khau va cap nhat tai khoan',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-700',
    iconClass: 'bg-sky-100 text-sky-700',
  },
  {
    key: 'TRAINING_SUBMISSION',
    label: 'Nop diem ren luyen',
    description: 'Nop phieu DRL va gui minh chung',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    iconClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    key: 'TRAINING_CHANGE',
    label: 'Thay doi diem ren luyen',
    description: 'Duyet, dieu chinh va thay doi ket qua DRL',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    iconClass: 'bg-amber-100 text-amber-700',
  },
];

const HISTORY_TYPE_MAP = Object.fromEntries(HISTORY_TYPES.map((item) => [item.key, item])) as Record<HistoryType, HistoryTypeOption>;

const ACTION_LABEL: Record<string, string> = {
  LOGIN_SUCCESS: 'Dang nhap thanh cong',
  LOGIN_FAILED: 'Dang nhap that bai',
  PROFILE_UPDATE: 'Cap nhat ho so',
  PASSWORD_CHANGE: 'Doi mat khau',
  PASSWORD_RESET: 'Dat lai mat khau',
  TRAINING_SUBMISSION_CREATE: 'Nop phieu DRL',
  TRAINING_SUBMISSION_UPDATE: 'Cap nhat phieu DRL',
  CUSTOM_EVIDENCE_SUBMIT: 'Nop minh chung',
  TRAINING_APPROVAL_UPDATE: 'Cap nhat ket qua DRL',
  CUSTOM_EVIDENCE_REVIEW: 'Duyet minh chung',
};

const METRIC_LABEL: Record<string, string> = {
  y_thuc: 'Y thuc',
  hoat_dong: 'Hoat dong',
  ky_luat: 'Ky luat',
  total: 'Tong diem',
  admin_y_thuc: 'Y thuc duyet',
  admin_hoat_dong: 'Hoat dong duyet',
  admin_ky_luat: 'Ky luat duyet',
  admin_total: 'Tong diem duyet',
  status: 'Trang thai',
  admin_notes: 'Ghi chu',
};

const getHistoryType = (item: ActivityLogItem): HistoryType => {
  if (item.category === 'AUTH') return 'AUTH';
  if (item.action === 'TRAINING_APPROVAL_UPDATE' || item.action === 'CUSTOM_EVIDENCE_REVIEW') return 'TRAINING_CHANGE';
  return 'TRAINING_SUBMISSION';
};

const normalizeObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Co' : 'Khong';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const formatDetails = (details: unknown) => {
  if (!details || typeof details !== 'object') return '';
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return '';
  }
};

const buildChangeRows = (details: unknown) => {
  const root = normalizeObject(details);
  const previous = normalizeObject(root.previous);
  const current = normalizeObject(root.current);
  const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);

  return Array.from(keys)
    .filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(current[key]))
    .map((key) => ({
      key,
      label: METRIC_LABEL[key] || key,
      previous: formatValue(previous[key]),
      current: formatValue(current[key]),
    }));
};

const buildDetailEntries = (details: unknown) => {
  const root = normalizeObject(details);
  return Object.entries(root)
    .filter(([key]) => key !== 'previous' && key !== 'current')
    .map(([key, value]) => ({
      key,
      label: METRIC_LABEL[key] || key,
      value: formatValue(value),
    }));
};

const detectBrowserName = (userAgent: string) => {
  if (/Edg\//.test(userAgent)) return 'Microsoft Edge';
  if (/OPR\//.test(userAgent)) return 'Opera';
  if (/SamsungBrowser\//.test(userAgent)) return 'Samsung Internet';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) return 'Chrome';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return '';
};

const detectDeviceType = (userAgent: string) => {
  if (/iPad/i.test(userAgent)) return 'iPad';
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/Android/i.test(userAgent)) return /Mobile/i.test(userAgent) ? 'Android Phone' : 'Android Tablet';
  if (/Windows NT/i.test(userAgent)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'macOS';
  if (/CrOS/i.test(userAgent)) return 'ChromeOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return '';
};

const getDeviceName = (userAgent?: string | null) => {
  const ua = String(userAgent || '').trim();
  if (!ua) return '--';

  const deviceType = detectDeviceType(ua);
  const browserName = detectBrowserName(ua);
  return [deviceType, browserName].filter(Boolean).join(' - ') || 'Thiet bi khong xac dinh';
};

const ActivityHistory = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);
  const [filters, setFilters] = useState({
    type: 'AUTH' as HistoryType,
    keyword: '',
    classId: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get<ActivityResponse>('/activity-logs', {
        params: {
          limit: 100,
          type: filters.type,
          keyword: filters.keyword || undefined,
          classId: isAdmin && filters.classId ? filters.classId : undefined,
        },
      });
      setLogs(res.data.items || []);
      setTotal(res.data.total || 0);
      setSelectedLog((current) => (current ? (res.data.items || []).find((item) => item.id === current.id) || null : null));
    } catch (_error) {
      toast.error('Khong the tai lich su hoat dong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters.type]);

  const stats = useMemo(() => {
    return logs.reduce(
      (acc, item) => {
        const type = getHistoryType(item);
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<HistoryType, number>,
    );
  }, [logs]);

  const changeRows = selectedLog ? buildChangeRows(selectedLog.details) : [];
  const detailEntries = selectedLog ? buildDetailEntries(selectedLog.details) : [];
  const rawDetails = selectedLog ? formatDetails(selectedLog.details) : '';

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">Minh bach he thong</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">Lich su hoat dong</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lich su duoc chia thanh 3 nhom: dang nhap, nop diem ren luyen va thay doi diem ren luyen.
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-400">
            {isAdmin ? 'Tai khoan admin xem duoc toan bo lich su trong he thong.' : 'Tai khoan nay chi xem duoc lich su lien quan den chinh minh.'}
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <RefreshCcw size={16} />
          Lam moi
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {HISTORY_TYPES.map((item) => {
          const isActive = filters.type === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, type: item.key }))}
              className={`rounded-3xl border p-4 text-left transition ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300/40'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${isActive ? 'bg-white/15 text-white' : item.badgeClass}`}>
                  {item.label}
                </span>
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${isActive ? 'bg-white/15 text-white' : item.iconClass}`}>
                  <Filter size={18} />
                </span>
              </div>
              <p className={`mt-4 text-3xl font-black ${isActive ? 'text-white' : 'text-slate-900'}`}>
                {isActive ? total : stats[item.key] || 0}
              </p>
              <p className={`mt-1 text-sm ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{item.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_auto]">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={filters.keyword}
            onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') fetchLogs();
            }}
            placeholder="Tim theo noi dung, tai khoan, IP, thiet bi..."
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>

        {isAdmin ? (
          <input
            value={filters.classId}
            onChange={(event) => setFilters((prev) => ({ ...prev, classId: event.target.value }))}
            placeholder="Loc theo lop"
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
          Tim
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={20} />
              Dang tai lich su...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <ShieldCheck className="mx-auto mb-3 text-slate-400" size={28} />
              Chua co lich su phu hop.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((item) => {
                const type = HISTORY_TYPE_MAP[getHistoryType(item)];
                const isSelected = selectedLog?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedLog(item)}
                    className={`grid w-full gap-4 p-5 text-left transition lg:grid-cols-[220px_1fr_140px] ${
                      isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="space-y-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${type.badgeClass}`}>
                        {type.label}
                      </span>
                      <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Clock3 size={14} />
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>

                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-900">{ACTION_LABEL[item.action] || item.action}</p>
                        {item.classId && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                            Lop {item.classId}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-6 text-slate-700">{item.summary}</p>
                      <p className="text-xs font-semibold text-slate-400">
                        {item.userName || item.username || 'Khong xac dinh'}
                      </p>
                    </div>

                    <div className="flex items-center justify-start gap-2 text-sm font-bold text-blue-600 lg:justify-end">
                      <Eye size={16} />
                      Xem chi tiet
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {selectedLog ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Chi tiet ban ghi</p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">{ACTION_LABEL[selectedLog.action] || selectedLog.action}</h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedLog.summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Tai khoan</p>
                  <p className="mt-2 font-bold text-slate-900">{selectedLog.userName || selectedLog.username || '--'}</p>
                  <p className="mt-1">Vai tro: {selectedLog.role || '--'}</p>
                  <p className="mt-1">Lop: {selectedLog.classId || '--'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Phien truy cap</p>
                  <p className="mt-2">Thoi gian: {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}</p>
                  <p className="mt-1">IP: {selectedLog.ipAddress || '--'}</p>
                  <p className="mt-1">Thiet bi: {getDeviceName(selectedLog.userAgent)}</p>
                </div>
              </div>

              {changeRows.length > 0 && (
                <div className="rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <p className="text-sm font-black text-slate-900">Thong tin thay doi</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {changeRows.map((row) => (
                      <div key={row.key} className="grid gap-3 px-4 py-3 md:grid-cols-[140px_1fr_1fr]">
                        <p className="text-sm font-bold text-slate-700">{row.label}</p>
                        <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Truoc: {row.previous}</div>
                        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Sau: {row.current}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailEntries.length > 0 && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-black text-slate-900">Thong tin bo sung</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {detailEntries.map((entry) => (
                      <div key={entry.key} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">{entry.label}</p>
                        <p className="mt-2 break-words text-sm text-slate-700">{entry.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rawDetails && (
                <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-black text-slate-700">Du lieu goc</summary>
                  <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                    {rawDetails}
                  </pre>
                </details>
              )}

              <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                <p className="flex items-center gap-2 font-bold text-slate-800">
                  <User size={14} />
                  Tai khoan: {selectedLog.username || '--'}
                </p>
                <p className="mt-2 flex items-start gap-2">
                  <Laptop size={14} className="mt-0.5 shrink-0" />
                  <span className="break-words">{selectedLog.userAgent || 'Khong co thong tin trinh duyet'}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-slate-500">
              <Eye className="mb-3 text-slate-300" size={28} />
              <p className="font-bold text-slate-700">Chon mot ban ghi de xem chi tiet</p>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Khi bam vao tung muc, he thong se hien thi thong tin thay doi diem va du lieu lien quan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityHistory;
