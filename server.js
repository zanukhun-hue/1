const fs = require('fs');
const path = require('path');
const vm = require('vm');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

app.disable('x-powered-by');
app.set('trust proxy', 1);

function loadWindowArray(fileName, propertyName) {
  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) return [];

  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: fileName });

  return Array.isArray(sandbox.window[propertyName]) ? sandbox.window[propertyName] : [];
}

const plugins = loadWindowArray('plugins.js', 'AE_PLUGINS');
const edits = loadWindowArray('edits.js', 'AE_EDITS');

const site = {
  title: 'Null-Object-AE',
  description: 'Каталог плагинов, скриптов и пресетов для Adobe After Effects.',
  url: (process.env.SITE_URL || 'https://null-object-ae.onrender.com').replace(/\/$/, ''),
  telegramUrl: process.env.TELEGRAM_URL || 'https://t.me/ae_plugins_vault'
};

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function escXml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&apos;',
    '"': '&quot;'
  }[char]));
}

function url(value) {
  return encodeURIComponent(String(value ?? ''));
}

function absoluteUrl(route = '/') {
  const cleanRoute = route.startsWith('/') ? route : `/${route}`;
  return `${site.url}${cleanRoute}`;
}

function statusBadge(plugin) {
  return plugin.status === 'available'
    ? '<span class="status-badge available"><i class="fas fa-check-circle"></i> Проверено</span>'
    : '<span class="status-badge updating"><i class="fas fa-clock"></i> Обновляется</span>';
}

function pluginSizeMB(plugin) {
  const raw = String(plugin.size || '').toLowerCase().replace(',', '.');
  const n = parseFloat(raw) || 0;
  if (raw.includes('gb')) return n * 1024;
  if (raw.includes('kb')) return n / 1024;
  return n;
}

function getCategories() {
  const map = new Map();
  plugins.forEach((plugin) => map.set(plugin.category, plugin.categoryLabel));
  return [['all', 'Все'], ...Array.from(map.entries())];
}

function sortPlugins(list, type = 'popular') {
  const badgeRank = (plugin) => /популяр/i.test(plugin.badge || '') ? 0 : /нов/i.test(plugin.badge || '') ? 1 : 2;
  return [...list].sort((a, b) => {
    if (type === 'az') return a.name.localeCompare(b.name, 'ru');
    if (type === 'available') return (a.status === 'available' ? 0 : 1) - (b.status === 'available' ? 0 : 1) || a.name.localeCompare(b.name, 'ru');
    if (type === 'size') return pluginSizeMB(a) - pluginSizeMB(b);
    if (type === 'new') return (/нов/i.test(b.badge || '') ? 1 : 0) - (/нов/i.test(a.badge || '') ? 1 : 0) || a.name.localeCompare(b.name, 'ru');
    return badgeRank(a) - badgeRank(b) || Number(b.status === 'available') - Number(a.status === 'available') || a.name.localeCompare(b.name, 'ru');
  });
}

function jsonLd(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.title,
    url: site.url,
    description: site.description,
    inLanguage: 'ru-RU',
    publisher: {
      '@type': 'Organization',
      name: site.title,
      url: site.url
    }
  };
}

function collectionSchema(name, description, route) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absoluteUrl(route),
    isPartOf: {
      '@type': 'WebSite',
      name: site.title,
      url: site.url
    }
  };
}

function softwareSchema(plugin) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: plugin.name,
    description: plugin.description,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Windows, macOS',
    softwareVersion: plugin.version,
    url: absoluteUrl(`/plugin/${url(plugin.id)}`),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RUB',
      availability: plugin.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder'
    }
  };
}

