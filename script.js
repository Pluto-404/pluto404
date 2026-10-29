(() => {
  'use strict';

  const A4 = { w: 2480, h: 3508 }; // A4 potret, 300 dpi

  const WORKS = [
    { title: 'abcdef', year: 2077, src: 'assets/MINJI.jpg',          ...A4 },
    { title: 'abcdef',     year: 2077, src: 'assets/marsha.jpg',         ...A4 },
    { title: 'abcdef',      year: 2077, src: 'assets/kentang goreng.jpg',       w: 1920, h: 1080 },
    { title: 'abcdef',         year: 2077, src: 'assets/hanni.jpg',          ...A4 },
    { title: 'abcdef',          year: 2077, src: 'assets/hannibrutalism.jpg', ...A4 },
    { title: 'abcdef',      year: 2077, src: 'assets/gd.jpg',                   w: 1920, h: 1080 },
    { title: 'abcdef',     year: 2077, src: 'assets/marsha kacamata@2x.jpg',                   ...A4 },
    { title: 'abcdef',     year: 2077, src: 'assets/hanniclaude.png',                   ...A4 },
    { title: 'abcdef',     year: 2077, src: 'assets/marsha alert.jpg',                   ...A4 },
    { title: 'abcdef',          year: 2077, src: 'assets/taro-latte.jpg',                   w: 1920, h: 1080 },
    { title: 'abcdef',     year: 2077, src: 'assets/efootball.jpg',                   ...A4 },
    { title: 'abcdef',     year: 2077, src: 'assets/billie joe intagram.jpg',                   ...A4 },
    { title: 'abcdef',     year: 2077, src: 'assets/mockuploop.png',                   ...A4 },
    { title: 'abcdef',     year: 2077, src: 'assets/basket case.jpg',                   ...A4 },
  ];

  const CAPTION_H = 44; // perkiraan tinggi teks keterangan di bawah gambar

  const gridEl = document.getElementById('grid');
  const shapesEl = document.getElementById('shapes');
  const countEl = document.getElementById('count');
  const emptyEl = document.getElementById('empty');

  const dialog = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbTitle = document.getElementById('lb-title');
  const lbMeta = document.getElementById('lb-meta');
  const lbStage = document.getElementById('lb-stage');

  /* ---------- Data ---------- */

  function shapeOf(w, h) {
    const r = w / h;
    if (r > 1.05) return 'lanskap';
    if (r < 0.95) return 'potret';
    return 'persegi';
  }

  const SHAPE_LABEL = { semua: 'Semua', potret: 'Potret', lanskap: 'Lanskap', persegi: 'Persegi' };

  function placeholder(work, i) {
    const { w, h } = work;
    const hue = (i * 47 + 210) % 360;
    const m = Math.min(w, h);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="hsl(${hue},70%,62%)"/>` +
      `<stop offset="1" stop-color="hsl(${(hue + 50) % 360},75%,42%)"/></linearGradient></defs>` +
      `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
      `<circle cx="${w * 0.72}" cy="${h * 0.28}" r="${m * 0.22}" fill="rgba(255,255,255,0.25)"/>` +
      `<rect x="${w * 0.1}" y="${h * 0.7}" width="${w * 0.55}" height="${m * 0.06}" fill="rgba(255,255,255,0.8)"/>` +
      `<rect x="${w * 0.1}" y="${h * 0.7 + m * 0.1}" width="${w * 0.35}" height="${m * 0.035}" fill="rgba(255,255,255,0.5)"/>` +
      `<text x="${w * 0.1}" y="${h * 0.14}" font-family="sans-serif" font-size="${m * 0.07}" fill="rgba(255,255,255,0.85)">Contoh ${w}x${h}</text>` +
      `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  const works = WORKS.map((work, i) => ({
    ...work,
    shape: shapeOf(work.w, work.h),
    thumb: work.src || placeholder(work, i),
    large: work.full || work.src || placeholder(work, i),
    el: null
  }));

  /* ---------- Filter bentuk kanvas ---------- */

  const state = { shape: 'semua' };
  let visible = [];

  // Hanya bentuk yang benar-benar ada di daftar karya yang dibuatkan tombolnya
  function buildShapeChips() {
    const present = ['potret', 'lanskap', 'persegi'].filter((k) => works.some((w) => w.shape === k));
    for (const key of ['semua', ...present]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.shape = key;
      b.textContent = SHAPE_LABEL[key];
      shapesEl.append(b);
    }
  }

  function syncPressed() {
    shapesEl.querySelectorAll('.chip').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.shape === state.shape)));
  }

  shapesEl.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    state.shape = b.dataset.shape;
    update();
  });

  /* ---------- Item ---------- */

  function createItem(work) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'item';

    const img = document.createElement('img');
    img.src = work.thumb;
    img.width = work.w;
    img.height = work.h;
    img.alt = work.title;
    img.loading = 'lazy';
    img.decoding = 'async';

    const cap = document.createElement('span');
    cap.className = 'cap';
    const title = document.createElement('strong');
    title.textContent = work.title;
    const meta = document.createElement('em');
    meta.textContent = work.year;
    cap.append(title, meta);

    btn.append(img, cap);
    btn.addEventListener('click', () => openLightbox(work));
    return btn;
  }

  /* ---------- Masonry (urutan tetap kiri ke kanan) ---------- */

  // Lebar area konten grid (tanpa padding kiri-kanan)
  function innerWidth() {
    const cs = getComputedStyle(gridEl);
    return gridEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  function columnCount() {
    const width = innerWidth();
    if (width >= 1000) return 4;  // desktop
    if (width >= 620) return 3;   // tablet
    if (width >= 500) return 2;   // tablet kecil / HP landscape
    return 1;                     // HP: satu baris satu foto
  }

  let laidOutCols = 0;

  function layout() {
    const n = columnCount();
    const gap = parseFloat(getComputedStyle(gridEl).columnGap) || 20;
    const colWidth = (innerWidth() - gap * (n - 1)) / n;

    const cols = Array.from({ length: n }, () => {
      const c = document.createElement('div');
      c.className = 'col';
      return c;
    });
    const heights = new Array(n).fill(0);

    for (const work of visible) {
      if (!work.el) work.el = createItem(work);
      const i = heights.indexOf(Math.min(...heights));
      cols[i].append(work.el);
      heights[i] += colWidth * (work.h / work.w) + CAPTION_H + gap;
    }

    gridEl.replaceChildren(...cols);
    laidOutCols = n;
  }

  function update() {
    visible = works.filter((w) => state.shape === 'semua' || w.shape === state.shape);
    syncPressed();
    countEl.textContent = visible.length + ' desain';
    emptyEl.hidden = visible.length > 0;
    layout();
  }

  new ResizeObserver(() => {
    if (columnCount() !== laidOutCols) layout();
  }).observe(gridEl);

  /* ---------- Lightbox ---------- */

  let current = 0;

  function show(index) {
    const n = visible.length;
    current = (index + n) % n;
    const work = visible[current];
    lbImg.src = work.large;
    lbImg.alt = work.title;
    lbTitle.textContent = work.title;
    lbMeta.textContent = work.year + ' (' + (current + 1) + ' dari ' + n + ')';
  }

  function openLightbox(work) {
    show(visible.indexOf(work));
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  }

  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
  });

  document.getElementById('lb-close').addEventListener('click', () => dialog.close());
  document.getElementById('lb-prev').addEventListener('click', () => show(current - 1));
  document.getElementById('lb-next').addEventListener('click', () => show(current + 1));

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target === lbStage) dialog.close();
  });

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  // Geser jari untuk pindah karya
  let startX = null;
  lbStage.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  lbStage.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
  });

  /* ---------- Mulai ---------- */

  buildShapeChips();
  update();
})();