# Медіа-бриф: фото та відео для сайту

Специфікація на генерацію графіки замість Unsplash-заглушок.
Розміри слотів зняті з реального рендеру, не оцінені на око.

**Разом: 11 фото + 1 відео у двох форматах.**

---

## Три речі, які треба знати до генерації

### 1. CSS гасить усі фото

| Слот | Фільтр у `css/style.css` |
|---|---|
| Hero | `brightness(0.55) saturate(1.05)` |
| Картки послуг | `saturate(1.05) contrast(1.05)` |
| Before (ліва половина) | `grayscale(0.9) brightness(0.6) contrast(0.9)` |
| Booking | `brightness(0.65) saturate(1.05)` |

Hero втрачає майже половину яскравості. Генеруйте **світліше й контрастніше**,
ніж хочете бачити на сайті, з вираженими бліками — інакше кадр стане каламутним.

### 2. Пропорції слотів «пливуть»

| Слот | Десктоп 1440 | Мобільний 375 | Розмах |
|---|---|---|---|
| Hero | 1425×1149 (1.24) | 375×1100 (0.34) | ×3.6 |
| Картка послуги | 392×200 (1.96) | 333×200 (1.67) | ×1.2 |
| Before/After | 1225×612 (2.00) | 335×168 (2.00) | фіксовано |
| Booking | 611×772 (0.79) | 333×222 (1.50) | ×1.9, орієнтація перевертається |

Усі зображення виводяться через `object-fit: cover` — зайве обрізається.
Hero на мобільному показує лише ~19% ширини кадру, тому для нього потрібен
окремий вертикальний варіант і `<picture>`.

### 3. Hero перекритий градієнтами

```
linear-gradient(180deg, 0.35 → 0.35 at 30% → 0.97 at 92%)   вертикальний
linear-gradient(90deg,  0.85 → 0.15 at 55%)                 горизонтальний
```

Ліві 55% затемнені (там заголовок), нижні 8% майже чорні.
**Робоче вікно кадру: права половина, вертикально 30–70%.**

---

## Фото

Формат — **WebP, якість 80–85**. Загальний бюджет усіх фото ≈ 2 МБ.

### Hero (2 файли)

| Файл | Розмір | Вага |
|---|---|---|
| `hero.webp` | 2560×1440 | ≤ 350 КБ |
| `hero-mobile.webp` | 1080×2160 | ≤ 250 КБ |

> Photorealistic wide shot of a black premium SUV (Porsche Cayenne / BMW X5
> style, left-hand drive) in a dark detailing studio. Wet-look glossy paint with
> long specular highlights running along the body line. Background near-black
> #0D1014. Key light from upper right, cyan-teal rim light #54D6E3 along the
> roofline and front fender, subtle warm amber #CBA35C bounce on the far side.
> Polished dark concrete floor with soft reflections. Light atmospheric haze.
> Car positioned in the right half of frame, three-quarter front view. High key
> on the metal, deep blacks in the shadows. No text, no logos, no license plate,
> no people. 35mm, f/4, cinematic.

Для `hero-mobile` — той самий опис плюс:
*vertical composition, car centered, generous headroom above and floor below.*

### Картки послуг (6 файлів)

Усі **1200×600 (2:1)**, ≤ 150 КБ. Нижні 40% перекриває градієнт із ціною —
сюжет тримати у верхніх двох третинах.

| Файл | Ядро промпту |
|---|---|
| `service-wash.webp` | Gloved hands washing a black car with thick white foam cascading down the door panel, foam lance mist, water droplets frozen mid-air |
| `service-polish.webp` | Close-up of a dual-action polisher with orange foam pad on black paint, swirl marks visible ahead of the pad and mirror gloss behind it, bright work lamp raking across the surface |
| `service-ceramic.webp` | Gloved hand applying ceramic coating with a suede applicator block, iridescent wet sheen spreading on black paint, tight water beading nearby |
| `service-interior.webp` | Steam / extraction cleaning of a leather car seat, visible steam wand, half-cleaned contrast on the bolster, dark cabin, warm amber light through the window |
| `service-ppf.webp` | Installer squeegeeing a transparent protective film onto a black hood, film edge lifted and catching light, spray bottle mist, precision gloves |
| `service-headlights.webp` | Close-up of a restored LED headlight on a black car, crystal-clear lens, cyan light bloom inside the reflector, polished alloy wheel blurred behind |