function head({ title, description, route = '/', robots = 'index,follow', schema }) {
  const canonical = absoluteUrl(route);
  const fullTitle = title.includes(site.title) ? title : `${title} | ${site.title}`;
  const schemaTags = [websiteSchema(), schema].filter(Boolean).map(jsonLd).join('\n');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':true;document.documentElement.classList.toggle('dark-mode',d);document.documentElement.classList.toggle('light-mode',!d)}catch(e){document.documentElement.classList.add('dark-mode')}})();</script>
<style>html.dark-mode,html.dark-mode body{background:#080a12;color:#f8fafc;color-scheme:dark}html.light-mode,html.light-mode body{background:#f8fafc;color:#111827;color-scheme:light}</style>
<link rel="canonical" href="${esc(canonical)}">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E" rel="icon" type="image/svg+xml">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${esc(robots)}">
<meta name="theme-color" content="#080a12">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description)}">
${schemaTags}
</head>`;
}

function header(active = 'home') {
  const links = [
    ['home', '/', 'fas fa-house', 'Главная'],
    ['plugins', '/plugins', 'fas fa-plug', 'Каталог'],
    ['community', '/community', 'fas fa-film', 'Работы'],
    ['install', '/install', 'fas fa-download', 'Установка'],
    ['faq', '/faq', 'fas fa-circle-question', 'FAQ']
  ];

  return `<header class="header"><div class="container nav-container">
<a class="logo" href="/" aria-label="${esc(site.title)}"><span class="logo-icon">🎬</span><span class="logo-text">${esc(site.title)}</span></a>
<nav class="nav-links" id="navLinks">${links.map(([id, href, icon, label]) => `<a class="nav-link ${id === active ? 'active' : ''}" data-nav="${id}" href="${href}"><i class="${icon}"></i> ${label}</a>`).join('')}</nav>
<div class="header-actions"><a class="favorite-pill" href="/plugins?favorites=1" title="Избранное"><i class="fas fa-heart"></i><span id="favoriteCount">0</span></a><a class="telegram-link" href="${esc(site.telegramUrl)}" target="_blank" rel="noopener" aria-label="Telegram"><i class="fab fa-telegram"></i></a><button class="theme-toggle" id="themeToggle" aria-label="Переключить тему"><i class="fas fa-moon"></i></button><button class="menu-toggle" id="menuToggle" aria-label="Открыть меню"><i class="fas fa-bars"></i></button></div>
</div></header>`;
}

function footer() {
  return `<footer class="footer"><div class="container footer-grid"><div><div class="footer-brand"><span>🎬</span> ${esc(site.title)}</div><p>Каталог плагинов, скриптов и пресетов для After Effects.</p></div><div><h4>Разделы</h4><a href="/plugins">Каталог</a><a href="/community">Работы пользователей</a><a href="/install">Установка</a><a href="/faq">FAQ</a></div><div><h4>Связь</h4><a href="${esc(site.telegramUrl)}" target="_blank" rel="noopener"><i class="fab fa-telegram"></i> Telegram-канал</a><span class="local-counter"><i class="fas fa-eye"></i> Ваши визиты: <b id="localVisitCount">0</b></span></div></div><div class="container footer-bottom">© 2026 ${esc(site.title)}. Все материалы добавляются для ознакомления.</div></footer>`;
}

function layout({ active, title, description, route, robots, schema, body }) {
  return `${head({ title, description, route, robots, schema })}<body data-page="${esc(active)}">${header(active)}<main>${body}</main>${footer()}<button class="back-to-top" id="backToTop" aria-label="Наверх"><i class="fas fa-arrow-up"></i></button><script src="/client.js" defer></script></body></html>`;
}

function pluginCard(plugin) {
  const download = plugin.status === 'available'
    ? `<a class="download-btn" href="/download/${url(plugin.id)}" target="_blank" rel="noopener"><i class="fas fa-download"></i> Скачать</a>`
    : '<button class="download-btn disabled" disabled><i class="fas fa-clock"></i> Обновляется</button>';
  const tags = (plugin.tags || []).slice(0, 4).map((tag) => `<span>#${esc(tag)}</span>`).join('');

  return `<article class="plugin-card reveal" data-plugin-card data-id="${esc(plugin.id)}" data-category="${esc(plugin.category)}" data-status="${esc(plugin.status)}" data-name="${esc(plugin.name)}" data-size="${pluginSizeMB(plugin)}">
<div class="plugin-card-header"><div class="badge-stack"><span class="plugin-badge">${esc(plugin.badge || plugin.categoryLabel)}</span>${statusBadge(plugin)}</div><div class="card-actions"><button class="favorite-btn" data-id="${esc(plugin.id)}" type="button" aria-label="Избранное"><i class="far fa-heart"></i></button><div class="plugin-icon"><i class="${esc(plugin.icon || 'fas fa-plug')}"></i></div></div></div>
<div class="plugin-card-content"><h3>${esc(plugin.name)}</h3><p>${esc(plugin.description)}</p><div class="plugin-tags">${tags}</div><div class="plugin-meta"><span><i class="fas fa-hdd"></i> ${esc(plugin.size)}</span><span><i class="fas fa-calendar"></i> ${esc(plugin.version)}</span><span><i class="fas fa-check-circle"></i> AE ${esc(plugin.minAe)}+</span></div></div>
<div class="plugin-card-footer">${download}<a class="details-btn" href="/plugin/${url(plugin.id)}"><i class="fas fa-info-circle"></i> Подробнее</a></div></article>`;
}

