import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Trash2, Users, Loader2, Calendar } from 'lucide-react';

const Classes = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClass, setNewClass] = useState('');
  const [semesters, setSemesters] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const [classesRes, semestersRes] = await Promise.all([
        api.get('/classes'),
        api.get('/semesters')
      ]);
      setClasses(classesRes.data);
      setSemesters(semestersRes.data);
    } catch (e) {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleAddClass = async () => {
    const trimmed = newClass.trim().toUpperCase();
    if (!trimmed) return toast.error('Tên lớp không được để trống');
    
    try {
      await api.post('/classes', { name: trimmed });
      toast.success(`Đã thêm lớp ${trimmed}`);
      setNewClass('');
      fetchClasses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể thêm lớp');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!window.confirm(`Cảnh báo: Bạn có chắc chắn muốn xóa toàn bộ lớp ${classId}? Việc này sẽ xóa vĩnh viễn tất cả sinh viên, tài khoản, điểm rèn luyện và dữ liệu điểm danh của lớp này.`)) return;

    try {
      await api.delete(`/classes/${classId}`);
      toast.success(`Đã xóa lớp ${classId} và toàn bộ dữ liệu liên quan`);
      fetchClasses();
    } catch (error) {
      toast.error('Không thể xóa lớp');
    }
  };

  const updateClassSemester = async (classId: string, semesterId: string) => {
    setUpdatingId(classId);
    try {
      await api.put(`/classes/${classId}`, { active_semester_id: semesterId || null });
      toast.success(`Đã cập nhật học kỳ cho lớp ${classId}`);
      setClasses(prev => prev.map(c => c.name === classId ? { ...c, active_semester_id: semesterId } : c));
    } catch (error) {
      toast.error('Không thể cập nhật học kỳ');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900">Quản lý lớp học</h2>
        <p className="text-slate-500 mt-1">Danh sách các lớp trong hệ thống</p>
      </div>

      {/* Add class */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-8">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus size={18} className="text-primary-500" /> Thêm lớp mới</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Tên lớp (VD: CNTT1, KTM2...)"
            value={newClass}
            onChange={e => setNewClass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddClass()}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary-500 font-medium"
          />
          <button onClick={handleAddClass}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all active:scale-95 shadow-md shadow-primary-500/20">
            Thêm lớp
          </button>
        </div>
      </div>

      {/* Class list */}
      {loading ? (
        <div className="py-16 flex flex-col items-center text-slate-400">
          <Loader2 className="animate-spin w-10 h-10 mb-3 text-primary-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map(c => (
            <div key={c.name} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center justify-between card-hover group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
                  <BookOpen size={20} className="text-primary-600" />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-lg">{c.name}</p>
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tight">
                      <Users size={12} /> {c.studentCount || 0} sinh viên
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="p-1 rounded bg-slate-100 text-slate-500">
                        <Calendar size={12} />
                      </div>
                      <select
                        value={c.active_semester_id || ''}
                        onChange={(e) => updateClassSemester(c.name, e.target.value)}
                        disabled={updatingId === c.name}
                        className="text-[10px] font-black uppercase tracking-widest bg-transparent outline-none focus:text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <option value="">Chọn học kỳ</option>
                        {semesters
                          .filter(s => s.isGlobal || s.scopeClasses?.some((sc: any) => sc.name === c.name))
                          .map(s => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))
                        }
                      </select>
                      {updatingId === c.name && <Loader2 size={10} className="animate-spin text-blue-500" />}
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteClass(c.name)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                title="Xóa lớp học"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Chưa có lớp nào. Thêm sinh viên để tạo lớp tự động.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Classes;
