import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  RefreshCcw,
  QrCode,
  ShieldCheck,
  Smartphone,
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
  } catch {
    // not a URL
  }

  return value;
};

const QRScannerCheckIn = () => {
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [statusText, setStatusText] = useState('San sang quet ma QR');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const successRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isRequestingLocationRef = useRef(false);
  const startScannerRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    successRef.current = success;
  }, [success]);

  const requestLocation = useCallback(() => {
    if (isRequestingLocationRef.current) return;

    if (!('geolocation' in navigator)) {
      toast.error('Trinh duyet khong ho tro dinh vi');
      return;
    }

    isRequestingLocationRef.current = true;
    toast.loading('Dang lay vi tri GPS...', { id: 'gps-loading' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss('gps-loading');

        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setLocation(nextLocation);
        locationRef.current = nextLocation;

        const accuracy = Math.round(position.coords.accuracy);
        setGpsAccuracy(accuracy);
        if (accuracy > 100) {
          toast.error(`GPS chua chinh xac (${accuracy}m). Hay ra cho thoang hon.`, { duration: 5000 });
          setStatusText('GPS yeu, hay doi vi tri thong thoang hon roi quet lai');
        } else {
          toast.success('Vi tri da san sang', { id: 'gps-success' });
          setStatusText('Vi tri GPS da san sang');
        }

        isRequestingLocationRef.current = false;
      },
      () => {
        toast.dismiss('gps-loading');
        toast.error('Loi dinh vi. Vui long bat GPS va cho phep truy cap.');
        setStatusText('Chua lay duoc vi tri GPS');
        isRequestingLocationRef.current = false;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  const ensureCheckInPrerequisites = useCallback(async () => {
    // Force refresh csrf token/session from backend before first write request
    await api.get('/auth/me');

    if (String(user?.role || '').toUpperCase() !== 'STUDENT') {
      throw new Error('Chi tai khoan sinh vien moi co the diem danh');
    }

    if (!user?.studentId) {
      throw new Error('Tai khoan chua lien ket sinh vien (thieu studentId)');
    }
  }, [user?.role, user?.studentId]);

  const handleCheckIn = useCallback(
    async (rawValue: string) => {
      if (isProcessingRef.current || successRef.current) return;

      const qrToken = extractQrToken(rawValue);
      if (!qrToken) return;

      const currentLocation = locationRef.current;
      if (!currentLocation) {
        toast.error('Dang cho GPS, vui long thu lai sau vai giay', { id: 'gps-wait' });
        setStatusText('Dang cho GPS truoc khi diem danh');
        requestLocation();
        return;
      }

      isProcessingRef.current = true;
      setLoading(true);
      setStatusText('Dang xu ly diem danh...');

      if (scannerRef.current && scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
        } catch (e) {
          console.error('Failed to stop scanner', e);
        }
      }

      try {
        await ensureCheckInPrerequisites();
        await api.post('/attendance/qr-check-in', {
          qrToken,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        });

        setSuccess(true);
        setLoading(false);
        setStatusText('Diem danh thanh cong');
        toast.success('Diem danh thanh cong!', { duration: 4000 });
      } catch (error: any) {
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          'Loi diem danh';

        toast.error(msg, { duration: 5000 });
        setStatusText(msg);

        isProcessingRef.current = false;
        setLoading(false);

        await startScannerRef.current();
      }
    },
    [ensureCheckInPrerequisites, requestLocation],
  );

  const startScanner = useCallback(async () => {
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('reader');
      }

      if (scannerRef.current.isScanning) return;

      const config = {
        fps: 10,
        qrbox: { width: 240, height: 240 },
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
      setHasPermission(false);
      setStatusText('Khong the mo camera de quet QR');
    }
  }, [handleCheckIn]);

  useEffect(() => {
    startScannerRef.current = startScanner;
  }, [startScanner]);

  useEffect(() => {
    void startScanner();
    requestLocation();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((e) => console.error('Stop fail', e));
      }
    };
  }, [startScanner, requestLocation]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-3 pb-24 pt-4 sm:px-4 sm:pb-8 sm:pt-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-3xl">Quet QR diem danh</h2>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Giu may on dinh, dua camera vao ma QR va dam bao GPS da bat.
            </p>
          </div>
          <div className="rounded-2xl bg-primary-100 p-3 text-primary-700">
            <Camera size={22} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
        <div className="lg:col-span-3">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div id="reader" className="w-full overflow-hidden rounded-2xl bg-slate-900" style={{ minHeight: '300px' }}></div>

            <AnimatePresence>
              {hasPermission === false && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 p-6 text-center text-white"
                >
                  <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                  <h4 className="text-lg font-bold">Khong the truy cap camera</h4>
                  <p className="mt-2 text-sm text-slate-300">Kiem tra quyen camera trong trinh duyet va thu lai.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold"
                  >
                    <RefreshCcw size={16} /> Thu lai
                  </button>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 p-6 text-center"
                >
                  <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary-600" />
                  <h4 className="text-xl font-bold text-slate-800">Dang xu ly...</h4>
                  <p className="mt-2 text-sm text-slate-500">Vui long cho trong giay lat</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-emerald-500 p-6 text-center text-white"
                >
                  <div className="mb-6 rounded-full bg-white/20 p-4">
                    <CheckCircle2 className="h-16 w-16" />
                  </div>
                  <h4 className="text-2xl font-black">DIEM DANH THANH CONG</h4>
                  <p className="mt-2 text-sm text-emerald-50">He thong da ghi nhan ban co mat.</p>
                  <button
                    onClick={() => {
                      window.location.href = '/attendance';
                    }}
                    className="mt-8 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-700"
                  >
                    Xem lich su diem danh
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <ShieldCheck size={16} className="text-primary-600" /> Trang thai
            </h4>

            <div className="space-y-3">
              <div className={`rounded-2xl border p-3 ${location ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className={location ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className="text-sm font-semibold text-slate-700">GPS</span>
                  </div>
                  <button
                    type="button"
                    onClick={requestLocation}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500"
                    aria-label="Lay lai GPS"
                  >
                    <RefreshCcw size={14} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {location ? 'Da bat dinh vi' : 'Chua bat dinh vi'}
                  {gpsAccuracy !== null ? ` - do chinh xac ~${gpsAccuracy}m` : ''}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">Xac thuc thiet bi/IP dang bat</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thong bao</p>
                <p className="mt-1 text-sm text-slate-700">{statusText}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 text-white shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/10 p-2">
                <QrCode size={18} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-white/60">Huong dan nhanh</p>
                <p className="mt-1 text-sm text-white/90">1) Bat GPS  2) Quet ma QR  3) Doi thong bao thanh cong.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerCheckIn;
