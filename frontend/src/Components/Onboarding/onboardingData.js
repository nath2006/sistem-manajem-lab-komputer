const task = (label, to, description) => ({ label, to, description });
const dashboard = to => task('Buka dashboard', to, 'Lihat ringkasan kegiatan dan informasi terbaru yang tersedia untuk Anda');
const schedule = task('Lihat jadwal lab', '/jadwal-lab', 'Periksa jadwal lab sebelum menentukan waktu penggunaan');
const requests = task('Tinjau pengajuan jadwal', '/kelola-jadwal-lab', 'Tinjau pengajuan penggunaan lab dan perbarui keputusan sesuai tanggung jawab Anda');
const inspections = task('Tinjau pemeriksaan perangkat', '/kelola-pemeriksaan-perangkat', 'Periksa hasil pengecekan perangkat untuk menentukan tindak lanjut');
const labs = task('Kelola data lab', '/kelola/data-lab', 'Perbarui informasi laboratorium dan penanggung jawabnya');
const announcements = task('Kelola pengumuman', '/kelola-pengumuman', 'Tulis dan perbarui pengumuman untuk pengguna sekolah');
const repairs = task('Catat perbaikan perangkat', '/kelola-perbaikan', 'Catat pekerjaan perbaikan dan perbarui hasil penanganan perangkat');
const checks = task('Catat pengecekan perangkat', '/kelola-pengecekan', 'Periksa perangkat lalu catat kondisi dan hasil pengecekannya');
const roleTasks = {
  Admin: [
    dashboard('/dashboard'),
    inspections,
    task('Kelola perangkat lab', '/kelola-perangkat', 'Kelola perangkat Pembelajaran di laboratorium sekolah'),
    requests,
    schedule,
    labs,
    announcements,
    repairs,
    checks,
    task('Kelola akun pengguna', '/user', 'Tambah dan perbarui akun pengguna sesuai tugasnya'),
    task(
      'Pengaturan Sistem',
      '/pengaturan',
      'Sesuaikan identitas dan tampilan sekolah'
    ),
    task('Lihat catatan aktivitas', '/log-aktivitas', 'Telusuri aktivitas pengguna saat Anda perlu memeriksa perubahan data'),
  ],
  Guru: [
    dashboard('/dashboard-guru'),
    task(
      'Jadwal Lab',
      '/jadwal-lab',
      'Periksa jadwal penggunaan laboratorium sebelum mengajukan waktu'
    ),
    task(
      'Pengajuan Jadwal Lab',
      '/pengajuan-jadwal-lab',
      'Ajukan waktu penggunaan laboratorium untuk kegiatan mengajar Anda'
    ),
    task(
      'Cek Status Pengajuan Jadwal',
      '/pengajuan-jadwal-lab/status',
      'Pantau keputusan pengajuan jadwal Anda sebelum menggunakan lab'
    ),
  ],
  'Kepala Lab': [
    dashboard('/dashboard-kepala-lab'),
    schedule,
    task(
      'Pengajuan Jadwal Lab',
      '/kelola-jadwal-lab',
      'Tinjau pengajuan jadwal penggunaan lab yang Anda pimpin'
    ),
    task(
      'Pemeriksaan Perangkat',
      '/kelola-pemeriksaan-perangkat',
      'Tinjau hasil pemeriksaan perangkat di lab yang Anda pimpin'
    ),
    task(
      'Kelola Data Perangkat',
      '/kelola-perangkat',
      'Kelola perangkat Pembelajaran di lab yang Anda pimpin'
    ),
  ],
  'Koordinator Lab': [
    dashboard('/dashboard-koordinator-lab'),
    task(
      'Kelola Data Lab',
      '/kelola/data-lab',
      'Perbarui informasi laboratorium dan penanggung jawabnya'
    ),
    task(
      'Kelola Pengumuman',
      '/kelola-pengumuman',
      'Tulis dan perbarui pengumuman untuk pengguna sekolah'
    ),
  ],
  Teknisi: [
    dashboard('/dashboard-teknisi'),
    task('Data Perangkat Lab', '/kelola-perangkat', 'Lihat perangkat di semua lab lalu pilih lab dan pencarian untuk ekspor Excel atau PDF tanpa mengubah data perangkat'),
    task(
      'Pengecekan Perangkat',
      '/kelola-pengecekan',
      'Periksa perangkat lalu catat kondisi dan hasil pengecekannya'
    ),
    task(
      'Perbaikan Perangkat',
      '/kelola-perbaikan',
      'Catat pekerjaan perbaikan dan perbarui hasil penanganan perangkat'
    ),
  ],
};
const assetDescription = role => {
  if (role === 'Admin') return 'Kelola aset Operasional seperti printer dan perangkat jaringan lalu terbitkan QR sekali untuk verifikasi publik dan cetak ulang label saat diperlukan';
  return 'Lihat aset Operasional seperti printer dan perangkat jaringan dengan akses baca saja serta QR yang dibuat sekali untuk verifikasi publik dan cetak ulang label yang tersedia';
};
const ticketDescription = {
  Admin: 'Kelola tiket sekolah dan penanggung jawab lalu atur kategori prioritas status serta aset terkait dan tinjau komentar maupun riwayat penanganan',
  'Koordinator Lab': 'Pantau tiket sekolah dan tentukan penanggung jawab lalu periksa kategori prioritas status aset terkait komentar serta riwayat tindak lanjut',
  Teknisi: 'Lihat semua tiket dan tangani yang ditugaskan kepada Anda lalu periksa kategori prioritas aset serta perbarui status komentar dan riwayat pekerjaan',
  Guru: 'Buat dan pantau tiket Anda dengan memilih kategori serta aset terkait lalu ikuti prioritas status komentar dan riwayat bantuan',
  'Kepala Lab': 'Pantau tiket Anda dan tiket terkait aset di lab yang Anda pimpin lalu periksa kategori prioritas status aset komentar dan riwayat penanganan',
};
const chartDescription = {
  Admin: 'Baca grafik kategori dan kondisi aset IT serta status tiket untuk memantau layanan sekolah',
  'Kepala Lab': 'Baca grafik kategori dan kondisi aset sekolah serta status tiket dari laporan Anda dan aset di lab yang Anda pimpin',
  'Koordinator Lab': 'Gunakan grafik kategori dan kondisi aset serta status tiket untuk mengoordinasikan layanan sekolah',
  Teknisi: 'Baca grafik kategori dan kondisi aset serta status tiket untuk memantau kebutuhan penanganan',
  Guru: 'Pantau grafik status tiket yang Anda laporkan untuk melihat perkembangan bantuan Anda',
};
// Stable selectors point to the persistent shell; a tour never navigates.
export const ROLE_STEPS = Object.fromEntries(
  Object.entries(roleTasks).map(([role, tasks]) => [role, [
    { element: '[data-tour="content"]', title: 'Kenali ruang kerja Anda', description: 'Ikuti panduan otomatis yang tampil sekali untuk akun Anda tanpa mengubah data dan ingat bahwa data pengadaan tetap privat sesuai akses akun' },
    ...tasks.map(({label, to, description}) => ({element: `[data-tour-path="${to}"]`, title: label, description})),
    { element: '[data-tour-path="/aset-it"]', title: 'Aset IT Sekolah', description: assetDescription(role) },
    { element: '[data-tour-path="/ticketing"]', title: 'Bantuan', description: ticketDescription[role] },
    { element: '[data-tour="dashboard-charts"]', title: 'Grafik dashboard', description: chartDescription[role], optional: true },
    { element: '[data-tour="profile"]', title: 'Ulangi panduan saat perlu', description: 'Pilih Panduan awal dari menu profil untuk mengulang kapan pun Anda membutuhkan bantuan' },
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
