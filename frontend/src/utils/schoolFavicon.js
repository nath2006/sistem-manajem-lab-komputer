// A favicon needs square pixels; contain the logo rather than stretching it.
export function updateSchoolFavicon(logoSrc, fallbackSrc) {
  if (typeof document === 'undefined' || !document.head || typeof Image === 'undefined' || (!logoSrc && !fallbackSrc)) return () => {};
  let active = true, image, timer, generation = 0;
  let link = document.getElementById('school-favicon');
  if (!link) {
    link = document.createElement('link');
    link.id = 'school-favicon';
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.setAttribute('type', 'image/png');
  link.setAttribute('sizes', '128x128');
  link.removeAttribute('href');
  const clear = () => {
    clearTimeout(timer);
    if (image) image.onload = image.onerror = null;
  };
  const load = source => {
    clear();
    const current = ++generation;
    const fail = () => {
      if (!active || current !== generation) return;
      clear();
      if (source !== fallbackSrc && fallbackSrc) load(fallbackSrc);
    };
    image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!active || current !== generation) return;
      try {
        const width = image.naturalWidth, height = image.naturalHeight;
        if (!width || !height) return fail();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const context = canvas.getContext('2d');
        if (!context) return fail();
        const scale = 112 / Math.max(width, height);
        const drawnWidth = width * scale, drawnHeight = height * scale;
        context.drawImage(image, (128 - drawnWidth) / 2, (128 - drawnHeight) / 2, drawnWidth, drawnHeight);
        const png = canvas.toDataURL('image/png');
        if (!png.startsWith('data:image/png;base64,')) return fail();
        clear();
        link.href = png;
      } catch { fail(); }
    };
    image.onerror = fail;
    timer = setTimeout(fail, 10000);
    image.src = source;
  };
  load(logoSrc || fallbackSrc);
  return () => { active = false; clear(); };
}
