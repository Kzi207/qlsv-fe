import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import api, { apiConfigError } from '../api/axios';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const LOGIN_BACKGROUND_IMAGE_URL = String(import.meta.env.VITE_LOGIN_BACKGROUND_IMAGE_URL || '').trim();
const LOGIN_LOGO_URL = String(import.meta.env.VITE_LOGIN_LOGO_URL || '').trim();

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const mobileBackgroundStyle = LOGIN_BACKGROUND_IMAGE_URL
    ? {
        backgroundImage: `linear-gradient(rgba(0, 71, 171, 0.7), rgba(0, 71, 171, 0.9)), url("${LOGIN_BACKGROUND_IMAGE_URL}")`,
      }
    : undefined;

  // Dynamic mobile screen and aspect ratio state
  const [isPhoneRatio, setIsPhoneRatio] = useState(false);

  // Mechanical gear parallax mouse movement state (for desktop layout)
  const [gearTranslation, setGearTranslation] = useState({
    g1: 'translate(0px, 0px)',
    g2: 'translate(0px, 0px)'
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      setGearTranslation({
        g1: `translate(${x * 15}px, ${y * 15}px)`,
        g2: `translate(${-x * 25}px, ${-y * 25}px)`
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Monitor screen resize and aspect ratio to detect typical phone screens
  useEffect(() => {
    const checkRatio = () => {
      const isMobileDevice = window.innerWidth < 768 || (window.innerWidth / window.innerHeight) < 0.85;
      setIsPhoneRatio(isMobileDevice);
    };
    checkRatio();
    window.addEventListener('resize', checkRatio);
    return () => window.removeEventListener('resize', checkRatio);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (apiConfigError) {
      toast.error(apiConfigError);
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.user);
      toast.success('Chào mừng trở lại!');
      
      const params = new URLSearchParams(window.location.search);
      const redirectPath = params.get('redirect') || '/';
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Dedicated Mobile / Portrait Viewport Layout (100% matched to your exact mobile template)
  if (isPhoneRatio) {
    return (
      <div className="login-root-container bg-blue-700 min-h-screen flex items-center justify-center p-0 m-0 w-full">
        
        {/* External fonts and scoped CSS inside component */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        <style dangerouslySetInnerHTML={{ __html: `
          .login-root-container {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          .bg-overlay-phone {
            background-size: cover;
            background-position: center;
          }
          .btn-primary {
            transition: all 0.3s ease;
          }
          .btn-primary:active {
            transform: scale(0.98);
          }
        ` }} />

        {/* BEGIN: Main Container */}
        <main
          className="w-full min-h-screen md:min-h-[812px] md:max-h-[900px] md:my-auto md:rounded-[40px] md:overflow-y-auto max-w-md bg-overlay-phone relative flex flex-col shadow-2xl"
          style={mobileBackgroundStyle}
        >
          
          {/* BEGIN: Header Section */}
          <header className="flex flex-col items-center pt-10 pb-6 px-6 z-10" data-purpose="branding">
            {/* School Logo (Circular) */}
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center p-1 shadow-lg mb-4">
              {LOGIN_LOGO_URL ? (
                <img 
                  alt="CTUT Logo" 
                  className="w-full h-full object-contain rounded-full" 
                  src={LOGIN_LOGO_URL}
                />
              ) : (
                <span className="text-xl font-black text-blue-700">CTUT</span>
              )}
            </div>
            <h1 className="text-white text-2xl font-bold tracking-wider uppercase mb-1 drop-shadow-sm text-center">
              Đăng Nhập Hệ Thống
            </h1>
            <div className="flex items-center w-full max-w-[240px] justify-center">
              <div className="flex-grow h-[1px] bg-blue-300 opacity-50"></div>
              <span className="px-3 text-blue-100 text-xs font-semibold whitespace-nowrap uppercase tracking-widest">
                Khoa Kỹ Thuật Cơ Khí
              </span>
              <div className="flex-grow h-[1px] bg-blue-300 opacity-50"></div>
            </div>
          </header>
          {/* END: Header Section */}

          {/* BEGIN: Login Form Card */}
          <section className="flex-grow bg-white rounded-t-[40px] px-8 pt-10 pb-12 shadow-inner z-10 mt-4" data-purpose="login-card">
            <form className="space-y-6" onSubmit={handleSubmit}>
              
              {/* Username Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-800 ml-1" htmlFor="username">Tên đăng nhập</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </div>
                  <input 
                    className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" 
                    id="username" 
                    name="username" 
                    placeholder="Nhập tên đăng nhập" 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-800 ml-1" htmlFor="password">Mật khẩu</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </div>
                  <input 
                    className="block w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" 
                    id="password" 
                    name="password" 
                    placeholder="Nhập mật khẩu" 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600" 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      {showPassword ? (
                        <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      ) : (
                        <>
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Options: Remember and Forgot */}
              <div className="flex items-center justify-between py-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    className="w-5 h-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer" 
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-gray-700">Ghi nhớ đăng nhập</span>
                </label>
                <a 
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800" 
                  href="#"
                  onClick={(e) => { e.preventDefault(); toast.success('Vui lòng liên hệ Văn phòng Khoa để đặt lại mật khẩu.'); }}
                >
                  Quên mật khẩu?
                </a>
              </div>

              {/* Submit Button */}
              <button 
                className="btn-primary w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-75 disabled:cursor-not-allowed" 
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </>
                )}
              </button>

              {/* Security Notice Footer */}
              <div className="mt-8 p-4 bg-blue-50 rounded-2xl flex items-center space-x-4 border border-blue-100" data-purpose="security-notice">
                <div className="bg-blue-600 p-2 rounded-xl text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-gray-900">Bảo mật thông tin của bạn</h4>
                  <p className="text-xs text-gray-600">Là ưu tiên hàng đầu của chúng tôi.</p>
                </div>
              </div>
            </form>
          </section>
          {/* END: Login Form Card */}
        </main>
        {/* END: Main Container */}
      </div>
    );
  }

  // Gorgeous Split Screen Desktop Layout (100% responsive for horizontal / laptop ratios)
  return (
    <div className="login-root-container bg-transparent lg:bg-background font-body-md text-on-surface overflow-x-hidden min-h-screen relative w-full">
      
      {/* Dynamic Material Symbols CDN + Custom Scoped Style Variables */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      <style dangerouslySetInnerHTML={{ __html: `
        .login-root-container {
          font-family: 'Inter', sans-serif;
        }
        
        @media (max-width: 1023px) {
          .login-branding-panel {
            display: none !important;
          }
          .login-main-container {
            padding-top: 2rem !important;
            padding-bottom: 6rem !important;
            min-height: 100vh !important;
          }
          .login-card-wrapper {
            margin-top: 0 !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
        
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
          line-height: 1;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 30px 70px rgba(0, 30, 80, 0.3);
        }

        .bg-overlay {
          background: linear-gradient(180deg, rgba(0, 20, 50, 0.35) 0%, rgba(0, 50, 120, 0.75) 45%, rgba(0, 30, 80, 0.92) 100%);
        }

        .input-glow:focus-within {
          box-shadow: 0 0 0 4px rgba(0, 107, 212, 0.2);
        }

        .vibrant-btn {
          background: linear-gradient(90deg, #0053cc 0%, #0077ff 100%);
          box-shadow: 0 4px 20px rgba(0, 83, 204, 0.4);
        }

        .vibrant-btn:hover:not(:disabled) {
          background: linear-gradient(90deg, #005be6 0%, #0088ff 100%);
          box-shadow: 0 8px 25px rgba(0, 83, 204, 0.5);
          transform: translateY(-1px);
        }

        /* Responsive Text Definitions matching custom config */
        .font-headline-lg {
          font-size: 32px;
          line-height: 40px;
          letter-spacing: -0.02em;
          font-weight: 700;
        }
        .font-headline-md {
          font-size: 24px;
          line-height: 32px;
          font-weight: 600;
        }
        .font-headline-sm {
          font-size: 20px;
          line-height: 28px;
          font-weight: 600;
        }
        .font-body-lg {
          font-size: 16px;
          line-height: 24px;
          font-weight: 400;
        }
        .font-body-md {
          font-size: 14px;
          line-height: 20px;
          font-weight: 400;
        }
        .font-label-md {
          font-size: 12px;
          line-height: 16px;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        /* Color definitions */
        .text-primary { color: #004ebf; }
        .text-secondary { color: #006bd4; }
        .text-secondary-container { color: #0077ff; }
        .text-outline { color: #737785; }
        .text-outline-variant { color: #c3c6d6; }
        .text-on-surface-variant { color: #424654; }
        .text-on-surface { color: #191c1e; }
        .bg-background { background-color: #f7f9fb; }
        .bg-surface-container-lowest { background-color: #ffffff; }
        .border-outline-variant { border-color: #cbd5e1; }
        .focus-within\\:border-primary:focus-within { border-color: #004ebf; }
        .group-focus-within\\:text-primary:focus-within { color: #004ebf; }

        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        .animate-spin-reverse-gear {
          animation: spin-reverse 45s linear infinite;
        }

        .animate-spin-gear {
          animation: spin 30s linear infinite;
        }
      ` }} />

      <div className="block min-h-screen relative w-full">
        {/* Top Navigation Bar */}
        <header className="flex justify-end items-center w-full px-8 py-4 absolute z-50 bg-transparent">
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-white/90 hover:text-secondary-container transition-colors duration-200">language</button>
            <button className="material-symbols-outlined text-white/90 hover:text-secondary-container transition-colors duration-200">help_outline</button>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="login-main-container relative min-h-screen w-full flex flex-col pt-8 pb-24 px-4 md:px-10">
          
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              alt="CTUT Campus Building" 
              className="w-full h-full object-cover object-center" 
              src="ChatGPT Image 17_42_48 20 thg 5, 2026.png" 
            />
            <div className="absolute inset-0 bg-overlay z-10"></div>
            
            {/* Decorative Gear Icons for Parallax effect */}
            <div 
              className="absolute bottom-10 left-1/4 opacity-10 animate-spin-gear pointer-events-none" 
              style={{ transform: gearTranslation.g1, transition: 'transform 0.1s ease-out' }}
            >
              <span className="material-symbols-outlined text-[200px] text-white">settings</span>
            </div>
            <div 
              className="absolute top-20 right-1/4 opacity-10 animate-spin-reverse-gear pointer-events-none" 
              style={{ transform: gearTranslation.g2, transition: 'transform 0.1s ease-out' }}
            >
              <span className="material-symbols-outlined text-[150px] text-white">settings</span>
            </div>
          </div>

          <div className="container mx-auto my-auto relative z-20 flex flex-col lg:flex-row items-center justify-between gap-12 max-w-7xl">
            
            {/* Left Side: Branding & Info */}
            <div className="login-branding-panel flex w-1/2 text-white flex-col gap-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/95 p-1.5 shadow-xl shadow-blue-950/30">
                    <img
                      src="/logo-qlsv.png"
                      alt="Logo Khoa Kỹ Thuật Cơ Khí"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest text-[#ccd8ff] drop-shadow-sm">CỔNG THÔNG TIN</span>
                </div>
                <h1 className="font-headline-lg leading-tight md:text-[46px] max-w-xl text-white font-extrabold tracking-tight drop-shadow-2xl" style={{ textShadow: '0 4px 20px rgba(0, 20, 60, 0.6)' }}>
                  <span className="block text-white/95 text-lg md:text-xl font-bold uppercase tracking-widest mb-1.5">TRƯỜNG ĐẠI HỌC</span>
                  KỸ THUẬT - CÔNG NGHỆ CẦN THƠ
                </h1>
                <div className="h-1.5 w-28 bg-[#0077ff] rounded-full shadow-lg shadow-[#0077ff]/50"></div>
                <h2 className="font-headline-sm text-headline-sm text-secondary-container font-extrabold tracking-wider uppercase drop-shadow-md" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.4)' }}>
                  KHOA KỸ THUẬT CƠ KHÍ
                </h2>
                <p className="text-body-lg text-white/95 max-w-md leading-relaxed font-medium">
                  Đăng nhập để truy cập Cổng thông tin sinh viên và sử dụng các dịch vụ trực tuyến của Khoa.
                </p>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-6 pt-6">
                <div className="flex flex-col gap-3 group">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center transition-all group-hover:bg-white/25 border border-white/10">
                    <span className="material-symbols-outlined text-white">verified_user</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Bảo mật</h4>
                    <p className="text-label-md text-white/80">Thông tin của bạn được bảo vệ an toàn</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 group">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center transition-all group-hover:bg-white/25 border border-white/10">
                    <span className="material-symbols-outlined text-white">speed</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Nhanh chóng</h4>
                    <p className="text-label-md text-white/80">Truy cập nhanh đến các dịch vụ</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 group">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center transition-all group-hover:bg-white/25 border border-white/10">
                    <span className="material-symbols-outlined text-white">groups</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Hỗ trợ</h4>
                    <p className="text-label-md text-white/80">Đội ngũ hỗ trợ luôn sẵn sàng giúp bạn</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Login Card */}
            <div className="login-card-wrapper w-[460px] ml-auto mr-0">
              <div className="glass-card rounded-[2rem] p-12 transition-all duration-500">
                
                <div className="flex flex-col items-center mb-8">
                  <img 
                    alt="CTUT Mechanical Engineering Logo" 
                    className="w-24 h-24 object-contain mb-6 drop-shadow-lg" 
                    src="/logo-qlsv.png" 
                  />
                  <h3 className="font-headline-md text-headline-md text-primary text-center mb-2 font-bold tracking-tight whitespace-nowrap">
                    ĐĂNG NHẬP HỆ THỐNG
                  </h3>
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-[1px] flex-grow bg-[#c3c6d6]/60"></div>
                    <span className="text-label-md text-secondary font-bold whitespace-nowrap uppercase tracking-widest">
                      KHOA KỸ THUẬT CƠ KHÍ
                    </span>
                    <div className="h-[1px] flex-grow bg-[#c3c6d6]/60"></div>
                  </div>
                </div>

                {/* Core Active Form */}
                <form className="space-y-6" onSubmit={handleSubmit}>
                  
                  {/* Username */}
                  <div className="space-y-2 group">
                    <label className="text-label-md font-bold text-on-surface-variant block ml-1">
                      Tên đăng nhập
                    </label>
                    <div className="relative flex items-center input-glow rounded-xl bg-surface-container-lowest border border-outline-variant transition-all focus-within:border-primary">
                      <span className="material-symbols-outlined absolute left-4 text-outline group-focus-within:text-primary transition-colors">
                        person
                      </span>
                      <input 
                        className="w-full bg-transparent border-none py-4 pl-12 pr-4 focus:ring-0 text-on-surface placeholder:text-outline-variant outline-none" 
                        placeholder="Nhập tên đăng nhập" 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2 group">
                    <label className="text-label-md font-bold text-on-surface-variant block ml-1">
                      Mật khẩu
                    </label>
                    <div className="relative flex items-center input-glow rounded-xl bg-surface-container-lowest border border-outline-variant transition-all focus-within:border-primary">
                      <span className="material-symbols-outlined absolute left-4 text-outline group-focus-within:text-primary transition-colors">
                        lock
                      </span>
                      <input 
                        className="w-full bg-transparent border-none py-4 pl-12 pr-12 focus:ring-0 text-on-surface placeholder:text-outline-variant outline-none" 
                        placeholder="Nhập mật khẩu" 
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      
                      {/* Toggle password visibility */}
                      <button 
                        className="absolute right-4 text-outline hover:text-primary transition-colors flex items-center justify-center" 
                        onClick={() => setShowPassword(!showPassword)} 
                        type="button"
                      >
                        <span className="material-symbols-outlined">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between text-label-md px-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-on-surface-variant font-bold">
                      <input 
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer" 
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      Ghi nhớ
                    </label>
                    <a 
                      className="text-secondary hover:text-primary-container font-bold transition-colors" 
                      href="#"
                      onClick={(e) => { e.preventDefault(); toast.success('Vui lòng liên hệ Văn phòng Khoa để đặt lại mật khẩu.'); }}
                    >
                      Quên mật khẩu?
                    </a>
                  </div>

                  {/* Submit Action */}
                  <button 
                    className="w-full vibrant-btn text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <span>Đăng nhập</span>
                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Trust Footer */}
                <div className="mt-10 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-label-md text-on-surface-variant font-medium">
                    <span className="material-symbols-outlined text-secondary text-lg">security</span>
                    <span className="text-center text-xs">Bảo mật thông tin của bạn là ưu tiên hàng đầu.</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </main>

        {/* Footer Area */}
        <footer className="absolute bottom-4 w-full flex justify-between items-center px-8 z-30">
          <div className="text-label-md font-bold text-white/90">
            © 2026 Khoa Kỹ thuật Cơ khí - Trường Đại học Kỹ thuật - Công nghệ Cần Thơ
          </div>
          <div className="flex items-center gap-6">
            <a className="text-label-md font-bold text-white/70 hover:text-white transition-colors underline-offset-4 hover:underline" href="/chinhsachbaomat.html">Chính sách bảo mật</a>
            <a className="text-label-md font-bold text-white/70 hover:text-white transition-colors underline-offset-4 hover:underline" href="/dieukhoansudung.html">Điều khoản sử dụng</a>
            <a className="text-label-md font-bold text-white/70 hover:text-white transition-colors underline-offset-4 hover:underline" href="/thongtinlienhe.html">Thông tin liên hệ</a>
          </div>
        </footer>
      </div>

    </div>
  );
};

export default Login;
