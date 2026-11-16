const task = (label, to, description) => ({ label, to, description });
const roleTasks = {
  Admin: [
    task('Kelola User', '/user', 'Kelola akun dan peran pengguna.'),
    task(
      'Pengaturan Sistem',
      '/pengaturan',
      'Sesuaikan identitas dan tampilan sekolah.'
    ),
    task('Log Aktivitas', '/log-aktivitas', 'Tinjau catatan aktivitas sistem.'),
  ],
  Guru: [
    task(
      'Jadwal Lab',
      '/jadwal-lab',
      'Periksa jadwal penggunaan laboratorium.'
    ),
    task(
      'Pengajuan Jadwal Lab',
      '/pengajuan-jadwal-lab',
      'Ajukan jadwal penggunaan laboratorium.'
    ),
    task(
      'Cek Status Pengajuan Jadwal',
      '/pengajuan-jadwal-lab/status',
      'Pantau status pengajuan Anda.'
    ),
  ],
  'Kepala Lab': [
    task(
      'Pengajuan Jadwal Lab',
      '/kelola-jadwal-lab',
      'Tinjau dan kelola pengajuan jadwal.'
    ),
    task(
      'Pemeriksaan Perangkat',
      '/kelola-pemeriksaan-perangkat',
      'Tinjau hasil pemeriksaan perangkat.'
    ),
    task(
      'Kelola Data Perangkat',
      '/kelola-perangkat',
      'Kelola inventaris perangkat laboratorium.'
    ),
  ],
  'Koordinator Lab': [
    task(
      'Kelola Data Lab',
      '/kelola/data-lab',
      'Kelola informasi laboratorium.'
    ),
    task(
      'Kelola Pengumuman',
      '/kelola-pengumuman',
      'Kelola pengumuman untuk pengguna.'
    ),
  ],
  Teknisi: [
    task(
      'Pengecekan Perangkat',
      '/kelola-pengecekan',
      'Catat dan perbarui hasil pengecekan perangkat.'
    ),
    task(
      'Perbaikan Perangkat',
      '/kelola-perbaikan',
      'Catat dan pantau pekerjaan perbaikan.'
    ),
  ],
};
const assetDescription = role => {
  const overview = 'Lihat aset Pembelajaran dan Operasional, termasuk printer dan perangkat jaringan.';
  if (role === 'Admin') return `${overview} Anda dapat kelola seluruh aset sekolah.`;
  if (role === 'Kepala Lab') return `${overview} Kelola hanya aset Pembelajaran di lab yang Anda pimpin.`;
  return `${overview} Akses Anda baca saja.`;
};
const qrDescription = role => {
  const privacy = 'Pindai untuk verifikasi publik; data pengadaan tetap privat sesuai akses akun.';
  if (role === 'Admin') return `Terbitkan QR untuk seluruh aset, lalu cetak label. ${privacy}`;
  if (role === 'Kepala Lab') return `Terbitkan QR hanya untuk aset Pembelajaran di lab yang Anda pimpin. Lihat QR lain dan cetak label yang tersedia. ${privacy}`;
  return `Lihat QR yang sudah ada dan cetak label. ${privacy}`;
};
const ticketDescription = {
  Admin: 'Kelola kategori, prioritas, status dan penanggung jawab tiket; kaitkan aset serta tinjau komentar dan riwayat layanan sekolah.',
  'Koordinator Lab': 'Koordinasikan penanggung jawab, kategori, prioritas dan status tiket; pantau aset terkait, komentar dan riwayat tindak lanjut.',
  Teknisi: 'Tangani tiket yang ditugaskan kepada Anda; periksa kategori, prioritas dan aset, lalu perbarui status, komentar serta riwayat pekerjaan.',
  Guru: 'Buat dan pantau tiket Anda: pilih kategori, jelaskan kebutuhan dan aset terkait; lihat prioritas, status, komentar serta riwayat bantuan.',
  'Kepala Lab': 'Laporkan kebutuhan lab melalui tiket Anda; pilih kategori dan aset terkait, lalu pantau prioritas, status, komentar serta riwayat penanganan.',
};
const chartDescription = {
  Admin: 'Baca grafik kategori dan kondisi aset IT serta status tiket untuk memantau layanan sekolah.',
  'Kepala Lab': 'Baca grafik kategori dan kondisi aset sekolah; status tiket mencakup laporan Anda dan aset di lab yang Anda pimpin.',
  'Koordinator Lab': 'Gunakan grafik kategori dan kondisi aset serta status tiket untuk mengoordinasikan layanan sekolah.',
  Teknisi: 'Baca grafik kategori dan kondisi aset serta status tiket sesuai akses Bantuan untuk memantau kebutuhan penanganan.',
  Guru: 'Pantau grafik status tiket yang Anda laporkan untuk melihat perkembangan bantuan Anda.',
};
// Stable selectors point to the persistent shell; a tour never navigates.
export const ROLE_STEPS = Object.fromEntries(
  Object.entries(roleTasks).map(([role, tasks]) => [role, [
    { element: '[data-tour="content"]', title: 'Selamat datang', description: `Ruang kerja untuk peran ${role}. Panduan tidak mengubah data atau membuka halaman lain.` },
    { element: '[data-tour-path="/aset-it"]', title: 'Aset IT Sekolah', description: assetDescription(role) },
    { element: '[data-tour-path="/aset-it"]', title: 'QR dan verifikasi aset', description: qrDescription(role) },
    ...tasks.map(({label, to, description}) => ({element: `[data-tour-path="${to}"]`, title: label, description})),
    { element: '[data-tour-path="/ticketing"]', title: 'Bantuan (Ticketing)', description: ticketDescription[role] },
    { element: '[data-tour="dashboard-charts"]', title: 'Grafik dashboard', description: chartDescription[role], optional: true },
    { element: '[data-tour="profile"]', title: 'Panduan dan akun', description: 'Buka menu profil → Panduan awal untuk mengulang. Lewati atau Selesai menyimpan pilihan di browser ini; Escape hanya menutup.' },
  ]])
);

// Profile replay also works on non-dashboard routes: omit only optional targets.
export function getTourSteps(role, hasVisibleTarget) {
  return (ROLE_STEPS[role] || []).filter(step => !step.optional || hasVisibleTarget(step.element));
}

// Local tooltip tokens only; never change the school's configured primary color.
export function getTourColors(primary) {
  const hex = /^#[a-f\d]{6}$/i.test(primary) ? primary : '#800000';
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16));
  const luminance = rgb => rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const foreground = rgb => luminance(rgb) > 0.179 ? '#000000' : '#ffffff';
  const toHex = rgb => '#' + rgb.map(value => value.toString(16).padStart(2, '0')).join('');
  const hover = channels.map(value => Math.round(value * 0.9 + 25.5));
  let accent = [...channels];
  while ((1.05 / (luminance(accent) + 0.05)) < 4.5) accent = accent.map(value => Math.floor(value * 0.9));
  return { foreground: foreground(channels), hover: toHex(hover), hoverForeground: foreground(hover), accent: toHex(accent) };
}
