import { useEffect, useState } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Loader2, Award, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { EVALUATION_DATA } from '../constants/evaluationData';

const AdminEvidenceImport = () => {
  const [semesterOptions, setSemesterOptions] = useState<any[]>([]);
  const [semester, setSemester] = useState('');
  const [criterionId, setCriterionId] = useState('');
  const [points, setPoints] = useState('');
  const [activityName, setActivityName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const res = await api.get('/semesters');
        setSemesterOptions(res.data);
        if (res.data.length > 0) {
          setSemester(res.data[0]?.name || '');
        }
      } catch (error) {
        console.error('Không thể tải danh sách học kỳ', error);
        toast.error('Không thể tải danh sách học kỳ');
      }
    };
    fetchSemesters();
  }, []);

  const allCriteria = EVALUATION_DATA.flatMap((sec) =>
    sec.criteria.map((crit) => ({
      id: crit.id,
      content: crit.content,
      maxPoints: crit.maxPoints,
      guide: crit.guide,
      sectionTitle: sec.title.split('.')[0] + '.',
      type: crit.type,
    }))
  );

  const selectedCrit = allCriteria.find((c) => c.id === criterionId);

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
    if (!criterionId) return toast.error('Vui lòng chọn tiêu chí');
    if (!points || Number(points) <= 0) return toast.error('Điểm cộng phải lớn hơn 0');
    if (!activityName.trim()) return toast.error('Vui lòng nhập tên hoạt động');
    if (!file) return toast.error('Vui lòng tải lên file Excel');

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('semester', semester);
      formData.append('criterionId', criterionId);
      formData.append('points', points);
      formData.append('activityName', activityName.trim());

      const res = await api.post('/training/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(res.data.summary);
      toast.success('Nhập minh chứng thành công!');
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.message || 'Có lỗi xảy ra khi nhập dữ liệu';
      toast.error(errMsg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setFile(null);
    setPoints('');
    setCriterionId('');
    setActivityName('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Quản lý minh chứng</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Nhập Minh chứng Excel</h1>
          <p className="text-sm font-medium text-slate-500">Cấp điểm hoạt động hàng loạt và tự động duyệt minh chứng qua file Excel</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Input Form Column */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-slate-100/50">
          {!result ? (
            <form onSubmit={handleImport} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Học kỳ</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
                  >
                    {semesterOptions.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Điểm cộng</label>
                  <input
                    type="number"
                    step="any"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    placeholder="Ví dụ: 3"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">Tiêu chí DRL áp dụng</label>
                <select
                  value={criterionId}
                  onChange={(e) => setCriterionId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option value="">-- Chọn tiêu chí cộng điểm --</option>
                  {EVALUATION_DATA.map((section) => (
                    <optgroup key={section.id} label={section.title}>
                      {section.criteria.map((crit) => (
                        <option key={crit.id} value={crit.id}>
                          {crit.id} - {crit.content.substring(0, 75)}
                          {crit.content.length > 75 ? '...' : ''} ({crit.type === 'boolean' ? 'Đạt' : `Tối đa ${crit.maxPoints}đ`})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">Tên hoạt động minh chứng</label>
                <input
                  type="text"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  placeholder="Ví dụ: Tham gia hiến máu tình nguyện, Ngày hội khoa học..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              {/* Excel upload area */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">Tải lên tệp Excel danh sách MSSV</label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-8 text-center transition ${
                    dragActive
                      ? 'border-emerald-500 bg-emerald-50/20'
                      : file
                      ? 'border-emerald-500 bg-emerald-50/5'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
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
                    <div className="space-y-3">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <FileSpreadsheet size={28} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{file.name}</p>
                        <p className="text-xs text-slate-500 mt-1">Kích thước: {formatSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition"
                      >
                        Chọn tệp khác
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="excel-file-upload" className="group cursor-pointer space-y-3 py-4 w-full">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition duration-300">
                        <Upload size={28} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Kéo thả tệp Excel vào đây hoặc click để duyệt</p>
                        <p className="text-xs text-slate-400 mt-1">Chỉ hỗ trợ tệp định dạng .xlsx, .xls có chứa cột MSSV</p>
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-xl hover:shadow-emerald-500/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang xử lý dữ liệu...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Bắt đầu nhập minh chứng
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Results Panel */
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/30 p-6 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900">Nhập minh chứng thành công</h4>
                  <p className="text-xs text-slate-500 mt-1">Hệ thống đã tự động duyệt minh chứng và cộng điểm cho danh sách sinh viên bên dưới</p>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 text-4xl font-black text-emerald-700">
                  {result.successCount}
                  <span className="text-sm font-bold text-slate-500">sinh viên thành công</span>
                </div>
              </div>

              {/* Expandable Warnings/Errors */}
              <div className="space-y-3">
                {result.duplicateCount > 0 && (
                  <ResultListCollapse
                    title={`Đã trùng lặp (${result.duplicateCount})`}
                    description="Đã được cộng điểm hoạt động này trước đó"
                    list={result.duplicateList}
                    type="warning"
                  />
                )}

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

              <div className="pt-2 flex gap-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-3.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition active:scale-95 text-center"
                >
                  Nhập tiếp tệp khác
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Guide Card */}
          {selectedCrit ? (
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-emerald-500/10 space-y-4 animate-in slide-in-from-right duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-2xl">
                  <Award size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Tiêu chí đang chọn</p>
                  <h3 className="text-lg font-black">{selectedCrit.id}</h3>
                </div>
              </div>
              <div className="border-t border-white/10 pt-4 space-y-3">
                <p className="text-sm font-bold text-emerald-50 leading-relaxed">{selectedCrit.content}</p>
                <div className="bg-white/10 rounded-2xl p-4 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200">Hướng dẫn chấm điểm</p>
                  <p className="text-xs text-white/90 whitespace-pre-line leading-relaxed">{selectedCrit.guide}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-6 md:p-8 text-slate-500 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2.5 rounded-2xl text-slate-400">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-700">Hướng dẫn chọn tiêu chí</h3>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">Vui lòng chọn tiêu chí để xem chi tiết hướng dẫn chấm điểm và các quy chuẩn áp dụng minh chứng tương ứng.</p>
            </div>
          )}

          {/* Excel Format Requirement Card */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-slate-100/50 space-y-4">
            <h3 className="text-base font-black text-slate-900">Yêu cầu tệp Excel</h3>
            <ul className="space-y-3 text-xs text-slate-500">
              <li className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">1</span>
                <span>Tệp tải lên phải ở định dạng <strong>.xlsx</strong> hoặc <strong>.xls</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">2</span>
                <span>Cột mã sinh viên phải chứa tiêu đề là <strong>MSSV</strong>, <strong>Mã SV</strong>, hoặc <strong>Mã sinh viên</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">3</span>
                <span>Mỗi dòng tiếp theo tương ứng với một mã sinh viên cần ghi nhận minh chứng.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    <div className={`rounded-2xl border ${colors.border} overflow-hidden transition-all duration-300 bg-white`}>
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
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/30">
          <div className="flex flex-wrap gap-2">
            {list.map((item) => (
              <span key={item} className={`rounded-lg px-2 py-1 text-xs font-black ${colors.tag}`}>
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

export default AdminEvidenceImport;
