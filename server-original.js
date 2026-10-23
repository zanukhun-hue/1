const fs = require('fs');
const path = require('path');
const vm = require('vm');
const express = require('express');
const redesign = require('./redesign');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const BUILD = process.env.RENDER_GIT_COMMIT || 'living-collection-v8';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '7mb' }));

const serviceEnvName = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_');
const site = {
  title: 'Null-Object-AE',
  description: 'Каталог плагинов, скриптов и пресетов для Adobe After Effects.',
  url: (process.env.SITE_URL || 'https://null-object-ae.onrender.com').replace(/\/$/, ''),
  telegramUrl: process.env.TELEGRAM_URL || 'https://t.me/ae_plugins_vault',
  creatorTelegramUrl: process.env.CREATOR_TELEGRAM_URL || 'https://t.me/endfire',
  tgBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  tgChatId: process.env.TELEGRAM_CHAT_ID || '',
  tgSecret: process.env.TELEGRAM_WEBHOOK_SECRET || ''
};
const supabase = {
  url: (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, ''),
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  adminKey: process.env.SUPABASE_ADMIN_KEY || process.env[serviceEnvName] || ''
};

function loadWindowArray(fileName, propertyName) {
  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) return [];
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(filePath, 'utf8'), sandbox, { filename: fileName });
  return Array.isArray(sandbox.window[propertyName]) ? sandbox.window[propertyName] : [];
}
const plugins = loadWindowArray('plugins.js', 'AE_PLUGINS');
const discovery = JSON.parse(fs.readFileSync(path.join(ROOT, 'discovery.json'), 'utf8'));
const pluginMedia = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugin-media.json'), 'utf8'));
const pluginImages = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugin-images.json'), 'utf8'));
const compatibility = JSON.parse(fs.readFileSync(path.join(ROOT, 'compatibility.json'), 'utf8'));
const recipes = JSON.parse(fs.readFileSync(path.join(ROOT, 'recipes.json'), 'utf8'));
const presetLibrary = require('./preset-library');
const presetCatalog = presetLibrary.read(ROOT);
const presetStore = require('./telegram-preset-store').store({api:telegramApi,adminChat:site.tgChatId});

const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const escXml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[char]));
const enc = (value) => encodeURIComponent(String(value ?? ''));
const absoluteUrl = (route = '/') => `${site.url}${route.startsWith('/') ? route : `/${route}`}`;
const hasSupabase = () => Boolean(supabase.url && supabase.anonKey);
const serviceReady = () => Boolean(supabase.url && supabase.adminKey);

