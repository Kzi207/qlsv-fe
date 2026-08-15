import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Bot,
  ChevronRight,
  LifeBuoy,
  Loader2,
  MessageCircle,
  Minimize2,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';

type ChatAction = {
  label: string;
  path: string;
};

type ChatResponse = {
  answer: string;
  topic?: string;
  suggestions?: string[];
  actions?: ChatAction[];
  needsHumanSupport?: boolean;
  user?: {
    id: number;
    username: string;
    name: string;
    email?: string | null;
    role: 'ADMIN' | 'BCH' | 'STUDENT';
    studentId?: number | null;
    class_id?: string | null;
  };
};

type ChatMessage = {
  id: string;
  role: 'bot' | 'user';
  content: string;
  actions?: ChatAction[];
  suggestions?: string[];
  needsHumanSupport?: boolean;
  timestamp: Date;
};

const quickPrompts = [
  'Xem thông tin cá nhân của tôi',
  'Xem điểm rèn luyện của tôi',
  'Số buổi vắng của tôi',
  'Cập nhật thông tin cá nhân',
];

const ONE_CENTIMETER_IN_CSS_PIXELS = 38;

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatTime = (date: Date) =>
  date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const renderFormattedMessage = (content: string) => {
  return content.split(/\r?\n/).map((line, lineIndex, lines) => {
    const segments = line.split(/(\*\*[^*]+?\*\*)/g).filter(Boolean);

    return (
      <span key={`${lineIndex}-${line}`}>
        {segments.map((segment, segmentIndex) => {
          const isBold = segment.startsWith('**') && segment.endsWith('**') && segment.length > 4;

          if (isBold) {
            return (
              <strong key={`${lineIndex}-${segmentIndex}`} className="font-black">
                {segment.slice(2, -2)}
              </strong>
            );
          }

          return <span key={`${lineIndex}-${segmentIndex}`}>{segment}</span>;
        })}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
};

const StudentChatbot = ({ initiallyOpen = false }: { initiallyOpen?: boolean }) => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const chatbotRootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const initialMessages = useMemo<ChatMessage[]>(
    () => [
      {
        id: 'welcome',
        role: 'bot',
        content:
          'Xin chào! Mình có thể hỗ trợ bạn về điểm danh, điểm rèn luyện, minh chứng và thông tin cá nhân.',
        suggestions: quickPrompts,
        timestamp: new Date(),
      },
    ],
    [],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom khi có tin mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const root = chatbotRootRef.current;
      if (!root) return;

      const rect = root.getBoundingClientRect();
      const clickX = event.clientX;
      const clickY = event.clientY;
      const padding = ONE_CENTIMETER_IN_CSS_PIXELS;
      const isInsideSafeArea =
        clickX >= rect.left - padding &&
        clickX <= rect.right + padding &&
        clickY >= rect.top - padding &&
        clickY <= rect.bottom + padding;

      if (!isInsideSafeArea) {
        setIsOpen(false);
        setShowSupportForm(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const askBot = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;

    setInput('');
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { id: createId(), role: 'user', content: question, timestamp: new Date() },
    ]);

    try {
      const res = await api.post<ChatResponse>('/chatbot/message', { message: question });
      const data = res.data;
      if (data.user) {
        setUser(data.user);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'bot',
          content: data.answer,
          actions: data.actions,
          suggestions: data.suggestions,
          needsHumanSupport: data.needsHumanSupport,
          timestamp: new Date(),
        },
      ]);
      setSupportSubject(data.topic ? `Hỏi về ${data.topic}` : 'Yêu cầu hỗ trợ từ chatbot');
      setSupportMessage(question);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Chatbot đang bận, bạn thử lại sau nhé.';
      toast.error(message);
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'bot',
          content: 'Mình chưa thể phản hồi lúc này. Bạn có thể gửi yêu cầu hỗ trợ để được cán bộ phụ trách xử lý.',
          needsHumanSupport: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void askBot(input);
  };

  const handleAction = (action: ChatAction) => {
    if (action.path === '/support-request') {
      setShowSupportForm(true);
      return;
    }

    setIsOpen(false);
    navigate(action.path);
  };

  const submitSupportRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung hỗ trợ');
      return;
    }

    setSupportLoading(true);
    try {
      await api.post('/support/public', {
        fullName: user?.name || 'Sinh viên',
        email: user?.email || '',
        subject: supportSubject,
        message: supportMessage,
        sourcePage: 'student-chatbot',
      });
      toast.success('Đã gửi yêu cầu hỗ trợ');
      setShowSupportForm(false);
      setSupportSubject('');
      setSupportMessage('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Chưa gửi được yêu cầu hỗ trợ');
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <div ref={chatbotRootRef} className="fixed bottom-24 right-4 z-[60] lg:bottom-6 lg:right-6">
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 animate-fade-up">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Bot size={20} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">Trợ lý sinh viên</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Hỏi đáp nhanh</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setMessages(initialMessages); setShowSupportForm(false); }}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  title="Xóa hội thoại"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  title="Thu nhỏ"
                >
                  <Minimize2 size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-[430px] space-y-3 overflow-y-auto bg-slate-50 p-4">
              {messages.map((message) => (
                <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-100 bg-white text-slate-700'
                    }`}
                  >
                    <div className="break-words">{renderFormattedMessage(message.content)}</div>
                    <p className={`mt-1 text-[10px] ${
                      message.role === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>

                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.actions.map((action) => (
                          <button
                            key={`${message.id}-${action.path}-${action.label}`}
                            type="button"
                            onClick={() => handleAction(action)}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            {action.label}
                            <ChevronRight size={14} />
                          </button>
                        ))}
                      </div>
                    )}

                    {message.needsHumanSupport && (
                      <button
                        type="button"
                        onClick={() => setShowSupportForm(true)}
                        className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100"
                      >
                        <LifeBuoy size={14} />
                        Gửi yêu cầu hỗ trợ
                      </button>
                    )}

                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion) => (
                          <button
                            key={`${message.id}-${suggestion}`}
                            type="button"
                            onClick={() => askBot(suggestion)}
                            className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {showSupportForm && (
              <form
                onSubmit={submitSupportRequest}
                className="overflow-hidden border-t border-slate-100 bg-white animate-fade-up"
              >
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Yêu cầu hỗ trợ</p>
                      <button
                        type="button"
                        onClick={() => setShowSupportForm(false)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <input
                      value={supportSubject}
                      onChange={(event) => setSupportSubject(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      placeholder="Tiêu đề"
                      maxLength={200}
                    />
                    <textarea
                      value={supportMessage}
                      onChange={(event) => setSupportMessage(event.target.value)}
                      className="min-h-24 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      placeholder="Nội dung cần hỗ trợ"
                      maxLength={3000}
                    />
                    <button
                      type="submit"
                      disabled={supportLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {supportLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Gửi yêu cầu
                    </button>
                  </div>
              </form>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                placeholder="Nhập câu hỏi..."
                maxLength={500}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Gửi"
              >
                <Send size={17} />
              </button>
            </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-2xl shadow-slate-900/25 transition hover:-translate-y-0.5 hover:bg-blue-600 active:scale-95"
        title="Mở chatbot"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {!isOpen && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600">
            <Sparkles size={12} />
          </span>
        )}
      </button>
    </div>
  );
};

export default StudentChatbot;
