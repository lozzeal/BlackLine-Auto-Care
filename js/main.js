/* ============================================================
   BlackLine Auto Care — main.js
   Єдина точка входу для клієнтського JS.
     1) UI      — хедер, мобільне меню, reveal, before/after слайдер
     2) BOOKING — валідація форми, стиснення фото, відправка заявки
   ============================================================ */


/* =============================== 1) UI ===============================
   Хедер, мобільне меню, reveal-анімації, before/after слайдер.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- sticky header ---------- */
  const header = document.getElementById('siteHeader');
  if (header) {
    let ticking = false;
    const onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        header.classList.toggle('scrolled', window.scrollY > 40);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- burger / mobile nav ---------- */
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');

  if (burger && navLinks) {
    const setOpen = function (open) {
      navLinks.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    };

    burger.addEventListener('click', function () {
      setOpen(!navLinks.classList.contains('open'));
    });

    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        setOpen(false);
        burger.focus();
      }
    });
  }

  /* ---------- reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- before / after slider ---------- */
  const baWrap = document.getElementById('baWrap');
  const baAfter = document.getElementById('baAfter');
  const baDivider = document.getElementById('baDivider');
  const baHandle = document.getElementById('baHandle');

  if (baWrap && baAfter && baDivider && baHandle) {
    let dragging = false;
    let pos = 50;

    const setPos = function (x) {
      pos = Math.max(0, Math.min(100, x));
      baAfter.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';
      baDivider.style.left = pos + '%';
      baHandle.style.left = pos + '%';
      baHandle.setAttribute('aria-valuenow', String(Math.round(pos)));
    };

    const fromClientX = function (clientX) {
      const rect = baWrap.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    };

    setPos(50);

    baHandle.addEventListener('pointerdown', function (e) {
      dragging = true;
      baHandle.setPointerCapture(e.pointerId);
    });

    baWrap.addEventListener('pointerdown', function (e) {
      if (e.target === baHandle) return;
      dragging = true;
      setPos(fromClientX(e.clientX));
    });

    window.addEventListener('pointermove', function (e) {
      if (dragging) setPos(fromClientX(e.clientX));
    });

    window.addEventListener('pointerup', function () { dragging = false; });
    window.addEventListener('pointercancel', function () { dragging = false; });

    baHandle.addEventListener('keydown', function (e) {
      const step = e.shiftKey ? 10 : 5;
      if (e.key === 'ArrowLeft') { setPos(pos - step); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPos(pos + step); e.preventDefault(); }
      if (e.key === 'Home') { setPos(0); e.preventDefault(); }
      if (e.key === 'End') { setPos(100); e.preventDefault(); }
    });
  }
})();


/* ============================= 2) BOOKING ============================
   Валідація, стиснення фото у браузері, відправка на /api/submit-form.
   Фото стискаються ще до відправки, щоб уміститись у ліміт тіла
   запиту Vercel (4.5 МБ) і не мучити мобільний інтернет.
   ===================================================================== */
