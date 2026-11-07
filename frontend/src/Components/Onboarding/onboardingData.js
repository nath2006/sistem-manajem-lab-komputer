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
// Stable selectors point to the persistent shell; a tour never navigates.
export const ROLE_STEPS = Object.fromEntries(
  Object.entries(roleTasks).map(([role, tasks]) => [role, [
    { element: '[data-tour="content"]', title: 'Selamat datang', description: `Ruang kerja untuk peran ${role}. Panduan tidak mengubah data atau membuka halaman lain.` },
    ...tasks.map(({label, to, description}) => ({element: `[data-tour-path="${to}"]`, title: label, description})),
    { element: '[data-tour-path="/ticketing"]', title: 'Tiket Layanan', description: 'Catat kebutuhan layanan dan pantau tindak lanjut sesuai akses Anda.' },
    { element: '[data-tour="profile"]', title: 'Panduan dan akun', description: 'Buka menu profil → Panduan awal untuk mengulang. Lewati atau Selesai menyimpan pilihan di browser ini; Escape hanya menutup.' },
  ]])
);