function homePage() {
  const available = plugins.filter((plugin) => plugin.status === 'available').length;
  const categoryCount = new Set(plugins.map((plugin) => plugin.category)).size;
  const featured = sortPlugins(plugins).filter((plugin) => /популяр/i.test(plugin.badge || '') && plugin.status === 'available').slice(0, 3);
  const updates = plugins.slice(0, 6).map((plugin) => `<a href="/plugin/${url(plugin.id)}" class="update-row"><span>${statusBadge(plugin)}</span><b>${esc(plugin.name)}</b><small>${esc(plugin.updated)}</small></a>`).join('');

  return layout({
    active: 'home',
    route: '/',
    title: 'Null-Object-AE — плагины, скрипты и пресеты для After Effects',
    description: 'Null-Object-AE — каталог плагинов, скриптов и пресетов для Adobe After Effects с инструкциями по установке и страницами плагинов.',
    schema: collectionSchema('Null-Object-AE', site.description, '/'),
    body: `<section class="hero page-hero-home"><div class="container hero-grid"><div class="hero-content reveal"><span class="eyebrow"><i class="fas fa-sparkles"></i> AE 2022 и новее</span><h1>Профессиональные плагины для <span class="highlight">After Effects</span></h1><p>Каталог эффектов, скриптов, пресетов и комплектов для монтажа, графики, трекинга и анимации.</p><div class="hero-actions"><a class="btn btn-primary" href="/plugins"><i class="fas fa-plug"></i> Открыть каталог</a><a class="btn btn-ghost" href="/install"><i class="fas fa-download"></i> Как установить</a></div><div class="hero-stats"><div class="stat"><span>${plugins.length}</span><small>плагинов</small></div><div class="stat"><span>${available}</span><small>ссылок проверено</small></div><div class="stat"><span>${categoryCount}</span><small>категорий</small></div></div></div><div class="hero-visual stable-visual" aria-hidden="true"><div class="visual-float visual-float-ae"><div class="visual-element ae-card"><span>Ae</span></div></div><div class="visual-float visual-float-plugin"><div class="visual-element"><i class="fas fa-puzzle-piece"></i></div></div><div class="visual-float visual-float-download"><div class="visual-element"><i class="fas fa-cloud-arrow-down"></i></div></div></div></div></section>
<section class="section"><div class="container"><div class="section-head reveal"><span class="eyebrow">Быстрый старт</span><h2>Что есть на сайте</h2><p>Каталог, инструкции, FAQ, страницы плагинов и работы пользователей вынесены отдельно.</p></div><div class="feature-grid"><div class="feature-card reveal"><i class="fas fa-layer-group"></i><h3>Каталог по категориям</h3><p>Поиск, сортировка, фильтры, избранное и статусы.</p></div><div class="feature-card reveal"><i class="fas fa-file-lines"></i><h3>Страницы плагинов</h3><p>У каждого плагина есть отдельная страница с описанием и похожими позициями.</p></div><div class="feature-card reveal"><i class="fas fa-screwdriver-wrench"></i><h3>Инструкции установки</h3><p>Отдельно для .aex, .jsx/.jsxbin, .ffx и частых проблем.</p></div><div class="feature-card reveal"><i class="fas fa-server"></i><h3>SSR-отрисовка</h3><p>Основная разметка и каталог формируются на сервере.</p></div></div></div></section>
<section class="section soft-section"><div class="container"><div class="section-head reveal"><span class="eyebrow">Популярное</span><h2>Плагины, с которых стоит начать</h2><p>Несколько карточек из каталога.</p></div><div class="plugins-grid compact">${featured.map(pluginCard).join('')}</div><div class="center-actions"><a class="btn btn-primary" href="/plugins">Смотреть все плагины</a></div></div></section>
<section class="section"><div class="container two-column"><div class="notice-card reveal"><div class="notice-title"><i class="fas fa-triangle-exclamation"></i> Перед установкой</div><ul class="clean-list"><li>Проверьте совместимость плагина с вашей версией After Effects.</li><li>Закройте After Effects перед копированием файлов.</li><li>Запускайте After Effects от имени администратора, если плагин не появился.</li></ul><a class="btn btn-ghost" href="/install">Открыть инструкцию</a></div><div class="updates-card reveal"><h3><i class="fas fa-clock-rotate-left"></i> Последние обновления</h3><div class="updates-list">${updates}</div></div></div></section>`
  });
}

