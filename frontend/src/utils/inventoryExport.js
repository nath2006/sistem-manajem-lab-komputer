import { loadPdfTools } from './loadPdfTools.js';
import { dashboardTokens, foreground } from './dashboardTheme.js';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const text = value => value === null || value === undefined || value === '' ? '-' : String(value);
const definitions = {
  assets: [
    ['No. inventaris', r => r.nomor_inventaris], ['Nama aset', r => r.nama_perangkat],
    ['Penggunaan', r => r.penggunaan], ['Kategori', r => r.kategori],
    ['Lab / lokasi', r => [r.nama_lab, r.lokasi].filter(v => v !== null && v !== undefined && v !== '').join(' / ')],
    ['Kondisi', r => r.status], ['Tahun pengadaan', r => r.tahun_pengadaan],
    ['Sumber dana', r => r.sumber_dana], ['Harga beli', r => r.harga_beli],
    ['Spesifikasi', r => r.spesifikasi],
  ],
  lab: [
    ['No. inventaris', r => r.nomor_inventaris], ['Nama perangkat', r => r.nama_perangkat],
    ['Laboratorium', r => r.nama_lab], ['Status', r => r.status], ['Spesifikasi', r => r.spesifikasi],
  ],
};

// Project only explicitly allowed fields synchronously, before loading libraries/logos.
function snapshot(rows, options = {}) {
  const kind = options.kind ?? 'assets';
  if (!Object.hasOwn(definitions, kind)) throw new TypeError('Jenis inventaris tidak valid');
  if (!Array.isArray(rows) || !rows.length) throw new TypeError('Tidak ada data inventaris untuk diekspor');
  const columns = definitions[kind];
  const branding = options.branding ?? {};
  const color = /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(branding.primaryColor ?? '') ? branding.primaryColor : '#800000';
  const primaryColor = color.length === 4 ? '#' + [...color.slice(1)].map(value => value + value).join('') : color;
  return {
    kind,
    title: text(options.title ?? (kind === 'assets' ? 'Inventaris Aset IT Operasional' : 'Inventaris Perangkat Laboratorium')),
    schoolName: text(branding.schoolName), systemName: text(branding.systemName),
    logoSrc: typeof branding.logoSrc === 'string' ? branding.logoSrc : '',
    primaryColor,
    headerTextColor: foreground(primaryColor),
    headingColor: dashboardTokens(primaryColor)['--dashboard-accent'],
    generated: `${new Intl.DateTimeFormat('id-ID', {timeZone: 'Asia/Jakarta', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date())} WIB`,
    headers: columns.map(([label]) => label),
    body: rows.map(row => {
      if (!row || typeof row !== 'object') throw new TypeError('Baris inventaris tidak valid');
      return columns.map(([, read]) => text(read(row)));
    }),
  };
}

async function xlsxFromSnapshot(data) {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const cell = value => ({type: String, value, wrap:true, alignVertical:'top', fontSize:10});
  const heading = value => [{...cell(value), columnSpan:data.headers.length, fontWeight:'bold', height:30}];
  const sheet = [heading(data.schoolName), heading(data.systemName), heading(data.title),
    heading(`Dibuat: ${data.generated}`),
    data.headers.map(value => ({...cell(value), fontWeight:'bold', backgroundColor:data.primaryColor, textColor:data.headerTextColor, height:30})),
    ...data.body.map(row => row.map(cell))];
  const blob = await writeExcelFile(sheet, {sheet:'Inventaris', columns:data.headers.map((_,i) => ({width:i === data.headers.length - 1 ? 55 : 24}))}).toBlob();
  if (!blob.size) throw new Error('Berkas Excel kosong');
  return new Blob([blob], {type:XLSX_MIME});
}

export async function buildInventoryXlsx(rows, options = {}) {
  return xlsxFromSnapshot(snapshot(rows, options));
}

