'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PRICE_RUB = 149;
const CATEGORIES = [
  { id: 'shakes', title: 'Шейки и движения', short: 'Шейки', icon: 'fa-wave-square', accent: 'violet', description: 'Потряхивания камеры, Twitch и динамичные переходы.' },
  { id: 'color', title: 'Цветокоррекция', short: 'CC', icon: 'fa-palette', accent: 'rose', description: 'Готовые стили цвета, тон и обработка изображения.' },
  { id: 'distortion', title: 'Искажения', short: 'Искажения', icon: 'fa-water', accent: 'cyan', description: 'Деформации, турбулентность и визуальные искажения.' },
  { id: 'glow', title: 'Свечение и свет', short: 'Glow', icon: 'fa-sun', accent: 'amber', description: 'Контурное свечение, подсветка и эффекты света.' },
  { id: 'text', title: 'Текстовые эффекты', short: 'Текст', icon: 'fa-font', accent: 'blue', description: 'Эффекты текста, цветные стили и объём.' },
  { id: 'frames', title: '1 Frame эффекты', short: '1 Frame', icon: 'fa-bolt', accent: 'pink', description: 'Короткие однокадровые акценты для монтажа.' },
  { id: 'speed', title: 'Скорость и замедление', short: 'Speed', icon: 'fa-forward', accent: 'green', description: 'Twixtor, RSMB и пресеты работы со скоростью.' },
  { id: 'glitch', title: 'Glitch и CRT', short: 'Glitch', icon: 'fa-tv', accent: 'purple', description: 'Глитч, помехи, мерцание и VHS/CRT-атмосфера.' },
  { id: 'effects', title: 'Другие эффекты', short: 'FX', icon: 'fa-wand-magic-sparkles', accent: 'slate', description: 'Дополнительные стили и визуальные эффекты.' }
];

function read(root) {
  const encoded = fs.readFileSync(path.join(root, 'presets-index.tsv.gz.b64'), 'utf8').trim();
  const content = zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
  const allowed = new Set(CATEGORIES.map(c => c.id));
  return content.split(/\r?\n/).filter(Boolean).map(line => {
    const [id, category, file, title, size, archive] = line.split('\t');
    return { id, category, file, title, size: Number(size), archive };
  }).filter(p => allowed.has(p.category) && /^p-[a-f0-9]{8}$/.test(p.id) &&
    p.file.startsWith(p.category + '/') && /^[a-z0-9-]+\.ffx$/.test(p.file.split('/')[1] || ''));
}

function orderUrl(telegram, category) {
  const { telegramLink } = require('./telegram-preset-store');
  return telegramLink(telegram, category.id);
}

