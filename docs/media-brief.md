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

---

# Уточнені промпти для hero (після першої ітерації)

Перша партія згенерованих кадрів показала три системні промахи:
надто темна експозиція, авто по центру й на весь кадр, теплий блік
замість бірюзового. Плюс захаращений фон, який моделі image-to-video
розмивають у мазанину.

## Кадр під відео

```
Cinematic automotive photograph of a matte-black luxury SUV (generic, unbranded)
standing still inside a large empty detailing studio at night.

COMPOSITION: wide shot. The car is placed in the RIGHT HALF of the frame, front
three-quarter view angled toward the LEFT, front wheels turned slightly inward.
The car occupies about 55% of the frame width — leave generous empty negative
space on the left side, deep headroom above the roof, and clear polished floor
in the foreground. Low camera height, at chest level. 16:9.

LIGHT: bright luminous key light from the upper right creating one long unbroken
specular highlight running the full length of the shoulder line. A cyan-teal rim
light (#54D6E3) traces the roofline, windshield edge and front fender. Soft warm
amber (#CBA35C) bounce fills the far side. Elevated mid-tones, gentle contrast —
expose the frame ONE STOP BRIGHTER than a typical night studio shot, so the
glossy paint reads as dark graphite grey rather than pure black.

ENVIRONMENT: completely clean, empty, seamless dark backdrop. No equipment, no
tools, no trolleys, no shelving, no cables, no hoses, no signage, no wall stains.
Smooth polished concrete floor with a calm mirror reflection under the car. Thin
even atmospheric haze catching the light beams.

DETAILS: dark multi-spoke alloy wheels, clean glass, no brand badges, emblems or
lettering anywhere on the car, no license plate, no people, no reflections of
people.

TECHNICAL: 35mm lens, f/5.6, sharp throughout, photorealistic, high dynamic
range, natural colour.
```

Негативний промпт:

```
text, letters, logos, badges, emblems, watermark, license plate, people, human
silhouette, studio equipment, tool trolley, cables, hoses, shelves, graffiti,
posters, cluttered background, right-hand drive, deformed body panels, extra
wheels, blown highlights, heavy vignette, motion blur, crushed blacks, car
filling entire frame, tight crop
```

Ключові фрази, які лікують попередні промахи:
`expose one stop brighter`, `right half of the frame`,
`55% of the frame width`, `completely clean backdrop`.

## Відео (image-to-video)

Порожній простір ліворуч потрібен не тільки під заголовок — без нього
камері нікуди рухатись, і проїзд зріже кузов.

```
The car is parked and completely static. Camera performs a very slow lateral
dolly to the right, about 15 cm of travel across the whole shot, creating gentle
parallax between the car and the background. The specular highlight glides
slowly along the body line. Thin haze drifts softly to the left. The floor
reflection shimmers subtly.

The car itself does not move: wheels do not rotate, body does not shift or
settle, doors and hood stay closed. No people enter the frame. No cuts, no zoom,
no camera shake, no exposure changes. Locked-off cinematic look, 24fps.
```

Негатив:

```
wheels rotating, car driving, car moving, doors opening, hood opening, people
walking in, camera orbit, rapid zoom, handheld shake, flicker, morphing body
panels, warping reflections, appearing text or logos, scene change
```

Замовляти **5 секунд** — довші кліпи в i2v майже завжди «пливуть» до кінця.

## Безшовний цикл: маятник

Кліпи i2v практично ніколи не стикуються самі. Пряме відтворення + реверс
дає ідеальний стик, і для плавного лінійного проїзду виглядає природно.
З 5 секунд виходить 10-секундний цикл.

```bash
ffmpeg -i hero-raw.mp4 \
  -filter_complex "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,fps=25,scale=1920:1080:flags=lanczos" \
  -an -c:v libx264 -profile:v high -crf 26 -pix_fmt yuv420p -movflags +faststart \
  public/video/hero-loop.mp4
```

```bash
ffmpeg -i public/video/hero-loop.mp4 -an \
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 \
  public/video/hero-loop.webm
```

`-an` прибирає аудіотрек повністю, `+faststart` дозволяє почати
відтворення до повного завантаження файлу.

## Порядок роботи

1. Згенерувати кадр-кандидат.
2. **Перед** генерацією відео перевірити його в реальному слоті —
   з фільтрами й градієнтами, на десктопі та мобільному.
3. Тільки після цього анімувати.

Окреме рішення, яке треба ухвалити на цьому кроці: або кадр віддається
світлішим, або в `css/style.css` послаблюється `brightness(0.55)` до
приблизно `0.75` з компенсацією щільності градієнта під заголовком.
Другий шлях зберігає згенеровану картинку як є, але це вже правка
дизайну прототипу.

