# QLSV Frontend

Giao diện React cho hệ thống quản lý sinh viên. Được xây dựng bằng React 19, Vite, TypeScript và Tailwind CSS.

## 🚀 Công Nghệ Sử Dụng

| Công nghệ | Phiên bản | Mục đích |
| --- | --- | --- |
| **React** | 19.x | UI framework |
| **TypeScript** | 6.x | Type safety |
| **Vite** | 8.x | Build tool & dev server |
| **Tailwind CSS** | 3.x | Styling |
| **React Router** | 7.x | Routing |
| **Zustand** | 5.x | State management |
| **Axios** | 1.15.x | HTTP client |
| **Framer Motion** | 12.x | Animations |
| **Recharts** | 3.x | Data visualization |
| **html5-qrcode** | 2.x | QR code scanning |
| **Lucide React** | 1.x | Icons |
| **React Hot Toast** | 2.x | Notifications |

## 📁 Cấu Trúc Thư Mục

```
frontend/
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Root component
│   ├── App.css                  # Global styles
│   ├── index.css                # Global CSS
│   ├── api/
│   │   └── axios.ts             # HTTP client config
│   ├── components/
│   │   ├── DetailedEvaluationForm.tsx
│   │   ├── RoleRoute.tsx         # Protected routes
│   │   ├── StudentChatbot.tsx    # Chatbot UI
│   │   └── drl/                 # DRL-specific components
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Classes.tsx
│   │   ├── Attendance.tsx
│   │   ├── Evaluation.tsx
│   │   ├── AdminDRLManagement.tsx
│   │   ├── EventManagement.tsx
│   │   ├── ProfileManagement.tsx
│   │   └── ... (other pages)
│   ├── layout/
│   │   ├── MainLayout.tsx       # Main wrapper
│   │   └── Sidebar.tsx          # Navigation
│   ├── store/                   # Zustand stores
│   ├── types/                   # TypeScript interfaces
│   ├── utils/                   # Helper functions
│   ├── constants/
│   │   └── evaluationData.ts    # Constants
│   ├── assets/                  # Images, fonts
│   └── public/
│       ├── chinhsachbaomat.html # Privacy policy
│       ├── dieukhoansudung.html # Terms of use
│       └── thongtinlienhe.html  # Contact info
├── dist/                        # Build output
├── .env.example                 # Environment template
├── vite.config.ts               # Vite config
├── tailwind.config.js           # Tailwind config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies
└── vercel.json                  # Vercel deployment config
```

## 🛠️ Setup & Installation

### Yêu cầu
- **Node.js**: >=20 <25
- **npm** hoặc **yarn**

### Bước 1: Cài đặt Dependencies

```bash
cd frontend
npm install
```

### Bước 2: Cấu hình Environment

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

**Cấu hình chính**:
```env
# API Backend
VITE_API_URL=http://localhost:5000/api
VITE_API_BASE_URL=http://localhost:5000

# Mode
VITE_MODE=development
```

### Bước 3: Chạy Development Server

```bash
npm run dev
```
- Truy cập `http://localhost:5173` (hoặc port trong terminal)
- Hot-reload tự động khi chỉnh sửa code
- TypeScript type-checking trong editor

## 🏃 Chạy Dự Án

### Development Mode
```bash
npm run dev
```
- Server chạy ở `http://localhost:5173`
- Auto-reload với HMR (Hot Module Replacement)

### Build Production
```bash
npm run build
```
- Tạo thư mục `dist/` chứa static files
- Optimized bundle (code splitting, minification)
- Source maps cho debugging

### Preview Build
```bash
npm run preview
```
- Xem trước production build trên local
- Chạy ở `http://localhost:4173`

### Lint Code
```bash
npm run lint
```
- Kiểm tra ESLint errors/warnings
- Kiểm tra TypeScript types

## 📱 Các Trang Chính

### Public Pages
| Trang | Route | Mô tả |
| --- | --- | --- |
| Login | `/` | Đăng nhập tài khoản |
| Đăng ký sự kiện | `/dangky` | Công khai, không cần login |
| Chính sách bảo mật | `/chinhsachbaomat` | Static HTML |
| Điều khoản sử dụng | `/dieukhoansudung` | Static HTML |
| Liên hệ | `/thongtinlienhe` | Static HTML |

### Protected Pages (Require Login)
| Trang | Route | Vai trò |
| --- | --- | --- |
| Dashboard | `/dashboard` | Tất cả |
| Thông tin cá nhân | `/profile` | Tất cả |
| Quản lý tài khoản | `/account` | ADMIN |
| Quản lý lớp | `/classes` | ADMIN, BCH |
| Quản lý sinh viên | `/students` | ADMIN, BCH |
| Điểm danh QR | `/attendance` | ADMIN, BCH, STUDENT |
| Đánh giá DRL | `/evaluation` | STUDENT |
| Quản lý DRL | `/admin-drl-management` | ADMIN |
| Duyệt minh chứng | `/admin-evidence-review` | ADMIN, BCH |
| Quản lý sự kiện | `/event-management` | ADMIN |
| Quản lý BCH | `/bch-management` | ADMIN |
| Hỗ trợ sinh viên | `/support` | ADMIN, BCH |
| Lịch sử hoạt động | `/activity-history` | ADMIN |

