import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  Loader2,
  PieChart as PieChartIcon,
  Send,
  UserRoundX,
  Users,
  TrendingUp,
  Award,
  Search,
  MoreVertical,
  Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';
import { openPrintReport } from '../utils/download';

type SemesterOption = {
  name: string;
};

type ClassStudent = {
  id: number;
  name: string;
  studentCode: string;
  email?: string | null;
  classId: string;
  orderNumber?: number | null;
  scoreId?: number;
  status?: string;
  selfTotal?: number | null;
  approvedTotal?: number | null;
  updatedAt?: string;
};

type ClassSummary = {
  classId: string;
  totalStudents: number;
  submittedCount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  notSubmittedCount: number;
  submissionRate: number;
  approvalRate: number;
  submittedStudents: ClassStudent[];
  approvedStudents: ClassStudent[];
  notSubmittedStudents: ClassStudent[];
  pendingStudents: ClassStudent[];
  rejectedStudents: ClassStudent[];
};

type StatisticsPayload = {
  semester: string;
  classFilter: string | null;
  generatedAt: string;
  totals: {
    totalStudents: number;
    submittedCount: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    notSubmittedCount: number;
    submissionRate: number;
    approvalRate: number;
  };
  classes: ClassSummary[];
};

type ListMode = 'SUBMITTED' | 'APPROVED' | 'NOT_SUBMITTED';

// Toned and modern colors
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e'];