function render(items, query, root, esc, enc, telegram) {
  const q = String(query?.q || '').trim().slice(0, 90).toLocaleLowerCase('ru');
  const categories = CATEGORIES.map(category => {
    const presets = items.filter(p => p.category === category.id);
    return { ...category, count: presets.length, presets };
  });
  const shown = categories.filter(category => !q || (category.title + ' ' + category.short + ' ' +
    category.description + ' ' + category.presets.map(p => p.title).join(' ')).toLocaleLowerCase('ru').includes(q));
  const sample = category => category.presets.slice(0, 3).map(p => '<li>' + esc(p.title) + '</li>').join('');
  const previewTemplates = categories.map(category => `
    <template id="preset-preview-${esc(category.id)}">
      <div class="preset-preview-heading">
        <div class="preset-preview-icon preset-pack-${esc(category.accent)}"><i class="fas ${esc(category.icon)}" aria-hidden="true"></i></div>
        <div><span class="preset-preview-kicker">АВТОРСКИЙ НАБОР · ${category.count} ПРЕСЕТОВ</span><h2 id="presetPreviewTitle">${esc(category.title)}</h2><p>${esc(category.description)}</p></div>
      </div>
      <div class="preset-preview-facts"><span><i class="fas fa-file-archive" aria-hidden="true"></i> ZIP-архив</span><span><i class="fas fa-layer-group" aria-hidden="true"></i> ${category.count} файлов .ffx</span><span><i class="fas fa-tag" aria-hidden="true"></i> ${PRICE_RUB} ₽</span></div>
      <div class="preset-preview-placeholder"><i class="fas fa-circle-play" aria-hidden="true"></i><div><strong>Видеопревью в разработке</strong><span>Пока ниже доступен полный список пресетов из набора.</span></div></div>
      <h3 class="preset-preview-list-title">Что входит в набор</h3>
      <ol class="preset-preview-list">${category.presets.map(p => `<li>${esc(p.title)}</li>`).join("")}</ol>
      <p class="preset-preview-help">В наборе исходные .ffx для Adobe After Effects. Для отдельных эффектов могут потребоваться дополнительные плагины.</p>
      <div class="preset-preview-footer"><strong>${PRICE_RUB} ₽</strong>${orderUrl(telegram, category) ? `<a class="preset-purchase" href="${esc(orderUrl(telegram,category))}" target="_blank" rel="noopener noreferrer"><i class="fab fa-telegram-plane" aria-hidden="true"></i> Заказать в боте ↗</a>` : `<span class="preset-pending">Продажи скоро откроются</span>`}</div>
    </template>`).join("");
  const cards = shown.map(category => `
    <article class="plugin-card preset-pack preset-pack-${esc(category.accent)} reveal" id="pack-${esc(category.id)}" data-preset-pack="${esc(category.id)}">
      <div class="preset-pack-art" aria-hidden="true"><div class="preset-art-pattern"></div><div class="preset-art-emblem"><i class="fas ${esc(category.icon)}"></i></div><span class="preset-art-wordmark">${esc(category.short)}</span><span class="preset-art-corner">AE / FFX</span></div>
      <div class="preset-pack-body">
        <div class="preset-pack-meta"><span class="plugin-badge"><i class="fas fa-gem" aria-hidden="true"></i> Авторский набор</span><span class="preset-count">${category.count} пресетов</span></div>
        <h3>${esc(category.title)}</h3>
        <p class="preset-description">${esc(category.description)}</p>
        <div class="preset-pack-includes"><strong>Внутри набора:</strong><ul>${sample(category)}</ul>${category.count > 3 ? `<span>+ ещё ${category.count - 3} пресетов</span>` : ""}</div>
        <button class="preset-preview-trigger" type="button" data-pack-preview="${esc(category.id)}" aria-label="Посмотреть содержимое набора ${esc(category.title)}"><i class="fas fa-eye" aria-hidden="true"></i> Посмотреть состав <i class="fas fa-arrow-right" aria-hidden="true"></i></button>
        <div class="preset-pack-purchase"><div><span>Цена за набор</span><strong>${PRICE_RUB} ₽</strong></div>${orderUrl(telegram,category) ? `<a class="preset-purchase" href="${esc(orderUrl(telegram,category))}" target="_blank" rel="noopener noreferrer"><i class="fab fa-telegram-plane" aria-hidden="true"></i> Купить в боте</a>` : `<span class="preset-pending">Продажи скоро откроются</span>`}</div>
      </div>
    </article>`).join("");
  return `<div class="preset-store">
    <div class="preset-store-intro">
      <span class="preset-store-eyebrow">AE PLUGINS VAULT / PRESET STORE</span>
      <h2>Готовые эффекты. Сделано вручную.</h2>
      <p>Выбери набор, посмотри полный список пресетов и оформи заказ через нашего Telegram-бота. Выдача ZIP после подтверждения оплаты.</p>
      <div class="preset-store-stats"><span><strong>${categories.length}</strong> наборов</span><span><strong>${items.length}</strong> пресетов</span><span><strong>${PRICE_RUB} ₽</strong> за набор</span></div>
    </div>
    <form action="/presets" class="preset-search">
      <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
      <input type="search" name="q" maxlength="90" value="${esc(String(query?.q || '').slice(0,90))}" placeholder="Поиск: shake, CC, текст, glow..." aria-label="Поиск наборов пресетов">
      <button type="submit">Найти</button>
    </form>
    <div class="preset-store-heading"><h2>Тематические наборы</h2><span>Найдено: ${shown.length}</span></div>
    <div class="preset-pack-grid">${cards || '<p class="preset-empty">Ничего не найдено. <a href="/presets">Показать все наборы</a></p>'}</div>
    <dialog class="preset-preview-dialog" id="presetPreviewDialog" aria-labelledby="presetPreviewTitle"><button type="button" class="preset-preview-close" data-close-preset-preview aria-label="Закрыть окно просмотра"><span aria-hidden="true">×</span></button><div id="presetPreviewBody"></div></dialog>
    ${previewTemplates}
    <section class="preset-howto">
      <h2>Как купить пресеты</h2>
      <ol><li><strong>Выбери набор.</strong> Каждая категория продаётся отдельно за ${PRICE_RUB} ₽.</li><li><strong>Нажми «Купить в Telegram».</strong> Название и цена добавятся в черновик сообщения.</li><li><strong>Согласуй оплату с магазином.</strong> После подтверждения оплаты автор вручную отправит ZIP-архив.</li></ol>
      <p><i class="fas fa-circle-info" aria-hidden="true"></i> Формат файлов — .ffx для Adobe After Effects. Некоторым эффектам нужны дополнительные плагины. Совместимость зависит от версии AE. Плагины и скрипты в <a href="/plugins">бесплатном каталоге</a> продаваемыми пресетами не являются.</p>
    </section>
  </div>`;
}

// Legacy endpoint must never return binaries or redirect to a public file.
function download(req, res) {
  return res.status(410).set('Cache-Control', 'no-store').send('Прямое скачивание недоступно. Пресеты продаются наборами на /presets.');
}
module.exports = { read, render, download };
