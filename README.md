# BlackLine Auto Care

Сайт студії преміального автодетейлінгу (Київ) з робочою формою заявки:
клієнт заповнює форму, додає фото авто — заявка миттєво падає в Telegram
адміністратора разом із фотографіями.

Портфоліо-кейс: статичний фронтенд + одна serverless-функція, без фреймворків,
без збірки та без runtime-залежностей.

---

## Структура

```
blackline-auto-care/
├─ public/                    ← статика, яку віддає Vercel
│  ├─ index.html              головна сторінка
│  ├─ 404.html
│  ├─ favicon.svg
│  ├─ robots.txt · sitemap.xml
│  └─ assets/
│     ├─ css/style.css        стилі (дизайн-токени + компоненти)
│     └─ js/
│        ├─ ui.js             хедер, меню, reveal, before/after слайдер
│        └─ booking.js        валідація, стиснення фото, відправка форми
├─ api/
│  └─ booking.js              Vercel Function: валідація + Telegram
├─ scripts/
│  └─ dev-server.mjs          локальний сервер без Vercel CLI
├─ docs/
│  └─ prototype.html          вихідний односторінковий прототип
├─ vercel.json                роутинг, заголовки безпеки, кешування
└─ .env.example
```

---

## Як працює форма

```
браузер                          Vercel Function                Telegram
───────                          ───────────────                ────────
валідація полів
стиснення фото (canvas)
  2400×1800 → 1600px, JPEG
POST /api/booking  ──────────►   honeypot + анти-бот
  JSON, фото в base64            валідація полів
                                 перевірка сигнатур файлів
                                 rate limit по IP
                                                 ──────────►    sendMessage
                                                 ──────────►    sendMediaGroup
◄────────────────────────────    { ok, ref, photosDelivered }
показ підтвердження
```

**Чому base64, а не multipart:** ліміт тіла запиту на Vercel — 4.5 МБ на всі
рантайми. Фото стискаються ще в браузері до ~250 КБ кожне, тож накладні 33%
від base64 не заважають, а серверний код лишається без залежностей
(жодного `busboy`/`formidable`).

### Захист

| Механізм | Де | Що робить |
|---|---|---|
| Honeypot-поле `company` | клієнт + сервер | заповнене ботом → тихий `200`, у чат нічого не йде |
| Мінімальний час заповнення | сервер | сабміт швидше 1.5 с відкидається |
| Rate limit | сервер | 5 заявок з IP за 10 хв (best-effort, інстанси не спільні) |
| Сигнатури файлів | сервер | перевіряє реальні байти JPEG/PNG/WEBP, а не заявлений MIME |
| Екранування HTML | сервер | інʼєкція розмітки в Telegram-повідомлення неможлива |
| Whitelist послуг | сервер | приймаються лише 6 послуг зі списку |
| CSP + заголовки безпеки | `vercel.json` | `script-src 'self'`, `frame-ancestors 'none'` тощо |

Якщо заявка дійшла, а фото — ні, заявка **не втрачається**: у чат
додатково падає попередження з номером заявки.

---

## Локальний запуск

```bash
npm run dev
```

Відкриє http://localhost:3000. Vercel CLI не потрібен — `scripts/dev-server.mjs`
віддає статику й запускає ту саму функцію `api/booking.js`.

Без налаштованих змінних оточення форма чесно поверне `503` — так само, як
поводився б прод. Щоб перевірити відправку в Telegram локально, створіть
`.env.local`:

```
TELEGRAM_BOT_TOKEN=123456:AA...
TELEGRAM_CHAT_ID=-1001234567890
```

Перевірка синтаксису всіх JS-файлів:

```bash
npm run check
```

---

## Налаштування Telegram

1. У Telegram напишіть [@BotFather](https://t.me/BotFather) → `/newbot` →
   отримайте `TELEGRAM_BOT_TOKEN`.
2. Створіть групу для заявок і додайте туди бота (або пишіть боту напряму).
3. Дізнайтесь `TELEGRAM_CHAT_ID`:
   - надішліть будь-яке повідомлення в групу;
   - відкрийте `https://api.telegram.org/bot<ТОКЕН>/getUpdates`;
   - візьміть `message.chat.id` (у груп він відʼємний, напр. `-1001234567890`).
4. Якщо заявки мають падати в окремий топік форум-групи — додайте
   `TELEGRAM_THREAD_ID`.

> Бот не побачить повідомлень у групі, доки в BotFather увімкнено privacy mode,
> але для **надсилання** заявок цього достатньо — вимикати нічого не треба.

---

## Деплой на Vercel

```bash
npm i -g vercel
vercel link
vercel --prod
```

Або через веб: New Project → імпорт репозиторію. Vercel сам підхопить
`vercel.json`; framework preset — **Other**, build command не потрібен.

Далі **обовʼязково**: Project Settings → Environment Variables →
додати `TELEGRAM_BOT_TOKEN` і `TELEGRAM_CHAT_ID` для оточень
Production / Preview / Development → зробити redeploy.

Після деплою заміните домен у трьох місцях:
`public/index.html` (canonical + og:url + JSON-LD), `public/robots.txt`,
`public/sitemap.xml`.

---

## Ліміти

| Параметр | Значення | Де змінити |
|---|---|---|
| Кількість фото | 6 | `CONFIG.maxPhotos` + `LIMITS.maxPhotos` |
| Розмір після стиснення | до ~2.6 МБ сумарно | `CONFIG.totalBudgetBytes` |
| Довша сторона фото | 1600 px | `CONFIG.maxDimension` |
| Таймаут запиту | 30 с | `CONFIG.requestTimeoutMs` + `vercel.json` |
| Rate limit | 5 / 10 хв на IP | `LIMITS.rateWindowMs` |

`CONFIG` — у `public/assets/js/booking.js`, `LIMITS` — у `api/booking.js`.
Змінюючи ліміти фото, правте обидва файли.

---

## Що взято з прототипу без змін

Дизайн, тексти, порядок і структура секцій — з `docs/prototype.html`.
Технічні доповнення: розбиття на файли, SEO-метадані та JSON-LD,
доступність (skip-link, `aria-*`, привʼязані `label`), lazy-loading зображень,
робоче завантаження фото замість статичної підказки, і серверна частина.

Єдина зміна в текстах: блок «Фото авто можна буде додати після відправки
форми» став реальним полем завантаження, тож напис описує те, що там тепер є.
Під кнопкою додано рядок про згоду на обробку контактних даних.
