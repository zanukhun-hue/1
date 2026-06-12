(function(){
  const FAVORITES_KEY = 'aePluginFavorites';
  const THEME_KEY = 'theme';
  const VISITS_KEY = 'aeSiteVisits';
  const EDIT_SUBMISSIONS_KEY = 'aeEditSubmissions';
  const page = document.body.dataset.page || 'home';
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function injectHeroVisualFix(){
    if(document.getElementById('heroVisualFix')) return;
    const style = document.createElement('style');
    style.id = 'heroVisualFix';
    style.textContent = `
      .hero-grid,
      .page-hero-home,
      .page-hero-home .container{
        overflow: visible !important;
      }

      .stable-visual{
        height: 500px !important;
        min-height: 500px !important;
        overflow: visible !important;
        contain: layout !important;
        padding: 56px !important;
        margin: -56px !important;
        isolation: isolate;
      }

      .visual-float-ae{
        left: 6% !important;
        top: 10% !important;
        z-index: 3;
      }

      .visual-float-plugin{
        right: 5% !important;
        top: 18% !important;
        z-index: 2;
      }

      .visual-float-download{
        left: 43% !important;
        bottom: 7% !important;
        z-index: 1;
      }

      .visual-element{
        box-shadow: 0 34px 95px rgba(99,102,241,.48) !important;
      }

      .visual-element:hover{
        box-shadow: 0 44px 110px rgba(99,102,241,.58) !important;
      }

      @media (max-width: 900px){
        .stable-visual{
          height: 390px !important;
          min-height: 390px !important;
          padding: 38px !important;
          margin: -38px !important;
        }
        .visual-float-ae{left: 4% !important;top: 9% !important;}
        .visual-float-plugin{right: 4% !important;top: 19% !important;}
        .visual-float-download{left: 40% !important;bottom: 5% !important;}
        .ae-card{width: 164px !important;height: 164px !important;}
        .visual-element{width: 122px !important;height: 122px !important;}
      }
    `;
    document.head.appendChild(style);
  }

  function readJson(key, fallback){
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch(e){ return fallback; }
  }

  function writeJson(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getFavorites(){
    return readJson(FAVORITES_KEY, []);
  }

  function saveFavorites(items){
    writeJson(FAVORITES_KEY, items);
  }

  function syncFavoriteUI(){
    const favorites = getFavorites();
    $$('#favoriteCount').forEach(el => el.textContent = favorites.length);
    $$('.favorite-btn[data-id]').forEach(btn => {
      const active = favorites.includes(btn.dataset.id);
      btn.classList.toggle('active', active);
      const detailButton = btn.classList.contains('btn');
      btn.innerHTML = active
        ? `<i class="fas fa-heart"></i>${detailButton ? ' В избранном' : ''}`
        : `<i class="far fa-heart"></i>${detailButton ? ' В избранное' : ''}`;
      btn.title = active ? 'Убрать из избранного' : 'В избранное';
    });
  }

  function toggleFavorite(id){
    const favorites = getFavorites();
    const index = favorites.indexOf(id);
    if(index >= 0) favorites.splice(index, 1);
    else favorites.push(id);
    saveFavorites(favorites);
    syncFavoriteUI();
    if(page === 'plugins') filterCatalog();
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
    applyTheme(saved ? saved === 'dark' : true);
  }

  function toggleTheme(){
    const dark = !document.documentElement.classList.contains('dark-mode');
    applyTheme(dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }

  function initVisits(){
    const visits = readJson(VISITS_KEY, {});
    visits.total = (visits.total || 0) + 1;
    visits[page] = (visits[page] || 0) + 1;
    writeJson(VISITS_KEY, visits);
    $$('#localVisitCount').forEach(el => el.textContent = visits.total);
  }

  function setupReveals(){
    const items = $$('.reveal:not(.revealed)');
    if(!('IntersectionObserver' in window)){
      items.forEach(item => item.classList.add('revealed'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    items.forEach(item => observer.observe(item));
  }

  function cardText(card){
    return [card.dataset.name, card.textContent].join(' ').toLowerCase();
  }

  function sortCards(cards, sort){
    return cards.sort((a, b) => {
      const an = a.dataset.name || '';
      const bn = b.dataset.name || '';
      if(sort === 'az') return an.localeCompare(bn, 'ru');
      if(sort === 'available') return Number(b.dataset.status === 'available') - Number(a.dataset.status === 'available') || an.localeCompare(bn, 'ru');
      if(sort === 'size') return Number(a.dataset.size || 0) - Number(b.dataset.size || 0);
      if(sort === 'new') return Number(/нов/i.test(b.textContent)) - Number(/нов/i.test(a.textContent)) || an.localeCompare(bn, 'ru');
      return Number(/популяр/i.test(b.textContent)) - Number(/популяр/i.test(a.textContent)) || Number(b.dataset.status === 'available') - Number(a.dataset.status === 'available') || an.localeCompare(bn, 'ru');
    });
  }

  function filterCatalog(){
    const grid = $('#pluginsGrid');
    if(!grid) return;
    const cards = $$('[data-plugin-card]', grid);
    const search = ($('#pluginSearch')?.value || '').trim().toLowerCase();
    const active = $('#categoryFilters .filter-btn.active')?.dataset.category || 'all';
    const favoritesOnly = $('#favoritesOnly')?.classList.contains('active');
    const favorites = getFavorites();
    let visible = 0;
    cards.forEach(card => {
      const okCategory = active === 'all' || card.dataset.category === active;
      const okSearch = !search || cardText(card).includes(search);
      const okFavorite = !favoritesOnly || favorites.includes(card.dataset.id);
      const show = okCategory && okSearch && okFavorite;
      card.hidden = !show;
      if(show) visible += 1;
    });
    sortCards(cards, $('#sortPlugins')?.value || 'popular').forEach(card => grid.appendChild(card));
    const result = $('#resultCount');
    if(result) result.textContent = `Найдено: ${visible}`;
    const label = $('#activeFilterLabel');
    if(label){
      const activeText = $('#categoryFilters .filter-btn.active')?.textContent || 'Все категории';
      label.textContent = activeText + (favoritesOnly ? ' · избранное' : '');
    }
    const empty = $('#emptyState');
    if(empty) empty.hidden = visible !== 0;
  }

  function initCatalog(){
    const params = new URLSearchParams(location.search);
    if(params.get('favorites') === '1') $('#favoritesOnly')?.classList.add('active');
    $('#pluginSearch')?.addEventListener('input', filterCatalog);
    $('#clearSearch')?.addEventListener('click', () => {
      const input = $('#pluginSearch');
      if(input){ input.value = ''; input.focus(); }
      filterCatalog();
    });
    $('#sortPlugins')?.addEventListener('change', filterCatalog);
    $('#favoritesOnly')?.addEventListener('click', () => {
      $('#favoritesOnly')?.classList.toggle('active');
      filterCatalog();
    });
    $('#categoryFilters')?.addEventListener('click', event => {
      const button = event.target.closest('.filter-btn');
      if(!button) return;
      $$('.filter-btn', $('#categoryFilters')).forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      filterCatalog();
    });
    filterCatalog();
  }

  function initCommunity(){
    const grid = $('#communityGrid');
    if(!grid) return;
    function apply(){
      const query = ($('#editSearch')?.value || '').trim().toLowerCase();
      const active = $('#editFilters .filter-btn.active')?.dataset.platform || 'all';
      let visible = 0;
      $$('.edit-card', grid).forEach(card => {
        const text = card.textContent.toLowerCase();
        const platformText = text.includes('tiktok') ? 'tiktok' : text.includes('youtube') ? 'youtube' : 'video';
        const show = (active === 'all' || platformText === active) && (!query || text.includes(query));
        card.hidden = !show;
        if(show) visible += 1;
      });
      const count = $('#editCount');
      if(count) count.textContent = `Работ: ${visible}`;
      const empty = $('#communityEmpty');
      if(empty) empty.hidden = visible !== 0;
    }
    $('#editSearch')?.addEventListener('input', apply);
    $('#clearEditSearch')?.addEventListener('click', () => {
      const input = $('#editSearch');
      if(input){ input.value = ''; input.focus(); }
      apply();
    });
    $('#editFilters')?.addEventListener('click', event => {
      const button = event.target.closest('.filter-btn');
      if(!button) return;
      $$('.filter-btn', $('#editFilters')).forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      apply();
    });
    apply();
  }

  function escapeHtml(value){
    return String(value || '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function readSubmissions(){
    return readJson(EDIT_SUBMISSIONS_KEY, []);
  }

  function renderSubmissions(){
    const grid = $('#mySubmissionsGrid');
    if(!grid) return;
    const list = readSubmissions();
    grid.innerHTML = list.map(item => `<article class="edit-card revealed"><div class="edit-body"><div class="badge-stack"><span class="pending-badge"><i class="fas fa-clock"></i> На проверке</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || 'Пользовательская работа After Effects.')}</p><div class="edit-meta"><span><i class="fas fa-user"></i> ${escapeHtml(item.author)}</span>${item.plugins ? `<span><i class="fas fa-plug"></i> ${escapeHtml(item.plugins)}</span>` : ''}</div></div><div class="edit-actions"><a class="details-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener"><i class="fas fa-up-right-from-square"></i> Открыть</a></div></article>`).join('');
    const empty = $('#mySubmissionsEmpty');
    if(empty) empty.hidden = list.length !== 0;
  }

  function initSubmit(){
    renderSubmissions();
    $('#editSubmitForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const item = {
        id: 'local-' + Date.now(),
        url: $('#editUrl')?.value || '',
        title: $('#editTitle')?.value || 'Без названия',
        author: $('#editAuthor')?.value || 'Автор',
        plugins: $('#editPlugins')?.value || '',
        description: $('#editDescription')?.value || '',
        created: new Date().toISOString()
      };
      const list = readSubmissions();
      list.unshift(item);
      writeJson(EDIT_SUBMISSIONS_KEY, list);
      event.target.reset();
      renderSubmissions();
    });
  }

  function initEvents(){
    $('#themeToggle')?.addEventListener('click', toggleTheme);
    $('#menuToggle')?.addEventListener('click', () => $('#navLinks')?.classList.toggle('open'));
    document.addEventListener('click', event => {
      const button = event.target.closest('.favorite-btn[data-id]');
      if(!button) return;
      event.preventDefault();
      toggleFavorite(button.dataset.id);
    });
    const top = $('#backToTop');
    window.addEventListener('scroll', () => top?.classList.toggle('show', window.scrollY > 500));
    top?.addEventListener('click', () => scrollTo({top:0, behavior:'smooth'}));
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectHeroVisualFix();
    initTheme();
    initVisits();
    initEvents();
    syncFavoriteUI();
    if(page === 'plugins') initCatalog();
    if(page === 'community') initCommunity();
    if(page === 'submit') initSubmit();
    setupReveals();
  });
})();
