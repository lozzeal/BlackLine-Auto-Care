/**
 * POST /api/booking
 *
 * Приймає заявку з сайту (JSON + фото у base64), валідує її на сервері
 * та надсилає в Telegram: спершу текст заявки, потім альбом з фото.
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN  — токен бота від @BotFather        (обов'язково)
 *   TELEGRAM_CHAT_ID    — id чату/каналу/групи призначення (обов'язково)
 *   TELEGRAM_THREAD_ID  — id топіка у форум-групі          (опційно)
 */

// TELEGRAM_API_BASE перевизначається лише в тестах (локальний фейковий Telegram).
const TELEGRAM_API = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org/bot';

const LIMITS = {
  maxPhotos: 6,
  maxPhotoBytes: 5 * 1024 * 1024,
  maxTotalPhotoBytes: 8 * 1024 * 1024,
  minElapsedMs: 1500,           // швидше за це заповнити форму людина не встигає
  rateWindowMs: 10 * 60 * 1000,
  rateMaxRequests: 5
};

const SERVICES = [
  'Комплексне миття',
  'Полірування кузова',
  'Керамічне покриття',
  'Хімчистка салону',
  'Захисна плівка (PPF)',
  'Полірування фар / дисків'
];

/* Best-effort rate limit. Serverless-інстанси недовговічні й не спільні,
   тож це відсікає лише примітивний флуд — не заміна WAF. */
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < LIMITS.rateWindowMs);
  recent.push(now);
  hits.set(ip, recent);

  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (!times.length || now - times[times.length - 1] > LIMITS.rateWindowMs) hits.delete(key);
    }
  }
  return recent.length > LIMITS.rateMaxRequests;
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cleanText(value, maxLength) {
  return String(value ?? '')
    .replace(/\p{Cc}/gu, ' ')   // керуючі символи
    .trim()
    .slice(0, maxLength);
}

function normalizePhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 9) digits = '380' + digits;
  else if (digits.length === 10 && digits[0] === '0') digits = '38' + digits;
  return /^380\d{9}$/.test(digits) ? '+' + digits : null;
}

/** Перевіряємо реальний тип за сигнатурою файлу, а не за заявленим mime. */
function sniffImage(buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.toString('hex', 0, 8) === '89504e470d0a1a0a') return 'image/png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function validate(payload) {
  const fields = {};
  const data = {};

  data.name = cleanText(payload.name, 80);
  if (data.name.length < 2) fields.name = 'Вкажіть ім’я';

  data.phone = normalizePhone(payload.phone);
  if (!data.phone) fields.phone = 'Некоректний номер телефону';

  data.service = cleanText(payload.service, 60);
  if (!SERVICES.includes(data.service)) fields.service = 'Оберіть послугу зі списку';

  data.car = cleanText(payload.car, 80);

  data.date = '';
  const rawDate = cleanText(payload.date, 10);
  if (rawDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(Date.parse(rawDate + 'T00:00:00Z'))) {
      fields.date = 'Некоректна дата';
    } else {
      data.date = rawDate;
    }
  }

  data.pageUrl = cleanText(payload.pageUrl, 200);

  return { data, fields };
}

function decodePhotos(rawPhotos) {
  if (!Array.isArray(rawPhotos) || !rawPhotos.length) return { photos: [], error: null };
  if (rawPhotos.length > LIMITS.maxPhotos) {
    return { photos: [], error: `Забагато фото (максимум ${LIMITS.maxPhotos})` };
  }

  const photos = [];
  let total = 0;

  for (const item of rawPhotos) {
    if (!item || typeof item.data !== 'string') continue;

    const buffer = Buffer.from(item.data, 'base64');
    if (!buffer.length) continue;
    if (buffer.length > LIMITS.maxPhotoBytes) return { photos: [], error: 'Одне з фото завелике' };

    const mime = sniffImage(buffer);
    if (!mime) return { photos: [], error: 'Один із файлів не є зображенням' };

    total += buffer.length;
    if (total > LIMITS.maxTotalPhotoBytes) return { photos: [], error: 'Сумарний розмір фото завеликий' };

    photos.push({ buffer, mime, fileName: cleanText(item.fileName, 60) || 'photo.jpg' });
  }

  return { photos, error: null };
}

function kyivTimestamp() {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date());
}

