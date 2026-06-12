(function(){
  const FAVORITES_KEY='aePluginFavorites';
  const EDIT_FAVORITES_KEY='aeEditFavorites';
  const THEME_KEY='theme';
  const VISITS_KEY='aeSiteVisits';
  const EDIT_SUBMISSIONS_KEY='aeEditSubmissions';
  const RATE_KEY='aeLastSubmitTimes';
  const page=document.body.dataset.page||'home';
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const SUPABASE_PUBLIC={
    url:'https://qfugshwpslhdgrogrcyl.supabase.co',
    anonKey:['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9','eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdWdzaHdwc2xoZGdyb2dyY3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MzY2ODQsImV4cCI6MjA5NDUxMjY4NH0','9mV8XDbkFwBEMtf4IvqgM-tccZrA0_SXO8eXiuRg4i0'].join('.')
  };

  function injectUiFixes(){
    if($('#uiFixes')) return;
    const style=document.createElement('style');
    style.id='uiFixes';
    style.textContent=`
      .hero-grid,.page-hero-home,.page-hero-home .container{overflow:visible!important}
      .stable-visual{height:500px!important;min-height:500px!important;overflow:visible!important;contain:layout!important;padding:56px!important;margin:-56px!important;isolation:isolate}
      .visual-float-ae{left:6%!important;top:10%!important;z-index:3}.visual-float-plugin{right:5%!important;top:18%!important;z-index:2}.visual-float-download{left:43%!important;bottom:7%!important;z-index:1}
      .visual-element{box-shadow:0 34px 95px rgba(99,102,241,.48)!important}.visual-element:hover{box-shadow:0 44px 110px rgba(99,102,241,.58)!important}
      .plugin-detail-content .hero-actions{align-items:center!important;gap:14px!important;flex-wrap:wrap!important}
      .plugin-detail-content .hero-actions .btn.favorite-btn,.hero-actions .btn.favorite-btn{width:auto!important;min-width:168px!important;height:auto!important;min-height:52px!important;padding:14px 18px!important;border-radius:16px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;flex:0 0 auto!important;white-space:nowrap!important;line-height:1!important;font-size:.96rem!important;background:var(--surface)!important;color:var(--text)!important;border-color:var(--border)!important;box-shadow:var(--shadow-soft)!important}
      .plugin-detail-content .hero-actions .btn.favorite-btn i,.hero-actions .btn.favorite-btn i{width:auto!important;height:auto!important;margin:0!important;line-height:1!important}
      .plugin-detail-content .hero-actions .btn.favorite-btn.active,.hero-actions .btn.favorite-btn.active{color:#ef4444!important;background:rgba(239,68,68,.12)!important;border-color:rgba(239,68,68,.28)!important}
      .plugin-detail-content .hero-actions .btn.favorite-btn:hover,.hero-actions .btn.favorite-btn:hover{transform:translateY(-2px)!important;box-shadow:var(--shadow)!important}
      .catalog-panel .search-wrap{position:relative!important;display:flex!important;align-items:center!important;width:100%!important;min-height:58px!important;background:linear-gradient(180deg,var(--surface-2),color-mix(in srgb,var(--surface-2) 86%,var(--primary) 14%))!important;border:1px solid var(--border)!important;border-radius:18px!important;padding:0 56px 0 50px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 12px 28px rgba(0,0,0,.12)!important;overflow:hidden!important;transition:var(--transition)!important}
      .catalog-panel .search-wrap:focus-within{border-color:rgba(99,102,241,.58)!important;box-shadow:0 0 0 4px rgba(99,102,241,.14),0 16px 34px rgba(0,0,0,.16)!important}
      .catalog-panel .search-wrap>i{position:absolute!important;left:18px!important;top:50%!important;transform:translateY(-50%)!important;color:var(--primary)!important;font-size:1.05rem!important;pointer-events:none!important;z-index:2!important}
      .catalog-panel .search-wrap input{width:100%!important;height:58px!important;border:0!important;outline:0!important;background:transparent!important;color:var(--text)!important;font-size:1rem!important;font-weight:800!important;line-height:58px!important;min-width:0!important;appearance:none!important;box-shadow:none!important}
      .catalog-panel .search-wrap input::placeholder{color:var(--muted)!important;opacity:.76!important;font-weight:700!important}
      .catalog-panel .search-wrap button,#clearEditSearch{position:absolute!important;right:10px!important;top:50%!important;transform:translateY(-50%)!important;width:38px!important;height:38px!important;border:1px solid var(--border)!important;background:var(--surface)!important;color:var(--muted)!important;border-radius:13px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;font-size:.95rem!important;transition:var(--transition)!important;box-shadow:0 8px 18px rgba(0,0,0,.12)!important;z-index:3!important}
      .catalog-panel .search-wrap button:hover,#clearEditSearch:hover{color:#fff!important;background:var(--primary)!important;border-color:var(--primary)!important;box-shadow:0 12px 24px rgba(99,102,241,.28)!important}
      .field-hint{display:block;margin:6px 0 0;color:var(--muted);font-size:.84rem;font-weight:700;line-height:1.35}.field-hint b{color:var(--primary)}
      .version-selector{margin:22px 0 4px;border:1px solid var(--border);border-radius:20px;background:var(--surface);box-shadow:var(--shadow-soft);max-width:560px;overflow:hidden}
      .version-selector summary{list-style:none;cursor:pointer;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;font-weight:900;color:var(--text)}
      .version-selector summary::-webkit-details-marker{display:none}.version-selector summary span{display:flex;align-items:center;gap:10px}.version-selector summary .chevron{transition:transform .2s ease}.version-selector[open] summary .chevron{transform:rotate(180deg)}
      .version-selector-body{padding:0 18px 18px}.version-selector-list{display:flex;flex-wrap:wrap;gap:10px}.version-option{border:1px solid var(--border);background:var(--surface-2);color:var(--text);border-radius:14px;padding:12px 14px;font-weight:900;display:inline-flex;align-items:center;gap:8px;transition:var(--transition);text-decoration:none}
      .version-option.active{background:linear-gradient(135deg,var(--primary),#8b5cf6);border-color:transparent;color:#fff}.version-option:hover{transform:translateY(-2px);box-shadow:var(--shadow-soft)}.version-note{margin-top:12px;color:var(--muted);font-size:.9rem;font-weight:700}.version-note.success{color:#22c55e}.version-note.error{color:#ef4444}
      .cancel-submission-btn,.edit-favorite-btn,.report-link-btn,.request-plugin-btn{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:14px;padding:10px 13px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:var(--transition);text-decoration:none}
      .cancel-submission-btn{border-color:rgba(239,68,68,.28);background:rgba(239,68,68,.12);color:#ef4444}.cancel-submission-btn:hover,.edit-favorite-btn:hover,.report-link-btn:hover,.request-plugin-btn:hover{transform:translateY(-2px);box-shadow:var(--shadow-soft)}.cancel-submission-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}.edit-favorite-btn.active{color:#ef4444;background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.28)}
      .pending-badge{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(245,158,11,.28);background:rgba(245,158,11,.12);color:#f59e0b;border-radius:999px;padding:7px 10px;font-size:.82rem;font-weight:900}
      .edit-thumb.thumb-broken img,.edit-detail-thumb.thumb-broken img{display:none!important}.edit-thumb-fallback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:radial-gradient(circle at 30% 20%,rgba(99,102,241,.28),transparent 42%),var(--surface-2);color:var(--text);font-weight:900;text-align:center;padding:18px}.edit-thumb-fallback i{font-size:2rem;color:var(--primary)}
      .request-modal{position:fixed;inset:0;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:20px;z-index:9999}.request-modal[hidden]{display:none}.request-modal-card{width:min(560px,100%);background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:24px;box-shadow:var(--shadow);position:relative}.request-modal-close{position:absolute;right:14px;top:14px;width:36px;height:36px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);cursor:pointer}.request-modal-card label{display:block;margin:14px 0;font-weight:900}.request-modal-card input,.request-modal-card textarea{width:100%;margin-top:8px}
      .inline-report-form{margin-top:18px;padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--surface)}.inline-report-form label{display:block;font-weight:900}.inline-report-form input{width:100%;margin:8px 0 12px}
      .stats-chip{display:inline-flex!important;align-items:center;gap:7px;border:1px solid var(--border);background:var(--surface);border-radius:999px;padding:7px 10px;font-weight:900;color:var(--muted)}
      @media(max-width:900px){.stable-visual{height:390px!important;min-height:390px!important;padding:38px!important;margin:-38px!important}.visual-float-ae{left:4%!important;top:9%!important}.visual-float-plugin{right:4%!important;top:19%!important}.visual-float-download{left:40%!important;bottom:5%!important}.ae-card{width:164px!important;height:164px!important}.visual-element{width:122px!important;height:122px!important}.plugin-detail-content .hero-actions .btn.favorite-btn,.hero-actions .btn.favorite-btn{min-width:156px!important;min-height:50px!important}.version-selector-list{flex-direction:column}.version-option{justify-content:center;width:100%}.catalog-panel .search-wrap{min-height:54px!important;padding:0 50px 0 46px!important}.catalog-panel .search-wrap input{height:54px!important;line-height:54px!important;font-size:.94rem!important}.catalog-panel .search-wrap>i{left:16px!important}.catalog-panel .search-wrap button,#clearEditSearch{width:34px!important;height:34px!important;right:9px!important}}
    `;
    document.head.appendChild(style);
  }

  function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch(e){return fallback}}
  function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function getFavorites(){return readJson(FAVORITES_KEY,[])}
  function saveFavorites(items){writeJson(FAVORITES_KEY,items)}
  function getEditFavorites(){return readJson(EDIT_FAVORITES_KEY,[])}
  function saveEditFavorites(items){writeJson(EDIT_FAVORITES_KEY,items)}
  function supabaseHeaders(extra){return Object.assign({apikey:SUPABASE_PUBLIC.anonKey,Authorization:`Bearer ${SUPABASE_PUBLIC.anonKey}`},extra||{})}
  async function supabaseInsert(table,payload){const r=await fetch(`${SUPABASE_PUBLIC.url}/rest/v1/${table}`,{method:'POST',headers:supabaseHeaders({'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(payload)});if(!r.ok){const t=await r.text().catch(()=>'');throw new Error(t||'Ошибка Supabase')}return true}
  async function supabaseCount(table,query){const r=await fetch(`${SUPABASE_PUBLIC.url}/rest/v1/${table}?${query}&select=id`,{method:'HEAD',headers:supabaseHeaders({Prefer:'count=exact'})});const range=r.headers.get('content-range')||'';const n=Number(range.split('/')[1]);return Number.isFinite(n)?n:0}
  function canSubmit(name,delayMs){const data=readJson(RATE_KEY,{});const now=Date.now();if(data[name]&&now-data[name]<delayMs){return Math.ceil((delayMs-(now-data[name]))/1000)}data[name]=now;writeJson(RATE_KEY,data);return 0}

  function syncFavoriteUI(){
    const favorites=getFavorites();
    $$('#favoriteCount').forEach(el=>el.textContent=favorites.length);
    $$('.favorite-btn[data-id]').forEach(btn=>{
      const active=favorites.includes(btn.dataset.id),wide=btn.classList.contains('btn');
      btn.classList.toggle('active',active);
      btn.innerHTML=active?`<i class="fas fa-heart"></i>${wide?' В избранном':''}`:`<i class="far fa-heart"></i>${wide?' В избранное':''}`;
    });
    syncEditFavorites();
  }
  function toggleFavorite(id){const a=getFavorites(),i=a.indexOf(id);i>=0?a.splice(i,1):a.push(id);saveFavorites(a);syncFavoriteUI();filterCatalog()}

  function syncEditFavorites(){
    const fav=getEditFavorites();
    $$('.edit-favorite-btn[data-edit-id]').forEach(btn=>{
      const active=fav.includes(btn.dataset.editId);
      btn.classList.toggle('active',active);
      btn.innerHTML=active?'<i class="fas fa-heart"></i> В избранном':'<i class="far fa-heart"></i> В избранное';
    });
    filterCommunity();
  }
  function toggleEditFavorite(id){const a=getEditFavorites(),i=a.indexOf(id);i>=0?a.splice(i,1):a.push(id);saveEditFavorites(a);syncEditFavorites()}

  function applyTheme(isDark){
    document.documentElement.classList.toggle('dark-mode',isDark);document.documentElement.classList.toggle('light-mode',!isDark);
    document.body.classList.toggle('dark-mode',isDark);document.body.classList.toggle('light-mode',!isDark);
    const icon=$('#themeToggle i');if(icon)icon.className=isDark?'fas fa-sun':'fas fa-moon';
  }
  function initTheme(){const saved=localStorage.getItem(THEME_KEY);applyTheme(saved?saved==='dark':true)}
  function initVisits(){const v=readJson(VISITS_KEY,{});v.total=(v.total||0)+1;v[page]=(v[page]||0)+1;writeJson(VISITS_KEY,v);$$('#localVisitCount').forEach(el=>el.textContent=v.total)}
  function setupReveals(){const items=$$('.reveal:not(.revealed)');if(!('IntersectionObserver'in window)){items.forEach(x=>x.classList.add('revealed'));return}const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');o.unobserve(e.target)}}),{threshold:.08});items.forEach(x=>o.observe(x))}

  function cardText(card){return [card.dataset.name||'',card.textContent||''].join(' ').toLowerCase()}
  function sortCards(cards,sort){return cards.sort((a,b)=>{const an=a.dataset.name||'',bn=b.dataset.name||'';if(sort==='az')return an.localeCompare(bn,'ru');if(sort==='available')return Number(b.dataset.status==='available')-Number(a.dataset.status==='available')||an.localeCompare(bn,'ru');if(sort==='size')return Number(a.dataset.size||0)-Number(b.dataset.size||0);if(sort==='new')return Number(/нов/i.test(b.textContent))-Number(/нов/i.test(a.textContent))||an.localeCompare(bn,'ru');return Number(/популяр/i.test(b.textContent))-Number(/популяр/i.test(a.textContent))||Number(b.dataset.status==='available')-Number(a.dataset.status==='available')||an.localeCompare(bn,'ru')})}
  function filterCatalog(){const grid=$('#pluginsGrid');if(!grid)return;const cards=$$('[data-plugin-card]',grid),q=($('#pluginSearch')?.value||'').trim().toLowerCase(),cat=$('#categoryFilters .filter-btn.active')?.dataset.category||'all',favOnly=$('#favoritesOnly')?.classList.contains('active'),fav=getFavorites();let n=0;cards.forEach(c=>{const show=(cat==='all'||c.dataset.category===cat)&&(!q||cardText(c).includes(q))&&(!favOnly||fav.includes(c.dataset.id));c.style.display=show?'':'none';c.hidden=!show;if(show)n++});sortCards(cards,$('#sortPlugins')?.value||'popular').forEach(c=>grid.appendChild(c));if($('#resultCount'))$('#resultCount').textContent=`Найдено: ${n}`;if($('#activeFilterLabel'))$('#activeFilterLabel').textContent=($('#categoryFilters .filter-btn.active')?.textContent||'Все категории')+(favOnly?' · избранное':'');if($('#emptyState'))$('#emptyState').hidden=n!==0}
  function initCatalog(){const p=new URLSearchParams(location.search);if(p.get('favorites')==='1')$('#favoritesOnly')?.classList.add('active');document.addEventListener('input',e=>{if(e.target&&e.target.id==='pluginSearch')filterCatalog()});$('#pluginSearch')?.addEventListener('keyup',filterCatalog);$('#clearSearch')?.addEventListener('click',()=>{const i=$('#pluginSearch');if(i){i.value='';i.focus()}filterCatalog()});$('#sortPlugins')?.addEventListener('change',filterCatalog);$('#favoritesOnly')?.addEventListener('click',()=>{$('#favoritesOnly')?.classList.toggle('active');filterCatalog()});$('#categoryFilters')?.addEventListener('click',e=>{const b=e.target.closest('.filter-btn');if(!b)return;$$('.filter-btn',$('#categoryFilters')).forEach(x=>x.classList.remove('active'));b.classList.add('active');filterCatalog()});filterCatalog()}

  function injectEditFavoriteButtons(){
    $$('.edit-card').forEach(card=>{
      if(card.querySelector('.edit-favorite-btn'))return;
      const link=card.querySelector('.details-btn,.edit-actions a')||card.querySelector('a');
      const id=card.dataset.id||link?.getAttribute('href')||card.textContent.slice(0,40);
      const actions=card.querySelector('.edit-actions')||card;
      const btn=document.createElement('button');btn.className='edit-favorite-btn';btn.type='button';btn.dataset.editId=id;btn.innerHTML='<i class="far fa-heart"></i> В избранное';actions.prepend(btn);
    });
  }
  function filterCommunity(){const grid=$('#communityGrid');if(!grid)return;const q=($('#editSearch')?.value||'').trim().toLowerCase(),active=$('#editFilters .filter-btn.active')?.dataset.platform||'all',favOnly=$('#editFavoritesOnly')?.classList.contains('active'),fav=getEditFavorites();let n=0;$$('.edit-card',grid).forEach(c=>{const text=c.textContent.toLowerCase(),p=text.includes('tiktok')?'tiktok':text.includes('youtube')?'youtube':'video',id=c.dataset.id||c.querySelector('.edit-favorite-btn')?.dataset.editId;const show=(active==='all'||p===active)&&(!q||text.includes(q))&&(!favOnly||fav.includes(id));c.hidden=!show;if(show)n++});if($('#editCount'))$('#editCount').textContent=`Работ: ${n}`;if($('#communityEmpty'))$('#communityEmpty').hidden=n!==0}
  function initCommunity(){injectEditFavoriteButtons();initBrokenThumbFallback();syncEditFavorites();document.addEventListener('input',e=>{if(e.target&&e.target.id==='editSearch')filterCommunity()});$('#clearEditSearch')?.addEventListener('click',()=>{const i=$('#editSearch');if(i){i.value='';i.focus()}filterCommunity()});$('#editFilters')?.addEventListener('click',e=>{const b=e.target.closest('.filter-btn');if(!b)return;$$('.filter-btn',$('#editFilters')).forEach(x=>x.classList.remove('active'));b.classList.add('active');filterCommunity()});$('#editFavoritesOnly')?.addEventListener('click',()=>{$('#editFavoritesOnly')?.classList.toggle('active');filterCommunity()});filterCommunity()}

  function initBrokenThumbFallback(){
    document.addEventListener('error',e=>{
      const img=e.target;if(!img||img.tagName!=='IMG'||!img.closest('.edit-thumb,.edit-detail-thumb'))return;
      const holder=img.closest('.edit-thumb,.edit-detail-thumb');holder.classList.add('thumb-broken');
      if(!holder.querySelector('.edit-thumb-fallback')){const div=document.createElement('div');div.className='edit-thumb-fallback';div.innerHTML='<i class="fas fa-video"></i><span>Превью недоступно</span>';holder.appendChild(div)}
    },true);
  }

  function escapeHtml(v){return String(v||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function readSubmissions(){return readJson(EDIT_SUBMISSIONS_KEY,[])}
  function saveSubmissions(list){writeJson(EDIT_SUBMISSIONS_KEY,list)}
  function renderSubmissions(){const grid=$('#mySubmissionsGrid');if(!grid)return;const list=readSubmissions();grid.innerHTML=list.map((item,i)=>`<article class="edit-card revealed"><div class="edit-body"><div class="badge-stack"><span class="pending-badge"><i class="fas fa-clock"></i> На проверке</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description||'Пользовательская работа After Effects.')}</p><div class="edit-meta"><span><i class="fas fa-user"></i> ${escapeHtml(item.author)}</span>${item.plugins?`<span><i class="fas fa-plug"></i> ${escapeHtml(item.plugins)}</span>`:''}</div></div><div class="edit-actions"><a class="details-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener"><i class="fas fa-up-right-from-square"></i> Открыть</a><button class="cancel-submission-btn" data-cancel-index="${i}" type="button"><i class="fas fa-ban"></i> Отменить</button></div></article>`).join('');const empty=$('#mySubmissionsEmpty');if(empty)empty.hidden=list.length!==0}
  function setStatus(sel,msg,type){const s=$(sel);if(!s)return;s.hidden=false;s.textContent=msg;s.classList.remove('success','error');if(type)s.classList.add(type)}
  function inferPlatform(v){v=String(v||'').toLowerCase();return v.includes('youtube.com')||v.includes('youtu.be')?'youtube':v.includes('tiktok.com')?'tiktok':'video'}
  async function cancelSubmission(index,button){const list=readSubmissions(),item=list[index];if(!item||!confirm('Отменить эту заявку?'))return;try{if(button)button.disabled=true;const r=await fetch('/api/edit-submissions/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.serverId,url:item.url,title:item.title,author:item.author})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Не удалось отменить заявку');list.splice(index,1);saveSubmissions(list);renderSubmissions();setStatus('#submitStatus','Заявка отменена.','success')}catch(e){setStatus('#submitStatus',e.message,'error');if(button)button.disabled=false}}
  function initSubmit(){renderSubmissions();document.addEventListener('click',e=>{const b=e.target.closest('.cancel-submission-btn');if(b)cancelSubmission(Number(b.dataset.cancelIndex),b)});$('#editSubmitForm')?.addEventListener('submit',async e=>{e.preventDefault();const wait=canSubmit('edit',30000);if(wait)return setStatus('#submitStatus',`Подожди ${wait} сек. перед новой отправкой.`,'error');const form=e.target,btn=form.querySelector('button[type="submit"]');const item={url:$('#editUrl')?.value||'',thumb:$('#editThumb')?.value||'',title:$('#editTitle')?.value||'Без названия',author:$('#editAuthor')?.value||'Автор',plugins:$('#editPlugins')?.value||'',description:$('#editDescription')?.value||'',platform:inferPlatform($('#editUrl')?.value||'')};try{if(btn)btn.disabled=true;setStatus('#submitStatus','Отправляю заявку...',null);const r=await fetch('/api/edit-submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Не удалось отправить заявку');const row=Array.isArray(d)?d[0]:d;const list=readSubmissions();list.unshift({id:'local-'+Date.now(),serverId:row&&row.id?row.id:null,...item,created:new Date().toISOString()});saveSubmissions(list);form.reset();renderSubmissions();setStatus('#submitStatus','Заявка отправлена на проверку.','success')}catch(err){setStatus('#submitStatus',err.message,'error')}finally{if(btn)btn.disabled=false}})}

  function initFlowVersionSelector(){if(location.pathname!=='/plugin/flow')return;const actions=$('.plugin-detail-content .hero-actions'),downloadBtn=$('.plugin-detail-content .hero-actions .btn-primary');if(!actions||!downloadBtn||$('#flowVersionSelector'))return;const box=document.createElement('details');box.id='flowVersionSelector';box.className='version-selector reveal revealed';box.innerHTML=`<summary><span><i class="fas fa-code-branch"></i> Выбрать версию Flow</span><i class="fas fa-chevron-down chevron"></i></summary><div class="version-selector-body"><div class="version-selector-list"><a class="version-option" href="/download/flow?version=v141" target="_blank" rel="noopener"><i class="fas fa-download"></i> Скачать v1.4.1</a><a class="version-option active" href="/download/flow" target="_blank" rel="noopener"><i class="fas fa-check-circle"></i> Скачать v1.5.2</a></div><div class="version-note">Нажми на нужную версию. Основная кнопка скачивания ведёт на Flow v1.5.2.</div></div>`;actions.parentNode.insertBefore(box,actions);downloadBtn.innerHTML='<i class="fas fa-download"></i> Скачать v1.5.2'}

  function pluginIdFromPath(){const m=location.pathname.match(/^\/plugin\/([^/]+)/);return m?decodeURIComponent(m[1]):''}
  function initPluginReport(){const id=pluginIdFromPath();if(!id)return;const name=$('h1')?.textContent?.replace(/ для After Effects/i,'').trim()||id;const actions=$('.plugin-detail-content .hero-actions');if(actions&&!$('.report-link-btn')){const b=document.createElement('button');b.className='btn btn-ghost report-link-btn';b.type='button';b.dataset.pluginId=id;b.dataset.pluginName=name;b.innerHTML='<i class="fas fa-flag"></i> Ссылка не работает';actions.appendChild(b)}let form=$('#pluginReportForm');if(!form&&$('.plugin-detail-content')){form=document.createElement('form');form.id='pluginReportForm';form.className='inline-report-form';form.hidden=true;form.innerHTML='<label>Комментарий<input id="pluginReportMessage" type="text" placeholder="Например: файл удалён или нет доступа"></label><button class="btn btn-primary" type="submit">Отправить жалобу</button><p id="pluginReportStatus" class="version-note" hidden></p>';$('.plugin-detail-content').appendChild(form)}document.addEventListener('click',e=>{if(e.target.closest('.report-link-btn')&&form)form.hidden=!form.hidden});form?.addEventListener('submit',async e=>{e.preventDefault();const wait=canSubmit('report',30000);if(wait)return setStatus('#pluginReportStatus',`Подожди ${wait} сек.`,'error');try{setStatus('#pluginReportStatus','Отправляю...',null);await supabaseInsert('plugin_reports',{plugin_id:id,plugin_name:name,message:$('#pluginReportMessage')?.value||null,status:'pending'});form.reset();setStatus('#pluginReportStatus','Жалоба отправлена. Спасибо!','success')}catch(err){setStatus('#pluginReportStatus',err.message,'error')}})}

  function ensureRequestModal(){if($('#requestPluginModal'))return;const modal=document.createElement('div');modal.className='request-modal';modal.id='requestPluginModal';modal.hidden=true;modal.innerHTML=`<div class="request-modal-card"><button class="request-modal-close" type="button"><i class="fas fa-xmark"></i></button><h2>Запросить плагин</h2><form id="pluginRequestForm"><label>Название плагина<input id="requestPluginName" type="text" maxlength="120" required></label><label>Ссылка / источник<input id="requestPluginUrl" type="url"></label><label>Комментарий<textarea id="requestPluginComment" rows="4" maxlength="400"></textarea></label><button class="btn btn-primary" type="submit">Отправить запрос</button><p id="pluginRequestStatus" class="version-note" hidden></p></form></div>`;document.body.appendChild(modal)}
  function injectRequestButtons(){ensureRequestModal();const footer=document.querySelector('.footer-grid div:nth-child(2)');if(footer&&!footer.querySelector('.request-plugin-btn')){const a=document.createElement('button');a.className='request-plugin-btn';a.type='button';a.innerHTML='<i class="fas fa-plus"></i> Запросить плагин';footer.appendChild(a)}const nav=$('#navLinks');if(nav&&!nav.querySelector('[data-request-plugin]')){const a=document.createElement('button');a.className='nav-link request-plugin-btn';a.type='button';a.dataset.requestPlugin='1';a.innerHTML='<i class="fas fa-plus"></i> Запросить';nav.appendChild(a)}}
  function initPluginRequest(){injectRequestButtons();const modal=$('#requestPluginModal');document.addEventListener('click',e=>{if(e.target.closest('.request-plugin-btn'))modal.hidden=false;if(e.target.closest('.request-modal-close')||e.target===modal)modal.hidden=true});$('#pluginRequestForm')?.addEventListener('submit',async e=>{e.preventDefault();const wait=canSubmit('pluginRequest',30000);if(wait)return setStatus('#pluginRequestStatus',`Подожди ${wait} сек.`,'error');try{setStatus('#pluginRequestStatus','Отправляю...',null);await supabaseInsert('plugin_requests',{name:$('#requestPluginName')?.value||'',source_url:$('#requestPluginUrl')?.value||null,comment:$('#requestPluginComment')?.value||null,status:'pending'});e.target.reset();setStatus('#pluginRequestStatus','Запрос отправлен.','success')}catch(err){setStatus('#pluginRequestStatus',err.message,'error')}})}

  async function initPublicStats(){const id=pluginIdFromPath();try{if(id){await supabaseInsert('site_events',{event_type:'plugin_view',plugin_id:id,path:location.pathname});const [views,downloads]=await Promise.all([supabaseCount('site_events',`event_type=eq.plugin_view&plugin_id=eq.${encodeURIComponent(id)}`),supabaseCount('site_events',`event_type=eq.download&plugin_id=eq.${encodeURIComponent(id)}`)]);const meta=$('.detail-meta');if(meta&&!$('#publicStats')){const span=document.createElement('span');span.id='publicStats';span.className='stats-chip';span.innerHTML=`<i class="fas fa-eye"></i> ${views} просмотров · <i class="fas fa-download"></i> ${downloads} скачиваний`;meta.appendChild(span)}}}catch(e){}
    document.addEventListener('click',async e=>{const a=e.target.closest('a[href^="/download/"]');if(!a)return;const m=a.getAttribute('href').match(/^\/download\/([^?]+)/);if(!m)return;try{await supabaseInsert('site_events',{event_type:'download',plugin_id:decodeURIComponent(m[1]),path:a.getAttribute('href')})}catch(_){}})}

  function initEvents(){
    $('#themeToggle')?.addEventListener('click',()=>{const dark=!document.documentElement.classList.contains('dark-mode');applyTheme(dark);localStorage.setItem(THEME_KEY,dark?'dark':'light')});
    $('#menuToggle')?.addEventListener('click',()=>$('#navLinks')?.classList.toggle('open'));
    document.addEventListener('click',e=>{const b=e.target.closest('.favorite-btn[data-id]');if(b){e.preventDefault();toggleFavorite(b.dataset.id)}const eb=e.target.closest('.edit-favorite-btn[data-edit-id]');if(eb){e.preventDefault();toggleEditFavorite(eb.dataset.editId)}});
    const top=$('#backToTop');window.addEventListener('scroll',()=>top?.classList.toggle('show',window.scrollY>500));top?.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
  }

  document.addEventListener('DOMContentLoaded',()=>{
    injectUiFixes();initTheme();initVisits();initEvents();syncFavoriteUI();initFlowVersionSelector();initBrokenThumbFallback();initPluginReport();initPluginRequest();initPublicStats();
    if(page==='plugins')initCatalog();
    if(page==='community')initCommunity();
    if(page==='submit')initSubmit();
    setupReveals();
  });
})();
