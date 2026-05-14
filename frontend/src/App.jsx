import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import AIFeaturePage from './pages/AIFeaturePage';
import AIHistoryPage from './pages/AIHistoryPage';
import AlertsPage from './pages/AlertsPage';
import WebhooksPage from './pages/WebhooksPage';
import ExtensionsPage from './pages/ExtensionsPage';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/feature/:featureName"
          element={
            <PrivateRoute>
              <FeaturePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/ai/:aiFeature"
          element={
            <PrivateRoute>
              <AIFeaturePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-history"
          element={
            <PrivateRoute>
              <AIHistoryPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <PrivateRoute>
              <AlertsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/webhooks"
          element={
            <PrivateRoute>
              <WebhooksPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/extensions"
          element={
            <PrivateRoute>
              <ExtensionsPage />
            </PrivateRoute>
          }
        />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </>
  );
}

export default App;