function buildMessage(data, ref, photoCount) {
  const lines = [
    '🚗 <b>Нова заявка — BlackLine Auto Care</b>',
    `<code>${ref}</code>`,
    '',
    `👤 <b>Ім’я:</b> ${escapeHtml(data.name)}`,
    `📞 <b>Телефон:</b> <a href="tel:${escapeHtml(data.phone)}">${escapeHtml(data.phone)}</a>`,
    `🧰 <b>Послуга:</b> ${escapeHtml(data.service)}`
  ];

  if (data.car) lines.push(`🚙 <b>Авто:</b> ${escapeHtml(data.car)}`);
  if (data.date) {
    const [y, m, d] = data.date.split('-');
    lines.push(`📅 <b>Бажана дата:</b> ${d}.${m}.${y}`);
  }
  lines.push(`📷 <b>Фото:</b> ${photoCount ? photoCount + ' шт.' : '—'}`);
  lines.push('', `🕐 ${kyivTimestamp()} (Київ)`);

  return lines.join('\n');
}

async function telegram(method, body, isFormData) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const response = await fetch(`${TELEGRAM_API}${token}/${method}`, {
    method: 'POST',
    headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
    body: isFormData ? body : JSON.stringify(body)
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(`Telegram ${method} failed: ${result.description || response.status}`);
  }
  return result;
}

async function sendPhotos(photos, chatId, threadId, ref) {
  const caption = `📷 Фото до заявки <code>${ref}</code>`;

  if (photos.length === 1) {
    const form = new FormData();
    form.append('chat_id', chatId);
    if (threadId) form.append('message_thread_id', threadId);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('photo', new Blob([photos[0].buffer], { type: photos[0].mime }), photos[0].fileName);
    return telegram('sendPhoto', form, true);
  }

  const form = new FormData();
  form.append('chat_id', chatId);
  if (threadId) form.append('message_thread_id', threadId);
  form.append('media', JSON.stringify(photos.map((photo, i) => ({
    type: 'photo',
    media: `attach://file${i}`,
    ...(i === 0 ? { caption, parse_mode: 'HTML' } : {})
  }))));
  photos.forEach((photo, i) => {
    form.append(`file${i}`, new Blob([photo.buffer], { type: photo.mime }), photo.fileName);
  });

  return telegram('sendMediaGroup', form, true);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'Метод не підтримується' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const threadId = process.env.TELEGRAM_THREAD_ID || '';

  if (!token || !chatId) {
    console.error('[booking] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не налаштовані');
    return res.status(503).json({
      ok: false,
      error: 'Форма тимчасово недоступна. Зателефонуйте, будь ласка, +380 (67) 123-45-67.'
    });
  }

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ ok: false, error: 'Забагато спроб. Спробуйте за кілька хвилин.' });
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch {
    return res.status(400).json({ ok: false, error: 'Некоректний формат запиту' });
  }

  // Анти-бот: honeypot має лишатись порожнім, а форма — не сабмітитись миттєво.
  const tooFast = Number(payload.elapsedMs) >= 0 && Number(payload.elapsedMs) < LIMITS.minElapsedMs;
  if (cleanText(payload.company, 50) || tooFast) {
    console.warn('[booking] відкинуто як бот', { honeypot: Boolean(payload.company), elapsedMs: payload.elapsedMs });
    return res.status(200).json({ ok: true });   // мовчазний успіх — не підказуємо боту
  }

  const { data, fields } = validate(payload);
  if (Object.keys(fields).length) {
    return res.status(422).json({ ok: false, error: 'Перевірте заповнені поля', fields });
  }

  const { photos, error: photoError } = decodePhotos(payload.photos);
  if (photoError) {
    return res.status(422).json({ ok: false, error: photoError, fields: { photos: photoError } });
  }

  const ref = 'BLK-' + Date.now().toString(36).toUpperCase().slice(-6);

  try {
    await telegram('sendMessage', {
      chat_id: chatId,
      ...(threadId ? { message_thread_id: threadId } : {}),
      text: buildMessage(data, ref, photos.length),
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
  } catch (err) {
    console.error('[booking] не вдалося надіслати заявку в Telegram', err);
    return res.status(502).json({
      ok: false,
      error: 'Не вдалося надіслати заявку. Спробуйте ще раз або зателефонуйте +380 (67) 123-45-67.'
    });
  }

  // Заявка вже в чаті. Якщо фото не долетіли — це не привід валити всю відправку.
  let photosDelivered = true;
  if (photos.length) {
    try {
      await sendPhotos(photos, chatId, threadId, ref);
    } catch (err) {
      photosDelivered = false;
      console.error('[booking] не вдалося надіслати фото', err);
      try {
        await telegram('sendMessage', {
          chat_id: chatId,
          ...(threadId ? { message_thread_id: threadId } : {}),
          text: `⚠️ Заявка <code>${ref}</code>: не вдалося доставити ${photos.length} фото. Попросіть клієнта надіслати їх у месенджер.`,
          parse_mode: 'HTML'
        });
      } catch { /* вже й так у логах */ }
    }
  }

  return res.status(200).json({ ok: true, ref, photos: photos.length, photosDelivered });
}