---

# Друга ітерація hero: заміряна ціль по експозиції

Кадр з другої спроби (Dodge Durango, 1182×665) перевірено в реальному
слоті — композиція влучна, але експозиції бракує.

## Результати тест-фіту

Композити лежать у `docs/preview/`:

| Файл | Що показує |
|---|---|
| `hero-desktop-current.png` | поточний CSS — авто практично зникає |
| `hero-desktop-soft.png` | той самий кадр із послабленим CSS — читається |
| `hero-mobile-current.png` | мобільний кроп — видно саму решітку |
| `hero-sharpness.png` | різкість: ×1.73 проти оригіналу 1:1 |
| `hero-target-exposure.png` | кадр, підтягнутий до потрібної яскравості |
| `hero-desktop-target-exposure.png` | він же під **незмінним** CSS — працює |

## Заміряна ціль

| Показник | Значення |
|---|---|
| Середня яскравість кадру зараз | 61.8 |
| Потрібно | **92.3** |
| Множник | **×1.49** |
| В стопах | **+0.6** |
| Апскейл на десктопі 1440 | ×1.73 (на 2560 — ×2.2) |

Рішення: **CSS не чіпаємо**, кадр перегенеровуємо світлішим.
`hero-target-exposure.png` можна давати генератору як референс стилю.

## Промпт (третя ітерація)

Три зміни проти попереднього:
1. прибрано `near-black background #0D1014` — саме він тягнув кадр у темряву;
   стіни мають бути **графітово-сірими**, темний фон сайту дає градієнт;
2. верхнє світло стало головним героєм — ряди лінійних LED і, головне,
   їхні **довгі паралельні відблиски по капоту й даху** (фірмовий кадр галузі);
3. прямі вказівки на експозицію: підняті тіні, деталі в чорному кузові.

```
Photorealistic wide interior shot of a matte-black luxury SUV (generic, unbranded)
parked inside a bright modern car detailing studio.

LIGHTING — the main subject of this shot:
The ceiling carries several rows of long linear LED tube fixtures running
front-to-back, clearly visible in the upper part of the frame. Their reflections
fall onto the car as LONG UNBROKEN PARALLEL LIGHT STREAKS gliding along the hood,
the roof and the door panels — the classic gloss-check lighting of a professional
detailing bay. Soft ambient fill bounces off the walls so shadows stay open and
detailed. A thin cyan-teal edge highlight (#54D6E3) traces ONLY the roofline and
the windshield frame — a light reflection, NOT a painted stripe on the hood.

EXPOSURE: bright, well-lit scene. Shadows are LIFTED with clearly visible detail
in the dark bodywork — no crushed blacks, no silhouette. The paint reads as dark
graphite grey with strong specular highlights, not as pure black. The image should
look noticeably brighter than a moody night studio shot.

ENVIRONMENT: clean empty studio with dark CHARCOAL GREY walls (not black), gently
lit by the ceiling fixtures. Polished light-grey epoxy floor with crisp mirror
reflections of the car and of the ceiling lights. No equipment, no tools, no
trolleys, no cables, no shelving, no signage. Very light atmospheric haze catching
the beams.

COMPOSITION: wide shot, car placed in the RIGHT HALF of the frame, front
three-quarter view angled toward the LEFT, occupying about 55% of the frame width.
Generous empty space on the left, headroom above the roof, clear floor in the
foreground. Low camera height at chest level.

DETAILS: dark multi-spoke alloy wheels, clean glass, no brand badges, emblems or
lettering, no license plate, no people.

TECHNICAL: 35mm lens, f/5.6, sharp throughout, high dynamic range, photorealistic
automotive photography, 2560x1440, 16:9.
```

Негатив:

```
dark, underexposed, crushed blacks, silhouette, moody night scene, black walls,
heavy vignette, text, letters, logos, badges, emblems, watermark, license plate,
people, studio equipment, trolleys, cables, shelves, cluttered background,
right-hand drive, deformed body panels, cyan stripe painted on hood, tight crop,
car filling entire frame
```

## Стан у коді

`index.html` уже вказує на `/public/images/hero.png` (кадр другої ітерації).
Поки не приїде світліша версія, hero на сайті виглядає недоекспонованим.

---

# Промпт для відео під фінальний hero-кадр

Складено під конкретне фото `public/images/hero.webp` (2560×1429).

Два обмеження, які визначили рішення:

