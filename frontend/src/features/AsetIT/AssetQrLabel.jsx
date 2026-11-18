import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../Context/AuthContext";
import { useSettings } from "../../Context/SettingsContext";
import { getDocumentBranding } from "../../utils/documentBranding";
import { get, post } from "../../utils/api";
import {
  createLabelPrintJob,
  encodeQr,
  isLoopback,
  verificationUrl,
} from "./assetQr";
const button =
  "min-h-11 rounded-lg bg-maroon px-4 py-2 text-sm font-semibold text-white hover:bg-maroon/90 focus-visible:ring-2 focus-visible:ring-maroon disabled:opacity-50";
export default function AssetQrLabel({ asset }) {
  const { state: user } = useContext(AuthContext) || {};
  const { settings, logoSrc } = useSettings();
  const branding = getDocumentBranding(settings, logoSrc);
  const [failedLogo, setFailedLogo] = useState("");
  const [identity, setIdentity] = useState(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [image, setImage] = useState(""),
    [notice, setNotice] = useState("");
  const [base, setBase] = useState(
      () =>
        import.meta.env?.VITE_QR_PUBLIC_ORIGIN ||
        (typeof window === "undefined"
          ? ""
          : window.location.origin + (import.meta.env?.BASE_URL || "/")),
    ),
    [preview, setPreview] = useState(false),
    [copies, setCopies] = useState(1);
  const print = useMemo(() => createLabelPrintJob(), []);
  useEffect(() => {
    let active = true;
    get(`/asset-qr/identity/${asset.perangkat_id}`)
      .then((r) => {
        if (active) {
          setIdentity(r.data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message || "QR belum tersedia.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [asset.perangkat_id, attempt]);
  let url = "",
    baseError = "",
    loopback = false;
  try {
    url = verificationUrl(
      identity?.public_id || "00000000-0000-4000-8000-000000000000",
      base,
    );
    loopback = isLoopback(base);
  } catch (e) {
    baseError = e.message;
  }
  useEffect(() => {
    let active = true;
    if (identity?.public_id && url)
      encodeQr(url)
        .then((value) => {
          if (active) setImage(value);
        })
        .catch(() => {
          if (active) setError("Gagal membuat gambar QR. Coba lagi.");
        });
    return () => {
      active = false;
    };
  }, [identity?.public_id, url, attempt]);
  const canIssue =
    user?.role === "Admin" ||
    (user?.role === "Kepala Lab" &&
      asset.penggunaan === "Pembelajaran" &&
      Number(asset.lab_id) === Number(user.lab_id_kepala));
  async function issue() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await post(`/asset-qr/issue/${asset.perangkat_id}`);
      setIdentity(r.data.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function printLabel() {
    if (busy) return;
    setError("");
    setNotice("");
    // Configuration needs an actionable explanation, not a permanently disabled
    // control. The PDF builder independently enforces the same URL safety rules.
    if (baseError) {
      setError(`Perbaiki Alamat publik sekolah: ${baseError}`);
      return;
    }
    if (loopback && !preview) {
      setError("Untuk mencetak, isi Alamat publik sekolah dengan alamat LAN/domain yang dapat dibuka ponsel, atau centang ‘Izinkan pratinjau localhost saja’ untuk PDF uji lokal (bukan label inventaris).");
      return;
    }
    if (!Number.isInteger(copies) || copies < 1 || copies > 24) {
      setError("Isi Jumlah label dengan bilangan bulat 1–24.");
      return;
    }
    setBusy(true);
    try {
      if (
        await print(
          Array.from({ length: copies }, () => ({
            ...asset,
            public_id: identity.public_id,
          })),
          { base, preview, branding },
        )
      )
        setNotice(
          "PDF label dibuka. Gunakan Cetak pada penampil PDF jika dialog tidak terbuka otomatis. Cetak 100% / ukuran aktual.",
        );
    } catch (e) {
      setError(e.message || "Cetak gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="mt-5 min-w-0 rounded-xl border border-gray-200 p-4"
      aria-label="QR dan label"
    >
      <h3 className="font-semibold text-gray-900">QR dan label</h3>
      {loading ? (
        <p role="status" className="mt-3 animate-pulse text-sm text-gray-500">
          Memuat QR…
        </p>
      ) : identity?.public_id ? (
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Alamat publik sekolah
            <input
              aria-label="Alamat publik sekolah"
              type="url"
              className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-gray-300 p-2 font-normal"
              value={base}
              onChange={(e) => {
                setBase(e.target.value);
                setImage("");
              }}
            />
          </label>
          <p className="text-xs text-gray-500">
            Gunakan origin LAN/domain frontend yang dapat dibuka ponsel,
            termasuk base path deployment bila ada. Jangan ubah setelah label
            ditempel.
          </p>
          {baseError && (
            <p role="alert" className="text-sm text-red-700">
              {baseError}
            </p>
          )}
          {loopback && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <p>
                Localhost menunjuk ke ponsel pemindai, bukan komputer ini. Buka
                aplikasi melalui alamat LAN/domain sekolah atau isi alamat
                tersebut di atas. Jangan gunakan label localhost untuk
                inventaris.
              </p>
              <label className="mt-2 flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={preview}
                  onChange={(e) => setPreview(e.target.checked)}
                />
                Izinkan pratinjau localhost saja
              </label>
            </div>
          )}
          {image && !baseError && (
            <figure className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-2 flex min-w-0 items-center justify-center gap-3">
                {branding.logoSrc && <img src={branding.logoSrc} alt="Logo institusi" crossOrigin="anonymous" onError={() => setFailedLogo(branding.logoSrc)} onLoad={() => setFailedLogo("")} className="h-12 w-16 shrink-0 object-contain" />}
                <div className="min-w-0 text-center">
                  <p className="break-words text-sm font-semibold text-gray-900">{branding.schoolName}</p>
                  <p className="break-words text-xs text-gray-600">{branding.systemName}</p>
                </div>
              </div>
              {!branding.logoSrc && <p className="mb-2 text-center text-xs text-amber-900">Logo belum diatur di Pengaturan; label dicetak tanpa logo.</p>}
              {branding.logoSrc && failedLogo === branding.logoSrc && <p role="alert" className="mb-2 text-center text-xs text-red-700">Logo institusi gagal dimuat. Periksa logo di Pengaturan dan akses gambar/CORS. Cetak label PDF akan mencoba memuat logo kembali.</p>}
              <img
                src={image}
                width="180"
                height="180"
                className="mx-auto max-w-full"
                alt={`QR ${asset.nama_perangkat}`}
              />
              <figcaption className="space-y-1 text-center text-sm text-gray-800">
                <p className="break-words font-semibold">
                  {asset.nama_perangkat}
                </p>
                <p className="break-words">
                  {asset.nomor_inventaris || "-"} · {asset.kategori}
                </p>
                <p className="break-all font-mono text-xs">
                  {identity.public_id}
                </p>
              </figcaption>
            </figure>
          )}
          {!baseError && (
            <a
              className="inline-flex min-h-11 items-center break-all text-sm text-maroon underline"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Buka halaman verifikasi
            </a>
          )}
          <label className="block text-sm text-gray-700">
            Jumlah label (1–24)
            <input
              aria-label="Jumlah label"
              type="number"
              min="1"
              max="24"
              value={copies}
              onChange={(e) =>
                setCopies(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="ml-3 min-h-11 w-20 rounded-lg border border-gray-300 p-2"
            />
          </label>
          {(!Number.isInteger(copies) || copies < 1 || copies > 24) && (
            <p role="status" className="text-sm text-red-700">
              Isi Jumlah label dengan bilangan bulat 1–24 agar cetak aktif.
            </p>
          )}
          {loopback && !preview && (
            <p className="text-sm text-amber-900">
              Cetak memerlukan alamat LAN/domain sekolah atau persetujuan pratinjau localhost di atas.
            </p>
          )}
          <button
            type="button"
            className={button}
            onClick={printLabel}
            disabled={
              busy ||
              !Number.isInteger(copies) ||
              copies < 1 ||
              copies > 24
            }
          >
            {busy ? "Menyiapkan…" : "Cetak label PDF"}
          </button>
          <p className="text-xs text-gray-500">
            A4, label 90 × 50 mm, 10 per halaman. Logo institusi (jika diatur), nama institusi dan sistem, nama perangkat, inventaris, kategori, QR
            dan identitas terbaca; tanpa data pengadaan.
          </p>
        </div>
      ) : (
        !loading && (
          <div className="mt-3 text-sm text-gray-600">
            <p>
              QR belum diterbitkan. Identitas diterbitkan sekali dan tetap sama.
            </p>
            {canIssue ? (
              <button
                type="button"
                className={`${button} mt-3`}
                disabled={busy}
                onClick={issue}
              >
                {busy ? "Menyiapkan…" : "Terbitkan QR"}
              </button>
            ) : (
              <p className="mt-2">
                Minta Admin atau Kepala Lab penanggung jawab menerbitkan QR.
              </p>
            )}
          </div>
        )
      )}
      {error && (
        <div role="alert" className="mt-3 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 min-h-11 rounded-lg border border-gray-300 px-4 text-gray-700"
            disabled={busy}
            onClick={() => {
              setLoading(true);
              setAttempt((v) => v + 1);
            }}
          >
            Muat ulang QR
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-green-700">
          {notice}
        </p>
      )}
    </section>
  );
}
