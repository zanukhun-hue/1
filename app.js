
(function(){
  const plugins = window.AE_PLUGINS || [];
  const edits = window.AE_EDITS || [];
  const config = window.AE_SITE_CONFIG || {};
  const FAVORITES_KEY = 'aePluginFavorites';
  const THEME_KEY = 'theme';
  const VISITS_KEY = 'aeSiteVisits';
  const LAST_VISIT_KEY = 'aeSiteLastVisit';
  const EDIT_SUBMISSIONS_KEY = 'aeEditSubmissions';
  const page = document.body.dataset.page || 'home';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function getFavorites(){ try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch(e){ return []; } }
  function saveFavorites(arr){ localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr)); }
  function toggleFavorite(id){
    const fav = getFavorites();
    const idx = fav.indexOf(id);
    if(idx >= 0) fav.splice(idx,1); else fav.push(id);
    saveFavorites(fav);
    syncFavoriteUI();
    renderCurrentPage();
  }
  function syncFavoriteUI(){
    const fav = getFavorites();
    $$('#favoriteCount').forEach(el => el.textContent = fav.length);
    $$('.favorite-btn[data-id]').forEach(btn => {
      const active = fav.includes(btn.dataset.id);
      btn.classList.toggle('active', active);
      btn.innerHTML = active ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
      btn.title = active ? 'Убрать из избранного' : 'В избранное';
    });
  }

  function pluginSizeMB(p){
    const raw = String(p.size || '').toLowerCase().replace(',', '.');
    const n = parseFloat(raw) || 0;
    if(raw.includes('gb')) return n * 1024;
    if(raw.includes('kb')) return n / 1024;
    return n;
  }
  function statusBadge(p){
    return p.status === 'available'
      ? '<span class="status-badge available"><i class="fas fa-check-circle"></i> Проверено</span>'
      : '<span class="status-badge updating"><i class="fas fa-clock"></i> Обновляется</span>';
  }
  function pluginCard(p){
    const fav = getFavorites().includes(p.id);
    const download = p.status === 'available' && p.downloadUrl && p.downloadUrl !== '#'
      ? `<a class="download-btn" href="${p.downloadUrl}" target="_blank" rel="noopener"><i class="fas fa-download"></i> Скачать</a>`
      : `<button class="download-btn disabled" disabled><i class="fas fa-clock"></i> Обновляется</button>`;
    return `<article class="plugin-card reveal" data-id="${p.id}" data-category="${p.category}" data-status="${p.status}">
      <div class="plugin-card-header">
        <div class="badge-stack"><span class="plugin-badge">${p.badge || p.categoryLabel}</span>${statusBadge(p)}</div>
        <div class="card-actions"><button class="favorite-btn ${fav?'active':''}" data-id="${p.id}" type="button" aria-label="Избранное">${fav?'<i class="fas fa-heart"></i>':'<i class="far fa-heart"></i>'}</button><div class="plugin-icon"><i class="${p.icon || 'fas fa-plug'}"></i></div></div>
      </div>
      <div class="plugin-card-content">
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="plugin-tags">${(p.tags||[]).slice(0,4).map(t=>`<span>#${t}</span>`).join('')}</div>
        <div class="plugin-meta">
          <span><i class="fas fa-hdd"></i> ${p.size}</span>
          <span><i class="fas fa-calendar"></i> ${p.version}</span>
          <span><i class="fas fa-check-circle"></i> AE ${p.minAe}+</span>
        </div>
      </div>
      <div class="plugin-card-footer">${download}<a class="details-btn" href="plugin.html?id=${encodeURIComponent(p.id)}"><i class="fas fa-info-circle"></i> Подробнее</a></div>
    </article>`;
  }

  function getCategories(){
    const map = new Map();
    plugins.forEach(p => map.set(p.category, p.categoryLabel));
    return [['all','Все'], ...Array.from(map.entries())];
  }
  function renderCategories(){
    const wrap = $('#categoryFilters');
    if(!wrap) return;
    const cats = getCategories();
    wrap.innerHTML = cats.map(([id,label]) => `<button class="filter-btn ${id===activeCategory?'active':''}" data-category="${id}">${label}</button>`).join('');
  }

  let activeCategory = 'all';
  let favoritesOnly = false;
  function filteredPlugins(){
    const search = ($('#pluginSearch')?.value || '').trim().toLowerCase();
    const sort = $('#sortPlugins')?.value || 'popular';
    let list = plugins.filter(p => {
      const text = [p.name,p.description,p.categoryLabel,p.package,p.status,p.version,...(p.tags||[])].join(' ').toLowerCase();
      const categoryOk = activeCategory === 'all' || p.category === activeCategory;
      const searchOk = !search || text.includes(search);
      const favOk = !favoritesOnly || getFavorites().includes(p.id);
      return categoryOk && searchOk && favOk;
    });
    const badgeRank = p => /популяр/i.test(p.badge||'') ? 0 : /нов/i.test(p.badge||'') ? 1 : 2;
    list.sort((a,b) => {
      if(sort === 'az') return a.name.localeCompare(b.name, 'ru');
      if(sort === 'available') return (a.status === 'available' ? 0 : 1) - (b.status === 'available' ? 0 : 1) || a.name.localeCompare(b.name,'ru');
      if(sort === 'size') return pluginSizeMB(a) - pluginSizeMB(b);
      if(sort === 'new') return (/нов/i.test(b.badge||'') ? 1 : 0) - (/нов/i.test(a.badge||'') ? 1 : 0) || a.name.localeCompare(b.name,'ru');
      return badgeRank(a) - badgeRank(b) || (b.status === 'available') - (a.status === 'available') || a.name.localeCompare(b.name,'ru');
    });
    return list;
  }
  function renderCatalog(){
    renderCategories();
    const grid = $('#pluginsGrid');
    if(!grid) return;
    const params = new URLSearchParams(location.search);
    if(params.get('favorites') === '1') favoritesOnly = true;
    const favBtn = $('#favoritesOnly');
    if(favBtn) favBtn.classList.toggle('active', favoritesOnly);
    const list = filteredPlugins();
    grid.innerHTML = list.map(pluginCard).join('');
    $('#resultCount') && ($('#resultCount').textContent = `Найдено: ${list.length}`);
    const activeLabel = activeCategory === 'all' ? 'Все категории' : (getCategories().find(([id])=>id===activeCategory)?.[1] || 'Категория');
    $('#activeFilterLabel') && ($('#activeFilterLabel').textContent = activeLabel + (favoritesOnly ? ' · избранное' : ''));
    $('#emptyState') && ($('#emptyState').hidden = list.length !== 0);
    syncFavoriteUI();
    setupReveals();
  }

  function renderHome(){
    const stats = $('#homeStats');
    if(stats){
      const available = plugins.filter(p=>p.status==='available').length;
      const categories = new Set(plugins.map(p=>p.category)).size;
      stats.innerHTML = `<div class="stat"><span>${plugins.length}</span><small>плагинов</small></div><div class="stat"><span>${available}</span><small>ссылок проверено</small></div><div class="stat"><span>${categories}</span><small>категорий</small></div>`;
    }
    const featured = $('#featuredPlugins');
    if(featured){
      const list = plugins.filter(p=>/популяр/i.test(p.badge||'') && p.status === 'available').slice(0,3);
      featured.innerHTML = list.map(pluginCard).join('');
    }
    const updates = $('#updatesList');
    if(updates){
      updates.innerHTML = plugins.slice(0,6).map(p => `<a href="plugin.html?id=${p.id}" class="update-row"><span>${statusBadge(p)}</span><b>${p.name}</b><small>${p.updated}</small></a>`).join('');
    }
    syncFavoriteUI();
  }

  function installText(type){
    const map = {
      aex: '.aex копируется в папку Plug-ins вашей версии After Effects. После копирования перезапустите программу и ищите эффект в меню Effect.',
      jsx: '.jsx / .jsxbin копируется в Scripts или ScriptUI Panels. Панель обычно появляется в меню Window, обычный скрипт — в File → Scripts.',
      ffx: '.ffx копируется в Documents → Adobe → After Effects → User Presets. После этого пресет ищется в Effects & Presets.',
    };
    return map[type] || 'Смотрите общую инструкцию по установке и проверяйте папку вашей версии After Effects.';
  }
  function renderPluginDetail(){
    const box = $('#pluginDetail');
    if(!box) return;
    const id = new URLSearchParams(location.search).get('id') || plugins[0]?.id;
    const p = plugins.find(x=>x.id===id);
    if(!p){
      box.innerHTML = `<div class="empty-state inline"><h2>Плагин не найден</h2><p>Вернитесь в каталог и выберите карточку заново.</p><a class="btn btn-primary" href="plugins.html">Открыть каталог</a></div>`;
      return;
    }
    document.title = `${p.name} | AE Plugins Vault`;
    const fav = getFavorites().includes(p.id);
    const download = p.status === 'available' && p.downloadUrl && p.downloadUrl !== '#'
      ? `<a class="btn btn-primary" href="${p.downloadUrl}" target="_blank" rel="noopener"><i class="fas fa-download"></i> Скачать</a>`
      : `<button class="btn btn-disabled" disabled><i class="fas fa-clock"></i> Ссылка обновляется</button>`;
    box.innerHTML = `<div class="plugin-detail-grid reveal">
      <div class="plugin-detail-icon"><i class="${p.icon}"></i></div>
      <div class="plugin-detail-content">
        <div class="detail-badges"><span class="plugin-badge">${p.badge}</span>${statusBadge(p)}</div>
        <h1>${p.name}</h1>
        <p>${p.description}</p>
        <div class="detail-meta">
          <span><i class="fas fa-folder"></i> ${p.categoryLabel}</span>
          <span><i class="fas fa-box"></i> ${p.package}</span>
          <span><i class="fas fa-hdd"></i> ${p.size}</span>
          <span><i class="fas fa-calendar"></i> ${p.version}</span>
          <span><i class="fas fa-check-circle"></i> ${p.compatibility}</span>
        </div>
        <div class="plugin-tags big">${(p.tags||[]).map(t=>`<span>#${t}</span>`).join('')}</div>
        <div class="hero-actions">${download}<button class="btn btn-ghost favorite-btn ${fav?'active':''}" data-id="${p.id}">${fav?'<i class="fas fa-heart"></i> В избранном':'<i class="far fa-heart"></i> В избранное'}</button></div>
      </div>
    </div>
    <div class="detail-panels reveal">
      <article class="install-card"><h2>Инструкция для этого типа файла</h2><p>${installText(p.package)}</p><a href="install.html#${p.package==='jsx'?'jsx':p.package}" class="text-link">Открыть подробную инструкцию</a></article>
      <article class="install-card"><h2>Перед скачиванием</h2><ul class="check-list"><li>Закройте After Effects перед установкой.</li><li>Проверьте, что используете нужную папку версии AE.</li><li>Если кнопка отключена, файл сейчас обновляется.</li></ul></article>
    </div>`;
    const related = $('#relatedPlugins');
    if(related){
      related.innerHTML = plugins.filter(x=>x.id!==p.id && (x.category===p.category || x.package===p.package)).slice(0,3).map(pluginCard).join('');
    }
    syncFavoriteUI();
  }



  function escapeHtml(str){
    return String(str || '').replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  }
  function getSubmissions(){ try { return JSON.parse(localStorage.getItem(EDIT_SUBMISSIONS_KEY)) || []; } catch(e){ return []; } }
  function saveSubmissions(arr){ localStorage.setItem(EDIT_SUBMISSIONS_KEY, JSON.stringify(arr)); }
  function detectVideo(url){
    const value = String(url || '').trim();
    let u;
    try { u = new URL(value); } catch(e){ return null; }
    const host = u.hostname.replace(/^www\./,'').toLowerCase();
    if(host.includes('youtu.be')){
      const id = u.pathname.split('/').filter(Boolean)[0];
      if(id) return {platform:'youtube', id, url:value, embed:`https://www.youtube.com/embed/${id}`, thumb:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`};
    }
    if(host.includes('youtube.com')){
      let id = u.searchParams.get('v');
      const parts = u.pathname.split('/').filter(Boolean);
      if(!id && ['shorts','embed','live'].includes(parts[0])) id = parts[1];
      if(id) return {platform:'youtube', id, url:value, embed:`https://www.youtube.com/embed/${id}`, thumb:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`};
    }
    if(host.includes('tiktok.com')){
      const match = value.match(/video\/(\d+)/);
      return {platform:'tiktok', id: match ? match[1] : '', url:value, embed:value, thumb:''};
    }
    return null;
  }
  function platformLabel(platform){ return platform === 'tiktok' ? 'TikTok' : platform === 'youtube' ? 'YouTube' : 'Видео'; }
  function platformIcon(platform){ return platform === 'tiktok' ? 'fab fa-tiktok' : platform === 'youtube' ? 'fab fa-youtube' : 'fas fa-video'; }
  async function buildVideoPreview(url){
    const base = detectVideo(url);
    if(!base) throw new Error('Поддерживаются ссылки YouTube и TikTok');
    if(base.platform === 'youtube') return base;
    try {
      const resp = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(base.url)}`);
      if(resp.ok){
        const data = await resp.json();
        return {...base, title:data.title || '', author:data.author_name || '', thumb:data.thumbnail_url || '', html:data.html || ''};
      }
    } catch(e) {}
    return base;
  }
  function editCard(item, local=false){
    const title = escapeHtml(item.title || 'Без названия');
    const author = escapeHtml(item.author || 'Автор');
    const desc = escapeHtml(item.description || '');
    const used = escapeHtml(item.plugins || '');
    const platform = item.platform || detectVideo(item.url)?.platform || 'video';
    const thumb = item.thumb || detectVideo(item.url)?.thumb || '';
    const status = local ? '<span class="pending-badge"><i class="fas fa-clock"></i> На проверке</span>' : '';
    return `<article class="edit-card reveal">
      <a class="edit-thumb" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="${title}" loading="lazy">` : '<div class="edit-thumb-placeholder"><i class="fas fa-video"></i></div>'}
        <span class="platform-badge"><i class="${platformIcon(platform)}"></i> ${platformLabel(platform)}</span>
        <span class="play-badge"><i class="fas fa-play"></i></span>
      </a>
      <div class="edit-body">
        <div class="badge-stack">${status}</div>
        <h3>${title}</h3>
        <p>${desc || 'Пользовательская работа After Effects.'}</p>
        <div class="edit-meta">
          <span><i class="fas fa-user"></i> ${author}</span>
          ${used ? `<span><i class="fas fa-plug"></i> ${used}</span>` : ''}
        </div>
      </div>
      <div class="edit-actions"><a class="details-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener"><i class="fas fa-up-right-from-square"></i> Открыть</a></div>
    </article>`;
  }
  let activeEditPlatform = 'all';
  function renderCommunity(){
    const grid = $('#communityGrid');
    if(!grid) return;
    const query = ($('#editSearch')?.value || '').trim().toLowerCase();
    let list = edits.filter(x => (x.status || 'approved') === 'approved');
    list = list.filter(x => {
      const platform = x.platform || detectVideo(x.url)?.platform || 'video';
      const platformOk = activeEditPlatform === 'all' || platform === activeEditPlatform;
      const text = [x.title,x.author,x.description,x.plugins,platform].join(' ').toLowerCase();
      return platformOk && (!query || text.includes(query));
    });
    grid.innerHTML = list.map(x=>editCard(x)).join('');
    $('#editCount') && ($('#editCount').textContent = `Работ: ${list.length}`);
    $('#communityEmpty') && ($('#communityEmpty').hidden = list.length !== 0);
    setupReveals();
  }
  function renderSubmissions(){
    const grid = $('#mySubmissionsGrid');
    if(!grid) return;
    const list = getSubmissions();
    grid.innerHTML = list.map(x=>editCard(x, true)).join('');
    $('#mySubmissionsEmpty') && ($('#mySubmissionsEmpty').hidden = list.length !== 0);
    setupReveals();
  }
  function showToast(text){
    let t = $('#toastMessage');
    if(!t){ t = document.createElement('div'); t.id = 'toastMessage'; t.className = 'toast-message'; document.body.appendChild(t); }
    t.textContent = text;
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 2600);
  }
  async function fillEditPreview(){
    const box = $('#editPreview');
    const url = $('#editUrl')?.value || '';
    if(!box) return null;
    box.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Загружаю превью...</p>';
    try {
      const meta = await buildVideoPreview(url);
      if(meta.title && !$('#editTitle').value) $('#editTitle').value = meta.title.slice(0,80);
      if(meta.author && !$('#editAuthor').value) $('#editAuthor').value = meta.author.slice(0,40);
      const item = {
        url: meta.url,
        platform: meta.platform,
        thumb: meta.thumb,
        title: $('#editTitle')?.value || meta.title || platformLabel(meta.platform),
        author: $('#editAuthor')?.value || meta.author || 'Автор',
        plugins: $('#editPlugins')?.value || '',
        description: $('#editDescription')?.value || ''
      };
      box.classList.remove('edit-preview-placeholder');
      box.innerHTML = editCard(item);
      setupReveals();
      return item;
    } catch(err){
      box.classList.add('edit-preview-placeholder');
      box.innerHTML = `<i class="fas fa-triangle-exclamation"></i><p>${escapeHtml(err.message || 'Не удалось сделать превью')}</p>`;
      return null;
    }
  }
  function initSubmitPage(){
    renderSubmissions();
    $('#previewEditBtn')?.addEventListener('click', fillEditPreview);
    $('#editUrl')?.addEventListener('change', fillEditPreview);
    $('#editSubmitForm')?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const meta = await fillEditPreview();
      if(!meta) return;
      const item = {
        ...meta,
        id: 'local-' + Date.now(),
        title: $('#editTitle')?.value || meta.title,
        author: $('#editAuthor')?.value || meta.author || 'Автор',
        plugins: $('#editPlugins')?.value || '',
        description: $('#editDescription')?.value || '',
        status:'pending',
        created:new Date().toISOString()
      };
      const list = getSubmissions();
      list.unshift(item);
      saveSubmissions(list);
      renderSubmissions();
      showToast('Заявка добавлена и ожидает проверки.');
    });
  }

  function renderStats(){
    const visits = JSON.parse(localStorage.getItem(VISITS_KEY) || '{}');
    $('#statsTotalVisits') && ($('#statsTotalVisits').textContent = visits.total || 0);
    $('#statsFavoriteCount') && ($('#statsFavoriteCount').textContent = getFavorites().length);
    $('#statsCatalogSize') && ($('#statsCatalogSize').textContent = plugins.length);
    const last = localStorage.getItem(LAST_VISIT_KEY);
    $('#statsLastVisit') && ($('#statsLastVisit').textContent = last ? new Date(last).toLocaleString('ru-RU') : '—');
  }

  function renderCurrentPage(){
    if(page === 'home') renderHome();
    if(page === 'plugins') renderCatalog();
    if(page === 'plugin') renderPluginDetail();
    if(page === 'stats') renderStats();
    if(page === 'community') renderCommunity();
    if(page === 'submit') renderSubmissions();
  }

  function applyTheme(isDark){
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.documentElement.classList.toggle('light-mode', !isDark);
    document.body.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('light-mode', !isDark);
    const icon = $('#themeToggle i');
    if(icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  }
  function initTheme(){
    const saved = localStorage.getItem(THEME_KEY);
    const isDark = saved ? saved === 'dark' : true;
    applyTheme(isDark);
  }
  function toggleTheme(){
    const dark = !document.documentElement.classList.contains('dark-mode');
    applyTheme(dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }
  function initVisits(){
    let visits = {};
    try { visits = JSON.parse(localStorage.getItem(VISITS_KEY)) || {}; } catch(e){ visits = {}; }
    visits.total = (visits.total || 0) + 1;
    visits[page] = (visits[page] || 0) + 1;
    localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    $$('#localVisitCount').forEach(el => el.textContent = visits.total);
  }
  function initGoatCounter(){
    if(!config.goatCounterCode) return;
    const code = config.goatCounterCode.trim();
    if(!code) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://gc.zgo.at/count.js';
    script.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
    document.head.appendChild(script);
    const publicCounter = $('#publicCounter');
    if(publicCounter){
      publicCounter.hidden = false;
      publicCounter.textContent = 'Публичная статистика подключена';
    }
  }
  function setupReveals(){
    const items = $$('.reveal:not(.revealed)');
    if(!('IntersectionObserver' in window)) { items.forEach(i=>i.classList.add('revealed')); return; }
    const observer = new IntersectionObserver((entries)=>{
      entries.forEach(entry => { if(entry.isIntersecting){ entry.target.classList.add('revealed'); observer.unobserve(entry.target); } });
    }, {threshold: .08});
    items.forEach(i=>observer.observe(i));
  }
  function initEvents(){
    $('#themeToggle')?.addEventListener('click', toggleTheme);
    $('#menuToggle')?.addEventListener('click', () => $('#navLinks')?.classList.toggle('open'));
    $$('.nav-link').forEach(a => { if(a.dataset.nav === page) a.classList.add('active'); });
    $$('[data-telegram-link]').forEach(a => { if(config.telegramUrl) a.href = config.telegramUrl; });
    document.addEventListener('click', (e)=>{
      const fav = e.target.closest('.favorite-btn[data-id]');
      if(fav){ e.preventDefault(); toggleFavorite(fav.dataset.id); }
    });
    $('#pluginSearch')?.addEventListener('input', renderCatalog);
    $('#clearSearch')?.addEventListener('click', () => { const input=$('#pluginSearch'); if(input){ input.value=''; input.focus(); renderCatalog(); } });
    $('#sortPlugins')?.addEventListener('change', renderCatalog);
    $('#favoritesOnly')?.addEventListener('click', () => { favoritesOnly = !favoritesOnly; renderCatalog(); });
    $('#categoryFilters')?.addEventListener('click', (e)=>{
      const btn = e.target.closest('.filter-btn');
      if(!btn) return;
      activeCategory = btn.dataset.category;
      $$('.filter-btn', $('#categoryFilters')).forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderCatalog();
    });
    $('#editSearch')?.addEventListener('input', renderCommunity);
    $('#clearEditSearch')?.addEventListener('click', () => { const input=$('#editSearch'); if(input){ input.value=''; input.focus(); renderCommunity(); } });
    $('#editFilters')?.addEventListener('click', (e)=>{
      const btn = e.target.closest('.filter-btn');
      if(!btn) return;
      activeEditPlatform = btn.dataset.platform;
      $$('.filter-btn', $('#editFilters')).forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderCommunity();
    });
    if(page === 'submit') initSubmitPage();
    const top = $('#backToTop');
    window.addEventListener('scroll', () => top?.classList.toggle('show', window.scrollY > 500));
    top?.addEventListener('click', () => scrollTo({top:0, behavior:'smooth'}));
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initVisits();
    initGoatCounter();
    initEvents();
    renderCurrentPage();
    syncFavoriteUI();
    setupReveals();
  });
})();
