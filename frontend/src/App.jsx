import { lazy } from "react";
import RouteBoundary from "./Components/RouteBoundary";
import DashboardLayout from "./Layouts/DashboardLayout";
// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./Context/AuthContext";
import { ProtectedRoute, RoleRoute } from "./utils/Middleware/ProtectedRoute";

// Pages
import LoginPage from "./pages/authentication/authLoginCover";
const AdminPage = lazy(() => import("./pages/admin/AdminDashboard"));
const GuruPage = lazy(() => import("./pages/Guru/GuruDashboard"));
const TeknisiPage = lazy(() => import("./pages/Teknisi/TeknisiDashboard"));
const KoordinatorLabPage = lazy(() => import("./pages/KoordinatorLab/KoordinatorLabDashboard"));
const KepalaLabPage = lazy(() => import("./pages/KepalaLab/KepalaLabDashboard"));

// Features
const User = lazy(() => import("./features/KelolaUser/User"));
const AddUser = lazy(() => import("./Components/User/AddUser"));
const Pengumuman = lazy(() => import("./features/KelolaPengumuman/Pengumuman"));
const AddPengumuman = lazy(() => import("./Components/Pengumuman/AddPengumuman"));
const Lab = lazy(() => import("./features/KelolaLaboratorium/Laboratorium"));
const AddLaboratorium = lazy(() => import("./Components/DataLab/AddLabaratorium"));

const Pengecekan = lazy(() => import("./features/KelolaPengecekan/PengecekanPerangkat"));
const AddPengecekan = lazy(() => import("./Components/Pengecekan/AddPengecekan"));

const Perbaikan = lazy(() => import("./features/KelolaPerbaikan/Perbaikan"));

const Perangkat = lazy(() => import("./features/KelolaDataPerangkat/Perangkat"));
const AddPerangkat = lazy(() => import("./Components/Perangkat/AddPerangkat"));
const AddPemeriksaan = lazy(() => import("./Components/Pemeriksaan/AddPemeriksaan"));
const Pemeriksaan = lazy(() => import("./features/PemeriksaanPerangkat/Pemeriksaan"));

const PengajuanJadwalLab = lazy(() => import("./features/KelolaJadwalLab/PengajuanJadwalLab"));
const JadwalLab = lazy(() => import("./features/LihatJadwalLab/JadwalLab"));

const PengajuanJadwalLabPageGuru = lazy(() => import("./features/PengajuanJadwalLab/PengajuanJadwalLab"));
const AddJadwalLab = lazy(() => import("./Components/KelolaJadwalLab/AddJadwalLab"));
const PengecekanStatus = lazy(() => import("./Components/KelolaJadwalLab/PengecekanStatus"));

const PengumumanDetailPage = lazy(() => import("./pages/Pengumuman/PengumumanDetailPage"));
const Pengaturan = lazy(() => import("./features/Pengaturan/Pengaturan"));
const LogAktivitas = lazy(() => import("./features/LogAktivitas/LogAktivitas"));
const Ticketing = lazy(() => import("./features/Ticketing/Ticketing"));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RouteBoundary />}>
          {/* Public */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/pengumuman/:id" element={<PengumumanDetailPage />} />
          </Route>
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            {/* Akses Umum yang login disini*/}
            <Route path="/ticketing" element={<Ticketing />} />

            {/* Admin Only */}
            <Route element={<RoleRoute allowedRoles={["Admin"]} />}>
              <Route path="/dashboard" element={<AdminPage />} />
              <Route path="/pengaturan" element={<Pengaturan />} />
              <Route path="/log-aktivitas" element={<LogAktivitas />} />
              <Route path="/user" element={<User />} />
              <Route path="/add-user" element={<AddUser />} />
            </Route>

            {/* Shared: Admin + Koordinator Lab */}
            <Route
              element={
                <RoleRoute allowedRoles={["Admin", "Koordinator Lab"]} />
              }
            >
              <Route path="/kelola/data-lab" element={<Lab />} />
              <Route path="/add-laboratorium" element={<AddLaboratorium />} />
              <Route path="/kelola-pengumuman" element={<Pengumuman />} />
              <Route path="/add-pengumuman" element={<AddPengumuman />} />
              <Route path="/add-pengecekan" element={<AddPengecekan />} />
            </Route>

            {/* Koordinator Lab */}
            <Route element={<RoleRoute allowedRoles={["Koordinator Lab"]} />}>
              <Route
                path="/dashboard-koordinator-lab"
                element={<KoordinatorLabPage />}
              />
            </Route>
          {/* Shared: Admin + Kepala Lab */}
          <Route element={<RoleRoute allowedRoles={["Admin", "Kepala Lab"]} />}>
            <Route path="/kelola-perangkat" element={<Perangkat />} />
            <Route path="/add-perangkat" element={<AddPerangkat />} />
            <Route path="/add-pemeriksaan" element={<AddPemeriksaan />} />
            <Route
              path="/kelola-pemeriksaan-perangkat"
              element={<Pemeriksaan />}
            />

            <Route path="/kelola-jadwal-lab" element={<PengajuanJadwalLab />} />
          </Route>

          {/*Kepala Lab*/}
          <Route element={<RoleRoute allowedRoles={["Kepala Lab"]} />}>
            <Route path="/dashboard-kepala-lab" element={<KepalaLabPage />} />
          </Route>

          {/* Admin. Kepala Lab, guru*/}
          <Route
            element={
              <RoleRoute allowedRoles={["Admin", "Guru", "Kepala Lab"]} />
            }
          >
            <Route path="/jadwal-lab" element={<JadwalLab />} />
          </Route>

          {/* Guru */}
          <Route element={<RoleRoute allowedRoles={["Guru"]} />}>
            <Route path="/pengajuan-jadwal-lab" element={<AddJadwalLab />} />
            <Route path="/dashboard-guru" element={<GuruPage />} />
            <Route path="/jadwal-lab" element={<JadwalLab />} />
            <Route
              path="/pengajuan-jadwal-lab/status"
              element={<PengecekanStatus />}
            />
          </Route>

          {/* Teknisi */}
          <Route element={<RoleRoute allowedRoles={["Admin", "Teknisi"]} />}>
            <Route path="/kelola-pengecekan" element={<Pengecekan />} />
            <Route path="/kelola-perbaikan" element={<Perbaikan />} />
          </Route>
          {/*Teknisi*/}
          <Route element={<RoleRoute allowedRoles={["Teknisi"]} />}>
            <Route path="/dashboard-teknisi" element={<TeknisiPage />} />
          </Route>

          {/* Fallback */}
          </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
