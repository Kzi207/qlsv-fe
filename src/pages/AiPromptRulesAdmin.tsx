import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Trash2,
  Loader2,
  Edit2,
  X,
  Sparkles,
  FileText,
  Hash,
  AlertCircle
} from 'lucide-react';

interface AiPromptRule {
  id: number;
  activityName: string;
  drlSection: string;
  pointsParticipation: number;
  pointsOrganizer: number;
  pointsAchievement: number;
  description: string | null;
  keywords: string;
  createdAt: string;
  updatedAt: string;
}

const AiPromptRulesAdmin = () => {
  const [rules, setRules] = useState<AiPromptRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AiPromptRule | null>(null);

  const [formData, setFormData] = useState({
    activityName: '',
    drlSection: '',
    pointsParticipation: 0,
    pointsOrganizer: 0,
    pointsAchievement: 0,
    description: '',
    keywords: ''
  });

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await api.get('/chatbot/prompt-rules');
      setRules(response.data);
    } catch (e) {
      toast.error('Không thể tải danh sách từ khóa AI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setFormData({
      activityName: '',
      drlSection: '',
      pointsParticipation: 0,
      pointsOrganizer: 0,
      pointsAchievement: 0,
      description: '',
      keywords: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (rule: AiPromptRule) => {
    setEditingRule(rule);
    setFormData({
      activityName: rule.activityName,
      drlSection: rule.drlSection,
      pointsParticipation: rule.pointsParticipation,
      pointsOrganizer: rule.pointsOrganizer,
      pointsAchievement: rule.pointsAchievement,
      description: rule.description || '',
      keywords: rule.keywords
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activityName = formData.activityName.trim();
    const drlSection = formData.drlSection.trim();

    if (!activityName) return toast.error('Tên hoạt động không được để trống');
    if (!drlSection) return toast.error('Mục DRL không được để trống');

    try {
      if (editingRule) {
        await api.put(`/chatbot/prompt-rules/${editingRule.id}`, formData);
        toast.success('Đã cập nhật từ khóa AI');
      } else {
        await api.post('/chatbot/prompt-rules', formData);
        toast.success('Đã thêm từ khóa AI mới');
      }
      setShowModal(false);
      fetchRules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (rule: AiPromptRule) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa từ khóa cho hoạt động "${rule.activityName}"?`)) return;

    try {
      await api.delete(`/chatbot/prompt-rules/${rule.id}`);
      toast.success('Đã xóa từ khóa thành công');
      fetchRules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa từ khóa');
    }
  };

  const filteredRules = rules.filter(r => 
    r.activityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.drlSection.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.keywords && r.keywords.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl space-y-6 animate-fade-in pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Quản lý Từ khóa AI</h2>
            <p className="text-slate-500 text-[10px] md:text-xs font-medium uppercase tracking-wider">Cấu hình ánh xạ hoạt động sang điểm rèn luyện (DRL)</p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <Plus size={16} /> Thêm từ khóa mới
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50/70 border border-amber-100 rounded-[1.5rem] p-5 flex items-start gap-3">
        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
        <div className="text-xs md:text-sm text-amber-900">
          <p className="font-bold">💡 Hướng dẫn hoạt động:</p>
          <p className="mt-1 font-medium text-slate-600 leading-relaxed">
            Các luật được thêm tại đây sẽ được AI nạp tự động vào ngữ cảnh prompt khi trả lời câu hỏi của sinh viên về cách cộng điểm DRL của từng hoạt động. AI sẽ dựa vào đây để phân tích và trả lời chính xác sinh viên tham gia được cộng bao nhiêu điểm và thuộc mục nào trên phiếu DRL.
          </p>
        </div>
      </div>

      {/* Search Filter & List */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
        <div className="p-5 border-b border-slate-50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm theo hoạt động, mục hoặc từ khóa..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-medium text-slate-900 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center text-slate-400">
            <Loader2 className="animate-spin w-8 h-8 mb-3 text-blue-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Đang tải cấu hình AI...</p>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-25 text-slate-500" />
            <p className="text-[11px] font-black uppercase tracking-widest">Không có từ khóa nào</p>
            <p className="text-xs text-slate-500 mt-1">Hãy nhấn nút thêm để bổ sung ánh xạ hoạt động mới.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Hoạt động & Mục DRL</th>
                  <th className="py-4 px-6 text-center">Tham gia</th>
                  <th className="py-4 px-6 text-center">BTC</th>
                  <th className="py-4 px-6 text-center">Thành tích</th>
                  <th className="py-4 px-6">Từ khóa tìm kiếm</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRules.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-5 px-6">
                      <div className="font-extrabold text-slate-950 text-sm">{r.activityName}</div>
                      <div className="text-[11px] text-blue-600 font-bold uppercase mt-1 flex items-center gap-1">
                        <Hash size={10} /> {r.drlSection}
                      </div>
                      {r.description && (
                        <p className="text-slate-500 text-xs mt-1.5 line-clamp-1 max-w-xs">{r.description}</p>
                      )}
                    </td>
                    <td className="py-5 px-6 text-center">
                      <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 font-black rounded-lg text-xs">
                        +{r.pointsParticipation}đ
                      </span>
                    </td>
                    <td className="py-5 px-6 text-center">
                      {r.pointsOrganizer > 0 ? (
                        <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 font-black rounded-lg text-xs">
                          +{r.pointsOrganizer}đ
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs font-semibold">--</span>
                      )}
                    </td>
                    <td className="py-5 px-6 text-center">
                      {r.pointsAchievement > 0 ? (
                        <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-700 font-black rounded-lg text-xs">
                          +{r.pointsAchievement}đ
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs font-semibold">--</span>
                      )}
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {r.keywords ? r.keywords.split(',').map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md border border-slate-200/30">
                            {kw.trim()}
                          </span>
                        )) : (
                          <span className="text-slate-400 text-xs italic">Không có</span>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit} className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingRule ? 'Chỉnh sửa Từ khóa AI' : 'Thêm Từ khóa AI mới'}
                  </h3>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">Cấu hình chi tiết hoạt động</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-5">
                {/* Tên hoạt động */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Tên hoạt động</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tham gia Chủ nhật xanh"
                    value={formData.activityName}
                    onChange={e => setFormData({ ...formData, activityName: e.target.value })}
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-900 transition-all placeholder:font-medium placeholder:text-slate-400"
                  />
                </div>

                {/* Mục DRL & Từ khóa tìm kiếm */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Thuộc Mục DRL</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Mục II.2 hoặc Tiêu chí 15"
                      value={formData.drlSection}
                      onChange={e => setFormData({ ...formData, drlSection: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-900 transition-all placeholder:font-medium placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Từ khóa đi kèm (cách nhau bởi dấu phẩy)</label>
                    <input
                      type="text"
                      placeholder="VD: chu nhat xanh, tinh nguyen"
                      value={formData.keywords}
                      onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-900 transition-all placeholder:font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Điểm gợi ý */}
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Cấu hình điểm số gợi ý</span>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Tham gia</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.pointsParticipation}
                        onChange={e => setFormData({ ...formData, pointsParticipation: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:border-blue-500 font-black text-slate-900 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Ban tổ chức</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.pointsOrganizer}
                        onChange={e => setFormData({ ...formData, pointsOrganizer: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:border-blue-500 font-black text-slate-900 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Thành tích/Giải</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.pointsAchievement}
                        onChange={e => setFormData({ ...formData, pointsAchievement: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:border-blue-500 font-black text-slate-900 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Mô tả chi tiết */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Chi tiết/Ghi chú thêm</label>
                  <textarea
                    placeholder="VD: Cần cung cấp hình ảnh minh chứng hoặc giấy chứng nhận tham gia hoạt động môi trường..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium text-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-4 rounded-xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-6 py-4 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 active:scale-95 cursor-pointer"
                >
                  {editingRule ? 'Cập nhật từ khóa' : 'Lưu từ khóa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiPromptRulesAdmin;
