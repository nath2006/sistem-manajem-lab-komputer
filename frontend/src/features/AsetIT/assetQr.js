import { getDocumentBranding, loadDocumentLogo, SYSTEM_NAME } from "../../utils/documentBranding.js";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function verificationUrl(publicId, base) {
  if (!uuidPattern.test(publicId)) throw Error("Identitas QR tidak valid.");
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error(
      "Gunakan alamat HTTP/HTTPS sekolah tanpa kredensial, query atau fragmen.",
    );
  url.pathname =
    url.pathname.replace(/\/$/, "") + "/verifikasi-aset/" + publicId;
  return url.href;
}
export function isLoopback(base) {
  const url = new URL(base);
  if (!["http:", "https:"].includes(url.protocol))
    throw Error("Gunakan alamat HTTP/HTTPS sekolah.");
  // WHATWG URL canonicalizes abbreviated IPv4 and IPv4-mapped IPv6.
  const h = url.hostname.toLowerCase().replace(/\.+$/, "");
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    /^127\./.test(h) ||
    h === "[::1]" ||
    /^\[::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}\]$/.test(h) ||
    h === "0.0.0.0"
  );
}
export async function buildLabelPdf(labels, { base, preview = false, branding = getDocumentBranding() } = {}) {
  if (!Array.isArray(labels) || !labels.length || labels.length > 100)
    throw Error("Pilih 1–100 label.");
  if (isLoopback(base) && !preview)
    throw Error(
      "Gunakan alamat LAN/domain sekolah; localhost mengarah ke ponsel pemindai.",
    );
  const brand = { ...getDocumentBranding(), ...branding, systemName: SYSTEM_NAME };
  const logo = await loadDocumentLogo(brand.logoSrc);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  for (let i = 0; i < labels.length; i++) {
    if (i && i % 10 === 0) pdf.addPage();
    const label = labels[i],
      url = verificationUrl(label.public_id, base);
    const x = 10 + (i % 2) * 95,
      y = 10 + (Math.floor(i / 2) % 5) * 54;
    pdf.setDrawColor(180);
    pdf.rect(x, y, 90, 50);
    pdf.setTextColor(25);
    const headerX = x + (logo ? 16 : 3);
    if (logo) {
      const scale = Math.min(11 / logo.width, 8 / logo.height);
      const w = logo.width * scale, h = logo.height * scale;
      pdf.addImage(logo.dataUrl, "PNG", x + 3 + (11 - w) / 2, y + 1 + (8 - h) / 2, w, h);
    }
    pdf.setFontSize(7);
    pdf.text(pdf.splitTextToSize(brand.schoolName, logo ? 71 : 84).slice(0, 2), headerX, y + 3.5);
    pdf.setFontSize(5.5);
    pdf.text(SYSTEM_NAME, headerX, y + 9);
    pdf.addImage(await encodeQr(url), "PNG", x + 2, y + 10, 30, 30);
    pdf.setTextColor(25);
    pdf.setFontSize(9);
    pdf.text(
      pdf.splitTextToSize(String(label.nama_perangkat || "-"), 53).slice(0, 3),
      x + 34,
      y + 15,
    );
    pdf.setFontSize(7);
    pdf.text(
      pdf
        .splitTextToSize(String(label.nomor_inventaris || "-"), 53)
        .slice(0, 2),
      x + 34,
      y + 27,
    );
    pdf.text(
      pdf.splitTextToSize(String(label.kategori || "-"), 53).slice(0, 2),
      x + 34,
      y + 34,
    );
    pdf.setFontSize(6);
    pdf.text(label.public_id, x + 3, y + 42);
    pdf.setFontSize(5);
    pdf.text(pdf.splitTextToSize(url, 84).slice(0, 2), x + 3, y + 44.5);
    if (preview && isLoopback(base)) {
      pdf.setFontSize(4.5);
      pdf.text(
        "PRATINJAU LOCALHOST — bukan untuk pemindaian ponsel",
        x + 3,
        y + 49,
      );
    }
  }
  pdf.autoPrint();
  return pdf;
}
function showPdf(pdf, popup) {
  const url = URL.createObjectURL(pdf.output("blob"));
  try {
    popup.location.replace(url);
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  // A PDF belongs to its viewer, not to the mounted asset detail or a time limit.
  // Keep older jobs printable while newer viewers open; release only this URL
  // when its viewer closes. Document teardown also releases owned Blob URLs.
  const releaseWhenClosed = () => {
    let closed = false;
    try {
      // WindowProxy.closed can throw after browser isolation/navigation changes.
      closed = popup.closed;
    } catch {
      // An unreadable handle is not evidence that the viewer has closed.
    }
    if (closed) URL.revokeObjectURL(url);
    else setTimeout(releaseWhenClosed, 1000);
  };
  releaseWhenClosed();
}
export function createLabelPrintJob({
  open = () => window.open("about:blank", "_blank"),
  build = buildLabelPdf,
  print = showPdf,
} = {}) {
  let busy = false;
  return async (labels, options) => {
    if (busy) return false;
    busy = true;
    let popup;
    try {
      popup = open();
      if (!popup)
        throw Error("Jendela cetak diblokir. Izinkan pop-up lalu coba lagi.");
      const pdf = await build(labels, options);
      await print(pdf, popup);
      return true;
    } catch (e) {
      popup?.close();
      throw e;
    } finally {
      busy = false;
    }
  };
}
export async function encodeQr(url) {
  const { default: QRCode } = await import("qrcode");
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 512,
    type: "image/png",
    color: { dark: "#000000", light: "#ffffff" },
  });
}
