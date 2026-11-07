import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const isOwnedLogo = (value) =>
  typeof value === 'string' &&
  /^\/uploads\/branding\/[a-f0-9]{32}\.(png|jpg|webp|gif)$/.test(value);
export const defaultLogoDirectory = fileURLToPath(
  new URL('../uploads/branding/', import.meta.url)
);
const reject = () => {
  const error = new Error('Logo harus PNG/JPG/WebP/GIF asli, maksimal 2 MB.');
  error.status = 400;
  throw error;
};
export const parseLogoUpload = multer({
  storage: multer.memoryStorage(),
  preservePath: true,
  limits: {
    fileSize: MAX_LOGO_BYTES,
    files: 1,
    fields: 6,
    fieldSize: 8192,
    parts: 7,
  },
}).single('logo');
export function validateLogo(file) {
  const b = file.buffer;
  if (
    !b?.length ||
    b.length > MAX_LOGO_BYTES ||
    /[\\/\x00-\x1f]/.test(file.originalname)
  )
    reject();
  let extension;
  if (
    b.length >= 24 &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    b.toString('ascii', 12, 16) === 'IHDR'
  )
    extension = 'png';
  else if (
    b.length >= 4 &&
    b[0] === 255 &&
    b[1] === 216 &&
    b[2] === 255 &&
    b[b.length - 2] === 255 &&
    b[b.length - 1] === 217
  )
    extension = 'jpg';
  else if (
    b.length >= 12 &&
    ['GIF87a', 'GIF89a'].includes(b.toString('ascii', 0, 6))
  )
    extension = 'gif';
  else if (
    b.length >= 20 &&
    b.toString('ascii', 0, 4) === 'RIFF' &&
    b.toString('ascii', 8, 12) === 'WEBP' &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(b.toString('ascii', 12, 16))
  )
    extension = 'webp';
  const mime = {
    png: 'image/png',
    jpg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  const ext = path.extname(file.originalname).toLowerCase();
  if (
    !extension ||
    file.mimetype !== mime[extension] ||
    !(extension === 'jpg' ? ['.jpg', '.jpeg'] : [`.${extension}`]).includes(ext)
  )
    reject();
  return extension;
}
export async function storeLogo(file, directory = defaultLogoDirectory) {
  const extension = validateLogo(file);
  const filename = `${randomBytes(16).toString('hex')}.${extension}`;
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, filename);
  try {
    await writeFile(target, file.buffer, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') await unlink(target).catch(() => {});
    throw error;
  }
  return {
    url: `/uploads/branding/${filename}`,
    cleanup: () => unlink(target),
  };
}