1. **Повторювані патерни.** У кадрі ряди стельових ламп і грати решітки
   Dodge — саме такі структури i2v-моделі найчастіше перемальовують і
   «пливуть». Їхню стабільність прописано явно.
2. **Композиція без запасу.** Авто в правій половині, задок уже зрізаний
   краєм кадру. Боковий проїзд або заведе його під заголовок, або виштовхне
   за межі. Тому не проїзд, а майже непомітний наїзд.

## Промпт

```
A parked matte-black SUV inside a bright detailing studio. The car is completely
static — it does not move, roll, or settle.

MOTION:
The camera performs an extremely slow, smooth dolly push-in toward the car — no
more than a 5% change in framing across the entire clip. As the camera creeps
forward, the long parallel reflections of the ceiling LED tubes glide slowly and
continuously along the hood, the roof and the door panels, revealing the depth of
the gloss. Thin atmospheric haze drifts gently to the left. The floor reflection
shimmers faintly beneath the car.

STABILITY:
Constant exposure and constant colour throughout — the shot must not get darker
or brighter over time. No fade in, no fade out. The ceiling light fixtures keep
their exact number, spacing and shape. The grille slats keep their exact pattern.
The wheels do not rotate. Doors, hood and mirrors stay closed and fixed. No
people, no reflections of people. No cuts, no camera shake, no zoom snaps.

Locked-off cinematic automotive commercial, photorealistic, 24fps.
```

Негатив:

```
wheels rotating, car driving, car rolling, car moving, doors opening, hood
opening, people, human silhouette, camera orbit, camera shake, handheld, fast
zoom, whip pan, scene change, cut, flicker, exposure shift, darkening, fade to
black, morphing ceiling lights, changing number of lights, warping grille,
melting reflections, deforming body panels, appearing text, logos, watermark,
license plate
```

## Налаштування

| Параметр | Значення |
|---|---|
| Вхідне зображення | `public/images/hero.webp` (2560×1429) |
| Тривалість | 5 секунд |
| Motion strength | **низький, 2–3 з 10** — вирішує більше за сам промпт |
| FPS | 24 |
| Звук | не потрібен |

## Чек-лист приймання дубля

Робити 2–3 генерації, i2v — лотерея. Перевіряти по черзі:

