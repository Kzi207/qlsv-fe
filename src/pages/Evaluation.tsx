import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DetailedEvaluationForm from '../components/DetailedEvaluationForm';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';

const EvaluationPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [semester, setSemester] = useState('2023-2024 - HK1');

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      // heursitic mapping for y_thuc, hoat_dong, ky_luat based on sections
      // Sec 1: y_thuc, Sec 2: ky_luat, Sec 3,4,5: hoat_dong (just for compatibility)
      const details = data.scores;
      const payload = {
        student_id: Number(studentId),
        semester: semester,
        y_thuc: 20, // Simplified for now, in a real app we'd calculate from specific sections
        hoat_dong: 40,
        ky_luat: 20,
        total: data.total,
        details: details
      };

      await api.post('/training', payload);
      toast.success('Đã lưu kết quả đánh giá!');
      navigate('/training-score');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chấm điểm rèn luyện</h1>
          <p className="text-slate-500">Mã sinh viên: {studentId}</p>
        </div>
      </div>

      <div className="glass p-4 rounded-xl flex items-center gap-4">
        <label className="text-sm font-medium text-slate-600">Học kỳ:</label>
        <select
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option>2023-2024 - HK1</option>
          <option>2023-2024 - HK2</option>
          <option>2024-2025 - HK1</option>
        </select>
      </div>

      <DetailedEvaluationForm
        onSubmit={handleSubmit}
        loading={loading}
        studentId={Number(studentId || 0)}
        semester={semester}
      />
    </div>
  );
};

export default EvaluationPage;