function supabaseHeaders(admin = false, extra = {}) {
  const key = admin ? supabase.adminKey : supabase.anonKey;
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}
async function supabaseRequest(pathname, options = {}, admin = false) {
  if (admin && !serviceReady()) throw new Error('Серверный доступ не настроен. Проверь секретный ключ Supabase в Render.');
  if (!admin && !hasSupabase()) throw new Error('Supabase не настроен.');
  const response = await fetch(`${supabase.url}/rest/v1/${pathname}`, { ...options, headers: supabaseHeaders(admin, options.headers || {}) });
  const text = await response.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (!response.ok) {
    const error = new Error(data && data.message ? data.message : text || `Supabase error ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
async function countRows(resource, filter = '', admin = false) {
  if (!hasSupabase() && !admin) return 0;
  try {
    const glue = filter ? `${filter}&` : '';
    const response = await fetch(`${supabase.url}/rest/v1/${resource}?${glue}select=id`, { method: 'HEAD', headers: supabaseHeaders(admin, { Prefer: 'count=exact' }) });
    const total = Number((response.headers.get('content-range') || '').split('/')[1]);
    return Number.isFinite(total) ? total : 0;
  } catch (_) { return 0; }
}

const rateBuckets = new Map();
function rateLimit(name, ip, max = 8, windowMs = 60000) {
  const key = `${name}:${ip}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + windowMs; }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  return bucket.count <= max;
}
const limit = (name, max = 8) => (req, res, next) => rateLimit(name, req.ip, max) ? next() : res.status(429).json({ error: 'Слишком много запросов. Попробуйте позже.' });
async function telegramApi(method, payload) {
  if (!site.tgBotToken) return null;
  const response = await fetch(`https://api.telegram.org/bot${site.tgBotToken}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.description || `Telegram ${method} failed`);
  return data.result;
}
async function notifyTelegram(text, replyMarkup) {
  if (!site.tgBotToken || !site.tgChatId) return;
  try {
    await telegramApi('sendMessage', {
      chat_id: site.tgChatId,
      text,
      disable_web_page_preview: true,
      reply_markup: replyMarkup || undefined
    });
  } catch (error) { console.error('Telegram notify failed:', error.message); }
}
function mainKeyboard() {
  return {
    keyboard: [
      [{ text: '📊 Статистика' }, { text: '📋 Pending' }]
    ],
    resize_keyboard: true,
    persistent: true
  };
}
function closeKeyboard(type, id) {
  return { inline_keyboard: [[{ text: '✅ Закрыть', callback_data: `${type}:done:${id}` } ]] };
}
async function answerCallback(id, text) {
  try { await telegramApi('answerCallbackQuery', { callback_query_id: id, text, show_alert: false }); } catch (_) {}
}
async function editTelegramMessage(chatId, messageId, text) {
  try { await telegramApi('editMessageText', { chat_id: chatId, message_id: messageId, text, disable_web_page_preview: true }); } catch (_) {}
}
function isAllowedTelegramChat(update) {
  const chatId = update?.message?.chat?.id || update?.callback_query?.message?.chat?.id || update?.callback_query?.from?.id;
  return String(chatId) === String(site.tgChatId);
}

function websiteSchema() { return { '@context': 'https://schema.org', '@type': 'WebSite', name: site.title, url: site.url, description: site.description, inLanguage: 'ru-RU' }; }
function collectionSchema(name, description, route) { return { '@context': 'https://schema.org', '@type': 'CollectionPage', name, description, url: absoluteUrl(route), isPartOf: { '@type': 'WebSite', name: site.title, url: site.url } }; }
function softwareSchema(plugin) { return { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: plugin.name, description: plugin.description, applicationCategory: 'MultimediaApplication', operatingSystem: 'Windows, macOS', softwareVersion: plugin.version, url: absoluteUrl(`/plugin/${enc(plugin.id)}`) }; }
function jsonLd(data) { return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`; }
function head({ title, description, route = '/', robots = 'index,follow', schema }) {
  const canonical = absoluteUrl(route);
  const fullTitle = title.includes(site.title) ? title : `${title} | ${site.title}`;
  const schemas = [websiteSchema(), schema].filter(Boolean).map(jsonLd).join('\n');
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script>(function(){try{var t=localStorage.getItem('theme');var d=true;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('ae-motion-enabled');document.documentElement.classList.toggle('dark-mode',d);document.documentElement.classList.toggle('light-mode',!d)}catch(e){document.documentElement.classList.add('dark-mode')}})();</script><style>html.dark-mode,html.dark-mode body{background:#080a12;color:#f8fafc;color-scheme:dark}html.light-mode,html.light-mode body{background:#f8fafc;color:#111827;color-scheme:light}</style><link rel="canonical" href="${esc(canonical)}"><link rel="stylesheet" href="/style.css?v=${enc(BUILD)}"><link rel="stylesheet" href="/assets/interior.css?v=${enc(BUILD)}"><link rel="stylesheet" href="/assets/plugin-theatre.css?v=${enc(BUILD)}"><link rel="stylesheet" href="/assets/scene-motion.css?v=${enc(BUILD)}"><link rel="stylesheet" href="/assets/experience.css?v=${enc(BUILD)}"><link rel="stylesheet" href="/assets/scene-revisions.css?v=${enc(BUILD)}"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"><link href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E" rel="icon" type="image/svg+xml"><title>${esc(fullTitle)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${esc(robots)}"><meta name="theme-color" content="#050505"><meta property="og:type" content="website"><meta property="og:locale" content="ru_RU"><meta property="og:site_name" content="${esc(site.title)}"><meta property="og:title" content="${esc(fullTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(fullTitle)}"><meta name="twitter:description" content="${esc(description)}">${schemas}</head>`;
}
function header(active = 'home') { return redesign.header({ site, active }); }
function footer() { return redesign.footer({ site }); }
function layout({ active, title, description, route, robots, schema, body }) { return `${head({ title, description, route, robots, schema })}<body data-page="${esc(active)}">${header(active)}<main id="main-content">${body}</main>${footer()}${workspaceUI()}<button class="back-to-top" id="backToTop"><i class="fas fa-arrow-up"></i></button><script src="/client.js?v=${enc(BUILD)}" defer></script><script src="/assets/plugin-theatre.js?v=${enc(BUILD)}" defer></script><script src="/assets/scene-motion.js?v=${enc(BUILD)}" defer></script><script src="/assets/experience.js?v=${enc(BUILD)}" defer></script>${active==='home'?`<script type="module" src="/assets/model-viewer.js?v=${enc(BUILD)}"></script>`:''}</body></html>`; }

function statusBadge(plugin) { return plugin.status === 'available' ? '<span class="status-badge available"><i class="fas fa-check-circle"></i> Ссылка доступна</span>' : '<span class="status-badge updating"><i class="fas fa-clock"></i> Обновляется</span>'; }
function pluginSizeMB(plugin) { const raw = String(plugin.size || '').toLowerCase().replace(',', '.'); const n = parseFloat(raw) || 0; if (raw.includes('gb')) return n * 1024; if (raw.includes('kb')) return n / 1024; return n; }
function getCategories() { const map = new Map(); plugins.forEach((plugin) => map.set(plugin.category, plugin.categoryLabel)); return [['all', 'Все'], ...Array.from(map.entries())]; }
function categoryById(id) { const found = getCategories().find(([cat]) => cat === id); return found && id !== 'all' ? found : null; }
function sortPlugins(list, type = 'popular') { const rank = (plugin) => /популяр/i.test(plugin.badge || '') ? 0 : /нов/i.test(plugin.badge || '') ? 1 : 2; return [...list].sort((a, b) => { if (type === 'az') return a.name.localeCompare(b.name, 'ru'); if (type === 'available') return Number(b.status === 'available') - Number(a.status === 'available') || a.name.localeCompare(b.name, 'ru'); if (type === 'size') return pluginSizeMB(a) - pluginSizeMB(b); if (type === 'new') return Number(/нов/i.test(b.badge || '')) - Number(/нов/i.test(a.badge || '')) || a.name.localeCompare(b.name, 'ru'); return rank(a) - rank(b) || Number(b.status === 'available') - Number(a.status === 'available') || a.name.localeCompare(b.name, 'ru'); }); }
function relatedPlugins(plugin, count = 3) { const tags = new Set((plugin.tags || []).map((tag) => String(tag).toLowerCase())); return plugins.filter((item) => item.id !== plugin.id).map((item) => ({ item, score: (item.tags || []).filter((tag) => tags.has(String(tag).toLowerCase())).length * 3 + (item.category === plugin.category ? 2 : 0) + (item.package === plugin.package ? 1 : 0) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'ru')).slice(0, count).map((x) => x.item); }
function pluginArt(plugin, cls='') {
  const image=pluginImages[plugin.id]?.image;
  return `<div class="product-art ${cls} ${pluginImages[plugin.id]?.fit==='contain'?'product-contained':''} ${['bcc-sapphire','bcc-continuum','mocha-pro'].includes(plugin.id)?'product-logo':''}">${image?`<img src="${esc(image)}" alt="${esc(plugin.name)}" draggable="false" loading="lazy" width="600" height="400">`:`<span class="product-monogram" aria-hidden="true">${esc(plugin.name.split(/[ -]+/).map(w=>w[0]).join('').slice(0,3))}</span><span class="art-caption">${esc(plugin.categoryLabel)}</span>`}</div>`;
}
function buildButton(id) {return `<button class="build-btn" type="button" data-build-id="${esc(id)}" aria-pressed="false">＋ В корзину</button>`;}
function compatibilityNote(plugin) {const c=compatibility[plugin.id];return `<span class="compatibility-note" data-compat-id="${esc(plugin.id)}">${c?esc(c.label):'Совместимость уточняется'}</span>${c?`<a class="compat-source" href="${esc(c.source)}" target="_blank" rel="noopener">Данные разработчика ↗</a>`:''}`;}
function pluginCard(plugin) {
 const tasks=discovery.tasks.filter(task=>task.plugins.includes(plugin.id));
 const download=plugin.status==='available'?`<a class="download-btn" href="/download/${enc(plugin.id)}">↓ Скачать</a>`:'<button class="download-btn disabled" disabled>Обновляется</button>';
 return `<article class="plugin-card reveal" data-plugin-card data-id="${esc(plugin.id)}" data-category="${esc(plugin.category)}" data-status="${esc(plugin.status)}" data-name="${esc(plugin.name)}" data-size="${pluginSizeMB(plugin)}" data-tasks="${tasks.map(t=>t.id).join(' ')}" data-search-extra="${esc(tasks.map(t=>t.keywords).join(' '))}"><a class="product-cover" href="/plugin/${enc(plugin.id)}">${pluginArt(plugin)}<span class="cover-category">${esc(plugin.categoryLabel)}</span></a><div class="plugin-card-header"><span class="plugin-badge">${esc(plugin.badge||plugin.categoryLabel)}</span><div class="product-card-tools"><button class="favorite-btn" data-id="${esc(plugin.id)}" type="button" aria-label="Добавить ${esc(plugin.name)} в избранное"><i class="far fa-heart"></i></button></div></div><button type="button" class="build-drag-handle" data-build-drag="${esc(plugin.id)}" aria-label="Перетащить ${esc(plugin.name)} в корзину. Можно также нажать, чтобы добавить."><span aria-hidden="true">⠿</span> Перетащить в корзину <span class="drag-strip-arrow" aria-hidden="true">↓</span></button><div class="plugin-card-content"><h3><a href="/plugin/${enc(plugin.id)}">${esc(plugin.name)}</a></h3><p>${esc(plugin.description)}</p><div class="plugin-meta"><span>${esc(plugin.version)}</span><span>${esc(plugin.size)}</span></div>${compatibilityNote(plugin)}</div><div class="card-build-row">${statusBadge(plugin)}${buildButton(plugin.id)}</div><div class="plugin-card-footer">${download}<a class="details-btn" href="/plugin/${enc(plugin.id)}">Подробнее ↗</a></div></article>`;
}
function workspaceUI() {
 const data={plugins:plugins.map(p=>({id:p.id,name:p.name,description:p.description,category:p.categoryLabel,status:p.status,version:p.version,image:pluginImages[p.id]?.image||'',tasks:discovery.tasks.filter(t=>t.plugins.includes(p.id)).map(t=>t.id),keywords:discovery.tasks.filter(t=>t.plugins.includes(p.id)).map(t=>t.keywords).join(' ')})),compatibility};
 return `<script id="workspaceData" type="application/json">${JSON.stringify(data).replace(/</g,'\\u003c')}</script><dialog class="command-dialog" id="commandDialog" aria-labelledby="commandTitle"><div class="command-top"><label id="commandTitle" for="commandSearch">Найти инструмент или раздел</label><button type="button" data-command-close aria-label="Закрыть поиск">Esc</button></div><input id="commandSearch" type="search" placeholder="Плагин, эффект или задача…" autocomplete="off"><div id="commandResults" class="command-results"></div><p class="command-hint">↑ ↓ выбор · Enter открыть · Esc закрыть</p></dialog><dialog id="cartDialog" class="cart-dialog" aria-labelledby="cartTitle"><div class="cart-top"><div><span class="eyebrow">Выбранные инструменты</span><h2 id="cartTitle">Корзина плагинов</h2></div><button type="button" data-cart-close aria-label="Закрыть корзину">×</button></div><p class="cart-note">Собери нужные плагины и скачай каждый из списка. Выбор сохранится в этом браузере.</p><div class="cart-items" data-cart-items></div><div class="cart-empty empty-state" data-cart-empty><canvas class="empty-particles" data-empty-particles aria-hidden="true"></canvas><h3>Здесь будет твой набор</h3><p>Перетащи карточку за ручку ⠿ в корзину или нажми «В корзину».</p><button type="button" class="btn btn-primary" data-cart-close>Выбрать плагины →</button></div><div class="cart-bottom" data-cart-bottom><span data-build-summary></span><button type="button" class="btn btn-ghost" data-build-clear>Очистить корзину</button></div></dialog>`;
}
function environmentControls() {return `<details class="environment-controls"><summary>Моя версия AE <span data-environment-label>Не выбрана</span></summary><div class="environment-fields"><label>After Effects<select id="myAeVersion"><option value="">Любая версия</option>${[2026,2025,2024,2023,2022,2021,2020,2019].map(y=>`<option value="${y}">${y}${y===2020?' (17.5+)':''}</option>`).join('')}</select></label><label>Система<select id="myOs"><option value="">Любая система</option><option value="windows">Windows</option><option value="macos">macOS</option></select></label><label class="environment-check"><input id="compatibleOnly" type="checkbox"> Только подтверждённая совместимость</label></div><p>Без подтверждённых данных плагины помечены «Уточняется». Фильтр скрывает их, когда включён. Поддержка версии AE и системы проверяется отдельно.</p></details>`;}


async function logEvent(type, payload = {}, req) { if (!hasSupabase()) return; try { await supabaseRequest('site_events', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ event_type: type, plugin_id: payload.plugin_id || null, edit_id: payload.edit_id || null, path: payload.path || null, visitor_hash: String(req?.ip || '').slice(0, 64) }) }); } catch (_) {} }
async function countEvents(filter) { return countRows('site_events', filter); }
async function countRows(resource, filter = '', admin = false) {
  if (!hasSupabase() && !admin) return 0;
  try {
    const glue = filter ? `${filter}&` : '';
    const response = await fetch(`${supabase.url}/rest/v1/${resource}?${glue}select=id`, { method: 'HEAD', headers: supabaseHeaders(admin, { Prefer: 'count=exact' }) });
    const total = Number((response.headers.get('content-range') || '').split('/')[1]);
    return Number.isFinite(total) ? total : 0;
  } catch (_) { return 0; }
}
async function topDownloadedPlugins(limit = 4) {
  if (!hasSupabase()) return sortPlugins(plugins).slice(0, limit).map((plugin) => ({ plugin, downloads: 0 }));
  try {
    const rows = await supabaseRequest('site_events?select=plugin_id&event_type=eq.download&plugin_id=not.is.null&order=created_at.desc&limit=1000');
    const counts = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => counts.set(row.plugin_id, (counts.get(row.plugin_id) || 0) + 1));
    return plugins.map((plugin) => ({ plugin, downloads: counts.get(plugin.id) || 0 })).sort((a, b) => b.downloads - a.downloads || a.plugin.name.localeCompare(b.plugin.name, 'ru')).slice(0, limit);
  } catch (_) { return sortPlugins(plugins).slice(0, limit).map((plugin) => ({ plugin, downloads: 0 })); }
}
async function getModerationData() {
 const [reports,topDownloads,pendingReports]=await Promise.all([supabaseRequest('plugin_reports?select=*&status=eq.pending&order=created_at.desc&limit=100',{},true),topDownloadedPlugins(8),countRows('plugin_reports','status=eq.pending',true)]);
 return {reports,topDownloads,stats:{pendingReports,plugins:plugins.length}};
}
function moderationSummaryText(data) {return `Сводка Null-Object-AE\n\nЖалобы на ссылки: ${data.stats.pendingReports||0}\nПлагинов в каталоге: ${data.stats.plugins||0}`;}
async function sendPendingToTelegram() {
 const data=await getModerationData();await notifyTelegram(moderationSummaryText(data));
 for(const row of data.reports.slice(0,5))await notifyTelegram(`Жалоба на ссылку\n${row.plugin_name||row.plugin_id}\n${row.message||'Без комментария'}`,closeKeyboard('report',row.id));
}
async function handleTelegramAction(update) {
  if (await presetStore.handle(update)) return;
  if (!isAllowedTelegramChat(update)) return;
  if (update.message) {
    const raw = String(update.message.text || '').trim();
    const text = raw.toLowerCase();
    if (['/start', '/help'].includes(text)) return notifyTelegram('Панель управления включена. Нажимай кнопки снизу или используй команды:\n/stats — статистика\n/pending — жалобы на ссылки', mainKeyboard());
    if (text === '/stats' || raw === '📊 Статистика') return notifyTelegram(moderationSummaryText(await getModerationData()), { inline_keyboard: [[{ text: '📋 Показать pending', callback_data: 'dash:pending' } ]] });
    if (text === '/pending' || raw === '📋 Pending') return sendPendingToTelegram();
    return;
  }
  const cb = update.callback_query;
  if (!cb) return;
  const [type, action, id] = String(cb.data || '').split(':');
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  if (type === 'dash' && action === 'pending') {
    await answerCallback(cb.id, 'Загружаю pending...');
    return sendPendingToTelegram();
  }
  if (!id) return answerCallback(cb.id, 'Нет ID записи');
  if (type === 'report') {
    await supabaseRequest(`plugin_reports?id=eq.${enc(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'done' }) }, true);
    await answerCallback(cb.id, 'Жалоба закрыта');
    if (chatId && messageId) await editTelegramMessage(chatId, messageId, `${cb.message.text || ''}\n\nСтатус: закрыто ✅`);
    return;
  }

}

function pluginGallery() {
  const tiles = sortPlugins(plugins).filter(plugin => plugin.status === 'available');
  const images = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugin-images.json'), 'utf8'));
  const rings = [{ count: 6, radius: 350 }, { count: 12, radius: 700 }, { count: 18, radius: 1050 }];
  let offset = 0;
  const nodes = rings.flatMap((ring, level) => Array.from({ length: ring.count }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / ring.count + (level % 2 ? Math.PI / ring.count : 0);
    return { index: offset++, level, angle, x: 1280 + Math.cos(angle) * ring.radius, y: 1280 + Math.sin(angle) * ring.radius };
  })).slice(0, tiles.length);
  const edges = nodes.flatMap(node => {
    const siblings = nodes.filter(other => other.level === node.level);
    const next = siblings[(siblings.indexOf(node) + 1) % siblings.length];
    const inner = node.level ? nodes.filter(other => other.level === node.level - 1).sort((a,b) => Math.hypot(node.x-a.x,node.y-a.y)-Math.hypot(node.x-b.x,node.y-b.y))[0] : { index: -1, x:1280, y:1280 };
    return [next, inner].filter(Boolean).map(to => `<path class="gallery-wire" data-from="${node.index}" data-to="${to.index}" d="M ${node.x} ${node.y} Q ${(node.x+to.x)/2} ${(node.y+to.y)/2+70} ${to.x} ${to.y}"/>`);
  }).join('');
  const wires = `<svg class="gallery-connections" viewBox="0 0 2560 2560" aria-hidden="true"><defs><linearGradient id="wireGradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#38bdf8"/><stop offset=".5" stop-color="#818cf8"/><stop offset="1" stop-color="#c084fc"/></linearGradient><filter id="wireGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter></defs><g class="gallery-orbits">${rings.map(ring => `<circle cx="1280" cy="1280" r="${ring.radius}"/>`).join('')}</g><g class="gallery-wire-glow" filter="url(#wireGlow)">${edges}</g><g class="gallery-wire-lines">${edges}</g><circle class="gallery-core-halo" cx="1280" cy="1280" r="115"/><circle class="gallery-core" cx="1280" cy="1280" r="90"/><text class="gallery-core-title" x="1280" y="1286" text-anchor="middle">Ae</text><text class="gallery-core-caption" x="1280" y="1320" text-anchor="middle">${tiles.length} ПЛАГИНОВ</text></svg>`;
  return `<div class="gallery-shell"><div class="plugin-gallery" tabindex="0" role="region" aria-label="Галерея плагинов. Зажмите левую кнопку мыши и двигайте поле. Колесо приближает к курсору. На телефоне используйте перетаскивание и два пальца."><div class="gallery-world">${wires}${tiles.map((plugin, i) => `<a class="gallery-card" style="left:${nodes[i].x-100}px;top:${nodes[i].y-112}px" data-id="${esc(plugin.id)}" data-tasks="${discovery.tasks.filter(t=>t.plugins.includes(plugin.id)).map(t=>t.id).join(' ')}" data-node="${i}" data-x="${nodes[i].x}" data-y="${nodes[i].y}" href="/plugin/${enc(plugin.id)}" data-description="${esc(plugin.description)}"><span class="gallery-card-art ${['bcc-sapphire','bcc-continuum','mocha-pro'].includes(plugin.id)?'gallery-logo-art':''}">${images[plugin.id]?.image ? `<img src="${esc(images[plugin.id].image)}" alt="${esc(plugin.name)}" draggable="false" decoding="async" width="600" height="400">` : `<span class="gallery-image-placeholder"><span class="gallery-monogram" aria-hidden="true">${esc(plugin.name.split(/[ -]+/).map(word=>word[0]).join('').slice(0,3))}</span><span>Изображение пока не добавлено</span></span>`}</span><span class="gallery-card-info"><strong>${esc(plugin.name)}</strong><small>${esc(plugin.categoryLabel)}</small><span class="gallery-open" aria-hidden="true">↗</span></span></a>`).join('')}</div></div></div>`;
}
function galleryPage() {
  return layout({active:'gallery',route:'/gallery',title:'Галерея плагинов',description:'Исследуйте плагины After Effects в интерактивной галерее.',body:`<section class="gallery-page"><div class="gallery-page-heading"><div><span class="eyebrow">Коллекция / After Effects</span><h1>Галерея плагинов</h1></div><a class="text-link" href="/plugins">Открыть обычный каталог →</a></div><div class="gallery-task-bar"><button class="active" type="button" data-gallery-task="all" aria-pressed="true">Все связи</button>${discovery.tasks.map(t=>`<button type="button" data-gallery-task="${t.id}" aria-pressed="false">${esc(t.label)}</button>`).join('')}</div>${pluginGallery()}<div class="gallery-navigation"><span>ЛКМ — двигать · колесо — зум к курсору</span><div><button type="button" data-gallery-zoom="out" aria-label="Уменьшить масштаб">−</button><span class="gallery-zoom-level">80%</span><button type="button" data-gallery-zoom="in" aria-label="Увеличить масштаб">+</button><button type="button" data-gallery-reset>Общий вид</button></div></div></section>`});
}
async function homePage() {
 return layout({ active:'home', route:'/', title:'Коллекция плагинов и эффектов для After Effects', description:site.description, body:redesign.home({ plugins, images:pluginImages, discovery }) });
}

function taskFilters() { return `<div class="task-picker"><span class="task-picker-label">Что хочешь сделать?</span><div class="filter-tabs" id="taskFilters"><button type="button" class="task-filter active" data-task="all" aria-pressed="true">Любая задача</button>${discovery.tasks.map(task => `<button type="button" class="task-filter" data-task="${task.id}" aria-pressed="false">${esc(task.label)}</button>`).join('')}</div></div>`; }
function collectionsPage() {
  return layout({active:'collections',route:'/collections',title:'Наборы плагинов по задачам',description:'Подборки плагинов After Effects для эдитов, новичков и моушн-дизайна.',body:`<section class="subpage-hero"><div class="container"><span class="eyebrow">Подборки</span><h1>Инструменты под твою задачу</h1><p>Зачем нужен каждый плагин и где его найти. Скачивание доступно отдельно на странице плагина.</p></div></section><section class="section collections-section"><div class="container collections-grid">${discovery.collections.map(set => `<article class="collection-card" id="${set.id}"><span class="eyebrow">${set.items.length} инструментов</span><h2>${esc(set.title)}</h2><p>${esc(set.description)}</p><button type="button" class="build-btn collection-build" data-build-set="${esc(set.items.map(item=>item.id).join(' '))}">＋ Добавить набор в корзину</button><ul>${set.items.map(item => { const plugin=plugins.find(p=>p.id===item.id);return plugin?`<li><a href="/plugin/${enc(plugin.id)}"><strong>${esc(plugin.name)}</strong><span>${esc(item.note)}</span><small>${plugin.status==='available'?'Открыть плагин →':'Ссылка обновляется'}</small></a></li>`:''; }).join('')}</ul></article>`).join('')}</div></section>`});
}
function pluginComparison(plugin) {
  const media=pluginMedia[plugin.id];
  if(!media?.before||!media?.after)return '';
  const valid=url=>typeof url==='string'&&(url.startsWith('/assets/')||url.startsWith('https://'));
  if(!valid(media.before)||!valid(media.after))return '';
  return `<section class="video-comparison" aria-label="Видео до и после обработки ${esc(plugin.name)}"><h2>До / после</h2><div class="comparison-frame"><video class="comparison-before" src="${esc(media.before)}" muted playsinline preload="metadata"></video><div class="comparison-after-wrap"><video class="comparison-after" src="${esc(media.after)}" muted playsinline preload="metadata"></video></div><span class="comparison-label before">До</span><span class="comparison-label after">После</span><div class="comparison-divider" aria-hidden="true"></div></div><div class="comparison-controls"><button type="button" class="btn btn-ghost comparison-play">Воспроизвести</button><label>Граница сравнения<input class="comparison-range" type="range" min="0" max="100" value="50" aria-label="Положение границы до и после"></label></div><p class="comparison-status" role="status" hidden></p></section>`;
}
function pluginsPage() { const filters = getCategories().map(([id, label]) => `<button class="filter-btn ${id === 'all' ? 'active' : ''}" data-category="${esc(id)}">${esc(label)}</button>`).join(''); const categoryLinks = getCategories().filter(([id]) => id !== 'all').map(([id, label]) => `<a class="filter-btn" href="/category/${enc(id)}">${esc(label)}</a>`).join(''); return layout({ active: 'plugins', route: '/plugins', title: 'Каталог плагинов After Effects', description: 'Плагины, скрипты и пресеты для After Effects.', schema: collectionSchema('Каталог плагинов After Effects', 'Плагины, скрипты и пресеты для Adobe After Effects.', '/plugins'), body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-plug"></i> Каталог</span><h1>Плагины для After Effects</h1><p>Ищи по названию или задаче — например, «замедлить» или «убрать шум». <a class="text-link" href="/collections">Посмотреть наборы →</a></p></div></section><section class="section catalog-section"><div class="container"><div class="catalog-panel reveal"><div class="search-box"><i class="fas fa-search"></i><input id="pluginSearch" type="text" aria-label="Поиск плагинов по названию или задаче" placeholder="Название или задача: замедлить, свечение, убрать шум..."><button id="clearSearch" type="button" aria-label="Очистить поиск"><span aria-hidden="true">×</span></button></div>${taskFilters()}${environmentControls()}<div class="catalog-row"><div class="filter-tabs" id="categoryFilters">${filters}</div><div class="catalog-controls"><select id="sortPlugins"><option value="popular">Сначала популярные</option><option value="new">Сначала новые</option><option value="az">По названию A–Z</option><option value="available">Сначала доступные</option><option value="size">По размеру файла</option></select><button class="favorites-filter-btn" id="favoritesOnly" type="button"><i class="far fa-heart"></i> Только избранные</button></div></div><div class="catalog-meta"><span id="resultCount">Найдено: ${plugins.length}</span><span id="activeFilterLabel">Все категории</span></div></div><div class="basket-guide"><div><strong>Собери плагины в корзину</strong><p class="basket-guide-desktop">Зажми «Перетащить в корзину» на карточке и перетащи плагин в выделенную область внизу экрана.</p><p class="basket-guide-touch">Нажимай «В корзину» на нужных карточках. Затем открой корзину и скачай выбранное.</p></div><button type="button" class="btn btn-ghost" data-cart-open>Открыть корзину <span data-build-count>0</span></button></div><div class="plugins-grid" id="pluginsGrid">${sortPlugins(plugins).map(pluginCard).join('')}</div><div class="empty-state" id="emptyState" hidden><canvas class="empty-particles" data-empty-particles aria-hidden="true"></canvas><h3>Ничего не найдено</h3><p>Попробуй другую задачу или убери часть фильтров.</p></div></div></section>` }); }
function presetsPage(req) {
  return layout({active:'presets',route:'/presets',title:'Купить пресеты After Effects — наборы по 149 ₽',description:'9 тематических паков FFX: шейки, CC, текст, свечение и другие эффекты. Оплата через Telegram.',schema:collectionSchema('Пресеты для After Effects','Готовые пресеты .ffx для Adobe After Effects.','/presets'),body:`<link rel="stylesheet" href="/assets/preset-library.css?v=${enc(BUILD)}"><section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-sliders"></i> Пресеты</span><h1>Авторские пресеты After Effects</h1><p>9 тематических наборов по 149 ₽. Заказ через Telegram, выдача вручную после подтверждения оплаты. <a class="text-link" href="/install">Как установить .ffx →</a></p></div></section><section class="section"><div class="container">${presetLibrary.render(presetCatalog,req.query,ROOT,esc,enc,process.env.TELEGRAM_BOT_URL || 'https://t.me/netuegobl')}</div></section>`});
}
function categoryPage(id) { const category = categoryById(id); if (!category) return notFoundPage(); const [, label] = category; const list = sortPlugins(plugins.filter((plugin) => plugin.category === id)); return layout({ active: 'plugins', route: `/category/${enc(id)}`, title: `${label} для After Effects`, description: `Плагины категории ${label} для Adobe After Effects.`, schema: collectionSchema(`${label} для After Effects`, `Плагины категории ${label}.`, `/category/${enc(id)}`), body: `<section class="subpage-hero"><div class="container"><a class="back-link" href="/plugins"><i class="fas fa-arrow-left"></i> Назад в каталог</a><span class="eyebrow"><i class="fas fa-folder"></i> Категория</span><h1>${esc(label)} для After Effects</h1><p>В этой категории найдено: ${list.length}</p></div></section><section class="section"><div class="container"><div class="plugins-grid">${list.map(pluginCard).join('')}</div></div></section>` }); }
function installText(type) { return ({ aex: '.aex копируется в папку Plug-ins вашей версии After Effects.', jsx: '.jsx / .jsxbin копируется в Scripts или ScriptUI Panels.', ffx: '.ffx копируется в Documents → Adobe → After Effects → User Presets.' })[type] || 'Смотрите общую инструкцию по установке.'; }
async function pluginPage(id, req) { const plugin = plugins.find((item) => item.id === id); if (!plugin) return notFoundPage(); logEvent('plugin_view', { plugin_id: plugin.id, path: `/plugin/${plugin.id}` }, req); const views = await countEvents(`event_type=eq.plugin_view&plugin_id=eq.${enc(plugin.id)}`); const downloads = await countEvents(`event_type=eq.download&plugin_id=eq.${enc(plugin.id)}`); const download = plugin.status === 'available' ? `<a class="btn btn-primary" href="/download/${enc(plugin.id)}" target="_blank" rel="noopener"><i class="fas fa-download"></i> Скачать</a>` : '<button class="btn btn-disabled" disabled><i class="fas fa-clock"></i> Ссылка обновляется</button>'; const related = relatedPlugins(plugin); return layout({ active: 'plugins', route: `/plugin/${enc(plugin.id)}`, title: `${plugin.name} для After Effects`, description: `${plugin.name} для Adobe After Effects.`, schema: softwareSchema(plugin), body: `<section class="subpage-hero plugin-detail-hero"><div class="container"><a class="back-link" href="/plugins"><i class="fas fa-arrow-left"></i> Назад в каталог</a><div class="plugin-detail-grid reveal"><div class="plugin-detail-art">${pluginArt(plugin)}<span class="detail-art-caption">${esc(plugin.categoryLabel)} / ${esc(plugin.version)}</span></div><div class="plugin-detail-content"><div class="detail-badges"><span class="plugin-badge">${esc(plugin.badge)}</span>${statusBadge(plugin)}</div><h1>${esc(plugin.name)}</h1><p>${esc(plugin.description)}</p><div class="detail-meta"><span><i class="fas fa-folder"></i> ${esc(plugin.categoryLabel)}</span><span><i class="fas fa-box"></i> ${esc(plugin.package)}</span><span><i class="fas fa-hdd"></i> ${esc(plugin.size)}</span><span><i class="fas fa-eye"></i> ${views} просмотров</span><span><i class="fas fa-download"></i> ${downloads} скачиваний</span></div><div class="plugin-tags big">${(plugin.tags || []).map((tag) => `<span>#${esc(tag)}</span>`).join('')}</div>${compatibilityNote(plugin)}<div class="hero-actions">${download}${buildButton(plugin.id)}<button class="btn btn-ghost favorite-btn" data-id="${esc(plugin.id)}"><i class="far fa-heart"></i> В избранное</button><button class="btn btn-ghost report-link-btn" data-plugin-id="${esc(plugin.id)}" data-plugin-name="${esc(plugin.name)}"><i class="fas fa-flag"></i> Ссылка не работает</button></div><form class="inline-report-form" id="pluginReportForm" hidden><label>Комментарий<input id="pluginReportMessage" type="text" placeholder="Например: файл удалён или нет доступа"></label><button class="btn btn-primary" type="submit">Отправить жалобу</button><p id="pluginReportStatus" class="version-note" hidden></p></form></div></div>${pluginComparison(plugin)}<div class="detail-panels reveal"><article class="install-card"><span class="eyebrow">01 / Начало работы</span><h2>Установка</h2><p>${esc(installText(plugin.package))}</p><a href="/install" class="text-link">Открыть подробную инструкцию</a></article><article class="install-card"><span class="eyebrow">02 / Практика</span><h2>Как использовать</h2><p>${esc(plugin.description)}</p><a class="text-link" href="/recipes">Рецепты эффектов →</a></article><article class="install-card"><span class="eyebrow">03 / Если что-то пошло не так</span><h2>Плагин не появился?</h2><p>Перезапусти After Effects, проверь папку установки и версию плагина. Скрипты и эффекты открываются в разных разделах.</p><a class="text-link" href="/faq">Частые вопросы →</a></article></div></div></section><section class="section"><div class="container"><div class="section-head"><span class="eyebrow">Похожие</span><h2>Похожие плагины</h2></div><div class="plugins-grid compact">${related.map(pluginCard).join('')}</div></div></section>` }); }
function installPage() { return layout({ active: 'install', route: '/install', title: 'Как установить плагины After Effects', description: 'Инструкция по установке .aex, .jsx, .jsxbin и .ffx.', schema: collectionSchema('Инструкция по установке плагинов After Effects', 'Как устанавливать плагины.', '/install'), body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-download"></i> Установка</span><h1>Как устанавливать плагины</h1></div></section><section class="section"><div class="container install-content"><article class="install-card"><h2>.aex</h2><div class="code-block">C:\\Program Files\\Adobe\\Adobe After Effects 2022\\Support Files\\Plug-ins</div></article><article class="install-card"><h2>.jsx / .jsxbin</h2><div class="code-block">Support Files\\Scripts\\ScriptUI Panels</div></article><article class="install-card"><h2>.ffx</h2><div class="code-block">Documents\\Adobe\\After Effects 2022\\User Presets</div></article></div></section>` }); }
function faqPage() { const items = [['Почему плагин не появился?', 'Проверьте папку версии AE и перезапустите программу.'], ['Как сообщить о нерабочей ссылке?', 'На странице плагина нажмите кнопку “Ссылка не работает”.'], ['Что значит “Обновляется”?', 'Ссылка пока не добавлена или файл временно обновляется.']]; return layout({ active: 'faq', route: '/faq', title: 'FAQ по плагинам After Effects', description: 'Частые вопросы по плагинам After Effects.', schema: collectionSchema('FAQ по плагинам After Effects', 'Частые вопросы.', '/faq'), body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-circle-question"></i> FAQ</span><h1>Частые вопросы</h1></div></section><section class="section"><div class="container faq-list">${items.map(([q, a], index) => `<details class="faq-item" ${index === 0 ? 'open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>` }); }
function contactPage() { return layout({ active: 'contact', route: '/contact', title: 'Связь и правообладателям', description: 'Контакты и информация для правообладателей.', body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-envelope"></i> Связь</span><h1>Правообладателям и обратная связь</h1><p>Если материал нарушает права или ссылку нужно убрать, можно связаться через Telegram.</p><div class="hero-actions"><a class="btn btn-primary" href="${esc(site.telegramUrl)}" target="_blank" rel="noopener"><i class="fab fa-telegram"></i> Telegram</a></div></div></section><section class="section"><div class="container"><article class="install-card"><h2>Удаление материала</h2><p>В сообщении укажите ссылку на страницу и причину обращения.</p></article></div></section>` }); }
function notFoundPage() { return layout({ active: 'home', route: '/404', robots: 'noindex,follow', title: 'Страница не найдена', description: 'Страница не найдена.', body: '<section class="subpage-hero"><div class="container"><h1>Страница не найдена</h1><a class="btn btn-primary" href="/">На главную</a></div></section>' }); }
function sitemapXml() { const now = new Date().toISOString(); const categoryPages = getCategories().filter(([id]) => id !== 'all').map(([id]) => [`/category/${enc(id)}`, 'weekly', '0.72']); const pages = [['/', 'daily', '1.0'], ['/plugins', 'daily', '0.95'], ['/presets', 'weekly', '0.8'], ['/collections', 'weekly', '0.75'], ['/recipes', 'monthly', '0.7'], ['/gallery', 'weekly', '0.7'], ['/install', 'monthly', '0.75'], ['/faq', 'monthly', '0.7'], ['/contact', 'monthly', '0.45'], ...categoryPages, ...plugins.map((plugin) => [`/plugin/${enc(plugin.id)}`, 'weekly', plugin.status === 'available' ? '0.9' : '0.65'])]; return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(([route, changefreq, priority]) => `  <url>\n    <loc>${escXml(absoluteUrl(route))}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join('\n')}\n</urlset>`; }
function robotsTxt() { return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`; }

app.use((req, res, next) => { if (req.path === '/1' || req.path === '/1/') return res.redirect(301, '/'); if (req.path.startsWith('/1/')) return res.redirect(301, req.originalUrl.replace(/^\/1/, '') || '/'); next(); });
app.get('/google3dda0bd7c0af07a0.html', (req, res) => res.type('text/html').send('google-site-verification: google3dda0bd7c0af07a0.html'));
app.get('/yandex_4c9bf369d0611ade.html', (req, res) => res.type('text/html').send('<html><body>Verification: 4c9bf369d0611ade</body></html>'));
app.get('/robots.txt', (req, res) => res.type('text/plain').send(robotsTxt()));
app.get('/sitemap.xml', (req, res) => res.type('application/xml').send(sitemapXml()));
app.get('/favicon.ico', (req, res) => res.status(204).end());
// Public repository binaries remain reachable through GitHub until removed from its history.
// Prevent direct .ffx downloads from the deployed web app regardless of category folder.
app.use('/assets', (req, res, next) => {
  if (/\.ffx$/i.test(decodeURIComponent(req.path))) return res.status(403).set('Cache-Control', 'no-store').send('Пресеты доступны только после покупки.');
  next();
});
function localPreviewCache(res) {
  if (['localhost', '127.0.0.1', '[::1]'].includes(res.req.hostname)) res.setHeader('Cache-Control', 'no-store');
}
app.use('/assets', express.static(path.join(ROOT, 'assets'), { maxAge: '7d', setHeaders: localPreviewCache }));
app.use('/style.css', express.static(path.join(ROOT, 'style.css'), { maxAge: '1h', setHeaders: localPreviewCache }));
app.use('/client.js', express.static(path.join(ROOT, 'client.js'), { maxAge: '1h', setHeaders: localPreviewCache }));

app.post('/api/telegram/webhook', async (req, res) => {
  try {
    if (!site.tgSecret) return res.status(403).json({ error: 'Telegram webhook secret is not configured' });
    if (String(req.headers['x-telegram-bot-api-secret-token'] || '') !== site.tgSecret) return res.status(401).json({ error: 'Bad Telegram secret' });
    res.json({ ok: true });
    handleTelegramAction(req.body).catch((error) => console.error('Telegram action failed:', error.message));
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.post('/api/plugin-reports', limit('report', 5), async (req, res) => { try { const body = req.body || {}; const clean = { plugin_id: String(body.plugin_id || '').trim(), plugin_name: String(body.plugin_name || '').trim(), message: String(body.message || '').trim() || null, status: 'pending' }; if (!clean.plugin_id) return res.status(400).json({ error: 'Не найден плагин.' }); const data = await supabaseRequest('plugin_reports', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(clean) }); const row = Array.isArray(data) ? data[0] : null; notifyTelegram(`Жалоба на ссылку\n${clean.plugin_name}\n${clean.message || 'Без комментария'}`, row?.id ? closeKeyboard('report', row.id) : undefined); res.json({ ok: true }); } catch (error) { res.status(error.status || 500).json({ error: error.message, details: error.data || null }); } });

app.get('/', async (req, res) => res.send(await homePage()));
app.get('/index.html', (req, res) => res.redirect(301, '/'));

function recipesPage() {return layout({active:'recipes',route:'/recipes',title:'Рецепты эффектов',description:'Пошаговые идеи для анимации и эффектов в After Effects.',body:`<section class="subpage-hero"><div class="container"><span class="eyebrow">От инструмента к результату</span><h1>Рецепты эффектов</h1><p>Короткие маршруты для практики. Настройки подбирай под свой кадр.</p></div></section><section class="section"><div class="container recipes-grid">${recipes.map((recipe,i)=>`<article class="recipe-card" id="${recipe.id}"><div class="recipe-art recipe-art-${i}" aria-hidden="true"><span>${esc(recipe.visual)}</span></div><div class="recipe-body"><span class="eyebrow">${esc(recipe.level)} / ${esc(recipe.time)}</span><h2>${esc(recipe.title)}</h2><p>${esc(recipe.description)}</p><div class="recipe-tools">${recipe.plugins.map(id=>{const p=plugins.find(p=>p.id===id);return `<a href="/plugin/${enc(id)}">${esc(p.name)} ↗</a>`}).join('')}</div><ol>${recipe.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><button class="btn btn-ghost" type="button" data-build-set="${esc(recipe.plugins.join(' '))}">Добавить инструменты в корзину</button><a class="text-link" href="${esc(recipe.source)}" target="_blank" rel="noopener">Руководство разработчика ↗</a></div></article>`).join('')}</div></section>`});}

app.get('/my-build', (req,res)=>res.redirect(302,'/plugins?cart=1'));
app.get('/recipes', (req,res)=>res.send(recipesPage()));
app.get('/collections', (req, res) => res.send(collectionsPage()));
app.get('/gallery', (req, res) => res.send(galleryPage()));
app.get('/presets', (req, res) => res.send(presetsPage(req)));
app.get('/preset-download/:id', (req, res) => presetLibrary.download(req,res));
app.get('/plugins', (req, res) => res.send(pluginsPage()));
app.get('/plugins.html', (req, res) => res.redirect(301, '/plugins'));
app.get('/category/:id', (req, res) => res.send(categoryPage(req.params.id)));
app.get('/plugin/:id', async (req, res) => res.send(await pluginPage(req.params.id, req)));
app.get('/plugin.html', (req, res) => res.redirect(301, `/plugin/${enc(req.query.id || '')}`));
app.get('/install', (req, res) => res.send(installPage()));
app.get('/install.html', (req, res) => res.redirect(301, '/install'));
app.get('/faq', (req, res) => res.send(faqPage()));
app.get('/faq.html', (req, res) => res.redirect(301, '/faq'));
app.get('/contact', (req, res) => res.send(contactPage()));
function directDownloadUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== 'drive.google.com') return value;
    const id = url.pathname.match(/^\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get('id');
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return value;
    const direct = new URL('https://drive.google.com/uc');
    direct.searchParams.set('export', 'download');
    direct.searchParams.set('id', id);
    if (url.searchParams.has('resourcekey')) direct.searchParams.set('resourcekey', url.searchParams.get('resourcekey'));
    return direct.href;
  } catch { return value; }
}
app.get('/download/:id', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const plugin = plugins.find((item) => item.id === req.params.id);
  if (!plugin || plugin.status !== 'available') return res.redirect(302, '/plugins');
  let url = plugin.downloadUrl;
  if (req.query.version && Array.isArray(plugin.versions)) {
    const version = plugin.versions.find((item) => String(item.label || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(String(req.query.version).toLowerCase().replace(/[^a-z0-9]/g, '')));
    if (version && version.status === 'available' && version.downloadUrl && version.downloadUrl !== '#') url = version.downloadUrl;
  }
  if (!url || url === '#') return res.redirect(302, '/plugins');
  if (req.query.open === '1') return res.redirect(302, url);
  logEvent('download', { plugin_id: plugin.id, path: `/download/${plugin.id}` }, req);
  res.redirect(302, directDownloadUrl(url));
});
app.use((req, res) => res.status(404).send(notFoundPage()));
app.listen(PORT, () => console.log(`SSR server started: http://localhost:${PORT}`));
