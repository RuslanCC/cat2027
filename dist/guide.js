'use strict';

const packingGroups = [
  {
    title: 'Документы и деньги',
    items: [
      ['passport', 'Паспорт, билеты и подтверждение чартера'],
      ['entry', 'Travel Authorisation для въезда'],
      ['insurance', 'Страховка с покрытием отдыха на яхте'],
      ['money', 'Карта, работающая за рубежом, и наличные на мелкие расходы']
    ]
  },
  {
    title: 'Одежда и солнце',
    items: [
      ['bag', 'Мягкая дорожная сумка'],
      ['swim', 'Два-три купальника или пары плавок'],
      ['clothes', 'Футболки, шорты и лёгкая одежда на берег'],
      ['uv', 'Рашгард или рубашка с длинным рукавом'],
      ['rain', 'Лёгкая непромокаемая куртка'],
      ['hat', 'Кепка или панама, очки с ремешком'],
      ['sun', 'Солнцезащитный крем'],
      ['shoes', 'Удобная обувь для троп и нескользкая обувь для лодки']
    ]
  },
  {
    title: 'Вода и прогулки',
    items: [
      ['mask', 'Своя маска и трубка'],
      ['dry', 'Гермомешок или водонепроницаемый чехол для телефона'],
      ['bottle', 'Личная бутылка для воды'],
      ['backpack', 'Небольшой рюкзак для высадок'],
      ['repellent', 'Репеллент и привычные средства ухода']
    ]
  },
  {
    title: 'Личное и техника',
    items: [
      ['meds', 'Личные лекарства с запасом и рецептами, если нужны'],
      ['power', 'Зарядки, кабели и пауэрбанк'],
      ['adapter', 'Универсальный переходник для розеток на берегу'],
      ['offline', 'Скачать этот путеводитель и нужные карты заранее'],
      ['carryon', 'Купальник, смена одежды и важное — в ручную кладь']
    ]
  }
];

const firstTimeQuestions = [
  ['А если я совсем без опыта?', 'Перед выходом вместе разберём, как всё устроено и какая помощь понадобится при отходе и швартовке. Если захочется попробовать рулить или поработать с парусом — скажите. Будем осваиваться постепенно.'],
  ['Будет ли качать?', 'Катамаран широкий и стоит на двух корпусах, но на волне движение всё равно чувствуется. Если становится некомфортно, сразу скажите — подумаем, как помочь. Личные средства от укачивания лучше подобрать до поездки со своим врачом или фармацевтом.'],
  ['Где спим и принимаем душ?', 'Спим в каютах, на лодке четыре санузла с душем. На приёмке вместе разберёмся с водой, опреснителем и генератором. Всё, что нужно для обычного быта, покажем в первый вечер.'],
  ['Чем морской туалет отличается от домашнего?', 'У него своя система смыва. Перед первым использованием попросите показать кнопки и порядок работы. Влажные салфетки, ватные диски и другие предметы идут в мусорный контейнер. Правило для бумаги уточним на брифинге.'],
  ['Каждую ночь будем в порту?', 'Часть ночей проведём на якоре или у разрешённых буёв. На берег будем добираться на тузике — небольшой надувной лодке с мотором. Место ночёвки выбираем по ветру и волне.'],
  ['Кто готовит?', 'На борту есть кухня и холодильник. До поездки договоримся о простых завтраках и ужинах и распределим дела. На Ла-Диге и Праслене будем выходить поесть на берегу, а для удалённых остановок возьмём свои продукты. Если есть ограничения по еде или любимое блюдо для общего ужина, напишите мне заранее.'],
  ['Будут интернет и зарядка?', 'Для связи пригодится местная SIM, eSIM или подходящий роуминг. Между островами связь может пропадать. На лодке есть инвертор и генератор, с зарядкой разберёмся на приёмке. Пауэрбанк полезен на высадках.'],
  ['Нужно ли везти полотенца и маску?', 'Бельё, полотенца и ласты включены в стандартный комплект по карточке лодки. Маски и трубки в комплект не входят — берём свои. Если хочется отдельное лёгкое полотенце на пляж, оно пригодится.'],
  ['Что делать во время швартовки?', 'Перед манёвром договоримся, кто что делает. Если задача непонятна, спокойно переспросите заранее. Пальцы, руки и ноги держим подальше от зазора между лодкой и причалом.'],
  ['Можно ли сойти на берег в любой бухте?', 'Возможность высадки зависит от прибоя и правил острова. На частных островах нужно разрешение, в морских парках — соблюдать правила посещения. Иногда удобнее оставить лодку с защищённой стороны и дойти до пляжа пешком.'],
  ['Что с дождём в январе?', 'Январь — дождливый сезон, с ливнями и иногда грозами. Бывают и солнечные промежутки. Лёгкая куртка и гермочехол пригодятся, а день в запасе позволит подвинуть переходы.'],
  ['Какие расходы будут на месте?', 'Продукты, топливо, стоянки, вход в парки и трансферы. До поездки договоримся об общей кассе и личных расходах, чтобы всем было понятно, на что рассчитывать. Рестораны и дополнительные активности выберем уже вместе.']
];

