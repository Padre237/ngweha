import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader } from './components/ui/index.js';

// Frontiere d'authentification : charge Firebase Auth uniquement sur l'espace
// organisateur, jamais sur la Guest Page (CDC §9.1)
const AuthBoundary = lazy(() => import('./components/AuthBoundary.jsx'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute.jsx'));
const AdminLayout = lazy(() => import('./components/layout/AdminLayout.jsx'));

// Code splitting par route — impose par les objectifs de bundle (CDC §9.2)
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage.jsx'));
const EventsPage = lazy(() => import('./pages/EventsPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const GuestsPage = lazy(() => import('./pages/GuestsPage.jsx'));
const ScannerPage = lazy(() => import('./pages/ScannerPage.jsx'));
const SeatingPage = lazy(() => import('./pages/SeatingPage.jsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx'));
const GalleryPage = lazy(() => import('./pages/GalleryPage.jsx'));
const MessagesPage = lazy(() => import('./pages/MessagesPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const InvitePage = lazy(() => import('./invite/InvitePage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

export default function App() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <Loader size={32} label="Chargement…" />
        </div>
      }
    >
      <Routes>
        {/* ── Guest Page : publique et sans Firebase Auth (CDC §4.3, §6.1) ── */}
        <Route path="/invite/:token" element={<InvitePage />} />

        {/* ── Tout l'espace organisateur vit derriere AuthProvider ── */}
        <Route element={<AuthBoundary />}>
          {/* Routes d'authentification, accessibles sans session */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Routes admin : protegees et rendues dans la coquille a sidebar (CDC §4.3, §5.1) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Navigate to="/events" replace />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/guests" element={<GuestsPage />} />
              <Route path="/scanner" element={<ScannerPage />} />
              <Route path="/seating" element={<SeatingPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
