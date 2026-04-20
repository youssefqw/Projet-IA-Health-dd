import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/dashboard/PatientDashboard';
import DoctorDashboard from './pages/dashboard/DoctorDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard/patient" element={<PrivateRoute><PatientDashboard /></PrivateRoute>} />
                    <Route path="/dashboard/doctor" element={<PrivateRoute><DoctorDashboard /></PrivateRoute>} />
                    <Route path="/dashboard/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
