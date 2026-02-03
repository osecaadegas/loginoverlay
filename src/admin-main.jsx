import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminRoutes from './AdminRoutes';
import './index.css';
import './components/Admin/layout/AdminLayout.css';

/**
 * Admin Panel Entry Point
 * 
 * Separate entry point for the anti-cheat admin dashboard
 * Run with: npm run dev -- admin.html
 */

ReactDOM.createRoot(document.getElementById('admin-root')).render(
  <React.StrictMode>
    <AdminRoutes />
  </React.StrictMode>,
);
