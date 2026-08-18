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
├─ index.html               головна сторінка
├─ 404.html
├─ robots.txt · sitemap.xml
├─ css/
│  └─ style.css             дизайн-токени + усі компоненти
├─ js/
│  └─ main.js               1) UI  2) форма заявки
├─ public/                  статичні ассети
│  ├─ images/               реальні фото (зараз — заглушки з Unsplash)
│  ├─ favicon.ico · favicon.svg
│  └─ og-image.jpg          прев'ю для соцмереж і месенджерів
├─ api/
│  └─ submit-form.js        Vercel Function: валідація + Telegram
├─ scripts/
│  └─ dev-server.mjs        локальний сервер без Vercel CLI
├─ docs/
│  └─ prototype.html        вихідний односторінковий прототип
├─ vercel.json              роутинг, заголовки безпеки, кешування
├─ package.json             "type": "module" — потрібен для ESM у api/
├─ .env.local               токени, у git не потрапляє
├─ .env.example
└─ README.md
```

### Про веб-корінь

`index.html` лежить у корені, тож у `vercel.json` явно задано
`"outputDirectory": "."`. Це важливо: **за замовчуванням Vercel віддає теку
`public/` як веб-корінь, якщо вона існує** — і головна сторінка просто не
знайшлася б.

Наслідок: публічно доступним стає весь корінь репозиторію, тому службові
файли виключені через `.vercelignore` (`docs/`, `scripts/`, `memory/`,
`README.md`, `.env.example`). `package.json` там залишено свідомо — Vercel
бере з нього `"type": "module"`, без якого ESM-функція в `api/` не стартує.

Тека `public/` віддається за буквальним шляхом — `/public/og-image.jpg`.
Для звичних кореневих адрес `/favicon.ico` і `/og-image.jpg` у `vercel.json`
налаштовані rewrites.

---

## Як працює форма

```
браузер                          Vercel Function                Telegram
───────                          ───────────────                ────────
валідація полів
стиснення фото (canvas)
  2400×1800 → 1600px, JPEG
POST /api/submit-form ───────►   honeypot + анти-бот
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
віддає статику з кореня й запускає ту саму функцію `api/submit-form.js`.

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
`index.html` (canonical + og:url + og:image + JSON-LD), `robots.txt`,
`sitemap.xml`.

---

## Ліміти

| Параметр | Значення | Де змінити |
|---|---|---|
| Кількість фото | 6 | `CONFIG.maxPhotos` + `LIMITS.maxPhotos` |
| Розмір після стиснення | до ~2.6 МБ сумарно | `CONFIG.totalBudgetBytes` |
| Довша сторона фото | 1600 px | `CONFIG.maxDimension` |
| Таймаут запиту | 30 с | `CONFIG.requestTimeoutMs` + `vercel.json` |
| Rate limit | 5 / 10 хв на IP | `LIMITS.rateWindowMs` |

`CONFIG` — у `js/main.js`, `LIMITS` — у `api/submit-form.js`.
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