function pluginsPage() {
  const filters = getCategories().map(([id, label]) => `<button class="filter-btn ${id === 'all' ? 'active' : ''}" data-category="${esc(id)}">${esc(label)}</button>`).join('');

  return layout({
    active: 'plugins',
    route: '/plugins',
    title: 'Каталог плагинов After Effects — Saber, Twixtor, RSMB, Sapphire',
    description: 'Каталог Null-Object-AE: плагины, скрипты и пресеты для After Effects, фильтры по категориям, статусы и страницы с инструкциями.',
    schema: collectionSchema('Каталог плагинов After Effects', 'Плагины, скрипты и пресеты для Adobe After Effects.', '/plugins'),
    body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-plug"></i> Каталог</span><h1>Плагины для After Effects</h1><p>Ищи по названию, тегам, категории или описанию.</p></div></section>
<section class="section catalog-section"><div class="container"><div class="catalog-panel reveal"><div class="search-box"><i class="fas fa-search"></i><input id="pluginSearch" type="text" placeholder="Поиск: Saber, glow, text, script..."><button id="clearSearch" title="Очистить"><i class="fas fa-times"></i></button></div><div class="catalog-row"><div class="filter-tabs" id="categoryFilters">${filters}</div><div class="catalog-controls"><select id="sortPlugins" aria-label="Сортировка"><option value="popular">Сначала популярные</option><option value="new">Сначала новые</option><option value="az">По названию A–Z</option><option value="available">Сначала проверенные</option><option value="size">По размеру файла</option></select><button class="favorites-filter-btn" id="favoritesOnly" type="button"><i class="far fa-heart"></i> Только избранные</button></div></div><div class="catalog-meta"><span id="resultCount">Найдено: ${plugins.length}</span><span id="activeFilterLabel">Все категории</span></div></div><div class="pre-download-notice reveal"><div class="notice-title"><i class="fas fa-triangle-exclamation"></i> Перед установкой</div><ul><li>Проверьте совместимость плагина с вашей версией After Effects.</li><li>Закройте After Effects перед копированием файлов.</li><li>Запускайте After Effects от имени администратора, если плагин не появился.</li></ul></div><div class="plugins-grid" id="pluginsGrid">${sortPlugins(plugins).map(pluginCard).join('')}</div><div class="empty-state" id="emptyState" hidden><i class="fas fa-magnifying-glass"></i><h3>Ничего не найдено</h3><p>Попробуйте другое название, тег или категорию.</p></div></div></section>`
  });
}

function installText(type) {
  const map = {
    aex: '.aex копируется в папку Plug-ins вашей версии After Effects. После копирования перезапустите программу и ищите эффект в меню Effect.',
    jsx: '.jsx / .jsxbin копируется в Scripts или ScriptUI Panels. Панель обычно появляется в меню Window, обычный скрипт — в File → Scripts.',
    ffx: '.ffx копируется в Documents → Adobe → After Effects → User Presets. После этого пресет ищется в Effects & Presets.'
  };
  return map[type] || 'Смотрите общую инструкцию по установке и проверяйте папку вашей версии After Effects.';
}

function pluginPage(id) {
  const plugin = plugins.find((item) => item.id === id);
  if (!plugin) return notFoundPage();

  const download = plugin.status === 'available'
    ? `<a class="btn btn-primary" href="/download/${url(plugin.id)}" target="_blank" rel="noopener"><i class="fas fa-download"></i> Скачать</a>`
    : '<button class="btn btn-disabled" disabled><i class="fas fa-clock"></i> Ссылка обновляется</button>';
  const related = plugins.filter((item) => item.id !== plugin.id && (item.category === plugin.category || item.package === plugin.package)).slice(0, 3);

  return layout({
    active: 'plugins',
    route: `/plugin/${url(plugin.id)}`,
    title: `${plugin.name} для After Effects — описание, установка и скачивание`,
    description: `${plugin.name} для Adobe After Effects: описание, версия ${plugin.version}, размер ${plugin.size}, совместимость ${plugin.compatibility}.`,
    schema: softwareSchema(plugin),
    body: `<section class="subpage-hero plugin-detail-hero"><div class="container"><a class="back-link" href="/plugins"><i class="fas fa-arrow-left"></i> Назад в каталог</a><div class="plugin-detail-grid reveal"><div class="plugin-detail-icon"><i class="${esc(plugin.icon)}"></i></div><div class="plugin-detail-content"><div class="detail-badges"><span class="plugin-badge">${esc(plugin.badge)}</span>${statusBadge(plugin)}</div><h1>${esc(plugin.name)} для After Effects</h1><p>${esc(plugin.description)}</p><div class="detail-meta"><span><i class="fas fa-folder"></i> ${esc(plugin.categoryLabel)}</span><span><i class="fas fa-box"></i> ${esc(plugin.package)}</span><span><i class="fas fa-hdd"></i> ${esc(plugin.size)}</span><span><i class="fas fa-calendar"></i> ${esc(plugin.version)}</span><span><i class="fas fa-check-circle"></i> ${esc(plugin.compatibility)}</span></div><div class="plugin-tags big">${(plugin.tags || []).map((tag) => `<span>#${esc(tag)}</span>`).join('')}</div><div class="hero-actions">${download}<button class="btn btn-ghost favorite-btn" data-id="${esc(plugin.id)}"><i class="far fa-heart"></i> В избранное</button></div></div></div><div class="detail-panels reveal"><article class="install-card"><h2>Инструкция для этого типа файла</h2><p>${esc(installText(plugin.package))}</p><a href="/install#${plugin.package === 'jsx' ? 'jsx' : esc(plugin.package)}" class="text-link">Открыть подробную инструкцию</a></article><article class="install-card"><h2>Перед скачиванием</h2><ul class="check-list"><li>Закройте After Effects перед установкой.</li><li>Проверьте папку версии AE.</li><li>Если кнопка отключена, файл сейчас обновляется.</li></ul></article></div></div></section><section class="section"><div class="container"><div class="section-head"><span class="eyebrow">Похожие</span><h2>Похожие плагины</h2></div><div class="plugins-grid compact">${related.map(pluginCard).join('')}</div></div></section>`
  });
}

function installPage() {
  return layout({
    active: 'install',
    route: '/install',
    title: 'Как установить плагины After Effects — .aex, .jsx, .jsxbin, .ffx',
    description: 'Инструкция Null-Object-AE по установке плагинов, скриптов и пресетов After Effects: .aex, .jsx, .jsxbin и .ffx.',
    schema: collectionSchema('Инструкция по установке плагинов After Effects', 'Как устанавливать .aex, .jsx, .jsxbin и .ffx в Adobe After Effects.', '/install'),
    body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-download"></i> Установка</span><h1>Как устанавливать плагины, скрипты и пресеты</h1><p>Инструкции разделены по типам файлов.</p></div></section><section class="section"><div class="container install-layout"><aside class="install-nav reveal"><a href="#before">Перед установкой</a><a href="#aex">Установка .aex</a><a href="#jsx">Установка .jsx / .jsxbin</a><a href="#ffx">Установка .ffx</a><a href="#troubleshooting">Если плагин не появился</a></aside><div class="install-content"><article class="install-card reveal" id="before"><h2><i class="fas fa-triangle-exclamation"></i> Перед установкой</h2><ol><li>Закройте After Effects перед копированием файлов.</li><li>Проверьте версию AE. Лучше использовать AE 2022 и новее.</li><li>Распакуйте архив плагина в отдельную папку.</li><li>Сохраните копию исходных файлов, если меняете системные папки.</li></ol></article><article class="install-card reveal" id="aex"><h2><i class="fas fa-cube"></i> Установка .aex</h2><p>.aex — файл плагина After Effects. Его чаще всего нужно копировать в папку Plug-ins.</p><div class="code-block">C:\\Program Files\\Adobe\\Adobe After Effects 2022\\Support Files\\Plug-ins</div><ol><li>Распакуйте архив.</li><li>Найдите файл с расширением <b>.aex</b>.</li><li>Скопируйте его в папку <b>Plug-ins</b>.</li><li>Откройте After Effects и проверьте меню <b>Effect</b>.</li></ol></article><article class="install-card reveal" id="jsx"><h2><i class="fas fa-code"></i> Установка .jsx / .jsxbin</h2><p>.jsx и .jsxbin — это скрипты. Их кладут в Scripts или ScriptUI Panels.</p><div class="code-block">C:\\Program Files\\Adobe\\Adobe After Effects 2022\\Support Files\\Scripts</div><div class="code-block">C:\\Program Files\\Adobe\\Adobe After Effects 2022\\Support Files\\Scripts\\ScriptUI Panels</div><ol><li>Обычный скрипт копируйте в <b>Scripts</b>.</li><li>Панель копируйте в <b>ScriptUI Panels</b>.</li><li>В AE откройте <b>File → Scripts</b> или <b>Window</b>.</li><li>Если скрипт не запускается, включите разрешение скриптов в настройках AE.</li></ol></article><article class="install-card reveal" id="ffx"><h2><i class="fas fa-sliders"></i> Установка .ffx</h2><p>.ffx — пресеты эффектов. Их обычно кладут в папку User Presets.</p><div class="code-block">Documents\\Adobe\\After Effects 2022\\User Presets</div><ol><li>Скопируйте файл <b>.ffx</b> в папку <b>User Presets</b>.</li><li>Перезапустите AE.</li><li>Откройте панель <b>Effects & Presets</b>.</li><li>Найдите пресет по названию или через поиск.</li></ol></article><article class="install-card reveal" id="troubleshooting"><h2><i class="fas fa-life-ring"></i> Что делать, если плагин не появился</h2><ul class="check-list"><li>Проверьте, точно ли файл лежит в папке вашей версии After Effects.</li><li>Запустите AE от имени администратора.</li><li>Проверьте совместимость плагина.</li><li>Для скриптов включите доступ в настройках Scripting & Expressions.</li><li>Если это панель, ищите её в меню <b>Window</b>.</li></ul></article></div></div></section>`
  });
}

