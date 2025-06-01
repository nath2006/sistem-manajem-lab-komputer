// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./Context/AuthContext";
import { ProtectedRoute, RoleRoute } from "./utils/Middleware/ProtectedRoute";

// Pages
import LoginPage from "./pages/authentication/authLoginCover";
import AdminPage from "./pages/admin/AdminDashboard";
import GuruPage from "./pages/Guru/GuruDashboard";
import TeknisiPage from "./pages/Teknisi/TeknisiDashboard";
import KoordinatorLabPage from "./pages/KoordinatorLab/KoordinatorLabDashboard";
import KepalaLabPage from "./pages/KepalaLab/KepalaLabDashboard";

// Features
import User from "./features/KelolaUser/User";
import AddUser from "./Components/User/AddUser";
import Pengumuman from "./features/KelolaPengumuman/Pengumuman";
import AddPengumuman from "./Components/Pengumuman/AddPengumuman";
import Lab from "./features/KelolaLaboratorium/Laboratorium";
import AddLaboratorium from "./Components/DataLab/AddLabaratorium";

import Pengecekan from "./features/KelolaPengecekan/PengecekanPerangkat";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            
            {/* Akses Umum yang login disini*/}
            
            

            {/* Admin Only */}
            <Route element={<RoleRoute allowedRoles={["Admin"]} />}>
              <Route path="/dashboard" element={<AdminPage />} />
              <Route path="/user" element={<User />} />
              <Route path="/add-user" element={<AddUser />} />
            </Route>

            {/* Shared: Admin + Koordinator Lab */}
            <Route element={<RoleRoute allowedRoles={["Admin", "Koordinator Lab"]} />}>
              <Route path="/kelola/data-lab" element={<Lab />} />
              <Route path="/add-laboratorium" element={<AddLaboratorium />} />
              <Route path="/kelola-pengumuman" element={<Pengumuman />} />
              <Route path="/add-pengumuman" element={<AddPengumuman />} />
            </Route>

            {/* Kepala Lab */}
            <Route element={<RoleRoute allowedRoles={["Kepala Lab"]} />}>
              <Route path="/dashboard-kepala-lab" element={<KepalaLabPage />} />
            </Route>

            {/* Guru */}
            <Route element={<RoleRoute allowedRoles={["Guru"]} />}>
              <Route path="/dashboard-guru" element={<GuruPage />} />
            </Route>

            {/* Teknisi */}
            <Route element={<RoleRoute allowedRoles={["Admin","Teknisi"]} />}>
              <Route path="/kelola-pengecekan" element={<Pengecekan />} />
              <Route path="/dashboard-teknisi" element={<TeknisiPage />} />
            </Route>

            {/* Koordinator Lab */}
            <Route element={<RoleRoute allowedRoles={["Koordinator Lab"]} />}>
              <Route path="/dashboard-koordinator-lab" element={<KoordinatorLabPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
