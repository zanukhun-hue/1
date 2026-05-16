(function(){
  const config = window.AE_SITE_CONFIG || {};
  const EDIT_SUBMISSIONS_KEY = 'aeEditSubmissions';
  const page = document.body.dataset.page || '';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function isSupabaseReady(){
    return Boolean(config.supabaseUrl && config.supabaseAnonKey);
  }

  function supabaseBaseUrl(){
    return String(config.supabaseUrl || '').replace(/\/$/, '');
  }

  function supabaseHeaders(extra={}){
    return {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      ...extra
    };
  }

  function escapeHtml(str){
    return String(str || '').replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  }

  function showToast(text){
    let t = $('#toastMessage');
    if(!t){
      t = document.createElement('div');
      t.id = 'toastMessage';
      t.className = 'toast-message';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 3000);
  }

  function detectVideo(url){
    const value = String(url || '').trim();
    let u;
    try { u = new URL(value); } catch(e){ return null; }
    const host = u.hostname.replace(/^www\./,'').toLowerCase();

    if(host.includes('youtu.be')){
      const id = u.pathname.split('/').filter(Boolean)[0];
      if(id) return {platform:'youtube', id, url:value, thumb:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`};
    }

    if(host.includes('youtube.com')){
      let id = u.searchParams.get('v');
      const parts = u.pathname.split('/').filter(Boolean);
      if(!id && ['shorts','embed','live'].includes(parts[0])) id = parts[1];
      if(id) return {platform:'youtube', id, url:value, thumb:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`};
    }

    if(host.includes('tiktok.com')){
      const match = value.match(/video\/(\d+)/);
      return {platform:'tiktok', id: match ? match[1] : '', url:value, thumb:''};
    }

    return null;
  }

  function platformLabel(platform){
    return platform === 'tiktok' ? 'TikTok' : platform === 'youtube' ? 'YouTube' : 'Видео';
  }

  function platformIcon(platform){
    return platform === 'tiktok' ? 'fab fa-tiktok' : platform === 'youtube' ? 'fab fa-youtube' : 'fas fa-video';
  }

  async function buildVideoPreview(url){
    const base = detectVideo(url);
    if(!base) throw new Error('Поддерживаются только ссылки YouTube и TikTok');

    if(base.platform === 'youtube') return base;

    try {
      const resp = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(base.url)}`);
      if(resp.ok){
        const data = await resp.json();
        return {...base, title:data.title || '', author:data.author_name || '', thumb:data.thumbnail_url || ''};
      }
    } catch(e) {}

    return base;
  }

  function getLocalSubmissions(){
    try { return JSON.parse(localStorage.getItem(EDIT_SUBMISSIONS_KEY)) || []; } catch(e){ return []; }
  }

  function saveLocalSubmission(item){
    const list = getLocalSubmissions();
    list.unshift(item);
    localStorage.setItem(EDIT_SUBMISSIONS_KEY, JSON.stringify(list));
  }

  function editCard(item, local=false){
    const title = escapeHtml(item.title || 'Без названия');
    const author = escapeHtml(item.author || 'Автор');
    const desc = escapeHtml(item.description || '');
    const used = escapeHtml(item.plugins || '');
    const platform = item.platform || detectVideo(item.url)?.platform || 'video';
    const thumb = item.thumb || detectVideo(item.url)?.thumb || '';
    const status = local ? '<span class="pending-badge"><i class="fas fa-clock"></i> На проверке</span>' : '';

    return `<article class="edit-card reveal revealed">
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

  async function fetchApprovedRemoteEdits(){
    if(!isSupabaseReady()) return [];
    const endpoint = `${supabaseBaseUrl()}/rest/v1/edit_submissions?select=id,url,platform,thumb,title,author,plugins,description,status,created_at&status=eq.approved&order=created_at.desc`;
    const resp = await fetch(endpoint, { headers: supabaseHeaders() });
    if(!resp.ok) throw new Error('Не удалось загрузить общие работы');
    return await resp.json();
  }

  async function sendRemoteSubmission(item){
    if(!isSupabaseReady()) throw new Error('Supabase не настроен');

    const payload = {
      url: item.url,
      platform: item.platform || detectVideo(item.url)?.platform || 'video',
      thumb: item.thumb || '',
      title: item.title || 'Без названия',
      author: item.author || 'Автор',
      plugins: item.plugins || '',
      description: item.description || '',
      status: 'pending'
    };

    const endpoint = `${supabaseBaseUrl()}/rest/v1/edit_submissions`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(payload)
    });

    if(!resp.ok) throw new Error('Не удалось отправить заявку');
    const data = await resp.json();
    return data && data[0] ? data[0] : payload;
  }

  async function renderRemoteCommunity(){
    const grid = $('#communityGrid');
    if(!grid) return;

    if(!isSupabaseReady()) return;

    let list = [];
    try {
      list = await fetchApprovedRemoteEdits();
    } catch(e){
      console.warn(e);
      showToast('Не удалось загрузить общие работы из базы.');
      return;
    }

    const localApproved = (window.AE_EDITS || []).filter(x => (x.status || 'approved') === 'approved');
    list = [...list, ...localApproved];

    const query = ($('#editSearch')?.value || '').trim().toLowerCase();
    const activeBtn = $('#editFilters .filter-btn.active');
    const activePlatform = activeBtn ? activeBtn.dataset.platform : 'all';

    list = list.filter(x => {
      const platform = x.platform || detectVideo(x.url)?.platform || 'video';
      const platformOk = activePlatform === 'all' || platform === activePlatform;
      const text = [x.title,x.author,x.description,x.plugins,platform].join(' ').toLowerCase();
      return platformOk && (!query || text.includes(query));
    });

    grid.innerHTML = list.map(x => editCard(x)).join('');
    const count = $('#editCount');
    if(count) count.textContent = `Работ: ${list.length}`;
    const empty = $('#communityEmpty');
    if(empty) empty.hidden = list.length !== 0;
  }

  async function submitToRemoteOnly(e){
    const form = $('#editSubmitForm');
    if(!form || e.target !== form) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const url = $('#editUrl')?.value || '';
    let meta;
    try {
      meta = await buildVideoPreview(url);
    } catch(err){
      showToast(err.message || 'Проверь ссылку на видео.');
      return;
    }

    const item = {
      id: 'local-' + Date.now(),
      url: meta.url,
      platform: meta.platform,
      thumb: meta.thumb || '',
      title: $('#editTitle')?.value || meta.title || platformLabel(meta.platform),
      author: $('#editAuthor')?.value || meta.author || 'Автор',
      plugins: $('#editPlugins')?.value || '',
      description: $('#editDescription')?.value || '',
      status: 'pending',
      created: new Date().toISOString()
    };

    try {
      await sendRemoteSubmission(item);
      showToast('Заявка отправлена на модерацию. После одобрения её увидят все.');
      form.reset();
    } catch(err){
      console.warn(err);
      saveLocalSubmission(item);
      showToast('База пока не настроена. Заявка сохранена только в этом браузере.');
    }

    const grid = $('#mySubmissionsGrid');
    if(grid){
      const list = getLocalSubmissions();
      grid.innerHTML = list.map(x => editCard(x, true)).join('');
    }
    const empty = $('#mySubmissionsEmpty');
    if(empty) empty.hidden = getLocalSubmissions().length !== 0;
  }

  function init(){
    if(page === 'community'){
      renderRemoteCommunity();
      $('#editSearch')?.addEventListener('input', renderRemoteCommunity);
      $('#clearEditSearch')?.addEventListener('click', () => setTimeout(renderRemoteCommunity, 0));
      $('#editFilters')?.addEventListener('click', () => setTimeout(renderRemoteCommunity, 0));
    }

    if(page === 'submit'){
      document.addEventListener('submit', submitToRemoteOnly, true);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