function faqPage() {
  const items = [
    ['Почему плагин не появился в After Effects?', 'Чаще всего файл положили не в ту папку, AE не был перезапущен или скрипт нужно искать в меню Window, а не в Effects.'],
    ['Что значит статус “Проверено”?', 'У карточки есть рабочая ссылка на файл. Это не заменяет личную проверку файла перед запуском.'],
    ['Что значит “Обновляется”?', 'У карточки пока нет готовой ссылки или файл временно обновляется.'],
    ['Подойдут ли плагины для AE 2024 / 2025?', 'Сайт ориентирован на AE 2022 и новее, но совместимость зависит от конкретного плагина.'],
    ['Куда кидать .aex?', 'В папку Plug-ins вашей версии After Effects.'],
    ['Куда кидать .ffx?', 'В Documents → Adobe → After Effects → User Presets.'],
    ['Как сообщить о нерабочей ссылке?', 'Можно написать в Telegram-канал проекта.']
  ];

  return layout({
    active: 'faq',
    route: '/faq',
    title: 'FAQ по плагинам After Effects — частые вопросы',
    description: 'Ответы Null-Object-AE на частые вопросы по установке, совместимости и статусам плагинов Adobe After Effects.',
    schema: collectionSchema('FAQ по плагинам After Effects', 'Частые вопросы по плагинам, скриптам и пресетам для After Effects.', '/faq'),
    body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-circle-question"></i> FAQ</span><h1>Частые вопросы</h1><p>Короткие ответы на самые частые проблемы с плагинами After Effects.</p></div></section><section class="section"><div class="container faq-list">${items.map(([q, a], index) => `<details class="faq-item" ${index === 0 ? 'open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>`
  });
}

