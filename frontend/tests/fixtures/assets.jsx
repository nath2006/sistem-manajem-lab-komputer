import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext } from "../../src/Context/AuthContext";
import { SettingsProvider } from "../../src/Context/SettingsContext";
import DashboardLayout from "../../src/Layouts/DashboardLayout";
import AsetIT from "../../src/features/AsetIT/AsetIT";
import Perangkat from "../../src/features/KelolaDataPerangkat/Perangkat";
import api from "../../src/utils/api";
import "../../src/index.css";
const params = new URLSearchParams(location.search),
  role = params.get("role") || "Admin",
  mode = params.get("mode") || "populated";
const user = params.has("real")
  ? window.__assetRealSession.user
  : {
      role,
      fullName: "Pengguna review",
      userId: "asset-review",
      isAuthenticated: true,
      isLoading: false,
      lab_id_kepala: 1,
    };
localStorage.setItem(
  `lab:onboarding:v2:${user.userId}:${encodeURIComponent(user.role)}`,
  "skip",
);
window.fixtureErrors = [];
window.fixtureRequests = [];
window.fixtureIdentity = "assets-feature1-v1";
window.fixtureBoot = crypto.randomUUID();
window.addEventListener("error", (e) => window.fixtureErrors.push(e.message));
window.addEventListener("unhandledrejection", (e) =>
  window.fixtureErrors.push(String(e.reason)),
);
let rows =
  mode === "empty"
    ? []
    : [
        {
          perangkat_id: 1,
          nama_perangkat: "Printer Tata Usaha",
          nomor_inventaris: "REVIEW-001",
          penggunaan: "Operasional",
          kategori: "Printer",
          lab_id: null,
          nama_lab: null,
          lokasi: "Tata usaha",
          spesifikasi: "Printer jaringan sekolah",
          status: "Baik",
          tahun_pengadaan: null,
          sumber_dana: null,
          harga_beli: null,
        },
        {
          perangkat_id: 2,
          nama_perangkat: "Router Lab",
          nomor_inventaris: "REVIEW-002",
          penggunaan: "Pembelajaran",
          kategori: "Perangkat Jaringan",
          lab_id: 1,
          nama_lab: "Laboratorium review",
          lokasi: null,
          spesifikasi: "Router switch AP",
          status: "Baik",
          tahun_pengadaan: 2020,
          sumber_dana: "BOS",
          harga_beli: "0.00",
        },
      ];
if (params.has("real")) {
  api.defaults.baseURL = window.__assetRealSession.origin + "/api";
  api.defaults.headers.common.Authorization = `Bearer ${window.__assetRealSession.token}`;
} else
  api.defaults.adapter = async (config) => {
    const url = config.url,
      method = config.method,
      body =
        typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    window.fixtureRequests.push({ url, method, body });
    let data;
    if (url === "/settings/public")
      data = {
        school_name: "Sekolah Review Aset IT",
        logo_url: "",
        primary_color: params.get("color") || "#2563eb",
        schedule_start: "07:00",
        schedule_end: "17:00",
        lesson_duration: 60,
      };
    else if (url === "/lab")
      data = [{ lab_id: 1, nama_lab: "Laboratorium review", kepala_lab_id: 1 }];
    else if (url === "/assets" && method === "get") {
      if (mode === "loading") await new Promise(() => {});
      if (mode === "error")
        throw Object.assign(
          Error("Skema Aset IT belum tersedia. Gunakan database review."),
          {
            response: {
              status: 503,
              data: {
                code: "ASSET_SCHEMA_REQUIRED",
                message:
                  "Skema Aset IT belum tersedia. Gunakan database review.",
              },
            },
          },
        );
      await new Promise((r) => setTimeout(r, 100));
      data = rows;
    } else if (url === "/perangkat") data = rows;
    else if (url === "/assets" && method === "post") {
      data = {
        ...body,
        perangkat_id: 3,
        status: "Baik",
        nama_lab: body.lab_id ? "Laboratorium review" : null,
      };
      rows = [...rows, data];
    } else if (url.startsWith("/assets/") && method === "put") {
      const id = Number(url.split("/").at(-1));
      data = { ...rows.find((r) => r.perangkat_id === id), ...body };
      rows = rows.map((r) => (r.perangkat_id === id ? data : r));
    } else if (url.startsWith("/deletion/"))
      data = {
        resource: "perangkat",
        id: Number(url.split("/").at(-1)),
        label: "Aset review",
        can_delete: true,
        blockers: [],
        message: "Data dapat dihapus.",
      };
    else if (url.startsWith("/assets/") && method === "delete") {
      rows = rows.filter(
        (r) => r.perangkat_id !== Number(url.split("/").at(-1)),
      );
    } else throw Error("Unexpected fixture API request: " + url);
    return {
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: { data, message: "Aset tersimpan." },
    };
  };
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthContext.Provider value={{ state: user, dispatch: () => {} }}>
      <SettingsProvider>
        <MemoryRouter
          initialEntries={[
            params.get("legacy") ? "/kelola-perangkat" : "/aset-it",
          ]}
        >
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="/aset-it" element={<AsetIT />} />
              <Route path="/kelola-perangkat" element={<Perangkat />} />
              <Route path="*" element={<p>Halaman navigasi review</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </SettingsProvider>
    </AuthContext.Provider>
  </StrictMode>,
);