const boatSourceUrl = 'https://portal.booking-manager.com/wbm2/page.html?view=YachtDetails&addMargins=true&templateType=responsive&companyid=3577&yachtId=3772239300000102889';
const boatPhotos = [
  {src: './assets/boat/boat-01.webp', alt: 'Sunsail 424 под парусом, вид с кормы', caption: 'Два корпуса и стол под крышей на корме'},
  {src: './assets/boat/boat-02.webp', alt: 'Планировка катамарана с четырьмя каютами', caption: 'Планировка четырёх кают и четырёх санузлов', contain: true},
  {src: './assets/boat/boat-03.webp', alt: 'Открытая площадка наверху Sunsail 424', caption: 'Место для отдыха на верхней палубе'},
  {src: './assets/boat/boat-04.webp', alt: 'Sunsail 424 под парусом, вид сбоку', caption: 'Sunsail 424 Classic · Leopard 42'},
  {src: './assets/boat/boat-05.webp', alt: 'Катамаран Sunsail 424 на вечерней стоянке', caption: 'Вечер на катамаране'},
  {src: './assets/boat/boat-06.webp', alt: 'Стол и места для сидения в кормовой части', caption: 'Общий стол на корме'},
  {src: './assets/boat/boat-07.webp', alt: 'Диваны на верхней площадке катамарана', caption: 'Верхняя площадка с диванами'}
].map(photo => ({...photo, author: 'Sunsail', sourceUrl: boatSourceUrl, license: 'Фото модели из карточки бронирования'}));

const galleryCards = new Map();

function guideElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function createPhotoGallery(photos, title) {
  const section = guideElement('div', 'photo-gallery');
  section.setAttribute('role', 'region');
  section.setAttribute('aria-label', 'Фотографии · ' + title);
  const strip = guideElement('div', 'photo-strip');
  const counter = guideElement('span', 'gallery-counter', '1 / ' + photos.length);
  const caption = guideElement('p', 'gallery-caption', photos[0].caption);
  const next = guideElement('button', 'gallery-next', 'Ещё фото');
  next.type = 'button';
  next.setAttribute('aria-label', 'Следующее фото · ' + title);
  let current = 0;

  photos.forEach((photo, index) => {
    const frame = guideElement('figure', 'gallery-frame');
    const button = guideElement('button', 'gallery-photo-button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Открыть фото · ' + photo.alt);
    const image = guideElement('img');
    image.src = photo.src;
    image.alt = photo.alt;
    image.width = photo.width ?? 1200;
    image.height = photo.height ?? 900;
    image.loading = 'lazy';
    image.decoding = 'async';
    if (photo.contain) image.style.objectFit = 'contain';
    button.append(image);
    button.addEventListener('click', () => openPhotoViewer(photos, index));
    frame.append(button);
    strip.append(frame);
  });
  strip.addEventListener('scroll', () => {
    const index = Math.min(photos.length - 1, Math.max(0, Math.round(strip.scrollLeft / strip.clientWidth)));
    if (index === current) return;
    current = index;
    caption.textContent = photos[current].caption;
    counter.textContent = (current + 1) + ' / ' + photos.length;
  }, {passive: true});
  next.hidden = photos.length < 2;
  next.addEventListener('click', () => {
    const index = (current + 1) % photos.length;
    strip.scrollTo({left: index * strip.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  });
  const tools = guideElement('div', 'gallery-tools');
  tools.append(counter, next);
  const meta = guideElement('div', 'gallery-meta');
  meta.append(caption, tools);
  section.append(strip, meta);
  return section;
}

let lightboxPhotos = [];
let lightboxIndex = 0;

function renderPhotoViewer() {
  const photo = lightboxPhotos[lightboxIndex];
  const image = document.getElementById('lightbox-image');
  image.src = photo.src;
  image.alt = photo.alt;
  document.getElementById('lightbox-caption').textContent = photo.caption;
  document.getElementById('photo-counter').textContent = (lightboxIndex + 1) + ' / ' + lightboxPhotos.length;
  const source = document.getElementById('lightbox-source');
  source.href = photo.sourceUrl;
  source.textContent = photo.author + (photo.license ? ' · ' + photo.license : '');
  document.getElementById('photo-prev').disabled = lightboxIndex === 0;
  document.getElementById('photo-next').disabled = lightboxIndex === lightboxPhotos.length - 1;
}

function openPhotoViewer(photos, index) {
  lightboxPhotos = photos;
  lightboxIndex = index;
  renderPhotoViewer();
  document.getElementById('photo-dialog').showModal();
}

function updateDestinationOrder(stops, wind) {
  const main = document.getElementById('main-destinations');
  const more = document.getElementById('more-destinations');
  const order = [...stops, ...places.filter(place => !stops.includes(place.id)).map(place => place.id)];
  for (const id of order) {
    const card = galleryCards.get(id);
    if (!card) continue;
    const place = places.find(item => item.id === id);
    card.querySelector('.destination-intro').textContent = wind === 'ese' && place.eseStory ? place.eseStory : place.story;
    if (stops.includes(id)) main.append(card);
    else more.append(card);
  }
  document.getElementById('more-place-count').textContent = String(places.length - stops.length);
}

function initDestinationCards() {
  for (const place of places) {
    const card = guideElement('article', 'destination-card');
    card.id = 'island-' + place.id;
    const photos = destinationPhotos[place.id] ?? [];
    if (photos.length) card.append(createPhotoGallery(photos, place.title));
    const body = guideElement('div', 'destination-body');
    const intro = guideElement('p', 'destination-intro', place.story);
    const actions = guideElement('div', 'destination-actions');
    const mapLink = guideElement('button', 'quiet-button', 'На карте');
    mapLink.type = 'button';
    mapLink.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('guide-place-select', {detail: place.id}));
    });
    actions.append(mapLink);
    body.append(guideElement('p', 'destination-type', place.type), guideElement('h3', '', place.title), intro, actions);
    const notes = guideElement('details', 'accordion');
    notes.append(guideElement('summary', '', 'Чем займёмся и что учесть'));
    const content = guideElement('div', 'accordion-body');
    for (const [heading, text] of placeNotes[place.id]) {
      const section = guideElement('section', 'briefing-note');
      section.append(guideElement('h4', '', heading), guideElement('p', '', text));
      content.append(section);
    }
    if (place.link) {
      const link = guideElement('a', 'source-link', place.link[0]);
      link.href = place.link[1];
      link.target = '_blank';
      link.rel = 'noreferrer';
      content.append(link);
    }
    notes.append(content);
    body.append(notes);
    card.append(body);
    galleryCards.set(place.id, card);
  }
}