function platformLabel(platform) {
  return platform === 'tiktok' ? 'TikTok' : platform === 'youtube' ? 'YouTube' : 'Видео';
}

function platformIcon(platform) {
  return platform === 'tiktok' ? 'fab fa-tiktok' : platform === 'youtube' ? 'fab fa-youtube' : 'fas fa-video';
}

function editCard(item) {
  const platform = item.platform || 'video';
  const thumb = item.thumb || '';
  return `<article class="edit-card reveal"><a class="edit-thumb" href="${esc(item.url)}" target="_blank" rel="noopener">${thumb ? `<img src="${esc(thumb)}" alt="${esc(item.title)}" loading="lazy">` : '<div class="edit-thumb-placeholder"><i class="fas fa-video"></i></div>'}<span class="platform-badge"><i class="${platformIcon(platform)}"></i> ${platformLabel(platform)}</span><span class="play-badge"><i class="fas fa-play"></i></span></a><div class="edit-body"><h3>${esc(item.title || 'Без названия')}</h3><p>${esc(item.description || 'Пользовательская работа After Effects.')}</p><div class="edit-meta"><span><i class="fas fa-user"></i> ${esc(item.author || 'Автор')}</span>${item.plugins ? `<span><i class="fas fa-plug"></i> ${esc(item.plugins)}</span>` : ''}</div></div><div class="edit-actions"><a class="details-btn" href="${esc(item.url)}" target="_blank" rel="noopener"><i class="fas fa-up-right-from-square"></i> Открыть</a></div></article>`;
}

