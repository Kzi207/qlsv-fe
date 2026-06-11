import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Download,
  Eye,
  Filter,
  Loader2,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { downloadXlsxFile } from '../utils/download';

import { useAuthStore } from '../store/useAuthStore';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Cho duyet',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  APPROVED: {
    label: 'Da duyet',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  REJECTED: {
    label: 'Khong duyet',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  NOT_SUBMITTED: {
    label: 'Chua nop',
    className: 'border-slate-200 bg-slate-100 text-slate-600',
  },
};

const AdminDRLManagement = () => {
  const { user } = useAuthStore();
  const isBch = user?.role?.toUpperCase() === 'BCH';

  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [semesterOptions, setSemesterOptions] = useState<any[]>([]);
  const [filter, setFilter] = useState(() => {
    const saved = localStorage.getItem('drl_filters');
    const base = saved ? JSON.parse(saved) : { status: '', class_id: '', semester: '', keyword: '', assigned_only: false };
    if (!['', 'SUBMITTED', 'NOT_SUBMITTED', 'APPROVED'].includes(String(base.status || ''))) {
      base.status = '';
    }
    // If user is BCH, force class_id to their class if not set
    if (isBch && !base.class_id) base.class_id = user?.class_id || '';
    return base;
  });

  useEffect(() => {
    localStorage.setItem('drl_filters', JSON.stringify(filter));
  }, [filter]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [classesRes, semestersRes] = await Promise.all([
          api.get('/classes'),
          api.get('/semesters'),
        ]);

        setClassOptions(classesRes.data);
        setSemesterOptions(semestersRes.data);
      } catch (error) {
        console.error('Khong the tai du lieu bo loc', error);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      try {
        const res = await api.get('/training', {
          params: {
            status: filter.status || undefined,
            class_id: filter.class_id || undefined,
            semester: filter.semester || undefined,
            assigned_only: filter.assigned_only || undefined,
          },
        });
        setScores(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        toast.error('Khong the tai danh sach phieu');
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [filter.status, filter.class_id, filter.semester, filter.assigned_only]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/training/export', {
        params: {
          status: filter.status || undefined,
          class_id: filter.class_id || undefined,
          semester: filter.semester || undefined,
          assigned_only: filter.assigned_only || undefined,
        },
        responseType: 'blob',
      });
      downloadXlsxFile(res.data, 'diem-ren-luyen.xlsx');
      toast.success('Da xuat file Excel');
    } catch (error) {
      toast.error('Xuat file that bai');
    } finally {
      setExporting(false);
    }
  };

  const filteredScores = scores.filter((score) => {
    const keyword = filter.keyword.trim().toLowerCase();
    if (!keyword) return true;

    return [
      score.student?.name,
      score.student?.student_code,
      score.student?.class_id,
      typeof score.semester === 'object' ? score.semester?.name : score.semester,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-600">Duyệt phiếu DRL</p>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Danh sách phiếu điểm rèn luyện</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Mở trang chi tiết để xem phiếu theo dạng bảng, xem minh chứng và chấm từng mục.
            </p>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          Xuất Excel
        </button>
      </div>

      <div className={`grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm ${isBch ? 'lg:grid-cols-[1.3fr_repeat(4,220px)]' : 'lg:grid-cols-[1.3fr_repeat(3,220px)]'}`}>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={filter.keyword}
            onChange={(e) => setFilter((prev: any) => ({ ...prev, keyword: e.target.value }))}
            placeholder="Tim theo ten, MSSV, lop..."
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>

        {isBch && (
          <label className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filter.assigned_only}
              onChange={(e) => setFilter((prev: any) => ({ ...prev, assigned_only: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <span className="text-sm font-bold text-indigo-700">Chỉ hiện SV được giao</span>
          </label>
        )}

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Filter size={18} className="text-slate-400" />
          <select
            value={filter.status}
            onChange={(e) => setFilter((prev: any) => ({ ...prev, status: e.target.value }))}
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SUBMITTED">Đã nộp</option>
            <option value="NOT_SUBMITTED">Chưa nộp</option>
            <option value="APPROVED">Đã duyệt</option>
          </select>
        </label>

        <select
          value={filter.class_id}
          onChange={(e) => setFilter((prev: any) => ({ ...prev, class_id: e.target.value }))}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none"
          disabled={isBch}
        >
          <option value="">Tất cả lớp</option>
          {classOptions.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          value={filter.semester}
          onChange={(e) => setFilter((prev: any) => ({ ...prev, semester: e.target.value }))}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none"
        >
          <option value="">Tất cả học kỳ</option>
          {semesterOptions.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
            <p>Đang tải danh sách phiếu...</p>
          </div>
        ) : filteredScores.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-slate-400">
            <ClipboardList className="h-12 w-12 opacity-30" />
            <p>Không có phiếu nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[1.4fr_160px_160px_150px_120px] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500 lg:grid">
              <span>STT - Sinh viên</span>
              <span>Học kỳ</span>
              <span>Tự chấm</span>
              <span>Lớp chấm</span>
              <span className="text-right">Thao tác</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredScores.map((score) => {
                const status = STATUS_MAP[score.status] || STATUS_MAP.PENDING;
                const canViewDetails = typeof score.id === 'number';

                return (
                  <div
                    key={score.id}
                    className="grid gap-4 px-6 py-5 lg:grid-cols-[1.4fr_160px_160px_150px_120px] lg:items-center hover:bg-slate-50/50 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 font-bold text-xs">
                          {score.student?.order_number || '-'}
                        </span>
                        <p className="text-lg font-bold text-slate-900">{score.student?.name}</p>
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                          {score.student?.student_code}
                        </span>
                        {!isBch && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            Lớp {score.student?.class_id}
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="text-sm text-slate-600">
                      {typeof score.semester === 'object' ? score.semester?.name : score.semester}
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Sinh viên</p>
                      <p className="mt-1 text-2xl font-black text-slate-900">{score.total}</p>
                    </div>

                    <div className="rounded-2xl bg-sky-50 px-4 py-3 text-center">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-500">Lớp chấm</p>
                      <p className="mt-1 text-2xl font-black text-sky-700">{score.admin_total ?? '-'}</p>
                    </div>

                    <div className="flex items-center justify-end">
                      {canViewDetails ? (
                        <Link
                          to={`/training/approval/${score.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
                        >
                          <Eye size={16} />
                          Chi tiết
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-400">
                          <Eye size={16} />
                          Chưa nộp
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDRLManagement;
