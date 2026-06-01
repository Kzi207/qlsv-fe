import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCcw,
  QrCode,
  ShieldCheck,
  Smartphone,
  Info,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';

const extractQrToken = (rawValue: string): string => {
  const value = String(rawValue || '').trim();
  if (!value) return '';

  const hex64Pattern = /^[a-fA-F0-9]{64}$/;
  if (hex64Pattern.test(value)) return value;

  try {
    const parsed = new URL(value);
    const fromQuery = parsed.searchParams.get('qrToken') || parsed.searchParams.get('token') || '';
    if (hex64Pattern.test(fromQuery)) return fromQuery;

    const segments = parsed.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';
    if (hex64Pattern.test(lastSegment)) return lastSegment;
    
    // If it is a parsed URL, but we couldn't extract any valid 64-hex token, return empty
    return '';
  } catch {
    // not a URL
  }

  // Double check if value is URL-like but failed URL parsing
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return '';
  }

  return value;
};

const QRScannerCheckIn = () => {
  const { user, authInitialized } = useAuthStore();
  const navigate = useNavigate();

  const [trainingAward, setTrainingAward] = useState<null | {
    trainingScoreId: number;
    criterionId: string;
    sectionId: string;
    semester: string;
    points: number;
    newScore: number;
    activityName: string;
  }>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [prefilledQrToken, setPrefilledQrToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('qrToken') || params.get('token') || '';
    return extractQrToken(fromQuery || window.location.href);
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [statusText, setStatusText] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('qrToken') || params.get('token') || '';
    const extracted = extractQrToken(fromQuery || window.location.href);
    return extracted
      ? 'Đã nhận mã QR, đang đợi tọa độ GPS để tự động điểm danh...'
      : 'Sẵn sàng quét mã QR';
  });
  const [checkInError, setCheckInError] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const successRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isRequestingLocationRef = useRef(false);
  const hasAutoSubmittedRef = useRef(false);
  const startScannerRef = useRef<() => Promise<void>>(async () => {});
  const isStartingRef = useRef(false);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    successRef.current = success;
  }, [success]);

  // Auth Protection and Redirect logic
  useEffect(() => {
    if (authInitialized) {
      if (!user) {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('qrToken') || params.get('token') || '';
        const currentUrl = token 
          ? `/attendance/scan?qrToken=${encodeURIComponent(token)}`
          : '/attendance/scan';
        
        toast.error('Vui lòng đăng nhập để thực hiện điểm danh', { id: 'auth-scan' });
        navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`, { replace: true });
      } else if (String(user.role || '').toUpperCase() !== 'STUDENT') {
        toast.error('Chỉ tài khoản sinh viên mới được tham gia điểm danh QR', { id: 'role-scan' });
        navigate('/');
      }
    }
  }, [user, authInitialized, navigate]);

  const requestLocation = useCallback(() => {
    if (isRequestingLocationRef.current) return;

    if (!('geolocation' in navigator)) {
      toast.error('Trình duyệt không hỗ trợ dịch vụ định vị', { id: 'gps-unsupported' });
      return;
    }

    isRequestingLocationRef.current = true;
    const loadingToastId = toast.loading('Đang cập nhật vị trí GPS...', { id: 'gps-loading' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss(loadingToastId);

        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setLocation(nextLocation);
        locationRef.current = nextLocation;

        const accuracy = Math.round(position.coords.accuracy);
        setGpsAccuracy(accuracy);
        if (accuracy > 150) {
          toast.error(`Sai số GPS khá lớn (~${accuracy}m). Nên di chuyển ra nơi thông thoáng hơn.`, { duration: 5000 });
          setStatusText('GPS không ổn định, hãy kiểm tra lại kết nối định vị');
        } else {
          toast.success('Vị trí GPS đã sẵn sàng', { id: 'gps-ready' });
          setStatusText('Vị trí GPS ổn định, sẵn sàng điểm danh');
        }

        isRequestingLocationRef.current = false;
      },
      () => {
        toast.dismiss(loadingToastId);
        toast.error('Lỗi định vị. Vui lòng bật GPS trên điện thoại và cho phép trình duyệt truy cập vị trí.', { duration: 6000 });
        setStatusText('Chưa xác định được vị trí GPS');
        isRequestingLocationRef.current = false;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  const ensureCheckInPrerequisites = useCallback(async () => {
    // Refresh check to ensure active session
    await api.get('/auth/me');

    if (String(user?.role || '').toUpperCase() !== 'STUDENT') {
      throw new Error('Chỉ tài khoản sinh viên mới được điểm danh');
    }

    if (!user?.studentId) {
      throw new Error('Tài khoản của bạn chưa được liên kết với hồ sơ sinh viên');
    }
  }, [user?.role, user?.studentId]);

  const handleCheckIn = useCallback(
    async (rawValue: string) => {
      if (isProcessingRef.current || successRef.current) return;

      const qrToken = extractQrToken(rawValue);
      if (!qrToken) return;

      const currentLocation = locationRef.current;
      if (!currentLocation) {
        toast.error('Đang chờ GPS, vui lòng đợi trong giây lát...', { id: 'gps-wait' });
        setStatusText('Đang đợi GPS trước khi gửi dữ liệu điểm danh');
        requestLocation();
        return;
      }

      isProcessingRef.current = true;
      setLoading(true);
      setStatusText('Đang gửi dữ liệu điểm danh lên máy chủ...');
      setCheckInError(false);

      if (scannerRef.current && scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
        } catch (e) {
          console.error('Failed to stop scanner', e);
        }
      }

      try {
        await ensureCheckInPrerequisites();
        const res = await api.post('/attendance/qr-check-in', {
          qrToken,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        });

        const award = res.data?.trainingAward || null;
        setTrainingAward(award);

        setSuccess(true);
        setLoading(false);
        if (award?.points) {
          setStatusText(`Điểm danh thành công! Được cộng +${award.points}đ vào mục ${award.criterionId}`);
          toast.success(`Điểm danh thành công! Cộng +${award.points}đ ĐRL`, { duration: 4500 });
        } else {
          setStatusText('Điểm danh thành công!');
          toast.success('Điểm danh thành công!', { duration: 4000 });
        }
      } catch (error: any) {
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          'Lỗi xử lý điểm danh';

        toast.error(msg, { duration: 6000 });
        setStatusText(msg);

        setCheckInError(true);
        isProcessingRef.current = false;
        if (!prefilledQrToken) {
          hasAutoSubmittedRef.current = false;
        }
        setLoading(false);

        if (!prefilledQrToken) {
          await startScannerRef.current();
        }
      }
    },
    [ensureCheckInPrerequisites, prefilledQrToken, requestLocation],
  );

  const startScanner = useCallback(async () => {
    if (isStartingRef.current) return;
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('reader');
      }

      if (scannerRef.current.isScanning) return;

      isStartingRef.current = true;

      const config = {
        fps: 15,
        qrbox: (width: number, height: number) => {
          const size = Math.min(width, height) * 0.7;
          return { width: size, height: size };
        },
        aspectRatio: 1,
      };

      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          void handleCheckIn(decodedText);
        },
        () => {},
      );

      setHasPermission(true);
    } catch (err) {
      console.error('Scanner Error:', err);
      const errMsg = String((err as any)?.message || err || '');
      if (!errMsg.includes('already under transition') && !errMsg.includes('Device in use')) {
        setHasPermission(false);
        setStatusText('Không thể truy cập camera. Vui lòng cho phép quyền camera.');
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [handleCheckIn]);

  useEffect(() => {
    startScannerRef.current = startScanner;
  }, [startScanner]);

  useEffect(() => {
    if (!prefilledQrToken) {
      void startScanner();
    } else {
      setHasPermission(null);
    }
    requestLocation();

    return () => {
      if (scannerRef.current) {
        const stopScannerSafe = async () => {
          for (let i = 0; i < 10; i++) {
            if (!isStartingRef.current) break;
            await new Promise((r) => setTimeout(r, 100));
          }
          if (scannerRef.current && scannerRef.current.isScanning) {
            try {
              await scannerRef.current.stop();
            } catch (e) {
              console.error('Stop fail', e);
            }
          }
        };
        void stopScannerSafe();
      }
    };
  }, [prefilledQrToken, startScanner, requestLocation]);

  // Handle automatic check-in when GPS ready and prefilled token exists
  useEffect(() => {
    if (!prefilledQrToken || !location || loading || success || isProcessingRef.current) return;
    if (hasAutoSubmittedRef.current) return;

    hasAutoSubmittedRef.current = true;
    void handleCheckIn(prefilledQrToken);
  }, [handleCheckIn, loading, location, prefilledQrToken, success]);

  // Loading state while checking auth session initialization
  if (!authInitialized) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-bold text-sm">Đang kiểm tra thông tin phiên đăng nhập...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-3 pb-24 pt-4 sm:px-4 sm:pb-8 sm:pt-6 font-sans">
      
      {/* HEADER CARD */}
      <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-slate-50/50 to-slate-100 p-5 shadow-sm sm:p-6 hover:border-slate-200 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-indigo-100">
                Sinh Viên Check-In
              </span>
              {prefilledQrToken && (
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-100 animate-pulse">
                  Đã Prefill 🪄
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
              Quét QR Điểm Danh Hoạt Động
            </h2>
            <p className="text-xs text-slate-500 sm:text-sm">
              Giữ điện thoại ổn định, đưa camera song song với mã QR và bật định vị GPS.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 self-start sm:self-auto shadow-sm">
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
              {user?.name ? user.name.split(' ').pop()?.substring(0, 2).toUpperCase() : 'SV'}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 line-clamp-1">{user?.name || 'Tài khoản'}</p>
              <p className="text-[10px] text-slate-400 font-medium">MSSV: {user?.username || 'Chưa đăng nhập'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
        
        {/* VIEWPORT / CAMERA CONTAINER */}
        <div className="lg:col-span-3">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            
            {prefilledQrToken ? (
              /* AUTO SUBMIT VIEWPORT (NO CAMERA NEEDED) */
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-slate-900 px-6 py-12 text-center text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-transparent to-slate-950/80 pointer-events-none" />
                <div className="space-y-4 z-10 max-w-sm">
                  <div className="mx-auto h-20 w-20 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center animate-pulse">
                    <QrCode size={40} className="animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-black text-indigo-300">Nhận diện mã QR thành công!</p>
                    <p className="text-xs text-slate-400">
                      Mã được truyền từ camera ngoài hoặc trình duyệt. Hệ thống đang tự động xử lý điểm danh ngay.
                    </p>
                  </div>

                  {checkInError ? (
                    <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 space-y-3">
                      <p className="text-xs font-black text-rose-400 uppercase tracking-wider">Điểm danh thất bại</p>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                        {statusText}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCheckInError(false);
                          void handleCheckIn(prefilledQrToken);
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-black text-white active:scale-95 transition-all shadow-md"
                      >
                        <RefreshCcw size={12} /> Thử Lại Ngay
                      </button>
                    </div>
                  ) : (
                    /* GPS Loading inside Prefill */
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>Trạng thái GPS của bạn:</span>
                        <span className={`font-black ${location ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                          {location ? 'ĐÃ KHỚP ✅' : 'ĐANG DÒ GPS...⏳'}
                        </span>
                      </div>
                      {location ? (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Lat: {location.lat.toFixed(5)} | Lng: {location.lng.toFixed(5)}
                        </div>
                      ) : (
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full w-2/3 rounded-full animate-infinite-loading" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPrefilledQrToken('');
                        void startScanner();
                      }}
                      className="text-[11px] font-bold text-slate-400 hover:text-white underline transition-all"
                    >
                      Hoặc tự quét mã mới bằng camera 📷
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* REAL CAMERA VIEWPORT */
              <div className="relative rounded-2xl bg-slate-950 overflow-hidden">
                <div id="reader" className="w-full overflow-hidden" style={{ minHeight: '320px' }}></div>
                {/* Laser scan effect overlay */}
                {hasPermission && !loading && !success && (
                  <div className="absolute inset-x-0 h-[2px] bg-indigo-500/80 shadow-[0_0_10px_#4f46e5] top-1/4 animate-laser-scan pointer-events-none" />
                )}
              </div>
            )}

            {/* SCREEN OVERLAYS */}
            <AnimatePresence>
              {/* Permission denied Overlay */}
              {hasPermission === false && (
                <motion.div
                  key="permission-denied"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/98 p-6 text-center text-white"
                >
                  <AlertCircle className="mb-4 h-14 w-14 text-rose-500 animate-pulse" />
                  <h4 className="text-lg font-black tracking-tight">Không Có Quyền Truy Cập Camera 📷</h4>
                  <p className="mt-2 text-xs text-slate-400 max-w-xs leading-relaxed">
                    Trình duyệt của bạn đang chặn quyền mở camera. Hãy nhấp chọn biểu tượng ổ khóa 🔒 trên thanh địa chỉ, chọn Cho Phép (Allow) camera và tải lại trang.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-600/30"
                  >
                    <RefreshCcw size={14} /> Thử Lại
                  </button>
                </motion.div>
              )}

              {/* API Processing / Checkin loading overlay */}
              {loading && (
                <motion.div
                  key="loading-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-6 text-center"
                >
                  <div className="relative flex items-center justify-center">
                    <Loader2 className="h-16 w-16 animate-spin text-indigo-600" />
                    <QrCode className="absolute h-6 w-6 text-indigo-800" />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 mt-4">Đang Gửi Điểm Danh...</h4>
                  <p className="mt-1 text-xs text-slate-400">Hệ thống đang đối chiếu GPS và máy chủ hoạt động.</p>
                </motion.div>
              )}

              {/* SUCCESS OVERLAY */}
              {success && (
                <motion.div
                  key="success-overlay"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-emerald-600 p-6 text-center text-white"
                >
                  <motion.div 
                    initial={{ scale: 0.5, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="mb-4 rounded-full bg-white/10 p-5 border border-white/20"
                  >
                    <CheckCircle2 className="h-16 w-16 text-white" />
                  </motion.div>
                  <h4 className="text-2xl font-black uppercase tracking-tight">Điểm Danh Thành Công!</h4>
                  <p className="mt-1 text-xs text-emerald-100">Cảm ơn bạn! Hệ thống đã ghi nhận có mặt.</p>
                  
                  {trainingAward?.points ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-4 text-left text-xs max-w-sm w-full space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                        <span className="font-bold text-white uppercase tracking-wider text-[10px]">ĐRL TÍCH LŨY:</span>
                        <span className="font-black bg-emerald-500 px-2 py-0.5 rounded text-[11px]">+{trainingAward.points} điểm DRL</span>
                      </div>
                      <p className="text-emerald-50"><span className="opacity-80">Hoạt động:</span> <strong className="text-white">{trainingAward.activityName}</strong></p>
                      <p className="text-emerald-50"><span className="opacity-80">Tiêu chí:</span> <strong className="text-white">Mục {trainingAward.criterionId}</strong></p>
                      <p className="text-emerald-50"><span className="opacity-80">Học kỳ:</span> <strong className="text-white">{trainingAward.semester}</strong></p>
                    </motion.div>
                  ) : null}

                  <div className="mt-8 flex gap-3">
                    <button
                      onClick={() => {
                        window.location.href = '/attendance';
                      }}
                      className="rounded-2xl bg-white px-5 py-3 text-xs font-black text-emerald-800 hover:bg-emerald-50 shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                      Xem lịch sử
                    </button>
                    <button
                      onClick={() => {
                        setSuccess(false);
                        setPrefilledQrToken('');
                        hasAutoSubmittedRef.current = false;
                        isProcessingRef.current = false;
                        void startScanner();
                      }}
                      className="rounded-2xl bg-emerald-700/60 border border-white/20 px-5 py-3 text-xs font-black text-white hover:bg-emerald-700"
                    >
                      Quét mã khác
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* STATUS BOARD & INFO CONTAINER */}
        <div className="space-y-4 lg:col-span-2">
          
          {/* TRẠNG THÁI GPS & KẾT NỐI */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 hover:border-slate-300 transition-all space-y-4">
            <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-wider">
              <ShieldCheck size={14} className="text-indigo-600 animate-pulse" /> TRẠNG THÁI HỆ THỐNG
            </h4>

            <div className="space-y-3">
              {/* GPS coordinates panel */}
              <div className={`rounded-2xl border p-3.5 transition-all duration-300 ${location ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <MapPin size={16} className={location ? 'text-emerald-600' : 'text-slate-400 animate-bounce'} />
                    <div>
                      <span className="text-xs font-black text-slate-700 block leading-tight">Định vị GPS</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {location ? 'Đã thu thập tọa độ' : 'Đang lấy vị trí GPS'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={requestLocation}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 active:scale-90 transition-all shadow-sm"
                    title="Cập nhật lại GPS"
                  >
                    <RefreshCcw size={13} className={isRequestingLocationRef.current ? 'animate-spin' : ''} />
                  </button>
                </div>
                {location && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-sans">VĨ ĐỘ</span>
                      <strong className="text-slate-800">{location.lat.toFixed(6)}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-sans">KINH ĐỘ</span>
                      <strong className="text-slate-800">{location.lng.toFixed(6)}</strong>
                    </div>
                  </div>
                )}
                {gpsAccuracy !== null && (
                  <div className="mt-1.5 text-[10px] text-slate-500 flex justify-between">
                    <span>Độ chính xác:</span>
                    <span className="font-bold text-slate-700">~ {gpsAccuracy} m</span>
                  </div>
                )}
              </div>

              {/* IP / Device Check */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-3 flex items-center gap-3">
                <Smartphone size={16} className="text-blue-600 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-blue-900 block leading-tight">Xác thực thiết bị an toàn</span>
                  <span className="text-[10px] text-blue-700/80">Địa chỉ IP & Browser Agent được đối chiếu tự động</span>
                </div>
              </div>

              {/* Status Message Board */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100/60 pb-1 mb-1.5">
                  Bảng Thông Báo Hệ Thống
                </p>
                <p className="text-xs text-slate-700 leading-relaxed flex items-start gap-1.5 font-medium">
                  <Info size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  {statusText}
                </p>
              </div>
            </div>
          </div>

          {/* QUICK TUTORIAL */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 text-white shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/10 p-2 text-indigo-400">
                <QrCode size={18} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-white/50">Hướng dẫn nhanh</p>
                <p className="text-xs text-white/80 leading-relaxed">
                  1. Cấp quyền định vị khi điện thoại yêu cầu. <br/>
                  2. Cấp quyền Camera và đưa mã QR vào khung ngắm. <br/>
                  3. Điểm danh tự động ghi nhận ngay khi định vị xong!
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default QRScannerCheckIn;
