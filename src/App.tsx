import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import MainLayout from './layout/MainLayout';
import RoleRoute from './components/RoleRoute';
import { normalizeUserRole } from './utils/auth';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const TrainingScore = lazy(() => import('./pages/TrainingScore'));
const Attendance = lazy(() => import('./pages/Attendance'));
const EvaluationPage = lazy(() => import('./pages/Evaluation'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const QRAttendanceManager = lazy(() => import('./pages/QRAttendanceManager'));
const QRScannerCheckIn = lazy(() => import('./pages/QRScannerCheckIn'));
const StudentEvaluation = lazy(() => import('./pages/StudentEvaluation'));
const StudentEvidence = lazy(() => import('./pages/StudentEvidence'));
const AdminEvidenceReview = lazy(() => import('./pages/AdminEvidenceReview'));
const AccountManagement = lazy(() => import('./pages/AccountManagement'));
const AdminDRLManagement = lazy(() => import('./pages/AdminDRLManagement'));
const Classes = lazy(() => import('./pages/Classes'));
const Semesters = lazy(() => import('./pages/Semesters'));
const TrainingScoreApproval = lazy(() => import('./pages/TrainingScoreApproval'));
const TrainingScoreDetail = lazy(() => import('./pages/TrainingScoreDetail'));
const TrainingStatistics = lazy(() => import('./pages/TrainingStatistics'));
const BCHManagement = lazy(() => import('./pages/BCHManagement'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicEventRegister = lazy(() => import('./pages/PublicEventRegister'));
const EventManagement = lazy(() => import('./pages/EventManagement'));
const SupportManagement = lazy(() => import('./pages/SupportManagement'));

const PageFallback = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="h-10 w-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
  </div>
);

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, authInitialized } = useAuthStore();

  if (!authInitialized) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const { user, isAuthenticated, authInitialized, initializeAuth } = useAuthStore();
  const isStudent = normalizeUserRole(user?.role) === 'STUDENT';

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Router>
      <Toaster position="top-center" />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route
            path="/login"
            element={
              authInitialized && isAuthenticated ? <Navigate to="/" /> : <Login />
            }
          />
          
          {/* STANDALONE PUBLIC EVENT REGISTRATION ROUTE */}
          <Route path="/dangky" element={<PublicEventRegister />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={isStudent ? <StudentDashboard /> : <Dashboard />} />

            {/* ADMIN & BCH ROUTES */}
            <Route path="students" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><Students /></RoleRoute>} />
            <Route path="drl" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><AdminDRLManagement /></RoleRoute>} />
            <Route path="training/approval/:id" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><TrainingScoreDetail /></RoleRoute>} />
            <Route path="evaluation/:studentId" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><EvaluationPage /></RoleRoute>} />
            <Route path="classes" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><Classes /></RoleRoute>} />
            <Route path="events" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><EventManagement /></RoleRoute>} />
            <Route path="semesters" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><Semesters /></RoleRoute>} />
            <Route path="accounts" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><AccountManagement /></RoleRoute>} />
            <Route path="attendance/manage/class" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><QRAttendanceManager type="QR_CLASS" /></RoleRoute>} />
            <Route path="attendance/manage/activity" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><QRAttendanceManager type="ACTIVITY" /></RoleRoute>} />
            <Route path="training/approval" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><TrainingScoreApproval /></RoleRoute>} />
            <Route path="training/statistics" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><TrainingStatistics /></RoleRoute>} />
            <Route path="evidence/review" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><AdminEvidenceReview /></RoleRoute>} />

            {/* ADMIN ONLY ROUTES */}
            <Route path="bch" element={<RoleRoute allowedRoles={['ADMIN']}><BCHManagement /></RoleRoute>} />
            <Route path="support" element={<RoleRoute allowedRoles={['ADMIN']}><SupportManagement /></RoleRoute>} />

            {/* STUDENT ONLY ROUTES */}
            <Route path="training/evaluation/self" element={<RoleRoute allowedRoles={['STUDENT']}><StudentEvaluation /></RoleRoute>} />
            <Route path="evidence/submit" element={<RoleRoute allowedRoles={['STUDENT']}><StudentEvidence /></RoleRoute>} />

            {/* SHARED ROUTES */}
            <Route path="profile" element={<Profile />} />
            <Route path="activity-history" element={<Navigate to="/" replace />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="attendance/scan" element={<QRScannerCheckIn />} />
            <Route path="training" element={<TrainingScore />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