Спільний хвіст до кожного:

> …dark detailing studio, near-black background #0D1014, cyan-teal accent light
> #54D6E3, photorealistic, shallow depth of field, 50mm, no text, no logos,
> no watermarks.

### Before / After

| Файл | Розмір | Вага |
|---|---|---|
| `after.webp` | 2000×1000 (2:1) | ≤ 300 КБ |
| `before.webp` | те саме | ≤ 300 КБ |

**`before` не генерувати окремо.** Слайдер тримається на тому, що обидва кадри
збігаються попіксельно: рухається лише лінія розділу. Дві незалежні генерації
дадуть дві різні машини й ілюзія розсиплеться.

Порядок дій:
1. Згенерувати `after.webp`.
2. `before.webp` зробити **редагуванням того самого файлу** (inpaint): пил,
   розводи, тьмяний лак, павутинка подряпин, брудні диски. Геометрія та
   ракурс зберігаються.

Запасний варіант: лишити тільки `after.webp` — тоді «до» робить CSS-фільтр
`.ba-before`, як зараз. Виглядає пристойно.

> Photorealistic three-quarter front view of a black sedan in a dark studio,
> perfectly detailed: mirror-gloss paint, crisp reflections of overhead light
> strips, clean glass, dark polished wheels. Even lighting across the whole car,
> subject centered, horizontal 2:1 composition. No text, no plates, no people.

### Booking

`booking.webp` — **1600×2000 (0.8)**, ≤ 250 КБ.

Найпідступніший слот: на десктопі вертикальний, на мобільному — горизонтальна
смуга. Сюжет строго по центру, із запасом зверху й знизу.

> A detailing master in black uniform and nitrile gloves inspecting a black
> car's paint with an LED inspection torch, beam raking across the surface
> revealing gloss. Three-quarter back view of the person, face not prominent.
> Dark studio, cyan-teal accent #54D6E3 on the background wall, warm rim light
> on the shoulder. Vertical composition, subject centered. Photorealistic,
> 50mm, f/2.8. No text, no logos.

---

## Відео

### Hero-луп

| Файл | Кодек | Вага |
|---|---|---|
| `public/video/hero-loop.mp4` | H.264 High | ≤ 2.5 МБ |
| `public/video/hero-loop.webm` | VP9 | ≤ 1.8 МБ |

- 1920×1080, **6–8 секунд**, безшовний цикл
- **без звукової доріжки взагалі** (не «тиша», а відсутній аудіотрек)
- сюжет: повільний проїзд камери вздовж кузова, або блік, що пливе по лаку,
  або крапля, що скочується по глянцю
- жодних різких рухів і монтажних склейок — це фон під заголовком

Реалізація в коді (робиться після отримання файлів):
`autoplay muted loop playsinline`, `poster="/public/images/hero.webp"`,
вимкнення завантаження на мобільному, зупинка при `prefers-reduced-motion`.

CSP правити не треба: `default-src 'self'` покриває медіа з власного домену.

### Опційно

Короткий луп для панелі booking — той самий майстер із ліхтарем.
Не обовʼязковий; вимоги ті самі.

---

## Наскрізні правила

- **Ліворульні авто.** Праворулька в київській студії читається як помилка.
- **Жодного тексту, логотипів, водяних знаків, номерних знаків** —
  найчастіша ознака згенерованого зображення.
- **Обличчя великим планом не треба.** Руки, силует, вид зі спини —
  надійніше й не старіє.
- **Одна колірна температура на всі 11 кадрів.** Різнобій між картками
  послуг помітний одразу, бо вони лежать поруч у сітці.
- Палітра: `#0D1014` фон · `#54D6E3` акцент · `#CBA35C` теплий вторинний.

---

## Що робиться після отримання файлів

1. Підключити файли замість Unsplash у `index.html`.
2. Виправити `width` / `height` у картках послуг — зараз стоїть 900×600,
   а реальна пропорція 2:1.
3. Додати `<picture>` для hero (десктоп / мобільний).
4. Змонтувати відео-фон у hero з poster і fallback.
5. Прибрати `https://images.unsplash.com` з `img-src` у CSP (`vercel.json`).
6. Якщо буде справжня пара before/after — прибрати фільтр `.ba-before`
   з `css/style.css`.
