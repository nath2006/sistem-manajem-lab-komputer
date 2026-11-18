// Anonymous image loading never forwards application tokens or fetch credentials.
export async function loadDocumentLogo(logoSrc) {
  if (!logoSrc) return null;
  const message = 'Logo institusi gagal dimuat. Periksa logo di Pengaturan dan akses gambar/CORS, lalu coba cetak lagi.';
  return new Promise((resolve, reject) => {
    let image;
    let timer;
    const fail = () => { clearTimeout(timer); if (image) image.onload = image.onerror = null; reject(new Error(message)); };
    try {
      const source = String(logoSrc);
      const url = new URL(source, globalThis.location?.href || 'https://document.invalid/');
      if ((!['http:', 'https:', 'blob:'].includes(url.protocol) && !/^data:image\/(png|jpeg|webp);base64,/i.test(source)) || url.username || url.password) return fail();
      image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        try {
          const width = image.naturalWidth, height = image.naturalHeight;
          if (!width || !height) return fail();
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const context = canvas.getContext('2d');
          if (!context) return fail();
          context.drawImage(image, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          if (!dataUrl.startsWith('data:image/png;base64,')) return fail();
          clearTimeout(timer); image.onload = image.onerror = null;
          resolve({ dataUrl, width, height });
        } catch { fail(); }
      };
      image.onerror = fail;
      timer = setTimeout(fail, 10000);
      image.src = source;
    } catch { fail(); }
  });
}

export const SYSTEM_NAME = 'Sistem Manajemen IT dan Penggunaan Lab';

export function getDocumentBranding(settings = {}, logoSrc = '') {
  return {
    schoolName: String(settings.school_name || '').trim() || 'Nama institusi belum diatur',
    systemName: SYSTEM_NAME,
    logoSrc: typeof logoSrc === 'string' ? logoSrc.trim() : '',
    primaryColor: /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(settings.primary_color || '')
      ? settings.primary_color : '#800000',
  };
}