function initPackingList() {
  const items = packingGroups.flatMap(group => group.items);
  const key = 'cat2027-packing-v1';
  let checked = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (Array.isArray(saved)) checked = new Set(saved.filter(id => items.some(([itemId]) => itemId === id)));
  } catch {
    checked = new Set();
  }
  const count = () => {
    document.getElementById('packing-count').textContent = 'Собрано ' + checked.size + ' из ' + items.length;
    try { localStorage.setItem(key, JSON.stringify([...checked])); } catch {}
  };
  const container = document.getElementById('packing-groups');
  for (const group of packingGroups) {
    const section = guideElement('section', 'packing-group');
    section.append(guideElement('h3', '', group.title));
    for (const [id, label] of group.items) {
      const item = guideElement('label', 'pack-item');
      const input = guideElement('input');
      input.type = 'checkbox';
      input.name = 'pack-' + id;
      input.checked = checked.has(id);
      input.addEventListener('change', () => {
        if (input.checked) checked.add(id);
        else checked.delete(id);
        count();
      });
      item.append(input, guideElement('span', '', label));
      section.append(item);
    }
    container.append(section);
  }
  document.getElementById('packing-reset').addEventListener('click', () => {
    checked.clear();
    container.querySelectorAll('input').forEach(input => { input.checked = false; });
    count();
  });
  count();
}

function initPhotoCredits() {
  const host = document.getElementById('photo-credits');
  const seen = new Set();
  for (const photo of Object.values(destinationPhotos).flat()) {
    if (seen.has(photo.sourceUrl)) continue;
    seen.add(photo.sourceUrl);
    const row = guideElement('p', 'credit-item', photo.caption + ' · ' + photo.author + '.');
    const source = guideElement('a', '', 'Оригинал');
    source.href = photo.sourceUrl;
    source.target = '_blank';
    source.rel = 'noreferrer';
    const license = guideElement('a', '', photo.license);
    license.href = photo.licenseUrl;
    license.target = '_blank';
    license.rel = 'noreferrer';
    row.append(source, license);
    if (photo.changes) row.append(document.createTextNode(' ' + photo.changes));
    host.append(row);
  }
  const boat = guideElement('p', 'credit-item', 'Фотографии и планировка Sunsail 424 — ');
  const link = guideElement('a', '', 'Sunsail / карточка бронирования');
  link.href = boatSourceUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  boat.append(link);
  host.append(boat);
}

document.addEventListener('DOMContentLoaded', () => {
  initDestinationCards();
  initPackingList();
  initPhotoCredits();
  document.getElementById('boat-gallery').append(createPhotoGallery(boatPhotos, 'Sunsail 424 Classic'));
  const faq = document.getElementById('faq-list');
  for (const [question, answer] of firstTimeQuestions) {
    const item = guideElement('details', 'accordion');
    const content = guideElement('div', 'accordion-body');
    content.append(guideElement('p', '', answer));
    item.append(guideElement('summary', '', question), content);
    faq.append(item);
  }

  document.getElementById('photo-prev').addEventListener('click', () => {
    if (lightboxIndex > 0) { lightboxIndex -= 1; renderPhotoViewer(); }
  });
  document.getElementById('photo-next').addEventListener('click', () => {
    if (lightboxIndex < lightboxPhotos.length - 1) { lightboxIndex += 1; renderPhotoViewer(); }
  });
  const dialog = document.getElementById('photo-dialog');
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' && lightboxIndex > 0) {
      event.preventDefault();
      lightboxIndex -= 1;
      renderPhotoViewer();
    }
    if (event.key === 'ArrowRight' && lightboxIndex < lightboxPhotos.length - 1) {
      event.preventDefault();
      lightboxIndex += 1;
      renderPhotoViewer();
    }
  });

  const navLinks = [...document.querySelectorAll('.mobile-nav a')];
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio);
    if (!visible.length) return;
    navLinks.forEach(link => {
      if (link.hash === '#' + visible[0].target.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, {rootMargin: '-12% 0px -60% 0px', threshold: [0, .1, .4]});
  navLinks.forEach(link => observer.observe(document.querySelector(link.hash)));
  document.querySelectorAll('a[href="#briefing"]').forEach(link => link.addEventListener('click', () => {
    document.getElementById('captain-notes').open = true;
  }));
});