1. стельові лампи — чи не змінюється кількість і нахил до кінця кліпу;
2. решітка — чи не пливуть грати;
3. колеса — чи не почали обертатися;
4. яскравість — чи не темнішає кадр (це вб'є його під `brightness(0.55)`);
5. задок — чи не виповз за правий край сильніше, ніж на старті.

Запасний варіант, якщо наїзд завеликий: прибрати блок про dolly і лишити
саму рухому світлотінь — камера нерухома, ковзають лише відблиски й серпанок.
Для фону під заголовком достатньо, ризик артефактів майже нульовий.

## Роздільність відео

Тут вимоги нижчі, ніж до фото: рух маскує мʼякість значно краще за статику,
а перший кадр до завантаження відео — це `poster`, тобто різкий 2560×1429.
1280×720 з генератора цілком прийнятно.

## Збірка циклу

Маятник для наїзду працює особливо добре: пряме відтворення плюс реверс
дають повільне «дихання» замість стрибка на стику.

```bash
ffmpeg -i hero-raw.mp4 \
  -filter_complex "[0:v]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,fps=25,scale=1920:1080:flags=lanczos" \
  -an -c:v libx264 -profile:v high -crf 26 -pix_fmt yuv420p -movflags +faststart \
  public/video/hero-loop.mp4
```

```bash
ffmpeg -i public/video/hero-loop.mp4 -an \
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 \
  public/video/hero-loop.webm
```

---

# Промпти для решти зображень (фінальна редакція)

Складено після досвіду з hero. Замінює ранні варіанти вище.

## Уточнення по фільтрах

Раніше в брифі було сказано, що CSS гасить усі фото — це неточно.
Перевірено по кожному слоту:

| Слот | Фільтр | Наслідок для генерації |
|---|---|---|
| Hero | `brightness(0.55) saturate(1.05)` | треба сильно світліше |
| Booking | `brightness(0.65) saturate(1.05)` | треба світліше |
| Картки послуг | `saturate(1.05) contrast(1.05)` | **яскравість не чіпається, знімати нормально** |
| `.ba-after` | без фільтра | нормально |
| `.ba-before` | `grayscale(0.9) brightness(0.6) contrast(0.9)` | прибрати, якщо буде справжня пара |

## Before / After — крупний план капота

Загальний план авто в слайдері не працює: різниці на дистанції не видно.
Крупний план лаку показує саме те, за що платять.

**Умова:** слайдер тримає два повнокадрові знімки ОДНОГО капота, а не
один кадр, поділений навпіл. Рухається лише лінія розділу, тож файли
мають збігатися попіксельно.

### Крок 1 — `after` (16:9, далі обрізається до 2:1)

```
Photorealistic close-up of the hood and front fender of a black car, shot at a low
oblique angle so the paint surface fills the entire frame.

The paint is flawless: deep mirror-like gloss reflecting long parallel ceiling LED
tubes as crisp unbroken lines with hard edges, like light on glass. Visible depth
in the clear coat, wet-look richness.

Bright modern detailing studio, dark charcoal grey surroundings, lifted shadows
with clear detail. The hood surface fills the frame edge to edge — no sky, no
background clutter, no horizon.

No text, no badges, no emblems, no wipers, no people, no reflections of people.
50mm, f/8, sharp throughout, high dynamic range.
```

### Крок 2 — `before` через Image-to-Image

Вхід — щойно згенерований `after`. **Strength / denoise 0.35–0.45.**
Вище — почне міняти ракурс.

```
The same hood, exactly the same camera angle, framing and light positions.
The clear coat is now dull and hazy, covered in fine circular swirl marks and
light scratches that scatter the light. Dried water spots and a layer of grey road
dust. The ceiling light reflections are blurred, broken and diffused instead of
sharp. Matte, lifeless surface.
```

Якщо i2i попливе — лишити тільки `after` і поточну схему з CSS-фільтром.

**При отриманні справжньої пари прибрати фільтр `.ba-before`** з
`css/style.css` — інакше він накладеться другим шаром на реальний бруд.

## Картки послуг — 6 штук

16:9 (обрізається до 2:1). Нижні 40% перекриває градієнт із ціною —
сюжет у верхніх двох третинах.

| Файл | Ядро промпту |
|---|---|
| `service-wash` | Gloved hands washing a black car door with a thick blanket of white snow foam sliding down the panel, foam lance mist in the air, water droplets caught in the light |
| `service-polish` | A dual-action polisher with an orange foam pad on black paint. Ahead of the pad the surface is dull with fine swirl marks; behind it the paint is mirror gloss. A bright inspection lamp rakes across the surface revealing the contrast |
| `service-ceramic` | A gloved hand applying ceramic coating with a suede applicator block onto black paint. The coated area has an iridescent wet sheen; tight round water beads sit on the finished section nearby |
| `service-interior` | Steam and extraction cleaning of a grey leather car seat. A steam wand in a gloved hand, visible steam, clear contrast between the cleaned half of the bolster and the soiled half. Warm light through the car window |
| `service-ppf` | An installer squeegeeing a transparent protective film onto a black car hood. The film edge is lifted and catches the light, showing its thickness. Spray bottle mist in the air, precision gloves |
| `service-headlights` | Close-up of a restored LED headlight on a black car: crystal-clear lens, sharp internal reflectors, cyan-teal light bloom inside. A polished dark alloy wheel blurred behind |

Спільний хвіст:

```
Bright modern detailing studio, dark charcoal grey background, rows of linear LED
ceiling lights reflecting on glossy surfaces. Lifted shadows, clear detail in dark
areas. Photorealistic, shallow depth of field, 50mm. Subject in the upper two
thirds of the frame. No text, no logos, no badges, no license plates, no faces.
```

**Генерувати всі шість за один захід, підряд** — вони лежать поруч
у сітці, різниця в колірній температурі там помітна найгостріше.

## Booking

Формат 3:4 (портрет). На десктопі слот вертикальний, на мобільному —
горизонтальна смуга, тож сюжет строго по центру.

```
A detailing master in black uniform and black nitrile gloves inspecting a black
car's paint with a handheld LED inspection torch. The beam rakes across the panel
revealing gloss and fine detail. Three-quarter view from behind the person, face
not visible.

Bright modern detailing studio, dark charcoal grey walls, linear LED ceiling
lights. Bright, well-lit scene with lifted shadows — no crushed blacks.

VERTICAL composition. The person and the car panel are CENTERED with generous
space above and below, so the frame survives being cropped both to a tall portrait
and to a wide banner.

No text, no logos, no badges, no license plate, no visible face.
50mm, f/2.8, photorealistic.
```

## Конвеєр обробки

1. Згенерувати в Leonardo (Styles → Clear all).
2. Прогнати через AI-апскейлер ×3 — як робили з hero.
3. Передати файли: конвертація у WebP, підключення, виправлення
   `width`/`height`, зняття фільтра `.ba-before` за наявності пари,
   видалення `images.unsplash.com` із CSP у `vercel.json`.
