import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";
import { get } from "../../utils/api";
import { displayPrice, displayValue } from "./assetView";
import { conditionTone } from "../../utils/dashboardTheme";
const conditionClasses = {
  success: "bg-emerald-50 text-emerald-700",
  info: "bg-blue-50 text-blue-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
};
const button =
  "min-h-11 rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white hover:bg-maroon/90 focus-visible:ring-2 focus-visible:ring-maroon disabled:opacity-50";
export function VerificationView({ asset, privateData }) {
  const fields = [
    ["Nomor inventaris", asset.nomor_inventaris],
    ["Penggunaan", asset.penggunaan],
    ["Kategori", asset.kategori],
    ["Laboratorium", asset.nama_lab],
    ["Lokasi", asset.lokasi],
    ["Kondisi", asset.status],
    ["Spesifikasi", asset.spesifikasi],
  ];
  if (privateData)
    fields.push(
      ["Tahun pengadaan", privateData.tahun_pengadaan],
      ["Sumber dana", privateData.sumber_dana],
      ["Harga beli", displayPrice(privateData.harga_beli)],
    );
  return (
    <>
      <h1 className="break-words text-2xl font-bold text-gray-900">
        {asset.nama_perangkat}
      </h1>
      <dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
        {fields.map(([name, value]) => (
          <div className="min-w-0 rounded-lg bg-gray-50 p-4" key={name}>
            <dt className="text-sm font-medium text-gray-500">{name}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900">
              {name === "Kondisi" ? (
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${conditionClasses[conditionTone(value)]}`}>
                  {displayValue(value)}
                </span>
              ) : displayValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
export default function AssetVerification() {
  const { publicId } = useParams();
  const { state: user } = useContext(AuthContext);
  const [attempt, setAttempt] = useState(0),
    [result, setResult] = useState(null),
    [financial, setFinancial] = useState(null),
    [privateAttempt, setPrivateAttempt] = useState(0);
  const validPublicId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(publicId);
  // Auth reducer creates a new state for login/logout/loading, including same-user
  // sessions. Use an opaque identity, never a token-bearing string or storage key.
  const owner = useMemo(() => ({ publicId, auth: user }), [publicId, user]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    (async () => {
      try {
        if (!validPublicId)
          throw Object.assign(Error("Identitas QR tidak valid."), {
            status: 400,
          });
        const base = (import.meta.env?.VITE_BASE_URL || "/api").replace(
          /\/$/,
          "",
        );
        const response = await fetch(`${base}/asset-qr/${encodeURIComponent(publicId)}`, {
          cache: "no-store",
          credentials: "omit",
          signal: controller.signal,
        });
        const json = await response.json();
        if (!response.ok)
          throw Object.assign(Error(json.message || "Gagal memuat aset."), {
            status: response.status,
          });
        if (active) setResult({ id: publicId, attempt, data: json.data });
      } catch (e) {
        if (active)
          setResult({
            id: publicId,
            attempt,
            error: e.message,
            status: e.status,
          });
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [publicId, validPublicId, attempt]);
  useEffect(() => {
    let active = true;
    if (validPublicId && user?.isAuthenticated && !user?.isLoading) {
      get(`/asset-qr/${encodeURIComponent(publicId)}/private`)
        .then((r) => {
          if (active)
            setFinancial({ owner, attempt: privateAttempt, data: r.data });
        })
        .catch(() => {
          if (active)
            setFinancial({
              owner,
              attempt: privateAttempt,
              error:
                "Data pengadaan tidak dapat dimuat. Periksa sesi login Anda.",
            });
        });
    }
    return () => {
      active = false;
    };
  }, [publicId, validPublicId, owner, user?.isAuthenticated, user?.isLoading, privateAttempt]);
  const current =
    result?.id === publicId && result?.attempt === attempt ? result : null;
  const privateResult =
    user?.isAuthenticated &&
    financial?.owner === owner &&
    financial?.attempt === privateAttempt
      ? financial
      : null;
  return (
    <main className="min-h-dvh bg-gray-100 px-3 py-6 sm:px-6">
      <section className="mx-auto min-w-0 max-w-3xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-7">
        <p className="mb-3 text-sm font-semibold text-maroon">
          Verifikasi Aset IT Sekolah
        </p>
        {!current ? (
          <div
            role="status"
            aria-label="Memuat verifikasi"
            className="animate-pulse space-y-4 motion-reduce:animate-none"
          >
            <div className="h-7 w-3/4 rounded bg-gray-200" />
            <div className="h-40 rounded bg-gray-100" />
            <span className="sr-only">Memuat aset…</span>
          </div>
        ) : current.error ? (
          <div role="alert">
            <h1 className="text-xl font-bold text-gray-900">
              {current.status === 404
                ? "Aset tidak ditemukan"
                : current.status === 400
                  ? "QR tidak valid"
                  : "Verifikasi belum tersedia"}
            </h1>
            <p className="my-4 break-words text-sm text-gray-600">
              {current.error}
            </p>
            <button className={button} onClick={() => setAttempt((v) => v + 1)}>
              Coba lagi
            </button>
          </div>
        ) : (
          <>
            <VerificationView
              asset={current.data}
              privateData={privateResult?.data}
            />
            <div className="mt-5 border-t border-gray-200 pt-4 text-sm text-gray-600">
              {user?.isAuthenticated ? (
                <>
                  {!privateResult && (
                    <p role="status">Memuat data pengadaan…</p>
                  )}
                  {privateResult?.error && (
                    <div role="alert">
                      <p>{privateResult.error}</p>
                      <button
                        className={`${button} mt-3`}
                        onClick={() => setPrivateAttempt((v) => v + 1)}
                      >
                        Muat ulang pengadaan
                      </button>
                    </div>
                  )}
                  <Link
                    className="mt-3 inline-flex min-h-11 items-center text-maroon underline"
                    to="/aset-it"
                  >
                    Buka inventaris aset
                  </Link>
                </>
              ) : (
                <>
                  <p>
                    Identitas dan spesifikasi dapat dilihat publik. Data
                    pengadaan hanya tersedia setelah login.
                  </p>
                  <Link
                    to="/login"
                    className={`${button} mt-3 inline-flex items-center`}
                  >
                    Login untuk data pengadaan
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
