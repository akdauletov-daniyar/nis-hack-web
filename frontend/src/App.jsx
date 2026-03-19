import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Auth from './pages/Auth';

// Dashboard Imports
import CitizenDashboard from './pages/dashboards/CitizenDashboard';
import VolunteerDashboard from './pages/dashboards/VolunteerDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import EmergencyDashboard from './pages/dashboards/EmergencyDashboard';
import GovernmentDashboard from './pages/dashboards/GovernmentDashboard';
import LandingPage from './pages/LandingPage';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

// Model Page Imports
import AirQualityModel from './pages/models/AirQualityModel';
import DataPreprocessing from './pages/models/DataPreprocessing';
import GeoAIAccessibility from './pages/models/GeoAIAccessibility';
import IntegrationService from './pages/models/IntegrationService';
import TrafficModel from './pages/models/TrafficModel';

const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-red-600 mb-4">403</h1>
      <p className="text-xl text-gray-700">Unauthorized Access</p>
    </div>
  </div>
);

// A simple RoleRouter component to redirect users to their specific dashboard based on their role
const RoleRouter = () => {
  const { role } = useAuth();
  
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'government') return <Navigate to="/government" replace />;
  if (role === 'emergency') return <Navigate to="/emergency" replace />;
  if (role === 'volunteer') return <Navigate to="/volunteer" replace />;
  return <Navigate to="/citizen" replace />; // Default fallback
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Auth pages - no Layout (no navbar/footer) */}
          <Route path="/login" element={<Auth />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Public Routes Wrapped in Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/models/air-quality" element={<AirQualityModel />} />
            <Route path="/models/data-preprocessing" element={<DataPreprocessing />} />
            <Route path="/models/geoai-accessibility" element={<GeoAIAccessibility />} />
            <Route path="/models/integration-service" element={<IntegrationService />} />
            <Route path="/models/traffic-model" element={<TrafficModel />} />
          </Route>

          {/* Protected Dashboard Routes Wrapped in Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<RoleRouter />} />
              
              <Route path="/citizen" element={<CitizenDashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              
              <Route element={<ProtectedRoute allowedRoles={['volunteer', 'admin']} />}>
                <Route path="/volunteer" element={<VolunteerDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['emergency', 'admin']} />}>
                <Route path="/emergency" element={<EmergencyDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['government', 'admin']} />}>
                <Route path="/government" element={<GovernmentDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
