import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Cookies from "js-cookie";
import { AuthContext } from "../../../frontend/src/Context/AuthContext";
import AssetVerification from "../../../frontend/src/features/AsetIT/AssetVerification";
import AssetDetail from "../../../frontend/src/features/AsetIT/AssetDetail";
import api from "../../../frontend/src/utils/api";
import {
  buildLabelPdf,
  encodeQr,
  verificationUrl,
  createLabelPrintJob,
} from "../../../frontend/src/features/AsetIT/assetQr";
import "../../../frontend/src/index.css";
const params = new URLSearchParams(location.search),
  session = await (await fetch("/__qr_session")).json();
window.fixtureIdentity = "feature2-qr-isolated";
window.fixtureErrors = [];
window.addEventListener("error", (e) => window.fixtureErrors.push(e.message));
window.addEventListener("unhandledrejection", (e) =>
  window.fixtureErrors.push(String(e.reason)),
);
const authenticated = params.has("auth") || params.get("page") === "label";
if (authenticated) Cookies.set("auth_token", session.token);
else Cookies.remove("auth_token");
api.defaults.baseURL = "/api";
document.documentElement.style.setProperty(
  "--color-maroon",
  params.get("color") || "#2563eb",
);
const asset = authenticated
  ? (await api.get("/assets/" + session.assetId)).data.data
  : null;
const mode = params.get("state");
if (mode) {
  const original = window.fetch;
  window.fetch = (url, options) => {
    if (String(url).includes("/asset-qr/")) {
      if (mode === "loading") return new Promise(() => {});
      const status = mode === "notfound" ? 404 : 503;
      return Promise.resolve(
        new Response(JSON.stringify({ message: "Synthetic " + mode }), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return original(url, options);
  };
}
window.qrReview = {
  publicId: session.publicId,
  database: session.database,
  assetId: session.assetId,
  buildLabelPdf,
  encodeQr,
  verificationUrl,
  createLabelPrintJob,
};
export function Fixture() {
  const [user, setUser] = useState({
    isAuthenticated: authenticated,
    isLoading: false,
    userId: session.userId,
    role: "Admin",
  });
  window.fixtureLogout = () => {
    Cookies.remove("auth_token");
    delete api.defaults.headers.common.Authorization;
    setUser({ isAuthenticated: false, isLoading: false });
  };
  return (
    <AuthContext.Provider value={{ state: user }}>
      <MemoryRouter
        initialEntries={[
          "/verifikasi-aset/" + (params.get("id") || session.publicId),
        ]}
      >
        {params.get("page") === "label" ? (
          <AssetDetail asset={asset} onClose={() => {}} />
        ) : (
          <Routes>
            <Route
              path="/verifikasi-aset/:publicId"
              element={<AssetVerification />}
            />
          </Routes>
        )}
      </MemoryRouter>
    </AuthContext.Provider>
  );
}
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