## 🔐 Authentication & Authorization

### Login Flow
1. User nhập username/password
2. API gửi JWT token và CSRF token
3. Token được lưu trong HTTP-only cookie
4. CSRF token được lưu trong localStorage hoặc memory

### Protected Routes
- Sử dụng `RoleRoute` component để kiểm tra quyền
- Tự động redirect về Login nếu không có quyền
- Hỗ trợ kiểm tra multiple roles

### Logout
- Xóa JWT cookie từ browser
- Xóa CSRF token từ storage
- Redirect về Login page

## 🎯 State Management

### Zustand Stores
Xem `src/store/`:
- **User Store** - Thông tin user hiện tại, vai trò
- **Auth Store** - CSRF token, login state
- **Notification Store** - Toast messages

### API Integration
- `src/api/axios.ts` - Cấu hình Axios instance
- Tự động gắn JWT cookie và CSRF token vào requests
- Xử lý error responses

## 📊 Chủ Yếu Components

### RoleRoute Component
```tsx
<RoleRoute allowedRoles={['ADMIN', 'BCH']}>
  <AdminDashboard />
</RoleRoute>
```
- Kiểm tra user role
- Render content hoặc redirect

### Student Chatbot
```tsx
<StudentChatbot />
```
- Chat hỏi đáp tích hợp
- Hỗ trợ Gemini API
- Fallback với canned responses

### DetailedEvaluationForm
- Form tự đánh giá DRL
- Upload minh chứng
- Validation logic

### QR Code Scanner
- Quét QR từ camera
- Xử lý attendance check-in
- Hỗ trợ multiple browsers

## 🎨 Styling

### Tailwind CSS
- Utility-first CSS framework
- Config: `tailwind.config.js`
- Global styles: `src/index.css`
- Component styles: `src/App.css`

### Dark Mode (Optional)
- Hỗ trợ built-in trong Tailwind
- Toggle ở Sidebar hoặc Settings

### Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl
- Sidebar collapse trên mobile

## 📦 Environment Variables

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api
VITE_API_BASE_URL=http://localhost:5000

# Optional Features
VITE_ENABLE_CHATBOT=true
VITE_ENABLE_QR_SCANNER=true

# Build
VITE_MODE=development
```

## 🚀 Build & Deploy

### Build cho Production
```bash
npm run build
```

### Deploy lên Vercel (Recommended)
```bash
# Sử dụng Vercel CLI
vercel deploy

# Hoặc kết nối GitHub repo
# Vercel sẽ auto-deploy từ main branch
```

Cấu hình Vercel đã trong `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.yourdomain.com/:path*"
    },
    {
      "source": "/:path*",
      "destination": "/index.html"
    }
  ]
}
```

### Deploy lên Server
```bash
# Build
npm run build

# Copy dist/ lên server
scp -r dist/* user@server:/var/www/qlsv/

# Cấu hình Nginx
location / {
  root /var/www/qlsv;
  try_files $uri /index.html;
}
```

## 🔄 API Integration

### Axios Config
```typescript
// src/api/axios.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Cookie & CSRF
});

// Interceptor cho CSRF token
api.interceptors.request.use(config => {
  config.headers['X-CSRF-Token'] = getCSRFToken();
  return config;
});
```

### Fetch Example
```typescript
import { api } from '@/api/axios';

// GET
const { data } = await api.get('/students');

// POST
const { data } = await api.post('/students', { name: 'John' });

// PUT
const { data } = await api.put('/students/1', { name: 'Jane' });

// DELETE
await api.delete('/students/1');
```

## 🐛 Troubleshooting

| Vấn đề | Nguyên nhân | Giải pháp |
| --- | --- | --- |
| `CORS Error` | Backend & frontend port khác | Kiểm tra CORS config trong backend |
| `CSRF Token missing` | Token không được gửi | Kiểm tra `getCSRFToken()` logic |
| `401 Unauthorized` | JWT token hết hạn | Đăng nhập lại hoặc refresh token |
| `API not responding` | Backend chưa chạy | Kiểm tra `VITE_API_URL` trong .env |
| `Blank page` | Router error | Kiểm tra console & network tab |
| `ESLint errors` | Code style violation | Chạy `npm run lint -- --fix` |

## 📞 Support & Issues

- Để lại issue trên repository
- Kiểm tra console (F12) cho error messages
- Kiểm tra Network tab cho API calls

## 📄 License

ISC

---

**Phát triển**: QLSV Team | **Cập nhật**: June 2026
