import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Download,
  Eye,
  Filter,
  Loader2,
  Search,
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [filter.status, filter.class_id, filter.semester, filter.assigned_only, refreshKey]);

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

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-700 active:scale-95"
          >
            <Upload size={18} />
            Nhập DRL bằng File
          </button>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Xuất Excel
          </button>
        </div>
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

      {isImportOpen && (
        <ImportFinalDRLModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          semesterOptions={semesterOptions}
          onImportSuccess={() => setRefreshKey((prev) => prev + 1)}
        />
      )}
    </div>
  );
};

/* --- Modal Components --- */

const ImportFinalDRLModal = ({
  isOpen,
  onClose,
  semesterOptions,
  onImportSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  semesterOptions: any[];
  onImportSuccess: () => void;
}) => {
  const [semester, setSemester] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  // Set default semester
  useEffect(() => {
    if (semesterOptions.length > 0 && !semester) {
      setSemester(semesterOptions[0]?.name || '');
    }
  }, [semesterOptions]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        setFile(droppedFile);
      } else {
        toast.error('Chỉ chấp nhận tệp Excel (.xlsx, .xls)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semester) return toast.error('Vui lòng chọn học kỳ');
    if (!file) return toast.error('Vui lòng tải lên file Excel');

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('semester', semester);

      const res = await api.post('/training/import-final-drl', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(res.data.summary);
      toast.success('Nhập điểm rèn luyện thành công!');
      onImportSuccess();
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.message || 'Có lỗi xảy ra khi nhập dữ liệu';
      toast.error(errMsg);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => {
          if (!isImporting) onClose();
        }}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl transform overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl transition-all duration-300 animate-fade-in my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-500 h-6 w-6" />
              Nhập DRL bằng File Excel
            </h3>
            <p className="text-xs text-slate-500">Cập nhật trực tiếp điểm rèn luyện cuối cùng cho sinh viên</p>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form or Result */}
        <div className="flex-1 overflow-y-auto py-5 pr-1 space-y-4">
          {!result ? (
            <form onSubmit={handleImport} className="space-y-4">
              {/* Semester */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Học kỳ</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  {semesterOptions.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requirement details */}
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100 text-xs text-amber-800 space-y-1">
                <p className="font-bold">Yêu cầu tệp dữ liệu:</p>
                <p className="leading-relaxed">
                  - Bắt buộc có cột <strong>MSSV</strong> (mã sinh viên).<br />
                  - Có thể chứa các cột điểm: <strong>Ý thức</strong> (tối đa 20đ), <strong>Hoạt động</strong> (tối đa 45đ), <strong>Kỷ luật</strong> (tối đa 35đ) và <strong>Tổng điểm</strong>.<br />
                  - Nếu thiếu cột tổng điểm, hệ thống sẽ tự động tính từ tổng các cột điểm thành phần.
                </p>
              </div>

              {/* Excel upload area */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tệp danh sách Excel</label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-6 text-center transition ${
                    dragActive
                      ? 'border-sky-500 bg-sky-50/50'
                      : file
                      ? 'border-emerald-500 bg-emerald-50/10'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    type="file"
                    id="excel-file-upload"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {file ? (
                    <div className="space-y-2">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <FileSpreadsheet size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{file.name}</p>
                        <p className="text-xs text-slate-500">Kích thước: {formatSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Chọn tệp khác
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="excel-file-upload" className="group cursor-pointer space-y-2">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-sky-100 group-hover:text-sky-600 transition">
                        <Upload size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Kéo thả tệp hoặc click để tải lên</p>
                        <p className="text-xs text-slate-400">Chỉ nhận tệp Excel (.xlsx, .xls) chứa cột MSSV</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isImporting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang xử lý dữ liệu...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Xác nhận nhập điểm
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Results Panel */
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Xử lý tệp hoàn tất</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Kết quả nhập điểm rèn luyện hàng loạt</p>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-3xl font-black text-emerald-700">
                  {result.successCount}
                  <span className="text-sm font-bold text-slate-500">sinh viên thành công</span>
                </div>
              </div>

              {/* Expandable Warnings/Errors */}
              <div className="space-y-3">
                {result.notFoundCount > 0 && (
                  <ResultListCollapse
                    title={`MSSV không tồn tại (${result.notFoundCount})`}
                    description="Không tìm thấy mã sinh viên trong hệ thống"
                    list={result.notFoundList}
                    type="danger"
                  />
                )}

                {result.mismatchCount > 0 && (
                  <ResultListCollapse
                    title={`Khác lớp được giao (${result.mismatchCount})`}
                    description="Không thuộc phạm vi quản lý của bạn"
                    list={result.mismatchList}
                    type="danger"
                  />
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex w-full items-center justify-center rounded-2xl bg-slate-950 py-3 text-sm font-bold text-white hover:bg-slate-900 transition active:scale-95"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Collapsible item component for failed results
const ResultListCollapse = ({
  title,
  description,
  list,
  type,
}: {
  title: string;
  description: string;
  list: string[];
  type: 'warning' | 'danger';
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const colors = {
    warning: {
      border: 'border-amber-100 bg-amber-50/20',
      headerText: 'text-amber-800',
      icon: 'text-amber-600',
      tag: 'bg-amber-100 text-amber-800',
    },
    danger: {
      border: 'border-rose-100 bg-rose-50/20',
      headerText: 'text-rose-800',
      icon: 'text-rose-600',
      tag: 'bg-rose-100 text-rose-800',
    },
  }[type];

  return (
    <div className={`rounded-2xl border ${colors.border} overflow-hidden transition-all duration-300`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 outline-none text-left"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${colors.icon}`} />
          <div>
            <p className={`text-sm font-bold ${colors.headerText}`}>{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-white/60">
          <div className="flex flex-wrap gap-2">
            {list.map((item) => (
              <span key={item} className={`rounded-lg px-2 py-1 text-xs font-bold ${colors.tag}`}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default AdminDRLManagement;
