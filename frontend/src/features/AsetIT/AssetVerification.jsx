import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AuthContext } from "../../Context/AuthContext";
import { get } from "../../utils/api";
import { displayPrice, displayValue } from "./assetView";

/* ───────────── Token (sama dengan desain sistem sebelumnya) ───────────── */
const button =
  "min-h-11 rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white hover:bg-maroon/90 focus-visible:ring-2 focus-visible:ring-maroon disabled:opacity-50";
// Varian tombol lebar penuh untuk bar bawah (token warna tetap dari `button`)
const buttonBlock = `${button} inline-flex w-full items-center justify-center min-h-12 text-base`;
const card =
  "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7";
const labelClass =
  "text-[11px] font-semibold uppercase tracking-wider text-gray-500";
const valueClass =
  "mt-1 whitespace-pre-wrap break-words text-base font-semibold text-gray-900";

/* ───────────── Ikon inline ───────────── */
function CheckIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
function LockIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}
function AlertIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 7.5v5.5M12 16.5v.01" />
      <circle cx="12" cy="12" r="9.5" />
    </svg>
  );
}

/* ───────────── Badge kondisi (warna semantik status, bukan warna tema) ───────────── */
function conditionTone(status) {
  const v = String(status || "").toLowerCase();
  if (/rusak|hilang|tidak/.test(v)) return "bg-red-50 text-red-700 ring-red-200";
  if (/dalam\s+perbaikan/.test(v)) return "bg-blue-50 text-blue-700 ring-blue-200";
  if (/perlu|perbaikan|servis/.test(v)) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (/baik/.test(v)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-gray-100 text-gray-600 ring-gray-200";
}
function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${conditionTone(status)}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {displayValue(status)}
    </span>
  );
}

/* ───────────── Daftar field (label kecil + nilai besar) ───────────── */
function FieldGrid({ fields }) {
  return (
    <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-5">
      {fields.map(([name, value, wide]) => (
        <div
          key={name}
          className={`min-w-0 ${wide ? "col-span-2" : "col-span-2 sm:col-span-1"}`}
        >
          <dt className={labelClass}>{name}</dt>
          <dd className={valueClass}>{displayValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function VerificationView({ asset, privateData }) {
  const fields = [
    ["Nomor inventaris", asset.nomor_inventaris],
    ["Penggunaan", asset.penggunaan],
    ["Kategori", asset.kategori],
    ["Laboratorium", asset.nama_lab],
    ["Lokasi", asset.lokasi],
    ["Kondisi", asset.status],
    ["Spesifikasi", asset.spesifikasi, true],
  ];
  const procurement = privateData
    ? [
        ["Tahun pengadaan", privateData.tahun_pengadaan],
        ["Sumber dana", privateData.sumber_dana],
        ["Harga beli", displayPrice(privateData.harga_beli), true],
      ]
    : null;

  return (
    <>
      {/* Hero */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-maroon/10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-maroon text-white shadow-lg shadow-maroon/30">
            <CheckIcon />
          </div>
        </div>
        <p className="mt-5 text-sm font-semibold text-maroon">
          Aset terverifikasi
        </p>
        <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-gray-900">
          {asset.nama_perangkat}
        </h1>
        <div className="mt-3">
          <StatusBadge status={asset.status} />
        </div>
      </div>

      {/* Detail publik */}
      <section className={`${card} mt-8`} aria-label="Detail aset">
        <h2 className="mb-5 text-sm font-bold text-gray-900">Detail aset</h2>
        <FieldGrid fields={fields} />
      </section>

      {/* Data pengadaan (hanya setelah login) */}
      {procurement && (
        <section className={`${card} mt-4`} aria-label="Data pengadaan">
          <h2 className="mb-5 text-sm font-bold text-gray-900">
            Data pengadaan
          </h2>
          <FieldGrid fields={procurement} />
        </section>
      )}
    </>
  );
}

/* ───────────── Bar aksi bawah ───────────── */
function ActionBar({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-gray-100/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
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

  const showActionBar = current && !current.error;

  return (
    <main className="min-h-dvh bg-gray-100 px-4 pb-32 pt-8 sm:pt-12">
      <div className="mx-auto min-w-0 max-w-xl">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-500">
          Verifikasi Aset IT Sekolah
        </p>

        {!current ? (
          /* Loading skeleton */
          <div
            role="status"
            aria-label="Memuat verifikasi"
            className="animate-pulse motion-reduce:animate-none"
          >
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 rounded-full bg-gray-200" />
              <div className="mt-6 h-8 w-2/3 rounded-lg bg-gray-200" />
              <div className="mt-3 h-7 w-28 rounded-full bg-gray-200" />
            </div>
            <div className={`${card} mt-8 space-y-5`}>
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 rounded bg-gray-100" />
                    <div className="h-5 w-28 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
            <span className="sr-only">Memuat aset…</span>
          </div>
        ) : current.error ? (
          /* Error state */
          <div role="alert" className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-50">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30">
                <AlertIcon />
              </div>
            </div>
            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              {current.status === 404
                ? "Aset tidak ditemukan"
                : current.status === 400
                  ? "QR tidak valid"
                  : "Verifikasi belum tersedia"}
            </h1>
            <p className="mb-6 mt-2 max-w-sm break-words text-sm text-gray-600">
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

            {/* Kartu data pengadaan: terkunci / memuat / error */}
            {!user?.isAuthenticated && (
              <section
                className={`${card} mt-4 flex items-start gap-4`}
                aria-label="Data pengadaan terkunci"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon">
                  <LockIcon />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-gray-900">
                    Data pengadaan
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Identitas dan spesifikasi dapat dilihat publik. Data
                    pengadaan hanya tersedia setelah login.
                  </p>
                </div>
              </section>
            )}
            {user?.isAuthenticated && !privateResult && (
              <section
                role="status"
                className={`${card} mt-4 animate-pulse motion-reduce:animate-none`}
              >
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="mt-4 h-5 w-48 rounded bg-gray-100" />
                <span className="sr-only">Memuat data pengadaan…</span>
              </section>
            )}
            {user?.isAuthenticated && privateResult?.error && (
              <section role="alert" className={`${card} mt-4`}>
                <p className="text-sm text-gray-700">{privateResult.error}</p>
                <button
                  className={`${button} mt-4`}
                  onClick={() => setPrivateAttempt((v) => v + 1)}
                >
                  Muat ulang pengadaan
                </button>
              </section>
            )}
          </>
        )}
      </div>

      {showActionBar && (
        <ActionBar>
          {user?.isAuthenticated ? (
            <Link to="/aset-it" className={buttonBlock}>
              Buka inventaris aset
            </Link>
          ) : (
            <Link to="/login" className={buttonBlock}>
              Login untuk data pengadaan
            </Link>
          )}
        </ActionBar>
      )}
    </main>
  );
}