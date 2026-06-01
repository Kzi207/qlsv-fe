import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LifeBuoy, Loader2, Mail, Phone, RefreshCcw, User } from 'lucide-react';
import api from '../api/axios';

type SupportStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
type SupportFilter = SupportStatus | 'ALL';

type SupportRequestItem = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: SupportStatus;
  sourcePage: string | null;
  createdAt: string;
};

const statusLabel: Record<SupportStatus, string> = {
  NEW: 'Mới',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã xử lý',
};

const statusClass: Record<SupportStatus, string> = {
  NEW: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const SupportManagement = () => {
  const [items, setItems] = useState<SupportRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SupportFilter>('ALL');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchSupportRequests = async () => {
    setLoading(true);
    try {
      const params = statusFilter === 'ALL' ? undefined : { status: statusFilter };
      const res = await api.get<SupportRequestItem[]>('/support', { params });
      setItems(res.data || []);
    } catch (error) {
      toast.error('Không thể tải danh sách hỗ trợ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportRequests();
  }, [statusFilter]);

  const updateStatus = async (id: number, nextStatus: SupportStatus) => {
    setUpdatingId(id);
    try {
      const res = await api.patch<SupportRequestItem>(`/support/${id}/status`, { status: nextStatus });
      setItems((prev) => prev.map((item) => (item.id === id ? res.data : item)));
      toast.success('Đã cập nhật trạng thái');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalByStatus = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { NEW: 0, IN_PROGRESS: 0, RESOLVED: 0 } as Record<SupportStatus, number>,
    );
  }, [items]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 md:text-3xl">Hỗ trợ người dùng</h2>
          <p className="mt-1 text-sm text-slate-500">Biểu mẫu gửi từ trang thông tin liên hệ sẽ hiển thị tại đây.</p>
        </div>
        <button
          onClick={fetchSupportRequests}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <RefreshCcw size={16} />
          Làm mới
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">Mới</p>
          <p className="mt-2 text-2xl font-black text-amber-800">{totalByStatus.NEW}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-blue-700">Đang xử lý</p>
          <p className="mt-2 text-2xl font-black text-blue-800">{totalByStatus.IN_PROGRESS}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Đã xử lý</p>
          <p className="mt-2 text-2xl font-black text-emerald-800">{totalByStatus.RESOLVED}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
              statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setStatusFilter('NEW')}
            className={`rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
              statusFilter === 'NEW' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Mới
          </button>
          <button
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
              statusFilter === 'IN_PROGRESS' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Đang xử lý
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
              statusFilter === 'RESOLVED' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Đã xử lý
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-2 animate-spin" size={20} />
            Đang tải dữ liệu...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
            <LifeBuoy className="mx-auto mb-3 text-slate-400" size={26} />
            Chưa có yêu cầu hỗ trợ nào.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-black text-slate-900">{item.subject}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusClass[item.status]}`}>
                        {statusLabel[item.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <User size={12} />
                        {item.fullName}
                      </span>
                      {item.email && (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail size={12} />
                          {item.email}
                        </span>
                      )}
                      {item.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone size={12} />
                          {item.phone}
                        </span>
                      )}
                      <span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                      {item.sourcePage && <span>Nguồn: {item.sourcePage}</span>}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p>
                  </div>

                  <div className="flex flex-col gap-2 md:w-44">
                    <button
                      onClick={() => updateStatus(item.id, 'IN_PROGRESS')}
                      disabled={updatingId === item.id || item.status === 'IN_PROGRESS'}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Đang xử lý
                    </button>
                    <button
                      onClick={() => updateStatus(item.id, 'RESOLVED')}
                      disabled={updatingId === item.id || item.status === 'RESOLVED'}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Đánh dấu xong
                    </button>
                    <button
                      onClick={() => updateStatus(item.id, 'NEW')}
                      disabled={updatingId === item.id || item.status === 'NEW'}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Trả về mới
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportManagement;

