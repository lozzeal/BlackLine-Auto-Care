# public/images

Тека для реальних фото студії — зараз сайт використовує заглушки з Unsplash.

## Як замінити заглушки

1. Складіть сюди фото. Рекомендації:
   - формат **WebP** (за відсутності — JPEG, якість 80–85);
   - ширина: `hero` — 1920px, картки послуг — 900px, before/after — 1600px;
   - вага одного файлу — до 300 КБ.
2. Іменуйте за призначенням, напр.:
   ```
   hero.webp
   service-wash.webp        service-polish.webp
   service-ceramic.webp     service-interior.webp
   service-ppf.webp         service-headlights.webp
   before.webp              after.webp
   booking.webp
   ```
3. У `index.html` замініть `src` на `/public/images/<файл>`
   і приберіть параметри Unsplash (`?q=80&w=...`).
4. Атрибути `width` / `height` мають відповідати реальним розмірам —
   інакше поїде верстка під час завантаження (CLS).
5. У `vercel.json` в директиві CSP приберіть `https://images.unsplash.com`
   з `img-src`, коли зовнішніх картинок не залишиться.

## Before / After

Зараз обидва боки слайдера показують **одне й те саме фото** — «до»
відрізняється лише CSS-фільтром (`.ba-before`). Коли зʼявиться справжня
пара знімків, підставте різні файли й приберіть фільтр із `css/style.css`.
