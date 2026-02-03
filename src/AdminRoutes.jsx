import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/Admin/layout/AdminLayout';
import DashboardPage from './components/Admin/pages/DashboardPage';
import AlertsPage from './components/Admin/pages/AlertsPage';
import LogsPage from './components/Admin/pages/LogsPage';
import PlayersPage from './components/Admin/pages/PlayersPage';
import InvestigationPage from './components/Admin/pages/InvestigationPage';

/**
 * Admin Routes Component
 * 
 * Defines all admin panel routes with AdminLayout wrapper
 */
const AdminRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Panel Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="players" element={<PlayersPage />} />
          <Route path="investigations" element={<InvestigationPage />} />
          <Route path="rules" element={<div style={{ padding: '20px' }}>Rules manager coming soon...</div>} />
          <Route path="settings" element={<div style={{ padding: '20px' }}>Settings coming soon...</div>} />
          <Route path="docs" element={<div style={{ padding: '20px' }}>Documentation coming soon...</div>} />
          
          {/* 404 for unknown admin routes */}
          <Route path="*" element={<div style={{ padding: '20px' }}>Page not found</div>} />
        </Route>

        {/* Redirect root to admin dashboard */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        
        {/* 404 for any other routes */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AdminRoutes;
