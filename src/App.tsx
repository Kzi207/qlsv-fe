import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import MainLayout from './layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import TrainingScore from './pages/TrainingScore';
import Attendance from './pages/Attendance';
import EvaluationPage from './pages/Evaluation';
import StudentDashboard from './pages/StudentDashboard';
import QRAttendanceManager from './pages/QRAttendanceManager';
import QRScannerCheckIn from './pages/QRScannerCheckIn';
import RoleRoute from './components/RoleRoute';
import StudentEvaluation from './pages/StudentEvaluation';
import AccountManagement from './pages/AccountManagement';
import AdminDRLManagement from './pages/AdminDRLManagement';
import Classes from './pages/Classes';
import Semesters from './pages/Semesters';
import TrainingScoreApproval from './pages/TrainingScoreApproval';
import TrainingScoreDetail from './pages/TrainingScoreDetail';
import BCHManagement from './pages/BCHManagement';
import Profile from './pages/Profile';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, authInitialized } = useAuthStore();

  if (!authInitialized) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const { user, isAuthenticated, authInitialized, initializeAuth } = useAuthStore();
  const isStudent = user?.role?.toUpperCase() === 'STUDENT';

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        <Route
          path="/login"
          element={
            authInitialized && isAuthenticated ? <Navigate to="/" /> : <Login />
          }
        />
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
          <Route path="semesters" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><Semesters /></RoleRoute>} />
          <Route path="accounts" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><AccountManagement /></RoleRoute>} />
          <Route path="attendance/manage" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><QRAttendanceManager /></RoleRoute>} />
          <Route path="training/approval" element={<RoleRoute allowedRoles={['ADMIN', 'BCH']}><TrainingScoreApproval /></RoleRoute>} />

          {/* ADMIN ONLY ROUTES */}
          <Route path="bch" element={<RoleRoute allowedRoles={['ADMIN']}><BCHManagement /></RoleRoute>} />

          {/* STUDENT ONLY ROUTES */}
          <Route path="training/evaluation/self" element={<RoleRoute allowedRoles={['STUDENT']}><StudentEvaluation /></RoleRoute>} />

          {/* SHARED ROUTES */}
          <Route path="profile" element={<Profile />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="attendance/scan" element={<QRScannerCheckIn />} />
          <Route path="training" element={<TrainingScore />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
