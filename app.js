'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const el = id => document.getElementById(id);
  const svg = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const lookup = new Map(places.map(place => [place.id, place]));
  const zoneTypes = {
    shallows: {label: 'Мели и рифы', singular: 'Мелководье или риф', color: '#a64732', fill: '#e2805e'},
    anchorages: {label: 'Районы стоянок', singular: 'Район стоянки', color: '#255f82', fill: '#458fb2'}
  };
  const zoneToggles = Object.fromEntries(Object.keys(zoneTypes).map(type => [type, el(`show-${type}`)]));
  const mileFormat = new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 1});
  const motorKnots = 6;
  const metresPerMile = 1852;
  const params = new URLSearchParams(location.search);
  const windInputs = Array.from(document.querySelectorAll('input[name="wind"]'));
  const viaFregate = el('via-fregate');
  const compact = matchMedia('(max-width: 820px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let wind = params.get('wind') === 'ese' ? 'ese' : 'nw';
  let stops = [];
  let selected = 'eden';
  let selectedZone = null;
  let showTooltip = false;
  let overview = true;
  let routeCoordinates = [];
  let routeMetres = 0;
  let routeSegments = [];
  let legMiles = new Map();
  const playback = {frame: null, marker: null, elapsed: 0, started: 0, duration: 0, lastLeg: ''};
  const visiblePins = new Map();
  const routeButtons = new Map();
  viaFregate.checked = params.get('via') === 'fregate';
  windInputs.find(input => input.value === wind).checked = true;

  const map = L.map('map', {
    center: [-4.46, 55.67],
    zoom: 10.5,
    zoomControl: false,
    scrollWheelZoom: false,
    zoomSnap: 0.1,
    zoomDelta: 0.6,
    minZoom: 8.5,
    maxZoom: 15.5,
    maxBounds: [[-4.93, 55.04], [-4.05, 56.12]],
    maxBoundsViscosity: 0.8,
    fadeAnimation: !reducedMotion.matches,
    zoomAnimation: !reducedMotion.matches
  });

  L.control.zoom({
    position: 'topleft',
    zoomInTitle: 'Приблизить',
    zoomOutTitle: 'Отдалить'
  }).addTo(map);
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution('<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>');
  map.getContainer().setAttribute('role', 'region');
  map.createPane('wind-pane').style.zIndex = 395;
  map.createPane('area-pane').style.zIndex = 405;
  map.createPane('route-pane').style.zIndex = 410;
  map.createPane('boat-pane').style.zIndex = 640;

  const grid = L.layerGroup().addTo(map);
  for (let step = 0; step <= 10; step += 1) {
    const latitude = -5 + step / 10;
    const longitude = 55.1 + step / 10;
    const gridStyle = {color: '#457d7a', weight: 1, opacity: 0.16, interactive: false};
    L.polyline([[latitude, 55.00], [latitude, 56.20]], gridStyle).addTo(grid);
    L.polyline([[-5.05, longitude], [-3.95, longitude]], gridStyle).addTo(grid);
  }

  const land = shorelines.map(ring => ring.map(([lon, lat]) => [lat, lon]));
  L.polygon(land, {color: '#91bcb0', weight: 5, opacity: 0.38, fill: false, interactive: false}).addTo(map);
  L.polygon(land, {
    color: '#748f73', weight: 1.15, opacity: 0.92,
    fillColor: '#e9e7c9', fillOpacity: 0.99, interactive: false
  }).addTo(map);

  const labelLayer = L.layerGroup().addTo(map);
  const passageLayer = L.layerGroup().addTo(map);
  const zoneLayer = L.layerGroup().addTo(map);
  const windLayer = L.layerGroup().addTo(map);
  const pinLayer = L.layerGroup().addTo(map);
  const routeStyle = {
    pane: 'route-pane',
    color: '#226457', weight: 2.7, opacity: 0.92,
    dashArray: '6 7', lineJoin: 'round', lineCap: 'round', interactive: false
  };

  function placeId(key) {
    return key === 'return' ? 'eden' : key;
  }

  function currentRoute() {
    const ids = [...scenarios[wind].stops];
    if (wind === 'nw' && viaFregate.checked) ids.splice(2, 0, 'fregate');
    return ids;
  }

  function passageBetween(from, to) {
    const edge = passages.find(([a, b]) => (a === from && b === to) || (b === from && a === to));
    const via = edge[0] === from ? edge[2] : [...edge[2]].reverse();
    return [lookup.get(from).point, ...via, lookup.get(to).point];
  }

  function measurePassage(points) {
    const lengths = points.slice(1).map((point, index) => map.distance(points[index], point));
    return {lengths, metres: lengths.reduce((sum, length) => sum + length, 0)};
  }

  function drawArrow(points, lengths, total) {
    if (total < 4000) return;
    let remaining = total * 0.55;
    for (let index = 0; index < lengths.length; index += 1) {
      const length = lengths[index];
      if (remaining <= length) {
        const [fromLat, fromLon] = points[index];
        const [toLat, toLon] = points[index + 1];
        const fraction = remaining / length;
        const angle = Math.atan2(fromLat - toLat, toLon - fromLon) * 180 / Math.PI;
        const position = [fromLat + (toLat - fromLat) * fraction, fromLon + (toLon - fromLon) * fraction];
        const icon = L.divIcon({
          className: 'direction-arrow',
          html: `<span style="transform: rotate(${angle}deg)"></span>`,
          iconSize: [10, 10]
        });
        L.marker(position, {icon, interactive: false, keyboard: false, zIndexOffset: -500}).addTo(passageLayer);
        return;
      }
      remaining -= length;
    }
  }

  function drawPassages() {
    resetPlayback();
    passageLayer.clearLayers();
    const loop = [...stops, 'return'];
    routeCoordinates = [];
    routeMetres = 0;
    routeSegments = [];
    legMiles = new Map();
    loop.slice(1).forEach((key, index) => {
      const from = loop[index];
      const to = placeId(key);
      const points = passageBetween(from, to);
      const {lengths, metres} = measurePassage(points);
      const title = `${lookup.get(from).short} → ${lookup.get(to).short}`;
      lengths.forEach((length, i) => {
        if (!length) return;
        routeSegments.push({start: routeMetres, end: routeMetres + length, from: points[i], to: points[i + 1], title});
        routeMetres += length;
      });
      legMiles.set(key, metres / metresPerMile);
      routeCoordinates.push(...points);
      L.polyline(points, {pane: 'route-pane', color: '#fcf7de', weight: 5, opacity: 0.78, interactive: false}).addTo(passageLayer);
      L.polyline(points, routeStyle).addTo(passageLayer);
      drawArrow(points, lengths, metres);
    });
    playback.duration = Math.min(42000, Math.max(20000, routeMetres / metresPerMile * 340));
  }

  function formatMiles(distance) {
    return `≈ ${mileFormat.format(Math.round(distance * 2) / 2)}`;
  }

  function formatDuration(miles) {
    const minutes = Math.round(miles / motorKnots * 12) * 5;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${remainder} мин`;
    return remainder ? `${hours} ч ${remainder} мин` : `${hours} ч`;
  }

  function updateWind() {
    const flow = windFlows[wind];
    el('map-wind').setAttribute('aria-label', flow.label);
    el('map-wind').style.setProperty('--wind-angle', `${flow.angle}deg`);
    el('wind-bearing').textContent = flow.bearing;
    windLayer.clearLayers();
    const vectors = [
      [-4.343, 55.535], [-4.428, 55.544], [-4.512, 55.717],
      [-4.646, 55.685], [-4.490, 55.879]
    ];
    for (const point of vectors) {
      const icon = L.divIcon({
        className: 'wind-field-arrow',
        html: `<svg aria-hidden="true" viewBox="0 0 56 32" style="transform: rotate(${flow.angle}deg)"><path d="M5 16h44m-10-8 10 8-10 8M4 9h21M4 23h13"/></svg>`,
        iconSize: [52, 32]
      });
      L.marker(point, {icon, pane: 'wind-pane', interactive: false, keyboard: false}).addTo(windLayer);
    }
  }

  function updateFregateNote() {
    const milesBetween = (from, to) => measurePassage(passageBetween(from, to)).metres / metresPerMile;
    const extra = milesBetween('st-anne', 'fregate') + milesBetween('fregate', 'anse-cocos') - milesBetween('st-anne', 'anse-cocos');
    el('fregate-extra').textContent = `≈ +${formatDuration(extra)} хода`;
    el('fregate-extra').title = `${formatMiles(extra)} мор. миль дополнительно по схеме`;
    el('fregate-condition').textContent = wind === 'nw'
      ? 'Дневной крюк при северо-западном ветре и спокойной волне'
      : 'При выбранном ветре круг идёт через Праслен';
  }

  function setPlayButton(label, icon) {
    const button = el('play-route');
    button.lastElementChild.textContent = label;
    button.querySelector('use').setAttribute('href', `#i-${icon}`);
  }

  function resetPlayback() {
    if (playback.frame !== null) cancelAnimationFrame(playback.frame);
    if (playback.marker) playback.marker.remove();
    playback.frame = null;
    playback.marker = null;
    playback.elapsed = 0;
    playback.lastLeg = '';
    el('play-status').textContent = 'Ускоренный показ переходов';
    el('play-progress').value = 0;
    el('play-progress').hidden = true;
    setPlayButton('Проиграть маршрут', 'play');
  }

  function placeBoat(point) {
    const icon = L.divIcon({
      className: 'boat-map-icon',
      iconSize: [48, 42],
      html: `<svg aria-hidden="true" viewBox="0 0 56 46">
        <path d="M1 13h10M1 33h10" fill="none" stroke="#fffdf3" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M15 9h26l12 5-12 5H15a5 5 0 0 1 0-10Zm0 18h26l12 5-12 5H15a5 5 0 0 1 0-10Z" fill="#fffdf3" stroke="#19483f" stroke-width="2"/>
        <rect x="16" y="16" width="24" height="14" rx="3" fill="#facd92" stroke="#19483f" stroke-width="2"/>
        <path d="M25 19h9l3 4-3 4h-9Z" fill="#19483f"/>
      </svg>`
    });
    playback.marker = L.marker(point, {icon, pane: 'boat-pane', interactive: false, keyboard: false}).addTo(map);
  }

  function animateBoat(now) {
    const elapsed = playback.elapsed + now - playback.started;
    const ratio = Math.min(1, elapsed / playback.duration);
    const travelled = routeMetres * ratio;
    const segment = routeSegments.find(leg => leg.end >= travelled) ?? routeSegments.at(-1);
    const fraction = (travelled - segment.start) / (segment.end - segment.start);
    const [lat, lon] = segment.from;
    const latDelta = segment.to[0] - lat;
    const lonDelta = segment.to[1] - lon;
    const angle = Math.atan2(-latDelta, lonDelta) * 180 / Math.PI;
    playback.marker.setLatLng([lat + fraction * latDelta, lon + fraction * lonDelta]);
    playback.marker.getElement().firstElementChild.style.transform = `rotate(${angle}deg)`;
    el('play-progress').value = ratio * 100;
    if (playback.lastLeg !== segment.title) {
      playback.lastLeg = segment.title;
      el('play-status').textContent = segment.title;
    }
    if (ratio === 1) {
      playback.frame = null;
      playback.elapsed = playback.duration;
      el('play-status').textContent = 'Катамаран вернулся в Eden Island';
      setPlayButton('Повторить маршрут', 'play');
      return;
    }
    playback.frame = requestAnimationFrame(animateBoat);
  }

  function togglePlayback() {
    if (playback.frame !== null) {
      cancelAnimationFrame(playback.frame);
      playback.frame = null;
      playback.elapsed += performance.now() - playback.started;
      el('play-status').textContent = `Пауза · ${playback.lastLeg || 'Eden Island'}`;
      setPlayButton('Продолжить', 'play');
      return;
    }
    if (!playback.marker || playback.elapsed >= playback.duration) {
      resetPlayback();
      showTooltip = false;
      fitOverview();
      updatePinSelection();
      placeBoat(routeSegments[0].from);
    }
    el('play-progress').hidden = false;
    el('play-status').textContent = playback.lastLeg || 'Катамаран выходит из Eden Island';
    setPlayButton('Пауза', 'pause');
    playback.started = performance.now();
    playback.frame = requestAnimationFrame(animateBoat);
  }

  function drawZones() {
    zoneLayer.clearLayers();
    for (const zone of zones) {
      const active = selectedZone === zone;
      if (!zoneToggles[zone.type].checked || (zone.wind && zone.wind !== wind && !active)) continue;
      const type = zoneTypes[zone.type];
      const area = L.polygon(zone.shape, {
        pane: 'area-pane',
        className: `area-${zone.type}`,
        color: type.color,
        fillColor: type.fill,
        dashArray: '4 3',
        weight: active ? 2.8 : 1.6,
        opacity: 0.91,
        fillOpacity: active ? 0.47 : 0.27
      });
      area.bindTooltip(zone.title, {className: 'place-tooltip', opacity: 1, sticky: true});
      area.on('click', () => selectZone(zone, true));
      area.addTo(zoneLayer);
    }
  }

  function fitOverview() {
    const bounds = L.latLngBounds(routeCoordinates);
    bounds.extend(compact.matches ? [-4.692, 55.442] : [-4.773, 55.402]);
    if (!compact.matches) bounds.extend([-4.250, 55.878]);
    map.fitBounds(bounds, {padding: compact.matches ? [19, 23] : [34, 32], animate: false, maxZoom: 12});
    overview = true;
  }

  function drawLabels() {
    labelLayer.clearLayers();
    const labels = [...islandLabels];
    if (!compact.matches && map.getZoom() <= 11.6) {
      labels.push({title: 'Индийский океан', point: [-4.412, 55.478], level: 8, water: true});
    }
    for (const label of labels) {
      if (map.getZoom() < label.level) continue;
      const icon = L.divIcon({
        className: label.water ? 'water-label' : 'island-label',
        html: `<span>${label.title}</span>`,
        iconSize: [0, 0]
      });
      L.marker(label.point, {icon, interactive: false, keyboard: false, zIndexOffset: -1000}).addTo(labelLayer);
    }
  }

  function addPin(place, number) {
    const isMain = Number.isInteger(number);
    const size = isMain ? 32 : 27;
    const icon = L.divIcon({
      className: isMain ? 'route-map-pin' : 'side-map-pin',
      html: `<span aria-hidden="true">${isMain ? number : ''}</span>`,
      iconSize: [size, size]
    });
    const marker = L.marker(place.point, {icon, keyboard: true, riseOnHover: true, zIndexOffset: isMain ? 150 : 30});
    marker.addTo(pinLayer);
    marker.bindTooltip(place.short, {
      className: 'place-tooltip',
      direction: 'top',
      offset: [0, isMain ? -15 : -9],
      opacity: 1
    });
    const pin = marker.getElement();
    pin.setAttribute('aria-label', isMain ? `Остановка ${number}. ${place.title}` : place.title);
    marker.on('click', () => selectPlace(place.id, {fromMap: true}));
    pin.addEventListener('keydown', event => {
      if (event.key === ' ') {
        event.preventDefault();
        selectPlace(place.id, {fromMap: true});
      }
    });
    visiblePins.set(place.id, marker);
  }

  function drawPins() {
    pinLayer.clearLayers();
    visiblePins.clear();
    const occupied = [];
    stops.forEach((id, index) => {
      const place = lookup.get(id);
      addPin(place, index + 1);
      occupied.push(map.project(place.point));
    });

    const extras = places.filter(place => !stops.includes(place.id));
    const chosen = extras.find(place => place.id === placeId(selected));
    if (chosen) {
      addPin(chosen);
      occupied.push(map.project(chosen.point));
    }
    for (const place of extras) {
      if (visiblePins.has(place.id)) continue;
      const point = map.project(place.point);
      if (occupied.some(other => point.distanceTo(other) < (compact.matches ? 24 : 28))) continue;
      addPin(place);
      occupied.push(point);
    }
    updatePinSelection();
  }

  function updatePinSelection() {
    for (const [id, marker] of visiblePins) {
      const active = id === placeId(selected);
      marker.getElement().setAttribute('aria-pressed', String(active));
      marker.setZIndexOffset(active ? 450 : stops.includes(id) ? 150 : 30);
      if (active && showTooltip) marker.openTooltip();
      if (!active || !showTooltip) marker.closeTooltip();
    }
  }

  function pointButton(id, options) {
    const button = make('button', '', lookup.get(id).short);
    button.type = 'button';
    button.addEventListener('click', () => selectPlace(id, options));
    return button;
  }

  function renderGroups() {
    const groups = new Map();
    for (const place of places) {
      if (!place.group) continue;
      if (!groups.has(place.group)) groups.set(place.group, []);
      groups.get(place.group).push(place.id);
    }
    for (const [title, ids] of groups) {
      const section = make('section', 'place-group');
      const buttons = make('div');
      ids.forEach(id => buttons.append(pointButton(id, {fromGroups: true})));
      section.append(make('h3', '', title), buttons);
      el('place-groups').append(section);
    }
  }

  function renderZoneGuide() {
    for (const [kind, type] of Object.entries(zoneTypes)) {
      const group = make('section', 'zone-group');
      const title = make('h3');
      const swatch = make('i', `legend-${kind}`);
      swatch.setAttribute('aria-hidden', 'true');
      title.append(swatch, type.label);
      group.append(title);
      for (const zone of zones.filter(zone => zone.type === kind)) {
        const button = make('button', 'zone-choice');
        button.type = 'button';
        button.append(make('span', '', zone.title), make('small', '', zone.caption));
        button.addEventListener('click', () => selectZone(zone));
        group.append(button);
      }
      el('zone-groups').append(group);
    }
  }

  function briefingNote([heading, text]) {
    const section = make('section', 'briefing-note');
    section.append(make('h4', '', heading), make('p', '', text));
    return section;
  }

  function sourceLink([text, url]) {
    const link = make('a', 'place-source', text);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.insertAdjacentHTML('beforeend', svg('external'));
    return link;
  }

  function renderBriefing(place, title, type, isReturn) {
    el('briefing-title').textContent = title;
    el('briefing-type').textContent = type;
    el('briefing-time').hidden = true;
    const links = el('briefing-links');
    links.replaceChildren();
    let notes;
    if (selectedZone) {
      notes = [['Об этом месте', selectedZone.story], ['На месте', selectedZone.note]];
      const button = make('button', '', `Карточка места · ${place.short}`);
      button.type = 'button';
      button.addEventListener('click', () => {
        selectedZone = null;
        showTooltip = true;
        drawZones();
        updatePinSelection();
        renderCard();
      });
      links.append(button);
      if (selectedZone.link) links.append(sourceLink(selectedZone.link));
    } else if (isReturn) {
      notes = [['Сдача катамарана', 'Днём 22 января вернёмся в Eden Island, пополним топливо и подготовим лодку к сдаче. Вечер проведём у базы, утром соберём вещи и к 09:00 освободим катамаран.']];
    } else {
      notes = placeNotes[place.id];
      if (place.link) links.append(sourceLink(place.link));
      if (place.id === 'st-anne') links.append(sourceLink(parkRules));
      if (place.id === 'curieuse') links.append(sourceLink(laraiReef));
      for (const zone of zones.filter(zone => zone.place === place.id)) {
        const button = make('button', '', `На карте · ${zone.title}`);
        button.type = 'button';
        button.addEventListener('click', () => selectZone(zone));
        links.append(button);
      }
    }
    el('briefing-notes').replaceChildren(...notes.map(briefingNote));
  }

  function renderCard() {
    const place = lookup.get(placeId(selected));
    const isReturn = selected === 'return';
    const title = selectedZone?.title ?? (isReturn ? 'Возвращение в Eden Island' : place.title);
    const type = selectedZone ? zoneTypes[selectedZone.type].singular : isReturn ? 'Финиш · Маэ' : place.type;
    el('place-title').textContent = title;
    el('place-type').textContent = type;
    el('place-time').hidden = isReturn;
    el('place-time').lastElementChild.textContent = selectedZone?.time ?? place.time;
    el('place-text').textContent = selectedZone?.story ?? (isReturn
      ? 'Возвращаемся на Маэ 22 января, чтобы провести последнюю ночь у базы и спокойно собраться. Лодку сдаём 23 января к 09:00.'
      : wind === 'ese' && place.eseStory ? place.eseStory : place.story);
    el('place-time').hidden = true;
    const photo = destinationPhotos[place.id]?.[0];
    const preview = el('place-photo');
    preview.hidden = !photo;
    if (photo) {
      preview.src = photo.thumb ?? photo.src;
      preview.alt = photo.alt;
    }
    const related = selectedZone ? [] : place.related ?? [];
    el('place-related').replaceChildren(...related.map(id => pointButton(id, {})));
    el('place-related').hidden = !related.length;
    renderBriefing(place, title, type, isReturn);
  }

  function renderStops() {
    routeButtons.clear();
    const list = el('stops');
    list.replaceChildren();
    const total = routeMetres / metresPerMile;
    el('distance-total').replaceChildren(
      make('strong', '', `≈ ${formatDuration(total)} хода по кругу`),
      make('span', '', `${formatMiles(total)} мор. миль`)
    );
    el('distance-total').title = `Оценка по линиям на карте при ${motorKnots} узлах на моторе.`;
    [...stops, 'return'].forEach((key, index) => {
      const place = lookup.get(placeId(key));
      const isReturn = key === 'return';
      const item = make('li');
      const button = make('button', 'stop-button');
      button.type = 'button';
      const badge = make('span', 'stop-number', isReturn ? '' : String(index + 1));
      badge.setAttribute('aria-hidden', 'true');
      if (isReturn) badge.innerHTML = svg('anchor');
      const copy = make('span');
      copy.append(
        make('strong', '', isReturn ? 'Возвращение в Eden Island' : place.short),
        make('small', '', isReturn ? 'Маэ · сдача катамарана' : scenarios[wind].routeNotes[key] ?? 'Дневной заход по согласованию')
      );
      button.append(badge, copy);
      if (legMiles.has(key)) {
        const miles = legMiles.get(key);
        const distance = make('span', 'stop-distance', `≈ ${formatDuration(miles)}`);
        distance.append(make('span', '', `${formatMiles(miles)} мор. миль`));
        distance.title = `Переход от предыдущей точки при ${motorKnots} узлах`;
        button.append(distance);
      } else {
        button.insertAdjacentHTML('beforeend', svg('chevron'));
      }
      button.addEventListener('click', () => selectPlace(key, {}));
      item.append(button);
      list.append(item);
      routeButtons.set(key, button);
    });
    updateStopSelection(false);
    list.scrollTop = 0;
  }

  function renderDays() {
    const loop = [...stops, 'return'];
    const days = sailingDays[wind];
    const total = routeMetres / metresPerMile;
    el('daily-average').replaceChildren(
      make('span', '', 'Среднее за 17–22 января'),
      make('strong', '', `≈ ${formatDuration(total / 6)} хода в день`)
    );
    el('speed-label').textContent = `${motorKnots} узлах (около ${Math.round(motorKnots * metresPerMile / 1000)} км/ч)`;
    let start = 0;
    const items = days.map((day, index) => {
      let course = day.shore;
      let time = day.fixedTime ?? 'Без перехода';
      let note = day.note;
      if (day.end) {
        const end = loop.indexOf(day.end, start + 1);
        const journey = loop.slice(start, end + 1);
        const miles = journey.slice(1).reduce((sum, key) => sum + legMiles.get(key), 0);
        course = journey.map(key => lookup.get(placeId(key)).short).join(' → ');
        time = `≈ ${formatDuration(miles)}`;
        if (journey.includes('fregate') && day.viaNote) note = day.viaNote;
        start = end;
      }
      const item = make('li', 'day-item');
      const top = make('div', 'day-item-top');
      top.append(make('span', 'day-number', day.date), make('span', 'day-time', time));
      item.append(top, make('p', 'day-course', course), make('p', 'day-note', note));
      return item;
    });
    el('days-list').replaceChildren(...items);
  }

  function updateStopSelection(scrollToActive) {
    for (const [key, button] of routeButtons) {
      if (key === selected) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    const active = routeButtons.get(selected);
    if (!active || !scrollToActive) return;
    const list = el('stops');
    const row = active.getBoundingClientRect();
    const frame = list.getBoundingClientRect();
    if (row.bottom > frame.bottom) list.scrollTop += row.bottom - frame.bottom;
    if (row.top < frame.top) list.scrollTop += row.top - frame.top;
  }

  function selectPlace(key, {fromMap = false, fromGroups = false}) {
    selected = key;
    if (selectedZone) {
      selectedZone = null;
      drawZones();
    }
    showTooltip = true;
    const id = placeId(key);
    const place = lookup.get(id);
    renderCard();
    updateStopSelection(fromMap);
    if (!visiblePins.has(id)) drawPins();
    else updatePinSelection();

    if (!fromMap) {
      overview = false;
      const zoom = Math.max(map.getZoom(), stops.includes(id) ? 12.4 : 13.1);
      map.setView(place.point, zoom, {animate: !reducedMotion.matches});
    }

    if (compact.matches) {
      el('place-card').scrollIntoView({block: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    } else if (fromGroups) {
      el('map').scrollIntoView({block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    }
  }

  function selectZone(zone, fromMap = false) {
    selected = zone.place;
    selectedZone = zone;
    showTooltip = false;
    zoneToggles[zone.type].checked = true;
    drawZones();
    renderCard();
    updateStopSelection(true);
    if (!visiblePins.has(zone.place)) drawPins();
    else updatePinSelection();
    if (!fromMap) {
      map.fitBounds(zone.shape, {padding: [43, 43], maxZoom: 14.5, animate: !reducedMotion.matches});
      overview = false;
      el('map').scrollIntoView({block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    } else if (compact.matches) {
      el('place-card').scrollIntoView({block: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    }
  }

  function renderRoute(resetSelection) {
    stops = currentRoute();
    if (selectedZone?.wind && selectedZone.wind !== wind) selectedZone = null;
    if (resetSelection && !stops.includes(placeId(selected))) {
      selected = 'eden';
      selectedZone = null;
      showTooltip = false;
    }
    el('wind-title').textContent = scenarios[wind].title;
    el('wind-description').textContent = scenarios[wind].description;
    el('wind-human').textContent = wind === 'nw'
      ? 'Если волна позволит, подойдём к Анс-Кокос с моря. Затем обойдём Ла-Диг, заглянем к рифам и пойдём к Праслену. Ночёвки выберем в защищённых местах.'
      : 'Сначала идём к Праслену, потом к западному берегу Ла-Дига. Восточные пляжи будут открыты волне — к Анс-Кокос, Петит-Анс и Гранд-Анс доберёмся пешком.';
    updateWind();
    updateFregateNote();
    el('fregate-option').hidden = wind !== 'nw';
    viaFregate.disabled = wind !== 'nw';
    drawPassages();
    drawZones();
    fitOverview();
    drawLabels();
    drawPins();
    renderCard();
    renderStops();
    renderDays();
    updateDestinationOrder(stops, wind);
  }

  function shareUrl() {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('wind', wind);
    if (wind === 'nw' && viaFregate.checked) url.searchParams.set('via', 'fregate');
    url.hash = '';
    return url.toString();
  }

  function prepareShare() {
    if (location.protocol === 'file:' || document.documentElement.hasAttribute('data-offline')) return;
    const dialog = el('share-dialog');
    const url = el('share-url');
    const status = el('share-status');
    const open = el('open-share');
    open.hidden = false;
    open.addEventListener('click', () => {
      url.value = shareUrl();
      status.textContent = '';
      dialog.showModal();
    });
    url.addEventListener('focus', () => url.select());
    el('copy-link').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url.value);
        status.textContent = 'Ссылка скопирована.';
      } catch {
        url.focus();
        url.select();
        status.textContent = document.execCommand('copy') ? 'Ссылка скопирована.' : 'Скопируйте выделенную ссылку.';
      }
    });
  }

  windInputs.forEach(input => input.addEventListener('change', () => {
    wind = input.value;
    renderRoute(true);
  }));
  viaFregate.addEventListener('change', () => renderRoute(true));
  document.addEventListener('guide-place-select', event => {
    if (!lookup.has(event.detail)) return;
    selectPlace(event.detail, {fromGroups: true});
    el('map').scrollIntoView({block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  });
  el('play-route').addEventListener('click', togglePlayback);
  Object.values(zoneToggles).forEach(input => input.addEventListener('change', drawZones));
  el('reset-map').addEventListener('click', () => {
    showTooltip = false;
    fitOverview();
    updatePinSelection();
  });
  if (matchMedia('(min-width: 700px)').matches) document.querySelector('.stop-disclosure').open = true;
  renderGroups();
  renderZoneGuide();
  renderRoute(false);
  prepareShare();

  map.on('dragstart', () => { overview = false; });
  map.on('zoomstart', () => { overview = false; });
  map.on('zoomend', () => {
    drawLabels();
    drawPins();
  });
  map.on('resize', () => {
    if (overview) fitOverview();
    drawLabels();
    drawPins();
  });
});