const listModeMeta: Record<ListMode, { title: string; badgeClass: string }> = {
  SUBMITTED: {
    title: 'Đã nộp',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  APPROVED: {
    title: 'Đã duyệt',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  NOT_SUBMITTED: {
    title: 'Chưa nộp',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (value?: string) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString('vi-VN');
};

const getStudentListByMode = (item: ClassSummary | null, mode: ListMode) => {
  if (!item) return [];
  if (mode === 'SUBMITTED') return item.submittedStudents;
  if (mode === 'APPROVED') return item.approvedStudents;
  return item.notSubmittedStudents;
};

const TrainingStatistics = () => {
  const { user } = useAuthStore();
  const isBch = String(user?.role || '').toUpperCase() === 'BCH';
  const lockedClassId = String(user?.class_id || '').trim().toUpperCase();

  const [semesterOptions, setSemesterOptions] = useState<SemesterOption[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [listMode, setListMode] = useState<ListMode>('SUBMITTED');
  const [searchQuery, setSearchQuery] = useState('');
  const [payload, setPayload] = useState<StatisticsPayload | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const fetchFilters = async () => {
      setLoadingFilters(true);
      try {
        const semesterRes = await api.get<SemesterOption[]>('/semesters');
        const semesters = Array.isArray(semesterRes.data) ? semesterRes.data : [];
        setSemesterOptions(semesters);
        setSelectedSemester((prev) => prev || semesters[0]?.name || '');
      } catch (error) {
        toast.error('Không thể tải danh sách học kỳ');
      } finally {
        setLoadingFilters(false);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    if (!selectedSemester) return;

    const fetchStatistics = async () => {
      setLoadingData(true);
      try {
        const res = await api.get<StatisticsPayload>('/training/statistics', {
          params: {
            semester: selectedSemester,
            class_id: isBch ? lockedClassId || undefined : undefined,
          },
        });
        const nextPayload = res.data;
        setPayload(nextPayload);
        setSelectedClassId((prev) => {
          if (isBch && lockedClassId) return lockedClassId;
          if (prev && nextPayload.classes.some((item) => item.classId === prev)) return prev;
          return nextPayload.classes[0]?.classId || '';
        });
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Không thể tải thống kê ĐRL');
        setPayload(null);
      } finally {
        setLoadingData(false);
      }
    };

    fetchStatistics();
  }, [selectedSemester, isBch, lockedClassId]);

  const classSummaries = payload?.classes || [];
  const selectedClass = useMemo(
    () => classSummaries.find((item) => item.classId === selectedClassId) || classSummaries[0] || null,
    [classSummaries, selectedClassId],
  );
  const selectedStudents = useMemo(() => {
    const list = getStudentListByMode(selectedClass, listMode);
    if (!searchQuery) return list;
    const lowerQuery = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.studentCode.toLowerCase().includes(lowerQuery)
    );
  }, [selectedClass, listMode, searchQuery]);

  const classChartData = useMemo(
    () =>
      classSummaries.map((item) => ({
        classId: item.classId,
        'Đã nộp': item.submittedCount,
        'Đã duyệt': item.approvedCount,
        'Chưa nộp': item.notSubmittedCount,
      })),
    [classSummaries],
  );

  const selectedPieData = useMemo(() => {
    if (!selectedClass) return [];
    return [
      { name: 'Đã nộp', value: selectedClass.submittedCount },
      { name: 'Đã duyệt', value: selectedClass.approvedCount },
      { name: 'Chờ / chưa duyệt', value: selectedClass.pendingCount + selectedClass.rejectedCount },
      { name: 'Chưa nộp', value: selectedClass.notSubmittedCount },
    ].filter((item) => item.value > 0);
  }, [selectedClass]);

  const handleExportPdf = () => {
    if (!selectedClass) {
      toast.error('Chưa có dữ liệu lớp để xuất');
      return;
    }

    const modeTitle = listModeMeta[listMode].title;
    const rows = selectedStudents
      .map((student, index) => {
        const scoreCell =
          listMode === 'NOT_SUBMITTED'
            ? '--'
            : `${student.selfTotal ?? '--'} / ${student.approvedTotal ?? '--'}`;

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(student.studentCode)}</td>
            <td>${escapeHtml(student.name)}</td>
            <td>${escapeHtml(student.classId)}</td>
            <td>${scoreCell}</td>
            <td>${escapeHtml(formatDateTime(student.updatedAt))}</td>
          </tr>`;
      })
      .join('');

    const html = `
      <div class="header">
        <div>
          <h1 class="title">Báo cáo thống kê ĐRL</h1>
          <p class="subtitle">Danh sách ${escapeHtml(modeTitle.toLowerCase())} theo lớp ${escapeHtml(selectedClass.classId)} trong học kỳ ${escapeHtml(selectedSemester)}.</p>
        </div>
        <div class="meta">
          <div><strong>Học kỳ:</strong> ${escapeHtml(selectedSemester)}</div>
          <div><strong>Lớp:</strong> ${escapeHtml(selectedClass.classId)}</div>
          <div><strong>Nhóm xuất:</strong> ${escapeHtml(modeTitle)}</div>
          <div><strong>Thời gian tạo:</strong> ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
        </div>
      </div>
      <div class="stats">
        <div class="stat">
          <div class="stat-label">Tổng sinh viên</div>
          <div class="stat-value">${selectedClass.totalStudents}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Đã nộp</div>
          <div class="stat-value">${selectedClass.submittedCount}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Đã duyệt</div>
          <div class="stat-value">${selectedClass.approvedCount}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Chưa nộp</div>
          <div class="stat-value">${selectedClass.notSubmittedCount}</div>
        </div>
      </div>
      <div class="chips">
        <span class="chip ok">Tỷ lệ nộp: ${selectedClass.submissionRate}%</span>
        <span class="chip warn">Chờ / chưa duyệt: ${selectedClass.pendingCount + selectedClass.rejectedCount}</span>
        <span class="chip danger">Số dòng trong báo cáo: ${selectedStudents.length}</span>
      </div>
      ${
        selectedStudents.length > 0
          ? `<table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>MSSV</th>
                  <th>Họ tên</th>
                  <th>Lớp</th>
                  <th>Điểm SV / Duyệt</th>
                  <th>Cập nhật</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>`
          : `<div class="empty">Không có sinh viên thuộc nhóm ${escapeHtml(modeTitle.toLowerCase())} trong lớp này.</div>`
      }
    `;

    try {
      openPrintReport(`thong-ke-drl-${selectedClass.classId}-${listMode.toLowerCase()}`, html);
      toast.success('Đã mở báo cáo in. Bạn chọn "Lưu dưới dạng PDF" để xuất file.');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể mở báo cáo PDF');
    }
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1 text-xs font-bold text-indigo-600 backdrop-blur-sm">
            <Award size={14} />
            <span>THỐNG KÊ ĐIỂM RÈN LUYỆN</span>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Theo dõi tiến độ nộp và duyệt
            </h1>
            <p className="mt-2 max-w-2xl text-base text-slate-500">
              Cái nhìn tổng quan về tình hình chấm điểm rèn luyện của sinh viên, theo dõi tiến độ nộp và phê duyệt điểm một cách trực quan.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-white bg-white/50 p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl sm:gap-4 sm:p-3 lg:grid-cols-[1.3fr_280px_280px]">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-100/50 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md sm:px-5 sm:py-3.5">
          <div className="rounded-xl bg-slate-50 p-2 text-slate-400">
            <Filter size={18} />
          </div>
          <div className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Học kỳ</span>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full cursor-pointer bg-transparent text-sm font-bold text-slate-700 outline-none"
              disabled={loadingFilters}
            >
              {semesterOptions.length === 0 ? <option value="">Chọn học kỳ</option> : null}
              {semesterOptions.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-100/50 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md sm:px-5 sm:py-3.5">
          <div className="rounded-xl bg-slate-50 p-2 text-slate-400">
            <BarChart3 size={18} />
          </div>
          <div className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Lớp học</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full cursor-pointer bg-transparent text-sm font-bold text-slate-700 outline-none"
              disabled={isBch || classSummaries.length === 0}
            >
              {classSummaries.length === 0 ? <option value="">Chọn lớp</option> : null}
              {classSummaries.map((item) => (
                <option key={item.classId} value={item.classId}>
                  {item.classId}
                </option>
              ))}
            </select>
          </div>
        </label>

        <div className="flex items-start gap-4 rounded-2xl border border-indigo-100/50 bg-indigo-50/80 px-4 py-3 sm:items-center sm:px-5 sm:py-3.5">
          <div className="flex-1">
            <p className="font-black uppercase tracking-widest text-[10px] text-indigo-500">Lưu ý xuất PDF</p>
            <p className="mt-0.5 text-xs font-medium leading-tight text-indigo-700/80">Nút xuất sẽ mở báo cáo in. Chọn “Lưu dưới dạng PDF” để tải file.</p>
          </div>
        </div>
      </div>

      {loadingData ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-[2.5rem] border border-slate-100 bg-white/50 shadow-sm backdrop-blur-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <p className="font-medium text-slate-500">Đang tải và xử lý dữ liệu thống kê...</p>
        </div>
      ) : !payload || classSummaries.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-[2.5rem] border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <FileText className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-700">Chưa có dữ liệu thống kê</h3>
            <p className="mt-1 text-sm text-slate-500">Không tìm thấy thông tin cho học kỳ hoặc lớp đã chọn.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* STAT CARDS */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="group relative overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-lg sm:p-6">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-indigo-100/60 blur-3xl transition-transform group-hover:scale-110"></div>
              <div className="relative flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600/80">Tổng sinh viên</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-50">
                  <Users size={22} />
                </div>
              </div>
              <div className="relative mt-4">
                <p className="text-4xl font-black tracking-tight text-slate-900">{payload.totals.totalStudents}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">Toàn bộ lớp trong học kỳ</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-lg sm:p-6">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-blue-100/60 blur-3xl transition-transform group-hover:scale-110"></div>
              <div className="relative flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-600/80">Đã nộp</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-50">
                  <Send size={22} />
                </div>
              </div>
              <div className="relative mt-4">
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-black tracking-tight text-slate-900">{payload.totals.submittedCount}</p>
                  <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                    <TrendingUp size={12} /> {payload.totals.submissionRate}%
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-500">Tỷ lệ sinh viên đã nộp</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-lg sm:p-6">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-100/60 blur-3xl transition-transform group-hover:scale-110"></div>
              <div className="relative flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-600/80">Đã duyệt</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-50">
                  <CheckCircle2 size={22} />
                </div>
              </div>
              <div className="relative mt-4">
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-black tracking-tight text-slate-900">{payload.totals.approvedCount}</p>
                  <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    <TrendingUp size={12} /> {payload.totals.approvalRate}%
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-500">Tỷ lệ duyệt trên số đã nộp</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[2rem] border border-rose-100 bg-gradient-to-br from-rose-50/80 to-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-lg sm:p-6">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-rose-100/60 blur-3xl transition-transform group-hover:scale-110"></div>
              <div className="relative flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-rose-600/80">Chưa nộp</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm ring-1 ring-rose-50">
                  <UserRoundX size={22} />
                </div>
              </div>
              <div className="relative mt-4">
                <p className="text-4xl font-black tracking-tight text-slate-900">{payload.totals.notSubmittedCount}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">Cần nhắc nhở sinh viên nộp</p>
              </div>
            </div>
          </div>

          {/* CHARTS */}
          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="flex flex-col rounded-[2.5rem] border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-7">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                    <BarChart3 size={12} /> Biểu đồ
                  </div>
                  <h2 className="mt-3 text-xl font-black text-slate-900">Tiến độ nộp theo từng lớp</h2>
                </div>
              </div>

              <div className="h-[280px] w-full flex-1 sm:h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id="colorNotSubmitted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={1} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="classId" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{
                        borderRadius: '20px',
                        border: 'none',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        padding: '16px 20px',
                        fontWeight: 600,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(8px)',
                      }}
                      itemStyle={{ padding: '4px 0' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" iconSize={10} />
                    <Bar dataKey="Đã nộp" fill="url(#colorSubmitted)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Đã duyệt" fill="url(#colorApproved)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Chưa nộp" fill="url(#colorNotSubmitted)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col rounded-[2.5rem] border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-7">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-pink-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-pink-600">
                    <PieChartIcon size={12} /> Tỷ lệ
                  </div>
                  <h2 className="mt-3 text-xl font-black text-slate-900">Lớp {selectedClass?.classId || '--'}</h2>
                </div>
              </div>

              <div className="h-[220px] w-full sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={selectedPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={5}
                      stroke="none"
                    >
                      {selectedPieData.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} className="drop-shadow-sm outline-none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '20px',
                        border: 'none',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        padding: '12px 16px',
                        fontWeight: 600,
                      }}
                      itemStyle={{ padding: '2px 0' }}
                    />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {selectedClass ? (
                <div className="mt-auto grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50/80 px-5 py-4 border border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tỷ lệ nộp</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{selectedClass.submissionRate}%</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50/50 px-5 py-4 border border-emerald-100/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">Tỷ lệ duyệt</p>
                    <p className="mt-1 text-2xl font-black text-emerald-700">{selectedClass.approvalRate}%</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* DETAIL LIST */}
          <div className="rounded-[2.5rem] border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {selectedClass ? `Danh sách lớp ${selectedClass.classId}` : 'Chưa chọn lớp'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Xem chi tiết trạng thái từng sinh viên.</p>
              </div>

              <div className="flex w-full flex-col gap-4">
                <div className="relative w-full">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Tìm sinh viên bằng tên hoặc MSSV..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {(Object.keys(listModeMeta) as ListMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setListMode(mode)}
                        className={`flex-shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                          listMode === mode
                            ? 'border border-slate-900 bg-white text-slate-900 shadow-sm'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {listModeMeta[mode].title}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleExportPdf}
                    disabled={loadingData || !selectedClass}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
                  >
                    <Download size={16} />
                    Xuất PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8">
              {/* MOBILE VIEW (CARDS) */}
              <div className="grid grid-cols-1 gap-4 xl:hidden">
                {selectedStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <div className="mb-3 rounded-full bg-white shadow-sm p-4">
                      <Users size={24} className="opacity-50 text-slate-400" />
                    </div>
                    <p className="font-medium text-sm text-slate-500">Không có sinh viên thuộc nhóm này.</p>
                  </div>
                ) : (
                  selectedStudents.map((student, index) => (
                    <div
                      key={`${listMode}-${student.id}`}
                      className="group relative flex flex-col gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100/70 text-sm font-bold text-indigo-700">
                            {student.orderNumber ?? index + 1}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500">{student.studentCode}</span>
                            <span className="text-sm font-bold uppercase text-slate-800">{student.name}</span>
                          </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600 pt-1 pr-1">
                          <MoreVertical size={18} />
                        </button>
                      </div>

                      {student.email && (
                        <div className="flex items-center gap-2 text-slate-500 ml-1">
                          <Mail size={14} className="shrink-0" />
                          <span className="text-[11px] font-medium">{student.email}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            {student.classId}
                          </span>
                          {listMode === 'NOT_SUBMITTED' ? (
                            <span className="inline-flex items-center rounded bg-rose-100/80 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
                              Chưa có phiếu
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              {student.selfTotal ?? '--'} / {student.approvedTotal ?? '--'}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">
                          Cập nhật: {listMode === 'NOT_SUBMITTED' ? '--' : formatDateTime(student.updatedAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* DESKTOP VIEW (TABLE) */}
              <div className="hidden xl:block rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[900px] divide-y divide-slate-100">
                    <div className="grid grid-cols-[80px_130px_1.5fr_130px_160px_180px] gap-4 bg-slate-50/80 px-6 py-5 text-xs font-black uppercase tracking-wider text-slate-500">
                    <span>STT</span>
                    <span>MSSV</span>
                    <span>Họ tên</span>
                    <span>Lớp</span>
                    <span>Điểm</span>
                    <span>Cập nhật</span>
                  </div>

                  {selectedStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50/30">
                      <div className="mb-3 rounded-full bg-slate-100 p-4">
                        <Users size={24} className="opacity-50" />
                      </div>
                      <p className="font-medium text-slate-500">Không có sinh viên thuộc nhóm này.</p>
                    </div>
                  ) : (
                    selectedStudents.map((student, index) => (
                      <div
                        key={`${listMode}-${student.id}`}
                        className="group grid grid-cols-[80px_130px_1.5fr_130px_160px_180px] items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/60"
                      >
                        <div className="flex items-center">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                            {student.orderNumber ?? index + 1}
                          </span>
                        </div>
                        <div className="font-bold text-slate-700">{student.studentCode}</div>
                        <div>
                          <p className="font-bold text-slate-900">{student.name}</p>
                          {student.email ? <p className="mt-0.5 text-xs font-medium text-slate-400">{student.email}</p> : null}
                        </div>
                        <div>
                          <span className="inline-flex items-center rounded-lg bg-slate-100/80 px-2.5 py-1 text-xs font-bold text-slate-600">
                            {student.classId}
                          </span>
                        </div>
                        <div>
                          {listMode === 'NOT_SUBMITTED' ? (
                            <span className="inline-flex items-center rounded-lg border border-rose-200/50 bg-rose-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-rose-600">
                              Chưa có phiếu
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <span className="inline-flex w-fit items-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                                SV: {student.selfTotal ?? '--'}
                              </span>
                              <span className="inline-flex w-fit items-center rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                GV: {student.approvedTotal ?? '--'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-[13px] font-medium text-slate-500">
                          {listMode === 'NOT_SUBMITTED' ? '--' : formatDateTime(student.updatedAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingStatistics;
