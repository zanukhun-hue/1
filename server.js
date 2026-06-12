const fs = require('fs');
const path = require('path');
const vm = require('vm');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const BUILD = process.env.RENDER_GIT_COMMIT || 'local';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '7mb' }));

const serviceEnvName = ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_');
const site = {
  title: 'Null-Object-AE',
  description: 'Каталог плагинов, скриптов и пресетов для Adobe After Effects.',
  url: (process.env.SITE_URL || 'https://null-object-ae.onrender.com').replace(/\/$/, ''),
  telegramUrl: process.env.TELEGRAM_URL || 'https://t.me/ae_plugins_vault',
  adminPin: process.env.ADMIN_PIN || '',
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
const fallbackEdits = loadWindowArray('edits.js', 'AE_EDITS');

const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const escXml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[char]));
const enc = (value) => encodeURIComponent(String(value ?? ''));
const absoluteUrl = (route = '/') => `${site.url}${route.startsWith('/') ? route : `/${route}`}`;
const hasSupabase = () => Boolean(supabase.url && supabase.anonKey);
const adminReady = () => Boolean(supabase.url && supabase.adminKey && site.adminPin);

function supabaseHeaders(admin = false, extra = {}) {
  const key = admin ? supabase.adminKey : supabase.anonKey;
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}
async function supabaseRequest(pathname, options = {}, admin = false) {
  if (admin && !adminReady()) throw new Error('Админ-доступ не настроен. Проверь ADMIN_PIN и секретный ключ Supabase в Render.');
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
function requireAdmin(req, res, next) {
  if (!adminReady()) return res.status(500).json({ error: 'Админ-доступ не настроен в Render.' });
  if (String(req.headers['x-admin-pin'] || '') !== site.adminPin) return res.status(401).json({ error: 'Неверный админ-код.' });
  next();
}

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
function subKeyboard(id) {
  return { inline_keyboard: [[
    { text: '✅ Одобрить', callback_data: `sub:approve:${id}` },
    { text: '❌ Отклонить', callback_data: `sub:reject:${id}` }
  ], [{ text: '⚙️ Открыть админку', url: absoluteUrl('/admin') }]] };
}
function closeKeyboard(type, id) {
  return { inline_keyboard: [[{ text: '✅ Закрыть', callback_data: `${type}:done:${id}` }], [{ text: '⚙️ Открыть админку', url: absoluteUrl('/admin') }]] };
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

function parseImageDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Нужна картинка PNG, JPG или WEBP.');
  const mime = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 3 * 1024 * 1024) throw new Error('Картинка должна быть меньше 3 МБ.');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return { mime, buffer, ext };
}
async function uploadPreview(dataUrl) {
  if (!supabase.url || !supabase.adminKey) throw new Error('Загрузка превью не настроена: нужен секретный ключ Supabase в Render.');
  const img = parseImageDataUrl(dataUrl);
  const name = `thumb-${Date.now()}-${Math.random().toString(16).slice(2)}.${img.ext}`;
  const objectPath = `community/${name}`;
  const response = await fetch(`${supabase.url}/storage/v1/object/thumbs/${objectPath}?upsert=true`, {
    method: 'POST', headers: supabaseHeaders(true, { 'Content-Type': img.mime, 'x-upsert': 'true' }), body: img.buffer
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || 'Не удалось загрузить превью в Storage.');
  return `${supabase.url}/storage/v1/object/public/thumbs/${objectPath}`;
}

function websiteSchema() { return { '@context': 'https://schema.org', '@type': 'WebSite', name: site.title, url: site.url, description: site.description, inLanguage: 'ru-RU' }; }
function collectionSchema(name, description, route) { return { '@context': 'https://schema.org', '@type': 'CollectionPage', name, description, url: absoluteUrl(route), isPartOf: { '@type': 'WebSite', name: site.title, url: site.url } }; }
function softwareSchema(plugin) { return { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: plugin.name, description: plugin.description, applicationCategory: 'MultimediaApplication', operatingSystem: 'Windows, macOS', softwareVersion: plugin.version, url: absoluteUrl(`/plugin/${enc(plugin.id)}`) }; }
function jsonLd(data) { return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`; }
function head({ title, description, route = '/', robots = 'index,follow', schema }) {
  const canonical = absoluteUrl(route);
  const fullTitle = title.includes(site.title) ? title : `${title} | ${site.title}`;
  const schemas = [websiteSchema(), schema].filter(Boolean).map(jsonLd).join('\n');
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script>(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':true;document.documentElement.classList.toggle('dark-mode',d);document.documentElement.classList.toggle('light-mode',!d)}catch(e){document.documentElement.classList.add('dark-mode')}})();</script><style>html.dark-mode,html.dark-mode body{background:#080a12;color:#f8fafc;color-scheme:dark}html.light-mode,html.light-mode body{background:#f8fafc;color:#111827;color-scheme:light}</style><link rel="canonical" href="${esc(canonical)}"><link rel="stylesheet" href="/style.css?v=${enc(BUILD)}"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"><link href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8E%AC%3C/text%3E%3C/svg%3E" rel="icon" type="image/svg+xml"><title>${esc(fullTitle)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${esc(robots)}"><meta name="theme-color" content="#080a12"><meta property="og:type" content="website"><meta property="og:locale" content="ru_RU"><meta property="og:site_name" content="${esc(site.title)}"><meta property="og:title" content="${esc(fullTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(fullTitle)}"><meta name="twitter:description" content="${esc(description)}">${schemas}</head>`;
}
function header(active = 'home') {
  const links = [['home', '/', 'fas fa-house', 'Главная'], ['plugins', '/plugins', 'fas fa-plug', 'Каталог'], ['community', '/community', 'fas fa-film', 'Работы'], ['request', '/request-plugin', 'fas fa-plus', 'Запросить'], ['install', '/install', 'fas fa-download', 'Установка'], ['faq', '/faq', 'fas fa-circle-question', 'FAQ']];
  return `<header class="header"><div class="container nav-container"><a class="logo" href="/"><span class="logo-icon">🎬</span><span class="logo-text">${esc(site.title)}</span></a><nav class="nav-links" id="navLinks">${links.map(([id, href, icon, label]) => `<a class="nav-link ${id === active ? 'active' : ''}" href="${href}"><i class="${icon}"></i> ${label}</a>`).join('')}</nav><div class="header-actions"><a class="favorite-pill" href="/plugins?favorites=1" title="Избранное"><i class="fas fa-heart"></i><span id="favoriteCount">0</span></a><a class="telegram-link" href="${esc(site.telegramUrl)}" target="_blank" rel="noopener"><i class="fab fa-telegram"></i></a><button class="theme-toggle" id="themeToggle"><i class="fas fa-moon"></i></button><button class="menu-toggle" id="menuToggle"><i class="fas fa-bars"></i></button></div></div></header>`;
}
function footer() { return `<footer class="footer"><div class="container footer-grid"><div><div class="footer-brand"><span>🎬</span> ${esc(site.title)}</div><p>Каталог плагинов, скриптов, пресетов и работ пользователей After Effects.</p></div><div><h4>Разделы</h4><a href="/plugins">Каталог</a><a href="/community">Работы пользователей</a><a href="/request-plugin">Запросить плагин</a><a href="/contact">Правообладателям / связь</a></div><div><h4>Связь</h4><a href="${esc(site.telegramUrl)}" target="_blank" rel="noopener"><i class="fab fa-telegram"></i> Telegram-канал</a><a href="/admin"><i class="fas fa-lock"></i> Админ-панель</a><span class="local-counter"><i class="fas fa-eye"></i> Ваши визиты: <b id="localVisitCount">0</b></span></div></div><div class="container footer-bottom">© 2026 ${esc(site.title)}. При обращении правообладателя материал может быть снят.</div></footer>`; }
function layout({ active, title, description, route, robots, schema, body }) { return `${head({ title, description, route, robots, schema })}<body data-page="${esc(active)}">${header(active)}<main>${body}</main>${footer()}<button class="back-to-top" id="backToTop"><i class="fas fa-arrow-up"></i></button><script src="/client.js?v=${enc(BUILD)}" defer></script></body></html>`; }

function statusBadge(plugin) { return plugin.status === 'available' ? '<span class="status-badge available"><i class="fas fa-check-circle"></i> Проверено</span>' : '<span class="status-badge updating"><i class="fas fa-clock"></i> Обновляется</span>'; }
function pluginSizeMB(plugin) { const raw = String(plugin.size || '').toLowerCase().replace(',', '.'); const n = parseFloat(raw) || 0; if (raw.includes('gb')) return n * 1024; if (raw.includes('kb')) return n / 1024; return n; }
function getCategories() { const map = new Map(); plugins.forEach((plugin) => map.set(plugin.category, plugin.categoryLabel)); return [['all', 'Все'], ...Array.from(map.entries())]; }
function categoryById(id) { const found = getCategories().find(([cat]) => cat === id); return found && id !== 'all' ? found : null; }
function sortPlugins(list, type = 'popular') { const rank = (plugin) => /популяр/i.test(plugin.badge || '') ? 0 : /нов/i.test(plugin.badge || '') ? 1 : 2; return [...list].sort((a, b) => { if (type === 'az') return a.name.localeCompare(b.name, 'ru'); if (type === 'available') return Number(b.status === 'available') - Number(a.status === 'available') || a.name.localeCompare(b.name, 'ru'); if (type === 'size') return pluginSizeMB(a) - pluginSizeMB(b); if (type === 'new') return Number(/нов/i.test(b.badge || '')) - Number(/нов/i.test(a.badge || '')) || a.name.localeCompare(b.name, 'ru'); return rank(a) - rank(b) || Number(b.status === 'available') - Number(a.status === 'available') || a.name.localeCompare(b.name, 'ru'); }); }
function relatedPlugins(plugin, count = 3) { const tags = new Set((plugin.tags || []).map((tag) => String(tag).toLowerCase())); return plugins.filter((item) => item.id !== plugin.id).map((item) => ({ item, score: (item.tags || []).filter((tag) => tags.has(String(tag).toLowerCase())).length * 3 + (item.category === plugin.category ? 2 : 0) + (item.package === plugin.package ? 1 : 0) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'ru')).slice(0, count).map((x) => x.item); }
function pluginCard(plugin) { const download = plugin.status === 'available' ? `<a class="download-btn" href="/download/${enc(plugin.id)}" target="_blank" rel="noopener"><i class="fas fa-download"></i> Скачать</a>` : '<button class="download-btn disabled" disabled><i class="fas fa-clock"></i> Обновляется</button>'; const tags = (plugin.tags || []).slice(0, 4).map((tag) => `<span>#${esc(tag)}</span>`).join(''); return `<article class="plugin-card reveal" data-plugin-card data-id="${esc(plugin.id)}" data-category="${esc(plugin.category)}" data-status="${esc(plugin.status)}" data-name="${esc(plugin.name)}" data-size="${pluginSizeMB(plugin)}"><div class="plugin-card-header"><div class="badge-stack"><span class="plugin-badge">${esc(plugin.badge || plugin.categoryLabel)}</span>${statusBadge(plugin)}</div><div class="card-actions"><button class="favorite-btn" data-id="${esc(plugin.id)}" type="button"><i class="far fa-heart"></i></button><div class="plugin-icon"><i class="${esc(plugin.icon || 'fas fa-plug')}"></i></div></div></div><div class="plugin-card-content"><h3>${esc(plugin.name)}</h3><p>${esc(plugin.description)}</p><div class="plugin-tags">${tags}</div><div class="plugin-meta"><span><i class="fas fa-hdd"></i> ${esc(plugin.size)}</span><span><i class="fas fa-calendar"></i> ${esc(plugin.version)}</span><span><i class="fas fa-check-circle"></i> AE ${esc(plugin.minAe)}+</span></div></div><div class="plugin-card-footer">${download}<a class="details-btn" href="/plugin/${enc(plugin.id)}"><i class="fas fa-info-circle"></i> Подробнее</a></div></article>`; }

function inferPlatform(value) { const v = String(value || '').toLowerCase(); if (v.includes('youtube.com') || v.includes('youtu.be')) return 'youtube'; if (v.includes('tiktok.com')) return 'tiktok'; return 'video'; }
function platformLabel(platform) { return platform === 'tiktok' ? 'TikTok' : platform === 'youtube' ? 'YouTube' : 'Видео'; }
function platformIcon(platform) { return platform === 'tiktok' ? 'fab fa-tiktok' : platform === 'youtube' ? 'fab fa-youtube' : 'fas fa-video'; }
function normalizeEdit(row) { return { id: row.id || '', url: row.url, platform: row.platform || inferPlatform(row.url), thumb: row.thumb || '', title: row.title, author: row.author, plugins: row.plugins || '', description: row.description || '', status: row.status || 'approved', created_at: row.created_at }; }
async function getApprovedEdits() { if (!hasSupabase()) return fallbackEdits.filter((item) => (item.status || 'approved') === 'approved').map((item, index) => normalizeEdit({ id: `local-${index}`, ...item })); try { const rows = await supabaseRequest('edit_submissions?select=id,url,platform,thumb,title,author,plugins,description,status,created_at&status=eq.approved&order=created_at.desc'); return Array.isArray(rows) ? rows.map(normalizeEdit) : []; } catch (error) { console.error(error.message); return fallbackEdits.filter((item) => (item.status || 'approved') === 'approved').map((item, index) => normalizeEdit({ id: `local-${index}`, ...item })); } }
async function getApprovedEdit(id) { const rows = await supabaseRequest(`edit_submissions?select=id,url,platform,thumb,title,author,plugins,description,status,created_at&id=eq.${enc(id)}&status=eq.approved&limit=1`); return Array.isArray(rows) && rows[0] ? normalizeEdit(rows[0]) : null; }
function editCard(item) { const platform = item.platform || 'video'; const detailUrl = item.id ? `/edit/${enc(item.id)}` : item.url; const thumb = item.thumb ? `<img src="${esc(item.thumb)}" alt="${esc(item.title)}" loading="lazy">` : '<div class="edit-thumb-placeholder"><i class="fas fa-video"></i></div>'; return `<article class="edit-card reveal" data-edit-card data-id="${esc(item.id || item.url)}"><a class="edit-thumb" href="${esc(detailUrl)}">${thumb}<span class="platform-badge"><i class="${platformIcon(platform)}"></i> ${platformLabel(platform)}</span><span class="play-badge"><i class="fas fa-play"></i></span></a><div class="edit-body"><h3>${esc(item.title || 'Без названия')}</h3><p>${esc(item.description || 'Пользовательская работа After Effects.')}</p><div class="edit-meta"><span><i class="fas fa-user"></i> ${esc(item.author || 'Автор')}</span>${item.plugins ? `<span><i class="fas fa-plug"></i> ${esc(item.plugins)}</span>` : ''}</div></div><div class="edit-actions"><button class="edit-favorite-btn" data-edit-id="${esc(item.id || item.url)}" type="button"><i class="far fa-heart"></i> В избранное</button><a class="details-btn" href="${esc(detailUrl)}"><i class="fas fa-info-circle"></i> Подробнее</a></div></article>`; }
async function logEvent(type, payload = {}, req) { if (!hasSupabase()) return; try { await supabaseRequest('site_events', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ event_type: type, plugin_id: payload.plugin_id || null, edit_id: payload.edit_id || null, path: payload.path || null, visitor_hash: String(req?.ip || '').slice(0, 64) }) }); } catch (_) {} }
async function countEvents(filter) { return countRows('site_events', filter); }
async function topDownloadedPlugins(limit = 4) {
  if (!hasSupabase()) return sortPlugins(plugins).slice(0, limit).map((plugin) => ({ plugin, downloads: 0 }));
  try {
    const rows = await supabaseRequest('site_events?select=plugin_id&event_type=eq.download&plugin_id=not.is.null&order=created_at.desc&limit=1000');
    const counts = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => counts.set(row.plugin_id, (counts.get(row.plugin_id) || 0) + 1));
    return plugins.map((plugin) => ({ plugin, downloads: counts.get(plugin.id) || 0 })).sort((a, b) => b.downloads - a.downloads || a.plugin.name.localeCompare(b.plugin.name, 'ru')).slice(0, limit);
  } catch (_) { return sortPlugins(plugins).slice(0, limit).map((plugin) => ({ plugin, downloads: 0 })); }
}
async function getAdminDashboardData() {
  const [submissions, reports, requests, topDownloads, pendingSubmissions, pendingReports, pendingRequests, approvedWorks] = await Promise.all([
    supabaseRequest('edit_submissions?select=*&status=eq.pending&order=created_at.desc&limit=100', {}, true),
    supabaseRequest('plugin_reports?select=*&status=eq.pending&order=created_at.desc&limit=100', {}, true),
    supabaseRequest('plugin_requests?select=*&status=eq.pending&order=created_at.desc&limit=100', {}, true),
    topDownloadedPlugins(8),
    countRows('edit_submissions', 'status=eq.pending', true),
    countRows('plugin_reports', 'status=eq.pending', true),
    countRows('plugin_requests', 'status=eq.pending', true),
    countRows('edit_submissions', 'status=eq.approved', true)
  ]);
  return { submissions, reports, requests, topDownloads: topDownloads.map((x) => ({ id: x.plugin.id, name: x.plugin.name, downloads: x.downloads })), stats: { pendingSubmissions, pendingReports, pendingRequests, approvedWorks, plugins: plugins.length } };
}
function adminSummaryText(data) {
  const s = data.stats || {};
  return `Админ-панель Null-Object-AE\n\nЗаявки: ${s.pendingSubmissions || 0}\nЖалобы: ${s.pendingReports || 0}\nЗапросы плагинов: ${s.pendingRequests || 0}\nОпубликовано работ: ${s.approvedWorks || 0}\nПлагинов в каталоге: ${s.plugins || 0}`;
}
async function sendPendingToTelegram() {
  const data = await getAdminDashboardData();
  await notifyTelegram(adminSummaryText(data), { inline_keyboard: [[{ text: '⚙️ Открыть админку', url: absoluteUrl('/admin') }]] });
  for (const row of data.submissions.slice(0, 5)) await notifyTelegram(`Заявка на работу\n${row.title || 'Без названия'}\nАвтор: ${row.author || ''}\n${row.url || ''}`, subKeyboard(row.id));
  for (const row of data.reports.slice(0, 5)) await notifyTelegram(`Жалоба на ссылку\n${row.plugin_name || row.plugin_id || 'Плагин'}\n${row.message || 'Без комментария'}`, closeKeyboard('report', row.id));
  for (const row of data.requests.slice(0, 5)) await notifyTelegram(`Запрос плагина\n${row.name || 'Без названия'}\n${row.comment || ''}`, closeKeyboard('request', row.id));
}
async function handleTelegramAction(update) {
  if (!isAllowedTelegramChat(update)) return;
  if (update.message) {
    const text = String(update.message.text || '').trim().toLowerCase();
    if (['/start', '/help'].includes(text)) return notifyTelegram('Команды:\n/admin — статистика\n/pending — последние заявки, жалобы и запросы');
    if (text === '/admin') return notifyTelegram(adminSummaryText(await getAdminDashboardData()), { inline_keyboard: [[{ text: '📋 Показать pending', callback_data: 'dash:pending' }], [{ text: '⚙️ Открыть админку', url: absoluteUrl('/admin') }]] });
    if (text === '/pending') return sendPendingToTelegram();
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
  if (type === 'sub') {
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : null;
    if (!status) return answerCallback(cb.id, 'Неизвестное действие');
    await supabaseRequest(`edit_submissions?id=eq.${enc(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status }) }, true);
    await answerCallback(cb.id, status === 'approved' ? 'Одобрено' : 'Отклонено');
    if (chatId && messageId) await editTelegramMessage(chatId, messageId, `${cb.message.text || ''}\n\nСтатус: ${status === 'approved' ? 'одобрено ✅' : 'отклонено ❌'}`);
    return;
  }
  if (type === 'report') {
    await supabaseRequest(`plugin_reports?id=eq.${enc(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'done' }) }, true);
    await answerCallback(cb.id, 'Жалоба закрыта');
    if (chatId && messageId) await editTelegramMessage(chatId, messageId, `${cb.message.text || ''}\n\nСтатус: закрыто ✅`);
    return;
  }
  if (type === 'request') {
    await supabaseRequest(`plugin_requests?id=eq.${enc(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'done' }) }, true);
    await answerCallback(cb.id, 'Запрос закрыт');
    if (chatId && messageId) await editTelegramMessage(chatId, messageId, `${cb.message.text || ''}\n\nСтатус: закрыто ✅`);
  }
}

async function homePage() { const available = plugins.filter((plugin) => plugin.status === 'available').length; const categoryCount = new Set(plugins.map((plugin) => plugin.category)).size; const featured = sortPlugins(plugins).filter((plugin) => /популяр/i.test(plugin.badge || '') && plugin.status === 'available').slice(0, 3); const top = await topDownloadedPlugins(4); return layout({ active: 'home', route: '/', title: 'Null-Object-AE — плагины, скрипты и пресеты для After Effects', description: site.description, schema: collectionSchema('Null-Object-AE', site.description, '/'), body: `<section class="hero page-hero-home"><div class="container hero-grid"><div class="hero-content reveal"><span class="eyebrow"><i class="fas fa-sparkles"></i> AE 2022 и новее</span><h1>Профессиональные плагины для <span class="highlight">After Effects</span></h1><p>Каталог эффектов, скриптов, пресетов, пользовательских работ и инструкций.</p><div class="hero-actions"><a class="btn btn-primary" href="/plugins"><i class="fas fa-plug"></i> Открыть каталог</a><a class="btn btn-ghost" href="/community"><i class="fas fa-film"></i> Работы пользователей</a></div><div class="hero-stats"><div class="stat"><span>${plugins.length}</span><small>плагинов</small></div><div class="stat"><span>${available}</span><small>ссылок проверено</small></div><div class="stat"><span>${categoryCount}</span><small>категорий</small></div></div></div><div class="hero-visual stable-visual"><div class="visual-float visual-float-ae"><div class="visual-element ae-card"><span>Ae</span></div></div><div class="visual-float visual-float-plugin"><div class="visual-element"><i class="fas fa-puzzle-piece"></i></div></div><div class="visual-float visual-float-download"><div class="visual-element"><i class="fas fa-cloud-arrow-down"></i></div></div></div></div></section><section class="section soft-section"><div class="container"><div class="section-head reveal"><span class="eyebrow">Топ скачиваний</span><h2>Что чаще всего скачивают</h2><p>Блок обновляется по событиям скачивания.</p></div><div class="plugins-grid compact">${top.map(({ plugin, downloads }) => pluginCard({ ...plugin, badge: downloads ? `${downloads} скачиваний` : plugin.badge })).join('')}</div></div></section><section class="section"><div class="container"><div class="section-head reveal"><span class="eyebrow">Популярное</span><h2>Плагины, с которых стоит начать</h2></div><div class="plugins-grid compact">${featured.map(pluginCard).join('')}</div></div></section>` }); }
function pluginsPage() { const filters = getCategories().map(([id, label]) => `<button class="filter-btn ${id === 'all' ? 'active' : ''}" data-category="${esc(id)}">${esc(label)}</button>`).join(''); const categoryLinks = getCategories().filter(([id]) => id !== 'all').map(([id, label]) => `<a class="filter-btn" href="/category/${enc(id)}">${esc(label)}</a>`).join(''); return layout({ active: 'plugins', route: '/plugins', title: 'Каталог плагинов After Effects', description: 'Плагины, скрипты и пресеты для After Effects.', schema: collectionSchema('Каталог плагинов After Effects', 'Плагины, скрипты и пресеты для Adobe After Effects.', '/plugins'), body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-plug"></i> Каталог</span><h1>Плагины для After Effects</h1><p>Ищи по названию, тегам, категории или описанию.</p><div class="filter-tabs">${categoryLinks}</div></div></section><section class="section catalog-section"><div class="container"><div class="catalog-panel reveal"><div class="search-box"><i class="fas fa-search"></i><input id="pluginSearch" type="text" placeholder="Поиск: Saber, glow, text..."><button id="clearSearch"><i class="fas fa-times"></i></button></div><div class="catalog-row"><div class="filter-tabs" id="categoryFilters">${filters}</div><div class="catalog-controls"><select id="sortPlugins"><option value="popular">Сначала популярные</option><option value="new">Сначала новые</option><option value="az">По названию A–Z</option><option value="available">Сначала проверенные</option><option value="size">По размеру файла</option></select><button class="favorites-filter-btn" id="favoritesOnly" type="button"><i class="far fa-heart"></i> Только избранные</button></div></div><div class="catalog-meta"><span id="resultCount">Найдено: ${plugins.length}</span><span id="activeFilterLabel">Все категории</span></div></div><div class="plugins-grid" id="pluginsGrid">${sortPlugins(plugins).map(pluginCard).join('')}</div><div class="empty-state" id="emptyState" hidden><i class="fas fa-magnifying-glass"></i><h3>Ничего не найдено</h3></div></div></section>` }); }
function categoryPage(id) { const category = categoryById(id); if (!category) return notFoundPage(); const [, label] = category; const list = sortPlugins(plugins.filter((plugin) => plugin.category === id)); return layout({ active: 'plugins', route: `/category/${enc(id)}`, title: `${label} для After Effects`, description: `Плагины категории ${label} для Adobe After Effects.`, schema: collectionSchema(`${label} для After Effects`, `Плагины категории ${label}.`, `/category/${enc(id)}`), body: `<section class="subpage-hero"><div class="container"><a class="back-link" href="/plugins"><i class="fas fa-arrow-left"></i> Назад в каталог</a><span class="eyebrow"><i class="fas fa-folder"></i> Категория</span><h1>${esc(label)} для After Effects</h1><p>В этой категории найдено: ${list.length}</p></div></section><section class="section"><div class="container"><div class="plugins-grid">${list.map(pluginCard).join('')}</div></div></section>` }); }
function installText(type) { return ({ aex: '.aex копируется в папку Plug-ins вашей версии After Effects.', jsx: '.jsx / .jsxbin копируется в Scripts или ScriptUI Panels.', ffx: '.ffx копируется в Documents → Adobe → After Effects → User Presets.' })[type] || 'Смотрите общую инструкцию по установке.'; }
async function pluginPage(id, req) { const plugin = plugins.find((item) => item.id === id); if (!plugin) return notFoundPage(); logEvent('plugin_view', { plugin_id: plugin.id, path: `/plugin/${plugin.id}` }, req); const views = await countEvents(`event_type=eq.plugin_view&plugin_id=eq.${enc(plugin.id)}`); const downloads = await countEvents(`event_type=eq.download&plugin_id=eq.${enc(plugin.id)}`); const download = plugin.status === 'available' ? `<a class="btn btn-primary" href="/download/${enc(plugin.id)}" target="_blank" rel="noopener"><i class="fas fa-download"></i> Скачать</a>` : '<button class="btn btn-disabled" disabled><i class="fas fa-clock"></i> Ссылка обновляется</button>'; const related = relatedPlugins(plugin); return layout({ active: 'plugins', route: `/plugin/${enc(plugin.id)}`, title: `${plugin.name} для After Effects`, description: `${plugin.name} для Adobe After Effects.`, schema: softwareSchema(plugin), body: `<section class="subpage-hero plugin-detail-hero"><div class="container"><a class="back-link" href="/plugins"><i class="fas fa-arrow-left"></i> Назад в каталог</a><div class="plugin-detail-grid reveal"><div class="plugin-detail-icon"><i class="${esc(plugin.icon)}"></i></div><div class="plugin-detail-content"><div class="detail-badges"><span class="plugin-badge">${esc(plugin.badge)}</span>${statusBadge(plugin)}</div><h1>${esc(plugin.name)} для After Effects</h1><p>${esc(plugin.description)}</p><div class="detail-meta"><span><i class="fas fa-folder"></i> ${esc(plugin.categoryLabel)}</span><span><i class="fas fa-box"></i> ${esc(plugin.package)}</span><span><i class="fas fa-hdd"></i> ${esc(plugin.size)}</span><span><i class="fas fa-eye"></i> ${views} просмотров</span><span><i class="fas fa-download"></i> ${downloads} скачиваний</span></div><div class="plugin-tags big">${(plugin.tags || []).map((tag) => `<span>#${esc(tag)}</span>`).join('')}</div><div class="hero-actions">${download}<button class="btn btn-ghost favorite-btn" data-id="${esc(plugin.id)}"><i class="far fa-heart"></i> В избранное</button><button class="btn btn-ghost report-link-btn" data-plugin-id="${esc(plugin.id)}" data-plugin-name="${esc(plugin.name)}"><i class="fas fa-flag"></i> Ссылка не работает</button></div><form class="inline-report-form" id="pluginReportForm" hidden><label>Комментарий<input id="pluginReportMessage" type="text" placeholder="Например: файл удалён или нет доступа"></label><button class="btn btn-primary" type="submit">Отправить жалобу</button><p id="pluginReportStatus" class="version-note" hidden></p></form></div></div><div class="detail-panels reveal"><article class="install-card"><h2>Инструкция</h2><p>${esc(installText(plugin.package))}</p><a href="/install" class="text-link">Открыть подробную инструкцию</a></article></div></div></section><section class="section"><div class="container"><div class="section-head"><span class="eyebrow">Похожие</span><h2>Похожие плагины</h2></div><div class="plugins-grid compact">${related.map(pluginCard).join('')}</div></div></section>` }); }
function installPage() { return layout({ active: 'install', route: '/install', title: 'Как установить плагины After Effects', description: 'Инструкция по установке .aex, .jsx, .jsxbin и .ffx.', schema: collectionSchema('Инструкция по установке плагинов After Effects', 'Как устанавливать плагины.', '/install'), body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-download"></i> Установка</span><h1>Как устанавливать плагины</h1></div></section><section class="section"><div class="container install-content"><article class="install-card"><h2>.aex</h2><div class="code-block">C:\\Program Files\\Adobe\\Adobe After Effects 2022\\Support Files\\Plug-ins</div></article><article class="install-card"><h2>.jsx / .jsxbin</h2><div class="code-block">Support Files\\Scripts\\ScriptUI Panels</div></article><article class="install-card"><h2>.ffx</h2><div class="code-block">Documents\\Adobe\\After Effects 2022\\User Presets</div></article></div></section>` }); }
function faqPage() { const items = [['Почему плагин не появился?', 'Проверьте папку версии AE и перезапустите программу.'], ['Как сообщить о нерабочей ссылке?', 'На странице плагина нажмите кнопку “Ссылка не работает”.'], ['Что значит “Обновляется”?', 'Ссылка пока не добавлена или файл временно обновляется.']]; return layout({ active: 'faq', route: '/faq', title: 'FAQ по плагинам After Effects', description: 'Частые вопросы по плагинам After Effects.', schema: collectionSchema('FAQ по плагинам After Effects', 'Частые вопросы.', '/faq'), body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-circle-question"></i> FAQ</span><h1>Частые вопросы</h1></div></section><section class="section"><div class="container faq-list">${items.map(([q, a], index) => `<details class="faq-item" ${index === 0 ? 'open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>` }); }
async function communityPage() { const approved = await getApprovedEdits(); return layout({ active: 'community', route: '/community', title: 'Работы пользователей After Effects', description: 'Эдиты и видео пользователей.', schema: collectionSchema('Работы пользователей After Effects', 'Эдиты и видео пользователей.', '/community'), body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-film"></i> Комьюнити</span><h1>Работы пользователей</h1><p>Эдиты, шоурилы и ролики, сделанные в After Effects.</p><div class="hero-actions"><a class="btn btn-primary" href="/submit"><i class="fas fa-plus"></i> Поделиться эдитом</a></div></div></section><section class="section"><div class="container"><div class="catalog-panel reveal"><div class="search-wrap"><i class="fas fa-search"></i><input id="editSearch" type="search" placeholder="Поиск по названию, автору или платформе..."><button id="clearEditSearch" type="button"><i class="fas fa-xmark"></i></button></div><div class="catalog-row"><div class="filter-tabs" id="editFilters"><button class="filter-btn active" data-platform="all">Все</button><button class="filter-btn" data-platform="youtube">YouTube</button><button class="filter-btn" data-platform="tiktok">TikTok</button></div><div class="catalog-controls"><button class="favorites-filter-btn" id="editFavoritesOnly" type="button"><i class="far fa-heart"></i> Избранные работы</button></div><div class="catalog-meta"><span id="editCount">Работ: ${approved.length}</span></div></div></div><div class="edits-grid" id="communityGrid">${approved.map(editCard).join('')}</div><div class="empty-state" id="communityEmpty" ${approved.length ? 'hidden' : ''}><i class="fas fa-video"></i><h3>Работ пока нет</h3></div></div></section>` }); }
async function editPage(id, req) { const edit = await getApprovedEdit(id).catch(() => null); if (!edit) return notFoundPage(); logEvent('edit_view', { edit_id: edit.id, path: `/edit/${edit.id}` }, req); const views = await countEvents(`event_type=eq.edit_view&edit_id=eq.${enc(edit.id)}`); return layout({ active: 'community', route: `/edit/${enc(edit.id)}`, title: `${edit.title} — работа пользователя ${edit.author}`, description: edit.description || 'Пользовательская работа After Effects.', body: `<section class="subpage-hero plugin-detail-hero"><div class="container"><a class="back-link" href="/community"><i class="fas fa-arrow-left"></i> Назад к работам</a><div class="plugin-detail-grid reveal"><div class="edit-detail-thumb">${edit.thumb ? `<img src="${esc(edit.thumb)}" alt="${esc(edit.title)}">` : '<div class="edit-thumb-placeholder big"><i class="fas fa-video"></i></div>'}</div><div class="plugin-detail-content"><div class="detail-badges"><span class="platform-badge"><i class="${platformIcon(edit.platform)}"></i> ${platformLabel(edit.platform)}</span></div><h1>${esc(edit.title)}</h1><p>${esc(edit.description || 'Пользовательская работа After Effects.')}</p><div class="detail-meta"><span><i class="fas fa-user"></i> ${esc(edit.author)}</span>${edit.plugins ? `<span><i class="fas fa-plug"></i> ${esc(edit.plugins)}</span>` : ''}<span><i class="fas fa-eye"></i> ${views} просмотров</span></div><div class="hero-actions"><a class="btn btn-primary" href="${esc(edit.url)}" target="_blank" rel="noopener"><i class="fas fa-up-right-from-square"></i> Открыть видео</a><button class="btn btn-ghost edit-favorite-btn" data-edit-id="${esc(edit.id)}"><i class="far fa-heart"></i> В избранное</button></div></div></div></div></section>` }); }
function submitPage() { return layout({ active: 'submit', route: '/submit', robots: 'noindex,follow', title: 'Поделиться эдитом', description: 'Форма добавления пользовательской работы.', body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-paper-plane"></i> Отправка работы</span><h1>Поделиться своим эдитом</h1><p>Заявка отправляется на проверку.</p></div></section><section class="section"><div class="container submit-layout"><form class="submit-card reveal" id="editSubmitForm"><h2>Данные работы</h2><label>Ссылка на видео<input id="editUrl" name="url" type="url" required></label><label>Превью файлом<small class="field-hint">Можно выбрать PNG, JPG или WEBP до 3 МБ. Сайт сам загрузит картинку.</small><input id="editThumbFile" name="thumbFile" type="file" accept="image/png,image/jpeg,image/webp"></label><label>Или ссылка на превью<small class="field-hint">Необязательно. Лучше постоянная ссылка на <b>.jpg/.png/.webp</b>.</small><input id="editThumb" name="thumb" type="url" placeholder="https://.../preview.jpg"></label><label>Название<input id="editTitle" name="title" type="text" maxlength="120" required></label><label>Автор / ник<input id="editAuthor" name="author" type="text" maxlength="60" required></label><label>Какие плагины использовал<input id="editPlugins" name="plugins" type="text" maxlength="160"></label><label>Описание<textarea id="editDescription" name="description" rows="4" maxlength="400"></textarea></label><button class="btn btn-primary" type="submit"><i class="fas fa-paper-plane"></i> Отправить на проверку</button><p id="submitStatus" class="version-note" hidden></p></form><div class="preview-panel reveal"><h2>Мои заявки</h2><div class="edits-grid" id="mySubmissionsGrid"></div><div class="empty-state inline" id="mySubmissionsEmpty"><p>Локальных заявок пока нет.</p></div></div></div></section>` }); }
function requestPluginPage() { return layout({ active: 'request', route: '/request-plugin', title: 'Запросить плагин After Effects', description: 'Форма запроса плагина.', body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-plus"></i> Запрос</span><h1>Запросить плагин</h1><p>Напиши, чего не хватает в каталоге.</p></div></section><section class="section"><div class="container submit-layout"><form class="submit-card reveal" id="pluginRequestForm"><h2>Данные запроса</h2><label>Название плагина<input id="requestPluginName" type="text" maxlength="120" required></label><label>Ссылка / источник<input id="requestPluginUrl" type="url"></label><label>Комментарий<textarea id="requestPluginComment" rows="4" maxlength="400"></textarea></label><button class="btn btn-primary" type="submit">Отправить запрос</button><p id="pluginRequestStatus" class="version-note" hidden></p></form><div class="notice-card"><div class="notice-title"><i class="fas fa-lightbulb"></i> Как это помогает</div><p>Запрос попадёт в базу, и будет понятно, какие плагины чаще всего просят добавить.</p></div></div></section>` }); }
function contactPage() { return layout({ active: 'contact', route: '/contact', title: 'Связь и правообладателям', description: 'Контакты и информация для правообладателей.', body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-envelope"></i> Связь</span><h1>Правообладателям и обратная связь</h1><p>Если материал нарушает права или ссылку нужно убрать, можно связаться через Telegram.</p><div class="hero-actions"><a class="btn btn-primary" href="${esc(site.telegramUrl)}" target="_blank" rel="noopener"><i class="fab fa-telegram"></i> Telegram</a></div></div></section><section class="section"><div class="container"><article class="install-card"><h2>Удаление материала</h2><p>В сообщении укажите ссылку на страницу и причину обращения.</p></article></div></section>` }); }
function adminPage() { return layout({ active: 'admin', route: '/admin', robots: 'noindex,nofollow', title: 'Админ-панель', description: 'Проверка заявок.', body: `<section class="subpage-hero"><div class="container"><span class="eyebrow"><i class="fas fa-lock"></i> Admin</span><h1>Админ-панель</h1><p>Проверка заявок, жалоб, запросов и статистики.</p></div></section><section class="section"><div class="container"><div class="submit-card"><h2>Вход</h2><label>ADMIN_PIN<input id="adminPin" type="password" placeholder="Код из Render"></label><button class="btn btn-primary" id="adminLoadBtn" type="button"><i class="fas fa-rotate"></i> Загрузить</button><p id="adminStatus" class="version-note" hidden></p></div><div class="admin-grid" id="adminPanels" hidden><section class="install-card"><h2>Статистика</h2><div id="adminStats"></div></section><section class="install-card"><h2>Топ скачиваний</h2><div id="adminTopDownloads"></div></section><section class="install-card"><h2>Заявки на работы</h2><div id="adminSubmissions"></div></section><section class="install-card"><h2>Жалобы на ссылки</h2><div id="adminReports"></div></section><section class="install-card"><h2>Запросы плагинов</h2><div id="adminRequests"></div></section></div></div></section>` }); }
function notFoundPage() { return layout({ active: 'home', route: '/404', robots: 'noindex,follow', title: 'Страница не найдена', description: 'Страница не найдена.', body: '<section class="subpage-hero"><div class="container"><h1>Страница не найдена</h1><a class="btn btn-primary" href="/">На главную</a></div></section>' }); }
function sitemapXml() { const now = new Date().toISOString(); const categoryPages = getCategories().filter(([id]) => id !== 'all').map(([id]) => [`/category/${enc(id)}`, 'weekly', '0.72']); const pages = [['/', 'daily', '1.0'], ['/plugins', 'daily', '0.95'], ['/install', 'monthly', '0.75'], ['/faq', 'monthly', '0.7'], ['/community', 'weekly', '0.75'], ['/request-plugin', 'monthly', '0.55'], ['/contact', 'monthly', '0.45'], ...categoryPages, ...plugins.map((plugin) => [`/plugin/${enc(plugin.id)}`, 'weekly', plugin.status === 'available' ? '0.9' : '0.65'])]; return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(([route, changefreq, priority]) => `  <url>\n    <loc>${escXml(absoluteUrl(route))}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`).join('\n')}\n</urlset>`; }
function robotsTxt() { return `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`; }

app.use((req, res, next) => { if (req.path === '/1' || req.path === '/1/') return res.redirect(301, '/'); if (req.path.startsWith('/1/')) return res.redirect(301, req.originalUrl.replace(/^\/1/, '') || '/'); next(); });
app.get('/google3dda0bd7c0af07a0.html', (req, res) => res.type('text/html').send('google-site-verification: google3dda0bd7c0af07a0.html'));
app.get('/yandex_4c9bf369d0611ade.html', (req, res) => res.type('text/html').send('<html><body>Verification: 4c9bf369d0611ade</body></html>'));
app.get('/robots.txt', (req, res) => res.type('text/plain').send(robotsTxt()));
app.get('/sitemap.xml', (req, res) => res.type('application/xml').send(sitemapXml()));
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use('/style.css', express.static(path.join(ROOT, 'style.css'), { maxAge: '1h' }));
app.use('/client.js', express.static(path.join(ROOT, 'client.js'), { maxAge: '1h' }));

app.post('/api/telegram/webhook', async (req, res) => {
  try {
    if (!site.tgSecret) return res.status(403).json({ error: 'Telegram webhook secret is not configured' });
    if (String(req.headers['x-telegram-bot-api-secret-token'] || '') !== site.tgSecret) return res.status(401).json({ error: 'Bad Telegram secret' });
    res.json({ ok: true });
    handleTelegramAction(req.body).catch((error) => console.error('Telegram action failed:', error.message));
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.post('/api/upload-preview', limit('upload', 4), async (req, res) => { try { const publicUrl = await uploadPreview(req.body && req.body.image); res.json({ url: publicUrl }); } catch (error) { res.status(error.status || 500).json({ error: error.message }); } });
app.post('/api/edit-submissions', limit('submit', 6), async (req, res) => { if (!hasSupabase()) return res.status(500).json({ error: 'Supabase is not configured' }); try { const body = req.body || {}; const clean = { url: String(body.url || '').trim(), platform: ['youtube', 'tiktok', 'video'].includes(body.platform) ? body.platform : inferPlatform(body.url), thumb: String(body.thumb || '').trim() || null, title: String(body.title || '').trim(), author: String(body.author || '').trim(), plugins: String(body.plugins || '').trim() || null, description: String(body.description || '').trim() || null, status: 'pending' }; if (!clean.url || !clean.title || !clean.author) return res.status(400).json({ error: 'Заполните ссылку, название и автора.' }); const data = await supabaseRequest('edit_submissions', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(clean) }); const row = Array.isArray(data) ? data[0] : null; notifyTelegram(`Новая заявка на работу\n${clean.title}\nАвтор: ${clean.author}\n${clean.url}`, row?.id ? subKeyboard(row.id) : undefined); return res.status(201).json(data); } catch (error) { return res.status(error.status || 500).json({ error: error.message, details: error.data || null }); } });
app.post('/api/edit-submissions/cancel', limit('cancel', 10), async (req, res) => { try { const body = req.body || {}; const id = String(body.id || '').trim(); const filter = id ? `id=eq.${enc(id)}&status=eq.pending` : `url=eq.${enc(body.url)}&title=eq.${enc(body.title)}&author=eq.${enc(body.author)}&status=eq.pending`; await supabaseRequest(`edit_submissions?${filter}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'rejected' }) }); res.json({ ok: true }); } catch (error) { res.status(error.status || 500).json({ error: error.message, details: error.data || null }); } });
app.post('/api/plugin-reports', limit('report', 5), async (req, res) => { try { const body = req.body || {}; const clean = { plugin_id: String(body.plugin_id || '').trim(), plugin_name: String(body.plugin_name || '').trim(), message: String(body.message || '').trim() || null, status: 'pending' }; if (!clean.plugin_id) return res.status(400).json({ error: 'Не найден плагин.' }); const data = await supabaseRequest('plugin_reports', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(clean) }); const row = Array.isArray(data) ? data[0] : null; notifyTelegram(`Жалоба на ссылку\n${clean.plugin_name}\n${clean.message || 'Без комментария'}`, row?.id ? closeKeyboard('report', row.id) : undefined); res.json({ ok: true }); } catch (error) { res.status(error.status || 500).json({ error: error.message, details: error.data || null }); } });
app.post('/api/plugin-requests', limit('request', 5), async (req, res) => { try { const body = req.body || {}; const clean = { name: String(body.name || '').trim(), source_url: String(body.source_url || '').trim() || null, comment: String(body.comment || '').trim() || null, status: 'pending' }; if (!clean.name) return res.status(400).json({ error: 'Введите название плагина.' }); const data = await supabaseRequest('plugin_requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(clean) }); const row = Array.isArray(data) ? data[0] : null; notifyTelegram(`Новый запрос плагина\n${clean.name}\n${clean.comment || ''}`, row?.id ? closeKeyboard('request', row.id) : undefined); res.json({ ok: true }); } catch (error) { res.status(error.status || 500).json({ error: error.message, details: error.data || null }); } });
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => { try { res.json(await getAdminDashboardData()); } catch (error) { res.status(error.status || 500).json({ error: error.message }); } });
app.patch('/api/admin/submissions/:id', requireAdmin, async (req, res) => { try { const body = req.body || {}; const update = {}; ['url', 'platform', 'thumb', 'title', 'author', 'plugins', 'description'].forEach((key) => { if (Object.prototype.hasOwnProperty.call(body, key)) update[key] = String(body[key] || '').trim() || null; }); if (['approved', 'rejected', 'pending'].includes(body.status)) update.status = body.status; if (!Object.keys(update).length) return res.status(400).json({ error: 'Нет данных для обновления.' }); await supabaseRequest(`edit_submissions?id=eq.${enc(req.params.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(update) }, true); res.json({ ok: true }); } catch (error) { res.status(error.status || 500).json({ error: error.message }); } });
app.delete('/api/admin/submissions/:id', requireAdmin, async (req, res) => { try { await supabaseRequest(`edit_submissions?id=eq.${enc(req.params.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, true); res.json({ ok: true }); } catch (error) { res.status(error.status || 500).json({ error: error.message }); } });
app.patch('/api/admin/plugin-reports/:id', requireAdmin, async (req, res) => { try { await supabaseRequest(`plugin_reports?id=eq.${enc(req.params.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: req.body.status || 'done' }) }, true); res.json({ ok: true }); } catch (error) { res.status(error.status || 500).json({ error: error.message }); } });
app.patch('/api/admin/plugin-requests/:id', requireAdmin, async (req, res) => { try { await supabaseRequest(`plugin_requests?id=eq.${enc(req.params.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: req.body.status || 'done' }) }, true); res.json({ ok: true }); } catch (error) { res.status(error.status || 500).json({ error: error.message }); } });

app.get('/', async (req, res) => res.send(await homePage()));
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/plugins', (req, res) => res.send(pluginsPage()));
app.get('/plugins.html', (req, res) => res.redirect(301, '/plugins'));
app.get('/category/:id', (req, res) => res.send(categoryPage(req.params.id)));
app.get('/plugin/:id', async (req, res) => res.send(await pluginPage(req.params.id, req)));
app.get('/plugin.html', (req, res) => res.redirect(301, `/plugin/${enc(req.query.id || '')}`));
app.get('/install', (req, res) => res.send(installPage()));
app.get('/install.html', (req, res) => res.redirect(301, '/install'));
app.get('/faq', (req, res) => res.send(faqPage()));
app.get('/faq.html', (req, res) => res.redirect(301, '/faq'));
app.get('/community', async (req, res) => res.send(await communityPage()));
app.get('/community.html', (req, res) => res.redirect(301, '/community'));
app.get('/edit/:id', async (req, res) => res.send(await editPage(req.params.id, req)));
app.get('/submit', (req, res) => res.send(submitPage()));
app.get('/submit.html', (req, res) => res.redirect(301, '/submit'));
app.get('/request-plugin', (req, res) => res.send(requestPluginPage()));
app.get('/contact', (req, res) => res.send(contactPage()));
app.get('/admin', (req, res) => res.send(adminPage()));
app.get('/download/:id', (req, res) => { const plugin = plugins.find((item) => item.id === req.params.id); if (!plugin || plugin.status !== 'available') return res.redirect(302, '/plugins'); logEvent('download', { plugin_id: plugin.id, path: `/download/${plugin.id}` }, req); if (req.query.version && Array.isArray(plugin.versions)) { const version = plugin.versions.find((item) => String(item.label || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(String(req.query.version).toLowerCase().replace(/[^a-z0-9]/g, ''))); if (version && version.status === 'available' && version.downloadUrl && version.downloadUrl !== '#') return res.redirect(302, version.downloadUrl); } if (!plugin.downloadUrl || plugin.downloadUrl === '#') return res.redirect(302, '/plugins'); res.redirect(302, plugin.downloadUrl); });
app.use((req, res) => res.status(404).send(notFoundPage()));
app.listen(PORT, () => console.log(`SSR server started: http://localhost:${PORT}`));