(function () {
  'use strict';

  const CONFIG = {
    endpoint: '/api/submit-form',
    maxPhotos: 6,
    maxSourceBytes: 25 * 1024 * 1024,  // сирий файл з камери
    maxDimension: 1600,                // довша сторона після стиснення
    startQuality: 0.82,
    totalBudgetBytes: 2.6 * 1024 * 1024, // сумарно ПІСЛЯ стиснення (base64 +33%)
    requestTimeoutMs: 30000
  };

  const SERVICES = [
    'Комплексне миття',
    'Полірування кузова',
    'Керамічне покриття',
    'Хімчистка салону',
    'Захисна плівка (PPF)',
    'Полірування фар / дисків'
  ];

  const form = document.getElementById('bookingForm');
  if (!form) return;

  const fileInput = document.getElementById('f-photos');
  const dropZone = document.getElementById('photoDrop');
  const dropTitle = document.getElementById('photoDropTitle');
  const previews = document.getElementById('photoPreviews');
  const submitBtn = document.getElementById('submitBtn');
  const submitLabel = document.getElementById('submitLabel');
  const formMsg = document.getElementById('formMsg');

  const openedAt = Date.now();
  let photos = [];      // { id, fileName, mime, base64, bytes, objectUrl }
  let seq = 0;
  let sending = false;

  /* ---------------- helpers: повідомлення про помилки ---------------- */

  function fieldBox(name) {
    return form.querySelector('[data-field="' + name + '"]');
  }

  function setFieldError(name, message) {
    const box = fieldBox(name);
    if (!box) return;
    const slot = box.querySelector('[data-error]');
    if (slot) slot.textContent = message || '';
    box.classList.toggle('has-error', Boolean(message));
  }

  function clearErrors() {
    form.querySelectorAll('.field.has-error').forEach(function (box) {
      box.classList.remove('has-error');
      const slot = box.querySelector('[data-error]');
      if (slot) slot.textContent = '';
    });
  }

  function showMessage(text, isError) {
    formMsg.textContent = text;
    formMsg.classList.add('show');
    formMsg.classList.toggle('is-error', Boolean(isError));
  }

  function hideMessage() {
    formMsg.classList.remove('show', 'is-error');
    formMsg.textContent = '';
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  /* ---------------- телефон ---------------- */

  function digitsOf(value) {
    return String(value || '').replace(/\D/g, '');
  }

  // Приводимо будь-який український запис до +380XXXXXXXXX
  function normalizePhone(value) {
    let d = digitsOf(value);
    if (d.length === 9) d = '380' + d;                       // 671234567
    else if (d.length === 10 && d[0] === '0') d = '38' + d;  // 0671234567
    else if (d.length === 12 && d.slice(0, 3) === '380') { /* вже ок */ }
    else return null;
    return /^380\d{9}$/.test(d) ? '+' + d : null;
  }

  const phoneInput = document.getElementById('f-phone');
  if (phoneInput) {
    phoneInput.addEventListener('blur', function () {
      const normalized = normalizePhone(phoneInput.value);
      if (normalized) {
        phoneInput.value = normalized;
        setFieldError('phone', '');
      }
    });
  }

  /* ---------------- стиснення фото ---------------- */

  function loadImage(file) {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file).catch(function () { return loadViaElement(file); });
    }
    return loadViaElement(file);
  }

  function loadViaElement(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
      img.src = url;
    });
  }

  function drawToBlob(source, maxDim, quality) {
    const w = source.width;
    const h = source.height;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('encode failed'));
      }, 'image/jpeg', quality);
    });
  }

  // Стискаємо ітеративно, поки не влізе у виділений бюджет
  async function compressToBudget(file, maxBytes) {
    const source = await loadImage(file);
    let quality = CONFIG.startQuality;
    let dimension = CONFIG.maxDimension;
    let blob = await drawToBlob(source, dimension, quality);

    for (let i = 0; i < 4 && blob.size > maxBytes; i++) {
      quality -= 0.13;
      if (quality < 0.45) { quality = 0.62; dimension = Math.round(dimension * 0.75); }
      blob = await drawToBlob(source, dimension, quality);
    }

    if (source.close) source.close();
    return blob;
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const result = String(reader.result);
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = function () { reject(new Error('read failed')); };
      reader.readAsDataURL(blob);
    });
  }

  /* ---------------- керування списком фото ---------------- */

  function renderPhotos() {
    previews.innerHTML = '';

    photos.forEach(function (photo) {
      const thumb = document.createElement('div');
      thumb.className = 'photo-thumb';

      const img = document.createElement('img');
      img.src = photo.objectUrl;
      img.alt = 'Фото авто: ' + photo.fileName;
      thumb.appendChild(img);

      const size = document.createElement('span');
      size.className = 'size';
      size.textContent = formatBytes(photo.bytes);
      thumb.appendChild(size);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove';
      remove.setAttribute('aria-label', 'Видалити фото ' + photo.fileName);
      remove.textContent = '×';
      remove.addEventListener('click', function () { removePhoto(photo.id); });
      thumb.appendChild(remove);

      previews.appendChild(thumb);
    });

    const total = photos.reduce(function (sum, p) { return sum + p.bytes; }, 0);
    dropTitle.textContent = photos.length
      ? 'Додано ' + photos.length + ' з ' + CONFIG.maxPhotos + ' фото (' + formatBytes(total) + ') — додати ще'
      : 'Додайте фото авто — перетягніть або натисніть';
  }

  function removePhoto(id) {
    const photo = photos.find(function (p) { return p.id === id; });
    if (photo) URL.revokeObjectURL(photo.objectUrl);
    photos = photos.filter(function (p) { return p.id !== id; });
    setFieldError('photos', '');
    renderPhotos();
  }

  function clearPhotos() {
    photos.forEach(function (p) { URL.revokeObjectURL(p.objectUrl); });
    photos = [];
    fileInput.value = '';
    renderPhotos();
  }

  async function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    setFieldError('photos', '');

    const free = CONFIG.maxPhotos - photos.length;
    if (free <= 0) {
      setFieldError('photos', 'Максимум ' + CONFIG.maxPhotos + ' фото. Видаліть зайве, щоб додати інше.');
      return;
    }

    const accepted = [];
    let rejectedType = 0;
    let rejectedSize = 0;

    for (const file of incoming) {
      if (accepted.length >= free) break;
      if (!/^image\//.test(file.type)) { rejectedType++; continue; }
      if (file.size > CONFIG.maxSourceBytes) { rejectedSize++; continue; }
      accepted.push(file);
    }

    const notes = [];
    if (rejectedType) notes.push('пропущено не-зображень: ' + rejectedType);
    if (rejectedSize) notes.push('завеликих файлів: ' + rejectedSize);
    if (incoming.length > free) notes.push('ліміт ' + CONFIG.maxPhotos + ' фото');
    if (notes.length) setFieldError('photos', notes.join(' · '));

    if (!accepted.length) { fileInput.value = ''; return; }

    dropZone.classList.add('is-busy');
    const perPhotoBudget = CONFIG.totalBudgetBytes / Math.min(CONFIG.maxPhotos, photos.length + accepted.length);

    for (const file of accepted) {
      try {
        const blob = await compressToBudget(file, perPhotoBudget);
        const base64 = await blobToBase64(blob);
        photos.push({
          id: ++seq,
          fileName: file.name || ('photo-' + seq + '.jpg'),
          mime: 'image/jpeg',
          base64: base64,
          bytes: blob.size,
          objectUrl: URL.createObjectURL(blob)
        });
        renderPhotos();
      } catch (err) {
        console.error('[booking] не вдалося обробити фото', file.name, err);
        setFieldError('photos', 'Не вдалося обробити «' + (file.name || 'фото') + '». Спробуйте інший формат.');
      }
    }

    dropZone.classList.remove('is-busy');
    fileInput.value = '';   // щоб той самий файл можна було вибрати повторно
  }

  /* ---------------- dropzone events ---------------- */

  fileInput.addEventListener('change', function () { addFiles(fileInput.files); });

  ['dragenter', 'dragover'].forEach(function (type) {
    dropZone.addEventListener(type, function (e) {
      e.preventDefault();
      dropZone.classList.add('is-dragover');
    });
  });

  ['dragleave', 'dragend'].forEach(function (type) {
    dropZone.addEventListener(type, function () {
      dropZone.classList.remove('is-dragover');
    });
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('is-dragover');
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  /* ---------------- валідація ---------------- */

  function validate() {
    clearErrors();
    const data = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      car: form.elements.car.value.trim(),
      service: form.elements.service.value,
      date: form.elements.date.value
    };

    let firstBad = null;
    const fail = function (field, message) {
      setFieldError(field, message);
      if (!firstBad) firstBad = field;
    };

    if (data.name.length < 2) fail('name', 'Вкажіть ім’я — мінімум 2 символи');
    else if (data.name.length > 80) fail('name', 'Занадто довге ім’я');

    const phone = normalizePhone(data.phone);
    if (!phone) fail('phone', 'Формат: +380XXXXXXXXX або 0XXXXXXXXX');
    else data.phone = phone;

    if (!data.service || SERVICES.indexOf(data.service) === -1) {
      fail('service', 'Оберіть послугу зі списку');
    }

    if (data.date) {
      const picked = new Date(data.date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(picked.getTime())) fail('date', 'Некоректна дата');
      else if (picked < today) fail('date', 'Оберіть сьогоднішню або майбутню дату');
    }

    if (data.car.length > 80) fail('car', 'Занадто довга назва');

    if (firstBad) {
      const input = fieldBox(firstBad).querySelector('input, select');
      if (input) input.focus();
      return null;
    }
    return data;
  }

  /* ---------------- submit ---------------- */

  function setLoading(isLoading) {
    sending = isLoading;
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('is-loading', isLoading);
    submitLabel.textContent = isLoading ? 'Надсилаємо…' : 'Надіслати заявку';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (sending) return;

    hideMessage();
    const data = validate();
    if (!data) return;

    const payload = {
      name: data.name,
      phone: data.phone,
      car: data.car,
      service: data.service,
      date: data.date,
      company: form.elements.company.value,          // honeypot
      elapsedMs: Date.now() - openedAt,              // анти-бот: миттєві сабміти
      pageUrl: location.href,
      photos: photos.map(function (p) {
        return { fileName: p.fileName, mime: p.mime, data: p.base64 };
      })
    };

    setLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, CONFIG.requestTimeoutMs);

    try {
      const response = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      let result = {};
      try { result = await response.json(); } catch (_) { /* нехай буде порожньо */ }

      if (!response.ok || !result.ok) {
        if (result.fields) {
          Object.keys(result.fields).forEach(function (key) {
            setFieldError(key, result.fields[key]);
          });
        }
        throw new Error(result.error || 'Сервер повернув помилку ' + response.status);
      }

      form.reset();
      clearPhotos();
      clearErrors();
      showMessage('Дякуємо! Заявку прийнято — адміністратор зв’яжеться з вами протягом 15 хвилин.', false);

    } catch (err) {
      const aborted = err && err.name === 'AbortError';
      console.error('[booking] submit failed', err);
      showMessage(
        aborted
          ? 'Перевищено час очікування. Перевірте зв’язок і спробуйте ще раз або телефонуйте +380 (67) 123-45-67.'
          : 'Не вдалося надіслати заявку. Спробуйте ще раз або телефонуйте +380 (67) 123-45-67.',
        true
      );
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  });
})();
