import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./Context/AuthContext";
import { ProtectedRoute, AdminRoute } from "./utils/Middleware/ProtectedRoute";
import LoginPage from "./pages/authentication/authLoginCover";
import AdminPage from "./pages/admin/AdminDashboard";
import GuruPage from "./pages/Guru/GuruDashboard";
import TeknisiPage from "./pages/Teknisi/TeknisiDashboard";
import KoordinatorLabPage from "./pages/KoordinatorLab/KoordinatorLabDashboard";
import KepalaLabPage from "./pages/KepalaLab/KepalaLabDashboard";

import User from "./features/KelolaUser/User";
import AddUser from "./Components/User/AddUser";

import Pengumuman from "./features/KelolaPengumuman/Pengumuman";
import AddPengumuman from "./Components/Pengumuman/AddPengumuman";

function App() {
  return (
    //  <RouterProvider router={router} />
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/*Public Routes*/}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          {/*Protected Routes*/}
          <Route element={<ProtectedRoute />}>
            <Route path="/add-user" element={<AddUser />} />
            <Route path="/kelola-pengumuman" element={<Pengumuman />} />
            <Route path="/add-pengumuman" element={<AddPengumuman />} />

            {/*Admin Routes*/}
            <Route element={<AdminRoute />}>
              <Route path="/dashboard" element={<AdminPage />} />
              <Route path="/user" element={<User />} />
            </Route>

            {/* Kepala Lab Routes*/}
            <Route element={<KepalaLabPage />}>
              <Route path="/dashboard-kepala-lab" element={<KepalaLabPage />} />
            </Route>

            {/* Guru Routes */}
            <Route element={<GuruPage />}>
              <Route path="/dashboard-guru" element={<GuruPage />} />
            </Route>

            {/* Teknisi Routes */}
            <Route element={<TeknisiPage />}>
              <Route path="/dashboard-teknisi" element={<TeknisiPage />} />
            </Route>

            {/* Koordinator Lab Routes */}
            <Route element={<KoordinatorLabPage />}>
              <Route
                path="/dashboard-koordinator-lab"
                element={<KoordinatorLabPage />}
              />
            </Route>
          </Route>
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
