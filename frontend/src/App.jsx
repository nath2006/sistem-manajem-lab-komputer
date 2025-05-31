import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import LoginPage from "./pages/authentication/authLoginCover"
import AdminPage from './pages/admin';
import GuruPage from './pages/Guru';
import TeknisiPage from './pages/Teknisi';
import KoordinatorLabPage from './pages/KoordinatorLab';
import KepalaLabPage from './pages/KepalaLab';

function App() {

  return (
    //  <RouterProvider router={router} />
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<AdminPage />} />
          <Route path="/dashboard-guru" element={<GuruPage />} />
          <Route path="/dashboard-teknisi" element={<TeknisiPage />} />
          <Route path="/dashboard-koordinator-lab" element={<KoordinatorLabPage />} />
          <Route path="/dashboard-kepala-lab" element={<KepalaLabPage />} />
          {/* Add more routes here as needed */}
        </Routes>
      </BrowserRouter>
  </AuthProvider>
    )
}



export default App
