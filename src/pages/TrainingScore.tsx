import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Award, Search, Save, ChevronRight, Calculator, Loader2, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuthStore } from '../store/useAuthStore';

const TrainingScore = () => {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'STUDENT';
  const [students, setStudents] = useState([]);
  const [personalScores, setPersonalScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [semester, setSemester] = useState('');
  const [semesterOptions, setSemesterOptions] = useState<any[]>([]);
  const [scores, setScores] = useState({
    y_thuc: 0,
    hoat_dong: 0,
    ky_luat: 0,
  });

  useEffect(() => {
    fetchSemesters();
    if (isStudent) {
      fetchPersonalScores();
    } else {
      fetchStudents();
    }
  }, []);

  const fetchSemesters = async () => {
    try {
      const res = await api.get('/semesters');
      setSemesterOptions(res.data);
      if (res.data.length > 0 && !semester) {
        setSemester(res.data[0].name);
      }
    } catch (e) {
      console.error('Lỗi khi tải danh sách học kỳ');
    }
  };

  const fetchPersonalScores = async () => {
    try {
      const res = await api.get(`/training/student/${user?.studentId}`);
      setPersonalScores(res.data);
    } catch (error) {
      toast.error('Không thể tải điểm rèn luyện');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data);
    } catch (error) {
      toast.error('Không thể tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = async (student: any) => {
    setSelectedStudent(student);
    try {
      const res = await api.get(`/training/student/${student.id}`);
      const score = res.data.find((s: any) => s.semester === semester);
      if (score) {
        setScores({
          y_thuc: score.y_thuc,
          hoat_dong: score.hoat_dong,
          ky_luat: score.ky_luat,
        });
      } else {
        setScores({ y_thuc: 0, hoat_dong: 0, ky_luat: 0 });
      }
    } catch (error) {
      setScores({ y_thuc: 0, hoat_dong: 0, ky_luat: 0 });
    }
  };

  const calculateTotal = (s = scores) => s.y_thuc + s.hoat_dong + s.ky_luat;

  const getRank = (total: number) => {
    if (total >= 90) return { label: 'Xuất sắc', color: 'text-purple-600 bg-purple-50', border: 'border-purple-200' };
    if (total >= 75) return { label: 'Tốt', color: 'text-emerald-600 bg-emerald-50', border: 'border-emerald-200' };
    if (total >= 50) return { label: 'Trung bình', color: 'text-amber-600 bg-amber-50', border: 'border-amber-200' };
    return { label: 'Kém', color: 'text-red-600 bg-red-50', border: 'border-red-200' };
  };

  const handleSave = async () => {
    if (!selectedStudent) return;
    try {
      await api.post('/training', {
        student_id: selectedStudent.id,
        semester,
        ...scores,
      });
      toast.success('Đã lưu điểm rèn luyện');
    } catch (error) {
      toast.error('Lỗi khi lưu điểm');
    }
  };

  if (isStudent) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider mb-1">
              <History size={10} />
              History Records
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Kết quả rèn luyện</h2>
            <p className="text-slate-400 font-bold text-sm">Bảng tổng hợp điểm rèn luyện qua các học kỳ</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 self-center md:self-end">
             <Award size={20} />
             <span className="font-black tracking-tight text-sm">Hồ sơ rèn luyện</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {loading ? (
             <div className="col-span-full py-16 text-center text-slate-400">
               <Loader2 className="animate-spin mx-auto mb-3 h-8 w-8 text-blue-500" />
               <p className="font-bold text-sm">Đang tải dữ liệu hồ sơ...</p>
             </div>
           ) : personalScores.length === 0 ? (
             <div className="col-span-full py-20 text-center text-slate-400 bg-white border border-dashed border-slate-200 rounded-[2rem] shadow-sm">
               <Award size={48} className="mx-auto mb-3 opacity-10" />
               <p className="font-bold">Bạn chưa có dữ liệu điểm rèn luyện nào</p>
               <p className="text-xs">Hãy hoàn thành phiếu đánh giá học kỳ này.</p>
             </div>
           ) : (
             personalScores.map((s) => (
               <motion.div 
                 key={s.id}
                 whileHover={{ y: -4 }}
                 className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] relative overflow-hidden group"
               >
                 <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity translate-x-4 -translate-y-4">
                    <Award size={120} />
                 </div>
                 
                 <div className="relative z-10 space-y-6">
                    <div className="flex justify-between items-center">
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Học kỳ</span>
                          <span className="text-lg font-black text-blue-600 uppercase tracking-tight">{s.semester}</span>
                       </div>
                       <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border shadow-sm ${getRank(s.total).color} ${getRank(s.total).border}`}>
                          {getRank(s.total).label}
                       </div>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                       <span className="text-5xl font-black text-slate-900 tracking-tighter">{s.total}</span>
                       <span className="text-lg font-bold text-slate-300">/ 100</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                       <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider text-center">Học tập</p>
                          <p className="text-lg font-black text-slate-800 text-center">{s.y_thuc}</p>
                       </div>
                       <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider text-center">Hoạt động</p>
                          <p className="text-lg font-black text-slate-800 text-center">{s.hoat_dong}</p>
                       </div>
                       <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-wider text-center">Kỷ luật</p>
                          <p className="text-lg font-black text-slate-800 text-center">{s.ky_luat}</p>
                       </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${s.status === 'APPROVED' ? 'text-emerald-500' : 'text-orange-500'}`}>
                         <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'APPROVED' ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                         <span>{s.status === 'APPROVED' ? 'Đã phê duyệt' : 'Đang chờ duyệt'}</span>
                      </div>
                    </div>
                 </div>
               </motion.div>
             ))
           )}
        </div>
      </div>
    );
  }

  const filteredStudents = students.filter((s: any) => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-[calc(100vh-12rem)] flex flex-col">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Danh sách sinh viên</h3>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm tên hoặc mã số..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <div className="text-center py-8 text-slate-400">Đang tải...</div>
            ) : filteredStudents.map((s: any) => (
              <button
                key={s.id}
                onClick={() => handleStudentSelect(s)}
                className={`w-full text-left p-4 rounded-2xl transition-all ${
                  selectedStudent?.id === s.id 
                    ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500/20' 
                    : 'bg-white border border-slate-100 hover:border-primary-200 hover:shadow-sm'
                }`}
              >
                <p className="font-bold text-slate-900 text-sm truncate">{s.name}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs font-mono text-primary-600 font-bold">{s.student_code}</p>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <AnimatePresence mode="wait">
          {selectedStudent ? (
            <motion.div
              key={selectedStudent.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">{selectedStudent.name}</h2>
                  <p className="text-slate-500">Mã SV: {selectedStudent.student_code} • Lớp: {selectedStudent.class_id}</p>
                </div>
                <select 
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="bg-primary-50 text-primary-600 px-4 py-2 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {semesterOptions.map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Ý thức học tập (Max 40)</label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={scores.y_thuc}
                      onChange={(e) => setScores({ ...scores, y_thuc: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                      <span>0</span>
                      <span className="text-primary-600 text-sm bg-primary-50 px-2 rounded-md">{scores.y_thuc}</span>
                      <span>40</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Tham gia hoạt động (Max 40)</label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={scores.hoat_dong}
                      onChange={(e) => setScores({ ...scores, hoat_dong: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                      <span>0</span>
                      <span className="text-primary-600 text-sm bg-primary-50 px-2 rounded-md">{scores.hoat_dong}</span>
                      <span>40</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Ý thức kỷ luật (Max 20)</label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={scores.ky_luat}
                      onChange={(e) => setScores({ ...scores, ky_luat: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                      <span>0</span>
                      <span className="text-primary-600 text-sm bg-primary-50 px-2 rounded-md">{scores.ky_luat}</span>
                      <span>20</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-inner relative">
                    <Calculator size={32} className="text-slate-300 absolute opacity-20" />
                    <span className="text-4xl font-black text-primary-600 z-10">{calculateTotal()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng điểm</p>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${getRank(calculateTotal()).color}`}>
                      {getRank(calculateTotal()).label}
                    </div>
                  </div>
                  <button
                    onClick={handleSave}
                    className="w-full mt-4 flex items-center justify-center space-x-2 bg-primary-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
                  >
                    <Save size={20} />
                    <span>Lưu kết quả</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center text-slate-400 h-full min-h-[400px]">
              <Award size={64} className="mb-4 opacity-10" />
              <p className="text-lg font-medium">Chọn một sinh viên để nhập điểm rèn luyện</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TrainingScore;
