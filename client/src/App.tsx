import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ExamProvider } from './context/ExamContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AdminLayout from './components/layout/AdminLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfileCompletionPage from './pages/ProfileCompletionPage';
import DashboardPage from './pages/DashboardPage';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import LevelExamPage from './pages/LevelExamPage';
import LevelPlayPage from './pages/LevelPlayPage';
import MockExamPage from './pages/MockExamPage';
import { SpecialExamListPage } from './pages/SpecialExamPage';
import SpecialExamPlayPage from './pages/SpecialExamPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminQuestions from './pages/admin/AdminQuestions';
import AdminExams from './pages/admin/AdminExams';
import AdminContent from './pages/admin/AdminContent';
import AdminMedia from './pages/admin/AdminMedia';
import AdminLevels from './pages/admin/AdminLevels';
import AdminSpecialExams from './pages/admin/AdminSpecialExams';
import AdminSettings from './pages/admin/AdminSettings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireProfile({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (!user.isProfileComplete) return <Navigate to="/complete-profile" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" /></div>;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Routes>
        {/* Public routes with Navbar + Footer */}
        <Route path="/" element={<><Navbar /><LandingPage /><Footer /></>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route path="/complete-profile" element={
          <ProtectedRoute><Navbar /><ProfileCompletionPage /><Footer /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <RequireProfile><Navbar /><DashboardPage /><Footer /></RequireProfile>
        } />
        <Route path="/exam/:examId" element={
          <RequireProfile>
            <ExamProvider><ExamPage /></ExamProvider>
          </RequireProfile>
        } />
        <Route path="/exam/:examId/result/:attemptId" element={
          <RequireProfile><Navbar /><ResultPage /><Footer /></RequireProfile>
        } />
        <Route path="/levels" element={
          <RequireProfile><Navbar /><LevelExamPage /><Footer /></RequireProfile>
        } />
        <Route path="/levels/:level/sublevel/:sublevel" element={
          <RequireProfile><LevelPlayPage /></RequireProfile>
        } />
        <Route path="/mock-exam" element={
          <RequireProfile><Navbar /><MockExamPage /><Footer /></RequireProfile>
        } />
        <Route path="/special-exams" element={
          <RequireProfile><Navbar /><SpecialExamListPage /><Footer /></RequireProfile>
        } />
        <Route path="/special-exams/:examId" element={
          <RequireProfile><SpecialExamPlayPage /></RequireProfile>
        } />

        {/* Admin routes */}
        <Route path="/admin" element={<RequireAdmin><AdminLayout><AdminDashboard /></AdminLayout></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminLayout><AdminUsers /></AdminLayout></RequireAdmin>} />
        <Route path="/admin/questions" element={<RequireAdmin><AdminLayout><AdminQuestions /></AdminLayout></RequireAdmin>} />
        <Route path="/admin/exams" element={<RequireAdmin><AdminLayout><AdminExams /></AdminLayout></RequireAdmin>} />
        <Route path="/admin/content" element={<RequireAdmin><AdminLayout><AdminContent /></AdminLayout></RequireAdmin>} />
        <Route path="/admin/media" element={<RequireAdmin><AdminLayout><AdminMedia /></AdminLayout></RequireAdmin>} />
        <Route path="/admin/levels" element={<RequireAdmin><AdminLayout><AdminLevels /></AdminLayout></RequireAdmin>} />
        <Route path="/admin/special-exams" element={<RequireAdmin><AdminLayout><AdminSpecialExams /></AdminLayout></RequireAdmin>} />
        <Route path="/admin/settings" element={<RequireAdmin><AdminLayout><AdminSettings /></AdminLayout></RequireAdmin>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
