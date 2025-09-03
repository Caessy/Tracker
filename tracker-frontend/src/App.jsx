import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useContext, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConfirmDialog from './components/ConfirmDialog';
import AlertSnackbar from './components/AlertSnackbar';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import MFA from './pages/MFA';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import Start from './pages/dashboard/Start';
import Exercises from './pages/dashboard/Exercises';
import Calendar from './pages/dashboard/Calendar';
import Progress from './pages/dashboard/Progress';
import QuickWorkoutSession from './pages/dashboard/QuickWorkoutSession';
import ExerciseDetailPage from './pages/dashboard/ExerciseDetailPage';
import Instructor from './pages/dashboard/Instructor';
import TraineeDetail from './pages/dashboard/TraineeDetail';
import Account from './pages/dashboard/Account';
import ProtectedRoute from './components/ProtectedRoute';
import HelpPage from './pages/dashboard/HelpPage';

import { useAuthStore } from './store/useAuthStore';

const queryClient = new QueryClient();

function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <ThemeProvider theme={theme}>
    <CssBaseline />

      <QueryClientProvider client={queryClient}>
        <Router>
          <AlertSnackbar />
          <ConfirmDialog />
          <Routes>
            {/* Auth Pages */}
            <Route path="/login" element={<AuthLayout title="login"><Login /></AuthLayout>} />
            <Route path="/register" element={<AuthLayout title="Register"><Register /></AuthLayout>} />
            <Route path="/forgot-password" element={<AuthLayout title="Forgot Password"><ForgotPassword /></AuthLayout>} />
            <Route path="/mfa" element={<AuthLayout title="MFA"><MFA /></AuthLayout>} />

            {/* Dashboard (protected area) */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Start />} />
              <Route path="start" element={<Start />} />
              <Route path="exercises" element={<Exercises />} />
              <Route path="exercise/:id" element={<ExerciseDetailPage />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="progress" element={<Progress />} />
              <Route path="workout/quick" element={<QuickWorkoutSession />} />
              <Route path="instructor" element={<Instructor />} />
              <Route path="instructor/trainee/:id" element={<TraineeDetail />} />
              <Route path="account" element={<Account />} />
              <Route path='help' element={<HelpPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    
  </ThemeProvider>
  )
}

export default App;