function communityPage() {
  const approved = edits.filter((item) => (item.status || 'approved') === 'approved');
  return layout({
    active: 'community',
    route: '/community',
    title: 'Работы пользователей After Effects — эдиты и видео',
    description: 'Раздел Null-Object-AE с работами пользователей, эдитами, шоурилами и видео, сделанными в Adobe After Effects.',
    schema: collectionSchema('Работы пользователей After Effects', 'Эдиты и видео пользователей, сделанные с After Effects.', '/community'),
    body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-film"></i> Комьюнити</span><h1>Работы пользователей</h1><p>Эдиты, шоурилы и ролики, которые люди сделали в After Effects.</p><div class="hero-actions"><a class="btn btn-primary" href="/submit"><i class="fas fa-plus"></i> Поделиться эдитом</a><a class="btn btn-ghost" href="/plugins"><i class="fas fa-plug"></i> Плагины</a></div></div></section><section class="section"><div class="container"><div class="catalog-panel reveal"><div class="search-wrap"><i class="fas fa-search"></i><input id="editSearch" type="search" placeholder="Поиск по названию, автору или платформе..."><button id="clearEditSearch" type="button"><i class="fas fa-xmark"></i></button></div><div class="catalog-row"><div class="filter-tabs" id="editFilters"><button class="filter-btn active" data-platform="all">Все</button><button class="filter-btn" data-platform="youtube">YouTube</button><button class="filter-btn" data-platform="tiktok">TikTok</button></div><div class="catalog-meta"><span id="editCount">Работ: ${approved.length}</span></div></div></div><div class="edits-grid" id="communityGrid">${approved.map(editCard).join('')}</div><div class="empty-state" id="communityEmpty" ${approved.length ? 'hidden' : ''}><i class="fas fa-video"></i><h3>Работ пока нет</h3><p>Пока здесь пусто. Будь первым, кто поделится своей работой.</p><a class="btn btn-primary" href="/submit"><i class="fas fa-plus"></i> Добавить работу</a></div></div></section>`
  });
}

