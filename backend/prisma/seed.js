// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

// Password sederhana hanya untuk database review, tidak boleh menyasar database lama.
const database = process.env.SEED_REVIEW_DATABASE;
if (!/^simlab_review_\d{14}$/.test(database || '')) {
  throw new Error('Set SEED_REVIEW_DATABASE ke database simlab_review_ yang akan di-seed.');
}
const url = new URL(`mysql://${encodeURIComponent(process.env.DB_USER || '')}:${encodeURIComponent(process.env.DB_PASSWORD || '')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${database}`);
const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });

async function main() {
  // Khusus review lokal; simpan hash, bukan plaintext.
  const hash = await bcrypt.hash('123', 10);

  // enum harus pakai nama ENUM PRISMA (yang dimap), contoh: 'Kepala_Lab' bukan 'Kepala Lab'
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hash },
    create: { username: 'admin', password: hash, nama_lengkap: 'Admin Sistem', email: 'admin@example.com', role: 'Admin', is_online: false }
  });
  await prisma.user.upsert({
    where: { username: 'kalab' },
    update: { password: hash },
    create: { username: 'kalab', password: hash, nama_lengkap: 'Kepala Laboratorium', email: 'kalab@example.com', role: 'Kepala_Lab', is_online: false }
  });
  await prisma.user.upsert({
    where: { username: 'teknisi' },
    update: { password: hash },
    create: { username: 'teknisi', password: hash, nama_lengkap: 'Teknisi Lab', email: 'teknisi@example.com', role: 'Teknisi', is_online: false }
  });
  await prisma.user.upsert({
    where: { username: 'guru' },
    update: { password: hash },
    create: { username: 'guru', password: hash, nama_lengkap: 'Guru Pengampu', email: 'guru@example.com', role: 'Guru', is_online: false }
  });

  // contoh dummy lain (opsional)
  const lab1 = await prisma.laboratorium.upsert({
    where: { lab_id: 1 },
    update: {},
    create: {
      nama_lab: 'Lab Komputer 1',
      lokasi: 'Lantai 1',
      kapasitas: 30,
      kepala_lab_id: null,
      status: 'Tersedia',
      jam_buka: new Date('1970-01-01T07:00:00Z'),
      jam_tutup: new Date('1970-01-01T16:00:00Z'),
    },
  });

  await prisma.perangkat.upsert({
    where: { nomor_inventaris: 'INV-001' },
    update: {},
    create: {
      nama_perangkat: 'PC-01',
      spesifikasi: 'Core i5, 8GB RAM, SSD 256GB',
      status: 'Baik',
      lab_id: lab1.lab_id,
      nomor_inventaris: 'INV-001',
    },
  });

  const reset = await prisma.user.updateMany({ data: { password: hash } });
  console.log(`Seed OK: ${reset.count} akun pada ${database} menggunakan password review.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