async function pdfFromSnapshot(data) {
  const { jsPDF, autoTable } = await loadPdfTools();
  const doc = new jsPDF({orientation:'landscape', unit:'mm', format:'a4'});
  let logo = null;
  if (data.logoSrc) {
    const { loadDocumentLogo } = await import('./documentBranding.js');
    logo = await loadDocumentLogo(data.logoSrc);
  }
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setProperties({title:data.title, author:data.schoolName, creator:data.systemName});
  const drawHeader = () => {
    if (logo) {
      const ratio = Math.min(16 / logo.width, 16 / logo.height);
      doc.addImage(logo.dataUrl, 'PNG', 12, 10, logo.width * ratio, logo.height * ratio);
    }
    const x = logo ? 32 : 12;
    doc.setTextColor(data.headingColor);
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.text(doc.splitTextToSize(data.schoolName, width - x - 12).slice(0,2), x, 13);
    doc.setTextColor('#333333'); doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text(doc.splitTextToSize(data.systemName, width - x - 12).slice(0,2), x, 24);
    doc.setFont('helvetica','bold');
    doc.text(doc.splitTextToSize(data.title, width - 24).slice(0,2), 12, 35);
    doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(`Dibuat: ${data.generated}`, 12, 45);
  };
  autoTable(doc, {
    head:[data.headers], body:data.body, startY:51,
    margin:{top:51,left:12,right:12,bottom:16},
    showHead:'everyPage', rowPageBreak:'avoid',
    styles:{font:'helvetica',fontSize:data.kind === 'assets' ? 7 : 9,cellPadding:2,overflow:'linebreak',valign:'top',textColor:'#333333'},
    headStyles:{fillColor:data.primaryColor,textColor:data.headerTextColor,fontStyle:'bold'},
    alternateRowStyles:{fillColor:'#f3f4f6'},
    columnStyles:{[data.headers.length - 1]:{cellWidth:data.kind === 'assets' ? 48 : 100}},
    willDrawPage:drawHeader,
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFontSize(8); doc.setTextColor('#555555');
    doc.text(`Halaman ${page} / ${pages}`, width - 12, height - 7, {align:'right'});
  }
  return doc;
}

export async function buildInventoryPdf(rows, options = {}) {
  return pdfFromSnapshot(snapshot(rows, options));
}

// Downloads use their own short-lived URL; printable QR viewers own different URLs.
export async function exportInventory(format, rows, options = {}) {
  if (format !== 'xlsx' && format !== 'pdf') throw new TypeError('Format ekspor tidak valid');
  const { signal, isCurrent } = options;
  const assertCurrent = () => {
    if (signal?.aborted || (isCurrent && !isCurrent())) {
      const error = new Error('Ekspor dibatalkan');
      error.name = 'AbortError';
      throw error;
    }
  };
  assertCurrent();
  // Capture selection, scope and document metadata before the authorization await.
  const kind = options.kind ?? 'assets';
  if (!Object.hasOwn(definitions, kind)) throw new TypeError('Jenis inventaris tidak valid');
  if (!Array.isArray(rows) || !rows.length) throw new TypeError('Tidak ada data inventaris untuk diekspor');
  const ids = rows.map(row => row?.perangkat_id);
  if (ids.length > 5000 || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length)
    throw new TypeError('Pilihan inventaris tidak valid');
  const metadata = { kind, title: options.title, branding: { ...options.branding } };
  const body = { perangkat_ids: ids };
  if (kind === 'lab' && options.lab_id !== undefined && options.lab_id !== null && options.lab_id !== '') body.lab_id = Number(options.lab_id);
  if (kind === 'assets' && options.kategori) body.kategori = options.kategori;
  const { default: apiClient } = await import('./api.js');
  assertCurrent();
  const response = await apiClient.post(`/inventory-exports/${kind}`, body, { signal });
  assertCurrent();
  const authorized = response.data?.data;
  if (!Array.isArray(authorized) || authorized.length !== ids.length || authorized.some((row, index) => row?.perangkat_id !== ids[index]))
    throw new Error('Pilihan inventaris berubah. Muat ulang data sebelum mengekspor.');
  const data = snapshot(authorized, metadata);
  const blob = format === 'xlsx' ? await xlsxFromSnapshot(data)
    : (await pdfFromSnapshot(data)).output('blob');
  if (!blob.size) throw new Error('Berkas ekspor kosong');
  const safeTitle = data.title.normalize('NFKD').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0,80) || 'laporan';
  const filename = `inventaris-${data.kind}-${safeTitle}.${format}`;
  const anchor = document.createElement('a');
  assertCurrent();
  const url = URL.createObjectURL(blob);
  try {
    anchor.href = url; anchor.download = filename; anchor.style.display = 'none';
    document.body.appendChild(anchor);
    assertCurrent();
    anchor.click();
  } finally {
    anchor.remove();
    // Do not revoke synchronously: the browser must first consume the click.
    const timer = setTimeout(() => URL.revokeObjectURL(url), 60_000);
    timer?.unref?.();
  }
  return {filename, blob};
}