function submitPage() {
  return layout({
    active: 'submit',
    route: '/submit',
    robots: 'noindex,follow',
    title: 'Поделиться эдитом',
    description: 'Форма добавления пользовательской работы для Null-Object-AE.',
    body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-paper-plane"></i> Отправка работы</span><h1>Поделиться своим эдитом</h1><p>Форма сохраняет заявку в браузере. Для общей публикации отправьте данные в Telegram-канал проекта.</p></div></section><section class="section"><div class="container submit-layout"><form class="submit-card reveal" id="editSubmitForm"><h2>Данные работы</h2><label>Ссылка на видео<input id="editUrl" name="url" type="url" placeholder="https://youtube.com/watch?v=..." required></label><label>Название<input id="editTitle" name="title" type="text" placeholder="Например: Cinematic AE Edit" maxlength="80" required></label><label>Автор / ник<input id="editAuthor" name="author" type="text" placeholder="Твой ник" maxlength="40" required></label><label>Какие плагины использовал<input id="editPlugins" name="plugins" type="text" placeholder="Saber, Deep Glow, Twitch..." maxlength="120"></label><label>Описание<textarea id="editDescription" name="description" rows="4" placeholder="Коротко опиши работу" maxlength="300"></textarea></label><div class="submit-actions"><button class="btn btn-primary" type="submit"><i class="fas fa-paper-plane"></i> Сохранить заявку</button></div></form><div class="preview-panel reveal"><h2>Мои заявки</h2><div class="edits-grid" id="mySubmissionsGrid"></div><div class="empty-state inline" id="mySubmissionsEmpty"><p>Пока нет отправленных заявок.</p></div></div></div></section>`
  });
}

function notFoundPage() {
  return layout({
    active: 'home',
    route: '/404',
    robots: 'noindex,follow',
    title: 'Страница не найдена',
    description: 'Страница не найдена. Вернитесь на главную или в каталог Null-Object-AE.',
    body: '<section class="subpage-hero"><div class="container"><h1>Страница не найдена</h1><p>Проверьте адрес или вернитесь на главную.</p><div class="hero-actions"><a class="btn btn-primary" href="/">На главную</a><a class="btn btn-ghost" href="/plugins">Каталог</a></div></div></section>'
  });
}

function sitemapXml() {
  const now = new Date().toISOString();
  const pages = [
    ['/', 'daily', '1.0'],
    ['/plugins', 'daily', '0.95'],
    ['/install', 'monthly', '0.75'],
    ['/faq', 'monthly', '0.7'],
    ['/community', 'weekly', '0.65'],
    ...plugins.map((plugin) => [`/plugin/${url(plugin.id)}`, 'weekly', plugin.status === 'available' ? '0.9' : '0.65'])
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(([route, changefreq, priority]) => `  <url>
    <loc>${escXml(absoluteUrl(route))}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}

function robotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${absoluteUrl('/sitemap.xml')}
`;
}

app.use((req, res, next) => {
  if (req.path === '/1' || req.path === '/1/') {
    res.redirect(301, '/');
    return;
  }

  if (req.path.startsWith('/1/')) {
    res.redirect(301, req.originalUrl.replace(/^\/1/, '') || '/');
    return;
  }

  next();
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(robotsTxt());
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').send(sitemapXml());
});

app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use('/style.css', express.static(path.join(ROOT, 'style.css'), { maxAge: '1h' }));
app.use('/client.js', express.static(path.join(ROOT, 'client.js'), { maxAge: '1h' }));

app.get('/', (req, res) => res.send(homePage()));
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/plugins', (req, res) => res.send(pluginsPage()));
app.get('/plugins.html', (req, res) => res.redirect(301, '/plugins'));
app.get('/plugin/:id', (req, res) => res.send(pluginPage(req.params.id)));
app.get('/plugin.html', (req, res) => res.redirect(301, `/plugin/${url(req.query.id || '')}`));
app.get('/install', (req, res) => res.send(installPage()));
app.get('/install.html', (req, res) => res.redirect(301, '/install'));
app.get('/faq', (req, res) => res.send(faqPage()));
app.get('/faq.html', (req, res) => res.redirect(301, '/faq'));
app.get('/community', (req, res) => res.send(communityPage()));
app.get('/community.html', (req, res) => res.redirect(301, '/community'));
app.get('/submit', (req, res) => res.send(submitPage()));
app.get('/submit.html', (req, res) => res.redirect(301, '/submit'));

app.get('/download/:id', (req, res) => {
  const plugin = plugins.find((item) => item.id === req.params.id);
  if (!plugin || plugin.status !== 'available' || !plugin.downloadUrl || plugin.downloadUrl === '#') {
    res.redirect(302, '/plugins');
    return;
  }

  res.redirect(302, plugin.downloadUrl);
});

app.use((req, res) => {
  res.status(404).send(notFoundPage());
});

app.listen(PORT, () => {
  console.log(`SSR server started: http://localhost:${PORT}`);
});
