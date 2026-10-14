(function(){
  // Keep ordinary links, downloads, modifier clicks and browser history intact.
  if(!('CSSViewTransitionRule' in window)&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.documentElement.classList.add('motion-entry');
    window.addEventListener('pageshow',e=>{
      if(e.persisted)document.documentElement.classList.remove('motion-entry');
    });
  }

  const FAVORITES_KEY='aePluginFavorites', THEME_KEY='theme', VISITS_KEY='aeSiteVisits', VISITOR_ID_KEY='aeVisitorId', IGNORE_ANALYTICS_KEY='aeIgnoreAnalytics', RATE_KEY='aeLastSubmitTimes';
  const page=document.body.dataset.page||'home';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const SUPABASE_PUBLIC={url:'https://qfugshwpslhdgrogrcyl.supabase.co',anonKey:['eyJhb','GciOi','JIUzI','1NiIs','InR5c','CI6Ik','pXVCJ','9.','eyJpc','3MiOi','JzdXB','hYmFz','ZSIsI','nJlZi','I6InF','mdWdz','aHdwc','2xoZG','dyb2d','yY3ls','Iiwic','m9sZS','I6ImF','ub24i','LCJpY','XQiOj','E3Nzg','5MzY2','ODQsI','mV4cC','I6MjA','5NDUx','MjY4N','H0.','9mV8X','DbkFw','BEMtf','4Ivqg','M-tcc','ZrA0_','SXO8e','XiuRg','4i0'].join('')};

  function injectUiFixes(){
    if($('#uiFixes')) return;
    const st=document.createElement('style');
    st.id='uiFixes';
    st.textContent=`
      .local-counter{display:none!important}
      .install-card:before,.install-card:after,.notice-card:before,.notice-card:after,.about-card:before,.about-card:after,.stat-card:before,.stat-card:after,.submit-card:before,.submit-card:after,.preview-panel:before,.preview-panel:after{display:none!important;content:none!important;animation:none!important;transition:none!important}.install-card:hover:before,.notice-card:hover:before,.about-card:hover:before,.stat-card:hover:before,.submit-card:hover:before,.preview-panel:hover:before{transform:none!important}
      .hero-grid,.page-hero-home,.page-hero-home .container{overflow:visible!important}.stable-visual{height:500px!important;min-height:500px!important;overflow:visible!important;contain:layout!important;padding:56px!important;margin:-56px!important;isolation:isolate}.visual-float-ae{left:6%!important;top:10%!important;z-index:3}.visual-float-plugin{right:5%!important;top:18%!important;z-index:2}.visual-float-download{left:43%!important;bottom:7%!important;z-index:1}.visual-element{box-shadow:0 34px 95px rgba(99,102,241,.48)!important}.visual-element:hover{box-shadow:0 44px 110px rgba(99,102,241,.58)!important}
      .plugin-detail-content .hero-actions{align-items:center!important;gap:14px!important;flex-wrap:wrap!important}.plugin-detail-content .hero-actions .btn.favorite-btn,.hero-actions .btn.favorite-btn{width:auto!important;min-width:168px!important;height:auto!important;min-height:52px!important;padding:14px 18px!important;border-radius:16px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;flex:0 0 auto!important;white-space:nowrap!important;line-height:1!important;font-size:.96rem!important;background:var(--surface)!important;color:var(--text)!important;border-color:var(--border)!important;box-shadow:var(--shadow-soft)!important}.plugin-detail-content .hero-actions .btn.favorite-btn.active,.hero-actions .btn.favorite-btn.active{color:#ef4444!important;background:rgba(239,68,68,.12)!important;border-color:rgba(239,68,68,.28)!important}
      .catalog-panel .search-wrap{position:relative!important;display:flex!important;align-items:center!important;width:100%!important;min-height:58px!important;background:linear-gradient(180deg,var(--surface-2),color-mix(in srgb,var(--surface-2) 86%,var(--primary) 14%))!important;border:1px solid var(--border)!important;border-radius:18px!important;padding:0 56px 0 50px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 12px 28px rgba(0,0,0,.12)!important;overflow:hidden!important;transition:var(--transition)!important}.catalog-panel .search-wrap:focus-within{border-color:rgba(99,102,241,.58)!important;box-shadow:0 0 0 4px rgba(99,102,241,.14),0 16px 34px rgba(0,0,0,.16)!important}.catalog-panel .search-wrap>i{position:absolute!important;left:18px!important;top:50%!important;transform:translateY(-50%)!important;color:var(--primary)!important;font-size:1.05rem!important;pointer-events:none!important;z-index:2!important}.catalog-panel .search-wrap input{width:100%!important;height:58px!important;border:0!important;outline:0!important;background:transparent!important;color:var(--text)!important;font-size:1rem!important;font-weight:800!important;line-height:58px!important;min-width:0!important;appearance:none!important;box-shadow:none!important}.catalog-panel .search-wrap input::placeholder{color:var(--muted)!important;opacity:.76!important;font-weight:700!important}.catalog-panel .search-wrap button,#clearEditSearch{position:absolute!important;right:10px!important;top:50%!important;transform:translateY(-50%)!important;width:38px!important;height:38px!important;border:1px solid var(--border)!important;background:var(--surface)!important;color:var(--muted)!important;border-radius:13px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;font-size:.95rem!important;transition:var(--transition)!important;box-shadow:0 8px 18px rgba(0,0,0,.12)!important;z-index:3!important}
      .field-hint{display:block;margin:6px 0 0;color:var(--muted);font-size:.84rem;font-weight:700;line-height:1.35}.field-hint b{color:var(--primary)}.version-note{margin-top:12px;color:var(--muted);font-size:.9rem;font-weight:700}.version-note.success{color:#22c55e}.version-note.error{color:#ef4444}.version-selector{margin:22px 0 4px;border:1px solid var(--border);border-radius:20px;background:var(--surface);box-shadow:var(--shadow-soft);max-width:560px;overflow:hidden}.version-selector summary{list-style:none;cursor:pointer;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;font-weight:900;color:var(--text)}.version-selector summary::-webkit-details-marker{display:none}.version-selector-body{padding:0 18px 18px}.version-selector-list{display:flex;flex-wrap:wrap;gap:10px}.version-option{border:1px solid var(--border);background:var(--surface-2);color:var(--text);border-radius:14px;padding:12px 14px;font-weight:900;display:inline-flex;align-items:center;gap:8px;transition:var(--transition);text-decoration:none}.version-option.active{background:linear-gradient(135deg,var(--primary),#8b5cf6);border-color:transparent;color:#fff}
      .cancel-submission-btn,.edit-favorite-btn,.report-link-btn{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:14px;padding:10px 13px;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:var(--transition);text-decoration:none}.cancel-submission-btn{border-color:rgba(239,68,68,.28);background:rgba(239,68,68,.12);color:#ef4444}.cancel-submission-btn:hover,.edit-favorite-btn:hover,.report-link-btn:hover{transform:translateY(-2px);box-shadow:var(--shadow-soft)}.cancel-submission-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}.edit-favorite-btn.active{color:#ef4444;background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.28)}.pending-badge{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(245,158,11,.28);background:rgba(245,158,11,.12);color:#f59e0b;border-radius:999px;padding:7px 10px;font-size:.82rem;font-weight:900}
      .edit-thumb.thumb-broken img,.edit-detail-thumb.thumb-broken img{display:none!important}.edit-thumb-fallback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:radial-gradient(circle at 30% 20%,rgba(99,102,241,.28),transparent 42%),var(--surface-2);color:var(--text);font-weight:900;text-align:center;padding:18px}.edit-thumb-fallback i{font-size:2rem;color:var(--primary)}.inline-report-form{margin-top:18px;padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--surface)}.inline-report-form label{display:block;font-weight:900}.inline-report-form input{width:100%;margin:8px 0 12px}.stats-chip{display:inline-flex!important;align-items:center;gap:7px;border:1px solid var(--border);background:var(--surface);border-radius:999px;padding:7px 10px;font-weight:900;color:var(--muted)}
      @media(max-width:900px){.stable-visual{height:390px!important;min-height:390px!important;padding:38px!important;margin:-38px!important}.visual-float-ae{left:4%!important;top:9%!important}.visual-float-plugin{right:4%!important;top:19%!important}.visual-float-download{left:40%!important;bottom:5%!important}.ae-card{width:164px!important;height:164px!important}.visual-element{width:122px!important;height:122px!important}.plugin-detail-content .hero-actions .btn.favorite-btn,.hero-actions .btn.favorite-btn{min-width:156px!important;min-height:50px!important}.catalog-panel .search-wrap{min-height:54px!important;padding:0 50px 0 46px!important}.catalog-panel .search-wrap input{height:54px!important;line-height:54px!important;font-size:.94rem!important}.plugins-grid,.feature-grid{grid-template-columns:1fr!important}.subpage-hero h1,.hero h1{font-size:clamp(2rem,9vw,3rem)!important}.nav-links.open{max-height:75vh!important;overflow:auto!important}}
    `;document.head.appendChild(st);
  }

  const readJson=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}}, writeJson=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const getFavorites=()=>readJson(FAVORITES_KEY,[]), saveFavorites=v=>writeJson(FAVORITES_KEY,v);
  const esc=v=>String(v||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const sbHeaders=e=>Object.assign({apikey:SUPABASE_PUBLIC.anonKey,Authorization:`Bearer ${SUPABASE_PUBLIC.anonKey}`},e||{});
  function setStatus(sel,msg,type){const s=$(sel);if(!s)return;s.hidden=false;s.textContent=msg;s.classList.remove('success','error');if(type)s.classList.add(type)}
  function canSubmit(n,d){const x=readJson(RATE_KEY,{}),now=Date.now();if(x[n]&&now-x[n]<d)return Math.ceil((d-(now-x[n]))/1000);x[n]=now;writeJson(RATE_KEY,x);return 0}

  async function sbInsert(table,payload){const r=await fetch(`${SUPABASE_PUBLIC.url}/rest/v1/${table}`,{method:'POST',headers:sbHeaders({'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(payload)});if(!r.ok)throw new Error(await r.text().catch(()=>'Ошибка Supabase'));return true}
  function visitorId(){let id=localStorage.getItem(VISITOR_ID_KEY);if(!id){id=(crypto&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`);localStorage.setItem(VISITOR_ID_KEY,id)}return id}
  function analyticsIgnored(){return localStorage.getItem(IGNORE_ANALYTICS_KEY)==='1'}
  async function logSiteVisit(){try{if(analyticsIgnored())return;await sbInsert('site_visits',{path:location.pathname,visitor_hash:visitorId(),user_agent:(navigator.userAgent||'').slice(0,180)})}catch(e){console.warn('Site visit analytics skipped:',e.message)}}

  function syncFavoriteUI(){const fav=getFavorites();$$('#favoriteCount').forEach(e=>e.textContent=fav.length);$$('.favorite-btn[data-id]').forEach(b=>{const a=fav.includes(b.dataset.id),w=b.classList.contains('btn');b.classList.toggle('active',a);b.innerHTML=a?`<i class="fas fa-heart"></i>${w?' В избранном':''}`:`<i class="far fa-heart"></i>${w?' В избранное':''}`})}
  function toggleFavorite(id){const a=getFavorites(),i=a.indexOf(id);i>=0?a.splice(i,1):a.push(id);saveFavorites(a);syncFavoriteUI();filterCatalog()}
  function applyTheme(d){document.documentElement.classList.toggle('dark-mode',d);document.documentElement.classList.toggle('light-mode',!d);document.body.classList.toggle('dark-mode',d);document.body.classList.toggle('light-mode',!d);const i=$('#themeToggle i');if(i)i.className=d?'fas fa-sun':'fas fa-moon'}
  function initTheme(){const s=localStorage.getItem(THEME_KEY);applyTheme(s?s==='dark':true)}
  function initVisits(){logSiteVisit()}
  function setupReveals(){const items=$$('.reveal:not(.revealed)');if(!('IntersectionObserver'in window)){items.forEach(x=>x.classList.add('revealed'));return}const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');o.unobserve(e.target)}}),{threshold:.08});items.forEach(x=>o.observe(x))}

  function cardText(c){return[c.dataset.name||'',c.textContent||'',c.dataset.searchExtra||''].join(' ').toLowerCase()}
  function sortCards(cards,sort){return cards.sort((a,b)=>{const an=a.dataset.name||'',bn=b.dataset.name||'';if(sort==='az')return an.localeCompare(bn,'ru');if(sort==='available')return Number(b.dataset.status==='available')-Number(a.dataset.status==='available')||an.localeCompare(bn,'ru');if(sort==='size')return Number(a.dataset.size||0)-Number(b.dataset.size||0);if(sort==='new')return Number(/нов/i.test(b.textContent))-Number(/нов/i.test(a.textContent))||an.localeCompare(bn,'ru');return Number(/популяр/i.test(b.textContent))-Number(/популяр/i.test(a.textContent))||Number(b.dataset.status==='available')-Number(a.dataset.status==='available')||an.localeCompare(bn,'ru')})}
  function filterCatalog(){const g=$('#pluginsGrid');if(!g)return;const cards=$$('[data-plugin-card]',g),q=($('#pluginSearch')?.value||'').trim().toLowerCase(),cat=$('#categoryFilters .filter-btn.active')?.dataset.category||'all',task=$('#taskFilters .task-filter.active')?.dataset.task||'all',words=q.replace(/ё/g,'е').split(/\s+/).filter(word=>!['хочу','сделать','нужно','надо','для','видео','плагин','как','на','и','с','в','чтобы','мне'].includes(word)),fo=$('#favoritesOnly')?.classList.contains('active'),fav=getFavorites();let n=0;cards.forEach(c=>{const show=(!readEnvironment().only||compatibilityState(c.dataset.id).matches)&&(cat==='all'||c.dataset.category===cat)&&(task==='all'||(c.dataset.tasks||'').split(' ').includes(task))&&(!q||words.every(word=>cardText(c).replace(/ё/g,'е').includes(word)))&&(!fo||fav.includes(c.dataset.id));c.style.display=show?'':'none';c.hidden=!show;if(show)n++});sortCards(cards,$('#sortPlugins')?.value||'popular').forEach(c=>g.appendChild(c));if($('#resultCount'))$('#resultCount').textContent=`Найдено: ${n}`;if($('#activeFilterLabel'))$('#activeFilterLabel').textContent=($('#categoryFilters .filter-btn.active')?.textContent||'Все категории')+(task!=='all'?' · '+$('#taskFilters .task-filter.active').textContent:'')+(fo?' · избранное':'');if($('#emptyState'))$('#emptyState').hidden=n!==0}

  function initTaskSearch(){
    const filters=$('#taskFilters');if(!filters)return;
    function choose(id){const target=filters.querySelector(`[data-task="${id}"]`);if(!target)return;filters.querySelectorAll('button').forEach(button=>{const active=button===target;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});filterCatalog()}
    filters.addEventListener('click',event=>{const button=event.target.closest('[data-task]');if(button)choose(button.dataset.task)});
    const id=new URLSearchParams(location.search).get('task');if(id&&/^[a-z]+$/.test(id))choose(id);
  }
  function initVideoComparisons(){
    document.querySelectorAll('.video-comparison').forEach(box=>{
      const before=box.querySelector('.comparison-before'),after=box.querySelector('.comparison-after'),play=box.querySelector('.comparison-play'),range=box.querySelector('input'),status=box.querySelector('.comparison-status');
      function pause(){before.pause();after.pause();play.textContent='Воспроизвести'}
      range.addEventListener('input',()=>box.style.setProperty('--comparison-split',range.value+'%'));
      play.addEventListener('click',async()=>{if(!before.paused){pause();return}try{status.hidden=true;after.currentTime=before.currentTime;await Promise.all([before.play(),after.play()]);play.textContent='Пауза'}catch{pause();status.hidden=false;status.textContent='Не удалось загрузить видео. Попробуй ещё раз.'}});
      before.addEventListener('timeupdate',()=>{const duration=Math.min(before.duration||Infinity,after.duration||Infinity);if(before.currentTime>=duration-.05){before.currentTime=after.currentTime=0}else if(Math.abs(before.currentTime-after.currentTime)>.1)after.currentTime=before.currentTime});
      [before,after].forEach(video=>{video.addEventListener('ended',()=>{pause();before.currentTime=after.currentTime=0});video.addEventListener('error',()=>{pause();status.hidden=false;status.textContent='Видео сейчас недоступно.'})});
      document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
    });
  }

  function initCatalogCollapse(){
    const search=$('#pluginSearch');
    const panel=search?.closest('.catalog-panel');
    if(!panel||panel.querySelector('.catalog-panel-toggle'))return;
    const body=document.createElement('div');
    body.id='catalogPanelBody';
    body.className='catalog-panel-body';
    while(panel.firstChild)body.appendChild(panel.firstChild);
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='catalog-panel-toggle';
    toggle.setAttribute('aria-controls',body.id);
    panel.classList.add('catalog-collapsible');
    panel.appendChild(toggle);
    panel.appendChild(body);
    function setCollapsed(collapsed){
      body.hidden=collapsed;
      panel.classList.toggle('catalog-collapsed',collapsed);
      toggle.setAttribute('aria-expanded',String(!collapsed));
      toggle.textContent=collapsed?'Показать поиск и фильтры':'Скрыть поиск и фильтры';
    }
    setCollapsed(false);
    toggle.addEventListener('click',()=>setCollapsed(!body.hidden));
  }

  function initCatalog(){initCatalogCollapse();const p=new URLSearchParams(location.search);if(p.get('q')&&$('#pluginSearch'))$('#pluginSearch').value=p.get('q');if(p.get('favorites')==='1')$('#favoritesOnly')?.classList.add('active');document.addEventListener('input',e=>{if(e.target&&e.target.id==='pluginSearch')filterCatalog()});$('#pluginSearch')?.addEventListener('keyup',filterCatalog);$('#clearSearch')?.addEventListener('click',()=>{const i=$('#pluginSearch');if(i){i.value='';i.focus()}filterCatalog()});$('#sortPlugins')?.addEventListener('change',filterCatalog);$('#favoritesOnly')?.addEventListener('click',()=>{$('#favoritesOnly')?.classList.toggle('active');filterCatalog()});$('#categoryFilters')?.addEventListener('click',e=>{const b=e.target.closest('.filter-btn');if(!b)return;$$('.filter-btn',$('#categoryFilters')).forEach(x=>x.classList.remove('active'));b.classList.add('active');filterCatalog()});filterCatalog()}



  function initButtonGlow(){
    const selector='.btn,.download-btn,.details-btn,.version-option,.filter-btn,.favorite-btn,.edit-favorite-btn';
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,pending=null;
    const timers=new Map();
    function buttonFor(event){
      const button=event.target.closest?.(selector);
      if(!button||button.disabled||button.matches('.disabled,.btn-disabled,[aria-disabled="true"]'))return null;
      button.classList.add('cursor-button');
      return button;
    }
    function position(button,event){
      const rect=button.getBoundingClientRect();
      button.style.setProperty('--cursor-x',Math.max(0,Math.min(rect.width,event.clientX-rect.left))+'px');
      button.style.setProperty('--cursor-y',Math.max(0,Math.min(rect.height,event.clientY-rect.top))+'px');
    }
    function clear(button){
      button.classList.remove('glow-active');
      clearTimeout(timers.get(button));
      timers.delete(button);
      if(pending?.button===button){cancelAnimationFrame(frame);frame=0;pending=null}
    }
    function clearAll(){
      document.querySelectorAll('.glow-active').forEach(clear);
      cancelAnimationFrame(frame);frame=0;pending=null;
    }
    document.querySelectorAll(selector).forEach(button=>{
      if(!button.disabled&&!button.matches('.disabled,.btn-disabled,[aria-disabled="true"]'))button.classList.add('cursor-button');
    });
    document.addEventListener('pointerover',event=>{
      if(reduced.matches||event.pointerType==='touch')return;
      const button=buttonFor(event);if(!button)return;
      position(button,event);button.classList.add('glow-active');
    });
    document.addEventListener('pointermove',event=>{
      if(reduced.matches||event.pointerType==='touch')return;
      const button=buttonFor(event);if(!button)return;
      pending={button,x:event.clientX,y:event.clientY};
      if(!frame)frame=requestAnimationFrame(()=>{
        frame=0;
        if(pending){position(pending.button,{clientX:pending.x,clientY:pending.y});pending=null}
      });
    });
    document.addEventListener('pointerout',event=>{
      const button=buttonFor(event);
      if(button&&!button.contains(event.relatedTarget))clear(button);
    });
    document.addEventListener('pointerdown',event=>{
      if(reduced.matches||event.pointerType!=='touch')return;
      const button=buttonFor(event);if(!button)return;
      clear(button);position(button,event);button.classList.add('glow-active');
      timers.set(button,setTimeout(()=>clear(button),450));
    });
    document.addEventListener('pointercancel',event=>{const button=buttonFor(event);if(button)clear(button)});
    window.addEventListener('blur',clearAll);
    window.addEventListener('pagehide',clearAll);
    reduced.addEventListener?.('change',clearAll);
  }

  function initDownloads(){
    document.addEventListener('click',event=>{
      if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const link=event.target.closest('a[href]');
      if(!link)return;
      const url=new URL(link.href,location.href);
      if(url.origin!==location.origin||!/^\/download\/[^/]+$/.test(url.pathname)||url.searchParams.get('open')==='1')return;
      event.preventDefault();
      let frame=document.getElementById('pluginDownloadFrame');
      if(!frame){
        frame=document.createElement('iframe');
        frame.id='pluginDownloadFrame';
        frame.hidden=true;
        frame.title='Загрузка файла';
        document.body.appendChild(frame);
      }
      frame.src=url.href;
      const container=link.closest('.cart-item,.version-selector-body,.plugin-detail-content,.plugin-card')||link.parentElement;
      let notice=container.querySelector('.download-notice');
      if(!notice){
        notice=document.createElement('p');
        notice.className='download-notice';
        notice.setAttribute('role','status');
        container.appendChild(notice);
      }
      notice.replaceChildren(document.createTextNode('Запрос на скачивание отправлен. Если загрузка не началась — '));
      const fallback=document.createElement('a');
      url.searchParams.set('open','1');
      fallback.href=url.pathname+url.search;
      fallback.target='_blank';
      fallback.rel='noopener';
      fallback.textContent='открыть Google Диск';
      notice.appendChild(fallback);
    });
  }

  function initFlowVersionSelector(){if(location.pathname!=='/plugin/flow')return;const a=$('.plugin-detail-content .hero-actions'),dl=$('.plugin-detail-content .hero-actions .btn-primary');if(!a||!dl||$('#flowVersionSelector'))return;const box=document.createElement('details');box.id='flowVersionSelector';box.className='version-selector reveal revealed';box.innerHTML=`<summary><span><i class="fas fa-code-branch"></i> Выбрать версию Flow</span><i class="fas fa-chevron-down chevron"></i></summary><div class="version-selector-body"><div class="version-selector-list"><a class="version-option" href="/download/flow?version=v141" target="_blank" rel="noopener"><i class="fas fa-download"></i> Скачать v1.4.1</a><a class="version-option active" href="/download/flow" target="_blank" rel="noopener"><i class="fas fa-check-circle"></i> Скачать v1.5.2</a></div><div class="version-note">Нажми на нужную версию. Основная кнопка скачивания ведёт на Flow v1.5.2.</div></div>`;a.parentNode.insertBefore(box,a);dl.innerHTML='<i class="fas fa-download"></i> Скачать v1.5.2'}
  const pluginId=()=>{const m=location.pathname.match(/^\/plugin\/([^/]+)/);return m?decodeURIComponent(m[1]):''};
  function initPluginReport(){const id=pluginId();if(!id)return;const name=$('h1')?.textContent?.replace(/ для After Effects/i,'').trim()||id;document.addEventListener('click',e=>{if(e.target.closest('.report-link-btn'))$('#pluginReportForm')&&($('#pluginReportForm').hidden=!$('#pluginReportForm').hidden)});$('#pluginReportForm')?.addEventListener('submit',async e=>{e.preventDefault();const wait=canSubmit('report',30000);if(wait)return setStatus('#pluginReportStatus',`Подожди ${wait} сек.`,'error');try{setStatus('#pluginReportStatus','Отправляю...',null);await fetch('/api/plugin-reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plugin_id:id,plugin_name:name,message:$('#pluginReportMessage')?.value||null})}).then(async r=>{if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||'Ошибка')});e.target.reset();setStatus('#pluginReportStatus','Жалоба отправлена. Спасибо!','success')}catch(err){setStatus('#pluginReportStatus',err.message,'error')}})}

  function initHeroPlayground(){
    const hero=document.querySelector('.page-hero-home');
    const title=hero?.querySelector('h1 .highlight');
    if(!title||title.dataset.playgroundReady)return;
    const text=title.textContent.trim();
    const accessible=document.createElement('span');
    accessible.className='hero-fx-sr';
    accessible.textContent=text;
    const visual=document.createElement('span');
    visual.className='hero-fx-visual';
    visual.setAttribute('aria-hidden','true');
    text.split(' ').forEach((word,index)=>{
      if(index)visual.appendChild(document.createTextNode(' '));
      const group=document.createElement('span');
      group.className='hero-fx-word';
      Array.from(word).forEach((letter,i)=>{
        const char=document.createElement('span');
        char.className='hero-fx-char';
        char.style.setProperty('--fx-delay',(i*35)+'ms');
        char.textContent=letter;
        group.appendChild(char);
      });
      visual.appendChild(group);
    });
    title.replaceChildren(accessible,visual);
    title.classList.add('hero-fx-title');
    title.dataset.playgroundReady='true';
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const effects=['wave','glitch','blur'];
    let timer=0,index=0,visible=true;
    function clearEffect(){
      clearTimeout(timer);
      timer=0;
      delete title.dataset.effect;
    }
    function cycle(){
      clearEffect();
      if(!visible||document.hidden||reduced.matches)return;
      void title.offsetWidth;
      title.dataset.effect=effects[index++%effects.length];
      timer=setTimeout(()=>{
        delete title.dataset.effect;
        if(visible&&!document.hidden&&!reduced.matches)timer=setTimeout(cycle,2300);
      },1500);
    }
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        visible=Boolean(entries[0]?.isIntersecting);
        if(visible)cycle();else clearEffect();
      },{threshold:.12});
      observer.observe(title);
    }
    reduced.addEventListener?.('change',cycle);
    document.addEventListener('visibilitychange',cycle);
    window.addEventListener('pagehide',clearEffect);
    window.addEventListener('pageshow',cycle);
    cycle();
  }

  function initSpider(){
    if(document.querySelector('.site-spider'))return;
    const layer=document.createElement('div');layer.className='site-spider';
    layer.innerHTML='<canvas class="spider-canvas" aria-hidden="true"></canvas><button class="spider-handle" type="button" aria-label="Перетащите точку, чтобы паук пошёл за ней. Стрелки перемещают точку."><span></span></button><div class="site-toy-tools"><button type="button" class="spider-reset" aria-label="Вернуть паука"><i class="fas fa-rotate-left" aria-hidden="true"></i><span>Вернуть</span></button><button type="button" class="spider-toggle" aria-expanded="false"><i class="fas fa-eye" aria-hidden="true"></i><span>Показать паука</span></button></div>';
    document.body.appendChild(layer);
    const canvas=layer.querySelector('canvas'),ctx=canvas.getContext('2d');
    const handle=layer.querySelector('.spider-handle'),toggle=layer.querySelector('.spider-toggle'),reset=layer.querySelector('.spider-reset');
    const mobile=matchMedia('(max-width: 640px)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const key='site-toys-visible';let visible=false,frame=0,last=0,phase=0,drag=null;
    let w=innerWidth,h=innerHeight,x=0,y=0,tx=0,ty=0,angle=0,velocity=0;
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
    function preference(){try{const s=localStorage.getItem(key);if(s==='true'||s==='false')return s==='true'}catch{}return !mobile.matches}
    function stop(){cancelAnimationFrame(frame);frame=0;last=0;velocity=0}
    function release(){if(drag!==null){const id=drag;drag=null;if(handle.hasPointerCapture?.(id))handle.releasePointerCapture(id)}}
    function placeHandle(){handle.style.left=(tx-22)+'px';handle.style.top=(ty-22)+'px'}
    function resize(){
      w=innerWidth;h=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);
      tx=clamp(tx,28,w-28);ty=clamp(ty,100,Math.max(100,h-140));
      x=clamp(x,45,w-45);y=clamp(y,110,Math.max(110,h-140));placeHandle();draw(0);
    }
    function home(){x=w*.72;y=Math.min(h*.4,h-160);tx=Math.min(w-32,x+85);ty=y;angle=0;phase=0;resize();start()}
    function draw(speed){
      if(!ctx)return;
      ctx.clearRect(0,0,w,h);if(!visible)return;
      const scale=mobile.matches?.67:.9;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.strokeStyle='rgba(245,158,11,.5)';ctx.lineWidth=1;ctx.setLineDash([2,4]);ctx.stroke();ctx.setLineDash([]);
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
      ctx.shadowColor='rgba(0,0,0,.25)';ctx.shadowBlur=5;ctx.shadowOffsetY=3;
      ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';
      for(let side of [-1,1])for(let i=0;i<4;i++){
        const gait=Math.sin(phase+i*Math.PI*.8+(side===1?Math.PI:0))*Math.min(speed,1);
        const hipX=12-i*8,hipY=side*8;
        const kneeX=28-i*17+gait*5,kneeY=side*(27+Math.sin(i)*4);
        const footX=43-i*28-gait*8,footY=side*(43+Math.cos(i)*5);
        ctx.beginPath();ctx.moveTo(hipX,hipY);ctx.lineTo(kneeX,kneeY);ctx.lineTo(footX,footY);ctx.lineTo(footX+4,footY+side*5);ctx.strokeStyle='#818cf8';ctx.stroke();
        ctx.beginPath();ctx.moveTo(hipX,hipY);ctx.lineTo(kneeX,kneeY);ctx.strokeStyle='#a5b4fc';ctx.lineWidth=2;ctx.stroke();ctx.lineWidth=4;
        ctx.beginPath();ctx.arc(kneeX,kneeY,2.8,0,Math.PI*2);ctx.fillStyle='#fbbf24';ctx.fill();
      }
      ctx.shadowBlur=0;ctx.shadowOffsetY=0;const shell=ctx.createRadialGradient(-14,-5,1,-9,0,21);shell.addColorStop(0,'#c4b5fd');shell.addColorStop(.4,'#818cf8');shell.addColorStop(1,'#4338ca');
      ctx.beginPath();ctx.ellipse(-10,0,18,13,0,0,Math.PI*2);ctx.fillStyle=shell;ctx.fill();
      for(let j=0;j<3;j++){ctx.beginPath();ctx.ellipse(-17+j*7,0,2,6-j,0,0,Math.PI*2);ctx.fillStyle='rgba(251,191,36,.75)';ctx.fill()}
      for(let j=0;j<10;j++){const a=j*Math.PI/5;ctx.beginPath();ctx.moveTo(-10+Math.cos(a)*17,Math.sin(a)*12);ctx.lineTo(-10+Math.cos(a)*20,Math.sin(a)*15);ctx.strokeStyle='rgba(165,180,252,.65)';ctx.lineWidth=1;ctx.stroke()}
      ctx.beginPath();ctx.ellipse(12,0,11,10,0,0,Math.PI*2);ctx.fillStyle='#a5b4fc';ctx.fill();
      for(let side of [-1,1]){ctx.beginPath();ctx.arc(17,side*4,3,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.beginPath();ctx.arc(18,side*4,1.5,0,Math.PI*2);ctx.fillStyle='#1e1b4b';ctx.fill()}
      for(let side of [-1,1]){ctx.beginPath();ctx.arc(12,side*8,1.5,0,Math.PI*2);ctx.fillStyle='#312e81';ctx.fill();ctx.beginPath();ctx.moveTo(21,side*3);ctx.lineTo(26,side*5);ctx.lineTo(25,side*1);ctx.strokeStyle='#c7d2fe';ctx.lineWidth=2;ctx.stroke()}
      ctx.restore();
    }
    function tick(now){
      frame=0;if(!visible||document.hidden)return;
      const dt=Math.min(last?(now-last)/16.67:1,2);last=now;
      const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy),stopDistance=mobile.matches?27:35,moving=d>stopDistance+.5;
      const turn=Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)),turning=Math.abs(turn)>.015;
      if(moving||turning)angle+=turn*Math.min(1,.18*dt);
      if(moving){const desired=Math.min(9,(d-stopDistance)*.035)*Math.max(.3,Math.cos(turn));velocity+=(desired-velocity)*Math.min(1,.14*dt);const step=Math.min(d-stopDistance,Math.max(.15,velocity)*dt);x+=dx/d*step;y+=dy/d*step;phase+=step*.09}
      if(!moving)velocity=0;
      draw(moving?Math.min(1,velocity/4):0);
      if((moving||turning)&&!reduced.matches)frame=requestAnimationFrame(tick);else last=0;
    }
    function start(){if(!visible)return;if(reduced.matches){x=clamp(tx-(mobile.matches?27:35),45,w-45);y=clamp(ty,110,Math.max(110,h-140));angle=Math.atan2(ty-y,tx-x);draw(0);return}if(!frame)frame=requestAnimationFrame(tick)}
    function setVisible(value,persist=false){
      visible=value;release();stop();canvas.hidden=!value;handle.hidden=!value;reset.hidden=!value;
      toggle.setAttribute('aria-expanded',String(value));toggle.innerHTML=value?'<i class="fas fa-eye-slash" aria-hidden="true"></i><span>Скрыть паука</span>':'<i class="fas fa-eye" aria-hidden="true"></i><span>Показать паука</span>';
      if(value)home();else ctx?.clearRect(0,0,w,h);
      if(persist)try{localStorage.setItem(key,String(value))}catch{}
    }
    handle.addEventListener('pointerdown',e=>{if(e.button!==0||drag!==null)return;drag=e.pointerId;handle.setPointerCapture(e.pointerId)});
    handle.addEventListener('pointermove',e=>{if(drag!==e.pointerId)return;tx=clamp(e.clientX,28,w-28);ty=clamp(e.clientY,100,Math.max(100,h-140));placeHandle();start()});
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>handle.addEventListener(type,e=>{if(drag===e.pointerId)release()}));
    handle.addEventListener('keydown',e=>{const steps={ArrowLeft:[-30,0],ArrowRight:[30,0],ArrowUp:[0,-30],ArrowDown:[0,30]};if(!steps[e.key])return;e.preventDefault();tx=clamp(tx+steps[e.key][0],28,w-28);ty=clamp(ty+steps[e.key][1],100,Math.max(100,h-140));placeHandle();start()});
    reset.addEventListener('click',home);toggle.addEventListener('click',()=>setVisible(!visible,true));
    window.addEventListener('storage',e=>{if(e.key===key||e.key===null)setVisible(preference())});
    window.addEventListener('resize',()=>{resize();start()});window.addEventListener('blur',release);window.addEventListener('pagehide',()=>{release();stop()});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){release();stop()}else start()});
    mobile.addEventListener?.('change',()=>setVisible(preference()));reduced.addEventListener?.('change',()=>{stop();start()});
    resize();setVisible(preference());
  }

  function initPluginGallery(){
    const arena=document.querySelector('.plugin-gallery');if(!arena)return;
    const world=arena.querySelector('.gallery-world'),size=2560;
    const pointers=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let cx=size/2,cy=size/2,zoom=.4,pinch=null,suppressUntil=0;
    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
    function paint(){
      world.style.transform=`translate3d(${arena.clientWidth/2-cx*zoom}px,${arena.clientHeight/2-cy*zoom}px,0) scale(${zoom})`;
      document.querySelector('.gallery-zoom-level').textContent=Math.round(zoom*100)+'%';
      arena.dataset.cameraX=cx;arena.dataset.cameraY=cy;arena.dataset.zoom=zoom;updateMap();
    }
    function center(){cx=cy=size/2;zoom=clamp(Math.min((arena.clientWidth-80)/(size-180),(arena.clientHeight-190)/(size-180)),.12,.65);paint()}
    function changeZoom(next,px=arena.clientWidth/2,py=arena.clientHeight/2){const old=zoom;zoom=clamp(next,.12,1.8);cx+=(px-arena.clientWidth/2)*(1/old-1/zoom);cy+=(py-arena.clientHeight/2)*(1/old-1/zoom);paint()}
    document.querySelector('[data-gallery-zoom="in"]')?.addEventListener('click',()=>changeZoom(zoom*1.25));
    document.querySelector('[data-gallery-zoom="out"]')?.addEventListener('click',()=>changeZoom(zoom/1.25));
    document.querySelector('[data-gallery-reset]')?.addEventListener('click',center);
    arena.addEventListener('wheel',e=>{e.preventDefault();const delta=(e.deltaY||e.deltaX)*(e.deltaMode===1?16:e.deltaMode===2?arena.clientHeight:1);const r=arena.getBoundingClientRect();changeZoom(zoom*Math.exp(-clamp(delta,-480,480)*.0018),e.clientX-r.left,e.clientY-r.top)},{passive:false});
    arena.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});
      if(pointers.size===2){const [a,b]=[...pointers.values()],r=arena.getBoundingClientRect(),mx=(a.x+b.x)/2-r.left,my=(a.y+b.y)/2-r.top;pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom,worldX:cx+(mx-r.width/2)/zoom,worldY:cy+(my-r.height/2)/zoom};pointers.forEach((p,id)=>{p.moved=true;arena.setPointerCapture(id)})}
    });
    arena.addEventListener('pointermove',e=>{
      const p=pointers.get(e.pointerId);if(!p)return;
      const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
      if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()],r=arena.getBoundingClientRect();zoom=clamp(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,.12,1.8);cx=pinch.worldX-((a.x+b.x)/2-r.left-r.width/2)/zoom;cy=pinch.worldY-((a.y+b.y)/2-r.top-r.height/2)/zoom;paint();return}
      if(!p.moved&&Math.hypot(p.x-p.startX,p.y-p.startY)>6){p.moved=true;arena.setPointerCapture(e.pointerId);arena.classList.add('is-panning')}
      if(p.moved){cx-=dx/zoom;cy-=dy/zoom;paint()}
    });
    function release(e){const p=pointers.get(e.pointerId);if(!p)return;if(p.moved)suppressUntil=performance.now()+350;pointers.delete(e.pointerId);pinch=null;if(arena.hasPointerCapture?.(e.pointerId))arena.releasePointerCapture(e.pointerId);if(!pointers.size)arena.classList.remove('is-panning')}
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>arena.addEventListener(type,release));
    function cancel(){const ids=[...pointers.keys()];pointers.clear();pinch=null;arena.classList.remove('is-panning');ids.forEach(id=>{if(arena.hasPointerCapture?.(id))arena.releasePointerCapture(id)})}
    window.addEventListener('blur',cancel);window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel()});
    const cards=[...arena.querySelectorAll('.gallery-card')],edges=[...world.querySelectorAll('.gallery-wire')];
    const drawer=document.createElement('aside');drawer.className='gallery-drawer';drawer.hidden=true;drawer.setAttribute('aria-label','Просмотр плагина');
    drawer.innerHTML='<div class="drawer-top"><span class="eyebrow">Инструмент / обзор</span><button type="button" class="drawer-close" aria-label="Закрыть просмотр">×</button></div><div class="drawer-art"></div><h2></h2><p class="drawer-description"></p><span class="compatibility-note"></span><div class="drawer-actions"><a class="btn btn-primary drawer-download">↓ Скачать</a><button class="build-btn" type="button"></button><a class="text-link drawer-detail">Все подробности ↗</a></div><div class="drawer-switch"><button type="button" data-drawer-prev>← Предыдущий</button><button type="button" data-drawer-next>Следующий →</button></div>';
    arena.closest('.gallery-page').append(drawer);let selected=null,activeTask='all';
    function closeDrawer(){drawer.hidden=true;selected?.classList.remove('gallery-selected');if(selected){selected.dataset.skipCameraFocus='1';selected.focus({preventScroll:true});delete selected.dataset.skipCameraFocus}selected=null}
    drawer.querySelector('.drawer-close').addEventListener('click',closeDrawer);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.hidden){e.preventDefault();closeDrawer()}});
    function showCard(card){
      selected?.classList.remove('gallery-selected');selected=card;card.classList.add('gallery-selected');cancel();
      const p=workspace.plugins.find(p=>p.id===card.dataset.id);drawer.querySelector('h2').textContent=p.name;drawer.querySelector('.drawer-description').textContent=p.description;
      drawer.querySelector('.drawer-art').replaceChildren(card.querySelector('.gallery-card-art').cloneNode(true));
      drawer.querySelector('.drawer-detail').href=card.href;drawer.querySelector('.drawer-download').href='/download/'+encodeURIComponent(p.id);
      const b=drawer.querySelector('.build-btn');b.dataset.buildId=p.id;
      const note=drawer.querySelector('.compatibility-note');note.dataset.compatId=p.id;
      drawer.hidden=false;syncWorkspace();drawer.querySelector('.drawer-close').focus({preventScroll:true});
    }
    function step(n){const relevant=cards.filter(c=>activeTask==='all'||c.dataset.tasks.split(' ').includes(activeTask));if(!relevant.length)return;showCard(relevant[(relevant.indexOf(selected)+n+relevant.length)%relevant.length])}
    drawer.querySelector('[data-drawer-prev]').addEventListener('click',()=>step(-1));drawer.querySelector('[data-drawer-next]').addEventListener('click',()=>step(1));
    arena.addEventListener('click',e=>{
      if(performance.now()<suppressUntil){e.preventDefault();return}
      const card=e.target.closest('.gallery-card');if(!card||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
      e.preventDefault();showCard(card);
    });
    const minimap=document.querySelector('.gallery-minimap'),mapNodes=minimap.querySelector('[data-map-nodes]'),viewport=minimap.querySelector('[data-map-viewport]');
    cards.forEach(card=>{const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('cx',card.dataset.x);dot.setAttribute('cy',card.dataset.y);dot.setAttribute('r','28');dot.dataset.node=card.dataset.node;mapNodes.append(dot)});
    function updateMap(){if(!viewport)return;const width=arena.clientWidth/zoom,height=arena.clientHeight/zoom;viewport.setAttribute('x',cx-width/2);viewport.setAttribute('y',cy-height/2);viewport.setAttribute('width',width);viewport.setAttribute('height',height)}
    minimap.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();center();return}const steps={ArrowLeft:[-150,0],ArrowRight:[150,0],ArrowUp:[0,-150],ArrowDown:[0,150]};if(steps[e.key]){e.preventDefault();cx+=steps[e.key][0];cy+=steps[e.key][1];paint()}});
    minimap.addEventListener('pointerdown',e=>{e.preventDefault();const r=minimap.getBoundingClientRect();cx=clamp((e.clientX-r.left)/r.width*size,0,size);cy=clamp((e.clientY-r.top)/r.height*size,0,size);paint()});
    function filterTask(id){activeTask=id;const relevant=new Set(cards.filter(c=>id==='all'||c.dataset.tasks.split(' ').includes(id)).map(c=>c.dataset.node));cards.forEach(c=>c.classList.toggle('gallery-dimmed',!relevant.has(c.dataset.node)));edges.forEach(edge=>{const hit=relevant.has(edge.dataset.from)&&(edge.dataset.to==='-1'||relevant.has(edge.dataset.to));edge.classList.toggle('task-wire-active',id!=='all'&&hit);edge.classList.toggle('task-wire-dimmed',id!=='all'&&!hit)});mapNodes.querySelectorAll('circle').forEach(dot=>dot.classList.toggle('map-active',relevant.has(dot.dataset.node)));document.querySelectorAll('[data-gallery-task]').forEach(b=>{const on=b.dataset.galleryTask===id;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))})}
    document.querySelector('.gallery-task-bar').addEventListener('click',e=>{const b=e.target.closest('[data-gallery-task]');if(b)filterTask(b.dataset.galleryTask)});
    filterTask('all');
    arena.addEventListener('keydown',e=>{if(e.target!==arena)return;const steps={ArrowLeft:[-70,0],ArrowRight:[70,0],ArrowUp:[0,-70],ArrowDown:[0,70]};if(!steps[e.key])return;e.preventDefault();cx+=steps[e.key][0]/zoom;cy+=steps[e.key][1]/zoom;paint()});
    function highlight(index){edges.forEach(edge=>edge.classList.toggle('wire-active',edge.dataset.from===index||edge.dataset.to===index))}
    arena.querySelectorAll('.gallery-card').forEach(card=>{
      card.addEventListener('pointerenter',()=>{if(!pointers.size)highlight(card.dataset.node)});card.addEventListener('pointerleave',()=>highlight(null));
      card.addEventListener('focus',()=>{highlight(card.dataset.node);if(pointers.size||card.dataset.skipCameraFocus)return;const r=card.getBoundingClientRect(),a=arena.getBoundingClientRect();if(r.left<a.left||r.right>a.right||r.top<a.top||r.bottom>a.bottom){cx=Number(card.dataset.x);cy=Number(card.dataset.y);paint()}});
      card.addEventListener('blur',()=>highlight(null));
    });
    window.addEventListener('resize',paint);center();
  }

  function initSortMenu(){
    const select=document.getElementById('sortPlugins');if(!select)return;
    const menu=document.createElement('details');menu.className='sort-menu';
    const summary=document.createElement('summary');summary.innerHTML='<span></span><i class="fas fa-chevron-down" aria-hidden="true"></i>';summary.setAttribute('aria-label','Сортировка плагинов');
    const list=document.createElement('div');list.className='sort-options';list.setAttribute('role','group');list.setAttribute('aria-label','Варианты сортировки');
    const options=Array.from(select.options).map(option=>{const button=document.createElement('button');button.type='button';button.textContent=option.textContent;button.dataset.value=option.value;button.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));setOpen(false);summary.focus()});list.appendChild(button);return button});
    function sync(){const label=summary.querySelector('span');label.textContent=select.selectedOptions[0].textContent;label.classList.remove('sort-label-enter');void label.offsetWidth;label.classList.add('sort-label-enter');options.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===select.value)))}
    menu.append(summary,list);select.insertAdjacentElement('afterend',menu);select.hidden=true;select.addEventListener('change',sync);sync();
    summary.dataset.caption='Сортировка';
    const popover=typeof list.showPopover==='function';
    if(popover)list.setAttribute('popover','manual');
    function positionMenu(){const r=summary.getBoundingClientRect();const width=Math.min(Math.max(r.width,240),innerWidth-24);list.style.width=width+'px';list.style.left=Math.max(12,Math.min(r.left,innerWidth-width-12))+'px';list.style.top=Math.max(12,Math.min(r.bottom+8,innerHeight-list.offsetHeight-12))+'px'}
    function setOpen(value){menu.open=value;if(popover){if(value){if(!list.matches(':popover-open'))list.showPopover();positionMenu()}else if(list.matches(':popover-open'))list.hidePopover()}}
    menu.addEventListener('toggle',()=>setOpen(menu.open));
    window.addEventListener('resize',()=>{if(menu.open&&popover)positionMenu()});window.addEventListener('scroll',()=>{if(menu.open&&popover)positionMenu()},true);
    menu.addEventListener('keydown',e=>{if(e.key==='Escape'){setOpen(false);summary.focus();e.preventDefault();return}if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();setOpen(true);const i=options.indexOf(document.activeElement);const n=e.key==='Home'?0:e.key==='End'?options.length-1:e.key==='ArrowDown'?(i+1)%options.length:(i<0?options.length-1:(i+options.length-1)%options.length);requestAnimationFrame(()=>options[n].focus())});
    document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))setOpen(false)});
    menu.addEventListener('focusout',e=>{if(!menu.contains(e.relatedTarget))setOpen(false)});
  }

  const workspace=JSON.parse(document.getElementById('workspaceData')?.textContent||'{"plugins":[],"compatibility":{}}');
  const BUILD_KEY='aeMyBuild', ENV_KEY='aeEnvironment';
  const readBuild=()=>{const value=readJson(BUILD_KEY,[]);return Array.isArray(value)?[...new Set(value.filter(id=>workspace.plugins.some(p=>p.id===id)))]:[]};
  const readEnvironment=()=>{const v=readJson(ENV_KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}};
  function compatibilityState(id){
    const env=readEnvironment(),c=workspace.compatibility[id];
    if(!c)return {matches:false,label:'Совместимость уточняется'};
    const aeKnown=!env.ae||c.ae?.includes(Number(env.ae)),osKnown=!env.os||c.os?.includes(env.os);
    if(env.ae&&!aeKnown)return {matches:false,label:`${c.variant?'Версия '+c.variant+': ':''}AE ${env.ae} не подтверждён`};
    if(env.os&&!osKnown)return {matches:false,label:`${env.os==='macos'?'macOS':'Windows'}: совместимость уточняется`};
    return {matches:!!env.ae||!!env.os,label:env.ae?`AE ${env.ae}: поддержка ${c.variant||''} заявлена разработчиком${!env.os?' · ОС уточняется':''}`:c.label};
  }
  function syncWorkspace(){
    const ids=readBuild();
    document.querySelectorAll('[data-build-id]').forEach(b=>{const saved=ids.includes(b.dataset.buildId);b.setAttribute('aria-pressed',String(saved));b.classList.toggle('saved',saved);b.textContent=saved?'✓ В корзине':'＋ В корзину'});
    document.querySelectorAll('[data-build-count]').forEach(el=>el.textContent=ids.length);
    document.querySelectorAll('[data-build-summary]').forEach(el=>el.textContent=`В корзине: ${ids.length}`);
    document.querySelectorAll('[data-build-set]').forEach(b=>{const all=b.dataset.buildSet.split(' ').every(id=>ids.includes(id));b.textContent=all?'✓ Набор в корзине':'＋ Добавить набор в корзину';b.setAttribute('aria-pressed',String(all))});
    renderCart();
    document.querySelectorAll('[data-compat-id]').forEach(el=>{const state=compatibilityState(el.dataset.compatId);el.textContent=state.label;el.classList.toggle('compat-confirmed',state.matches)});
  }
  function saveBuild(ids){writeJson(BUILD_KEY,ids);syncWorkspace()}
  function renderCart(){
    const dialog=document.getElementById('cartDialog');if(!dialog)return;
    const ids=readBuild(),signature=ids.join('|');if(dialog.dataset.signature===signature)return;dialog.dataset.signature=signature;
    const list=dialog.querySelector('[data-cart-items]');list.replaceChildren();
    ids.forEach(id=>{
      const p=workspace.plugins.find(p=>p.id===id),row=document.createElement('article');row.className='cart-item';row.dataset.cartId=id;
      const art=document.createElement('a');art.className='cart-item-art';art.href='/plugin/'+encodeURIComponent(id);art.setAttribute('aria-label','Открыть '+p.name);
      if(p.image){const img=document.createElement('img');img.src=p.image;img.alt='';art.append(img)}else{art.textContent=p.name.split(/[ -]+/).map(w=>w[0]).join('').slice(0,3)}
      const info=document.createElement('div');info.className='cart-item-info';const name=document.createElement('a');name.href=art.href;name.textContent=p.name;const meta=document.createElement('span');meta.textContent=p.version;info.append(name,meta);
      const actions=document.createElement('div');actions.className='cart-item-actions';
      const download=document.createElement(p.status==='available'?'a':'button');download.className='cart-download';if(p.status==='available'){download.href='/download/'+encodeURIComponent(id);download.textContent=id==='flow'?'↓ Скачать 1.5.2':'↓ Скачать'}else{download.type='button';download.disabled=true;download.textContent='Обновляется'}
      const remove=document.createElement('button');remove.type='button';remove.className='cart-remove';remove.dataset.cartRemove=id;remove.textContent='×';remove.setAttribute('aria-label','Убрать '+p.name+' из корзины');actions.append(download,remove);row.append(art,info,actions);list.append(row);
    });
    dialog.querySelector('[data-cart-empty]').hidden=ids.length>0;dialog.querySelector('[data-cart-bottom]').hidden=!ids.length;
  }
  function initCart(){
    const dialog=document.getElementById('cartDialog');if(!dialog)return;let previous=null;
    function open(){if(dialog.open)return;previous=document.activeElement;renderCart();dialog.showModal();dialog.querySelector('[data-cart-close]').focus()}
    document.addEventListener('click',e=>{if(e.target.closest('[data-cart-open]'))open();if(e.target.closest('[data-cart-close]'))dialog.close();const remove=e.target.closest('[data-cart-remove]');if(remove){saveBuild(readBuild().filter(id=>id!==remove.dataset.cartRemove));const next=dialog.querySelector('.cart-remove')||dialog.querySelector('[data-cart-close]');next.focus()}});
    dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dialog.close()}});dialog.addEventListener('close',()=>previous?.focus({preventScroll:true}));
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
    if(new URLSearchParams(location.search).get('cart')==='1')open();
  }

  function initWorkspace(){
    syncWorkspace();
    document.addEventListener('click',e=>{
      const button=e.target.closest('[data-build-id]');if(button){const ids=readBuild(),id=button.dataset.buildId;saveBuild(ids.includes(id)?ids.filter(v=>v!==id):[...ids,id])}
      const set=e.target.closest('[data-build-set]');if(set)saveBuild([...new Set([...readBuild(),...set.dataset.buildSet.split(' ')])]);
      if(e.target.closest('[data-build-clear]'))saveBuild([]);
    });
    const ae=document.getElementById('myAeVersion'),os=document.getElementById('myOs'),only=document.getElementById('compatibleOnly');
    function syncEnv(){const env=readEnvironment();if(ae)ae.value=env.ae||'';if(os)os.value=env.os||'';if(only)only.checked=!!env.only;const label=document.querySelector('[data-environment-label]');if(label)label.textContent=[env.ae?'AE '+env.ae:'',env.os==='macos'?'macOS':env.os==='windows'?'Windows':''].filter(Boolean).join(' / ')||'Не выбрана';syncWorkspace()}
    [ae,os,only].filter(Boolean).forEach(el=>el.addEventListener('change',()=>{writeJson(ENV_KEY,{ae:ae.value,os:os.value,only:only.checked});syncEnv();filterCatalog()}));syncEnv();
    window.addEventListener('storage',e=>{if(e.key===BUILD_KEY||e.key===ENV_KEY){syncEnv();filterCatalog()}});
  }
  function initCommandPalette(){
    const dialog=document.getElementById('commandDialog'),input=document.getElementById('commandSearch'),results=document.getElementById('commandResults');if(!dialog)return;
    let previous=null,index=0;
    const actions=[['Каталог','/plugins','Все инструменты'],['Галерея','/gallery','Карта плагинов'],['Корзина плагинов','/plugins?cart=1','Выбранное для скачивания'],['Избранное','/plugins?favorites=1','Любимые плагины'],['Наборы','/collections','Инструменты по задачам'],['Рецепты эффектов','/recipes','Пошаговая практика'],['Установка','/install','Помощь с установкой'],['FAQ','/faq','Частые вопросы']];
    function render(){
      const words=input.value.toLowerCase().replace(/ё/g,'е').split(/\s+/).filter(w=>w&&!['хочу','сделать','нужно','надо','для','видео','плагин','как','на','и','с','в','чтобы','мне'].includes(w));
      const entries=[...actions.map(([name,href,description])=>({name,href,description})),...workspace.plugins.map(p=>({name:p.name,href:'/plugin/'+encodeURIComponent(p.id),description:p.category,search:p.description+' '+p.keywords}))].filter(item=>words.every(word=>(item.name+' '+item.description+' '+(item.search||'')).toLowerCase().replace(/ё/g,'е').includes(word))).slice(0,30);
      results.replaceChildren();index=0;
      entries.forEach(item=>{const a=document.createElement('a');a.href=item.href;const title=document.createElement('strong'),desc=document.createElement('span');title.textContent=item.name;desc.textContent=item.description;a.append(title,desc);results.append(a)});
      if(!entries.length){const p=document.createElement('p');p.textContent='Ничего не найдено. Попробуй другую задачу.';results.append(p)}mark();
    }
    function mark(){const links=[...results.querySelectorAll('a')];links.forEach((a,i)=>{a.classList.toggle('selected',i===index);if(i===index)a.scrollIntoView({block:'nearest'})})}
    function open(){if(dialog.open)return;previous=document.activeElement;dialog.showModal();input.value='';render();input.focus()}
    document.querySelectorAll('[data-command-open]').forEach(b=>b.addEventListener('click',open));
    dialog.querySelector('[data-command-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
    dialog.addEventListener('close',()=>previous?.focus());input.addEventListener('input',render);
    dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dialog.close();return}const links=[...results.querySelectorAll('a')];if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(links.length){index=(index+(e.key==='ArrowDown'?1:-1)+links.length)%links.length;mark()}}if(e.key==='Enter'&&e.target===input){e.preventDefault();links[index]?.click()}});
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();dialog.open?dialog.close():open()}});
  }

  function initEmptyParticles(){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
    document.querySelectorAll('[data-empty-particles]').forEach(canvas=>{
      const ctx=canvas.getContext('2d');if(!ctx)return;
      const width=360,height=210,dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=width*dpr;canvas.height=height*dpr;ctx.scale(dpr,dpr);
      const mask=document.createElement('canvas');mask.width=width;mask.height=height;const pen=mask.getContext('2d');pen.strokeStyle='white';pen.lineWidth=1.8;
      for(let row=0;row<3;row++)for(let col=0;col<3;col++){
        const x=59+col*84,y=19+row*58;pen.beginPath();pen.roundRect(x,y,72,46,6);pen.stroke();
        pen.beginPath();pen.moveTo(x+8,y+11);pen.lineTo(x+27,y+11);pen.moveTo(x+8,y+34);pen.lineTo(x+22,y+26);pen.lineTo(x+36,y+31);pen.lineTo(x+49,y+20);pen.lineTo(x+64,y+24);pen.stroke();
      }
      const data=pen.getImageData(0,0,width,height).data,points=[];
      for(let y=0;y<height;y+=3)for(let x=0;x<width;x+=3)if(data[(y*width+x)*4+3]>60)points.push({ox:x,oy:y,x,y,vx:0,vy:0,phase:x*.04+y*.06});
      canvas.dataset.particleCount=points.length;
      let pointer=null,frame=0,inView=false,last=0;
      function visible(){return inView&&!document.hidden&&!canvas.closest('[hidden]')&&canvas.getClientRects().length>0}
      function draw(time=0){
        ctx.clearRect(0,0,width,height);const moving=!reduced.matches&&fine.matches;
        points.forEach(p=>{
          let tx=p.ox,ty=p.oy;
          if(moving){ty+=Math.sin(time*.0007+p.phase)*1.4;if(pointer){tx+=(pointer.x-width/2)*.035;ty+=(pointer.y-height/2)*.025;const dx=p.ox-pointer.x,dy=p.oy-pointer.y,distance=Math.hypot(dx,dy);if(distance<78){const force=(1-distance/78)*28;tx+=dx/Math.max(distance,1)*force;ty+=dy/Math.max(distance,1)*force}}p.vx=(p.vx+(tx-p.x)*.055)*.76;p.vy=(p.vy+(ty-p.y)*.055)*.76;p.x+=p.vx;p.y+=p.vy}else{p.x=tx;p.y=ty}
          ctx.fillStyle=`rgba(150,139,235,${.3+(Math.sin(p.phase)+1)*.22})`;ctx.beginPath();ctx.arc(p.x,p.y,.85,0,Math.PI*2);ctx.fill();
        });
      }
      function tick(time){frame=0;if(!visible()){canvas.dataset.animating='false';return}if(time-last>28){draw(time);last=time}frame=requestAnimationFrame(tick)}
      function sync(){if(frame){cancelAnimationFrame(frame);frame=0}const animate=visible()&&!reduced.matches&&fine.matches;canvas.dataset.animating=String(animate);draw();if(animate)frame=requestAnimationFrame(tick)}
      canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)*width/r.width,y:(e.clientY-r.top)*height/r.height}});
      canvas.addEventListener('pointerleave',()=>pointer=null);
      const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync()},{threshold:.05});observer.observe(canvas);
      const parent=canvas.closest('.empty-state,.build-empty');if(parent)new MutationObserver(sync).observe(parent,{attributes:true,attributeFilter:['hidden']});
      document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);fine.addEventListener('change',sync);window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0});draw();
    });
  }

  function initMagneticBuild(){
    const handles=[...document.querySelectorAll('[data-build-drag]')];if(!handles.length)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');let gridVisible=false,footerVisible=false,hovering=false;
    const dock=document.createElement('div');dock.className='magnetic-build-dock';dock.hidden=true;dock.innerHTML='<span class="dock-symbol" aria-hidden="true">↓</span><div><strong>Перетащи плагин сюда</strong><span class="dock-instruction">Корзина плагинов · выбрано: <span data-build-count>0</span></span></div><button type="button" class="dock-open" data-cart-open>Открыть корзину →</button>';document.body.append(dock);
    const status=document.createElement('div');status.className='build-drag-status';status.setAttribute('role','status');status.hidden=true;document.body.append(status);
    let drag=null,ghost=null,base=null,statusTimer=0,suppressClickUntil=0;
    function syncDock(){dock.hidden=!fine.matches||(!drag?.active&&!hovering&&(!gridVisible||footerVisible));if(!drag?.active){dock.style.setProperty('--magnet-x','0px');dock.style.setProperty('--magnet-y','0px');dock.querySelector('strong').textContent='Перетащи плагин сюда';dock.querySelector('.dock-instruction').innerHTML='Корзина плагинов · выбрано: <span data-build-count>'+readBuild().length+'</span>'}}
    const footer=document.querySelector('.footer');if(footer)new IntersectionObserver(entries=>{footerVisible=entries[0].isIntersecting;syncDock()},{threshold:0}).observe(footer);
    const grid=document.getElementById('pluginsGrid');if(grid)new IntersectionObserver(entries=>{gridVisible=entries[0].isIntersecting;syncDock()},{threshold:0}).observe(grid);fine.addEventListener('change',()=>{finish(null,true);syncDock()});
    function notify(name){clearTimeout(statusTimer);status.textContent=`${name} добавлен в корзину`;status.hidden=false;statusTimer=setTimeout(()=>status.hidden=true,2400)}
    function start(e,button){
      if(e.button!==0||e.pointerType==='touch')return;
      const plugin=workspace.plugins.find(p=>p.id===button.dataset.buildDrag);if(!plugin)return;
      drag={id:e.pointerId,button,plugin,startX:e.clientX,startY:e.clientY,active:false,hit:false};button.setPointerCapture(e.pointerId);
    }
    function activate(){
      drag.active=true;drag.button.classList.add('is-dragging');dock.classList.add('is-drag-active');dock.querySelector('strong').textContent='Отпусти плагин в корзину';document.body.classList.add('build-is-dragging');dock.hidden=false;dock.style.setProperty('--magnet-x','0px');dock.style.setProperty('--magnet-y','0px');base=dock.getBoundingClientRect();
      ghost=document.createElement('div');ghost.className='build-drag-ghost';ghost.setAttribute('aria-hidden','true');
      if(drag.plugin.image){const img=document.createElement('img');img.src=drag.plugin.image;img.alt='';ghost.append(img)}
      const text=document.createElement('div'),name=document.createElement('strong'),hint=document.createElement('span');name.textContent=drag.plugin.name;hint.textContent='В корзину';text.append(name,hint);ghost.append(text);document.body.append(ghost);
    }
    function move(e){
      if(!drag||e.pointerId!==drag.id)return;
      if(!drag.active&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<7)return;
      e.preventDefault();if(!drag.active)activate();
      ghost.style.transform=`translate3d(${Math.max(8,Math.min(innerWidth-204,e.clientX+18))}px,${Math.max(8,Math.min(innerHeight-80,e.clientY+18))}px,0)`;
      const dx=e.clientX-(base.left+base.width/2),dy=e.clientY-(base.top+base.height/2),near=Math.hypot(dx,dy)<230;
      dock.style.setProperty('--magnet-x',(!reduced.matches&&near?Math.max(-22,Math.min(22,dx*.12)):0)+'px');dock.style.setProperty('--magnet-y',(!reduced.matches&&near?Math.max(-16,Math.min(16,dy*.1)):0)+'px');
      const r=dock.getBoundingClientRect();drag.hit=e.clientX>=r.left-18&&e.clientX<=r.right+18&&e.clientY>=r.top-18&&e.clientY<=r.bottom+18;
      dock.classList.toggle('is-ready',drag.hit);dock.querySelector('.dock-instruction').textContent=drag.hit?'Отпусти — добавим в корзину':'Отпусти здесь, чтобы добавить';
    }
    function finish(e,cancelled=false){
      if(!drag||e&&e.pointerId!==drag.id)return;
      const current=drag;drag=null;if(current.active)suppressClickUntil=performance.now()+400;
      if(current.active&&!cancelled&&current.hit){saveBuild([...new Set([...readBuild(),current.plugin.id])]);notify(current.plugin.name);const count=document.querySelector('[data-build-count]');if(count&&!reduced.matches)count.animate([{transform:'scale(1)'},{transform:'scale(1.6)'},{transform:'scale(1)'}],{duration:350})}
      current.button.classList.remove('is-dragging');if(current.button.hasPointerCapture(current.id))current.button.releasePointerCapture(current.id);ghost?.remove();ghost=null;dock.classList.remove('is-ready','is-drag-active');document.body.classList.remove('build-is-dragging');syncDock();
    }
    handles.forEach(button=>{
      button.addEventListener('pointerenter',()=>{hovering=true;syncDock()});button.addEventListener('pointerleave',()=>{hovering=false;syncDock()});
      button.addEventListener('pointerdown',e=>start(e,button));button.addEventListener('pointermove',move);button.addEventListener('pointerup',e=>finish(e));button.addEventListener('pointercancel',e=>finish(e,true));button.addEventListener('lostpointercapture',e=>finish(e,true));
      button.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();finish(null,true)}});
      button.addEventListener('click',e=>{e.preventDefault();if(performance.now()<suppressClickUntil)return;const plugin=workspace.plugins.find(p=>p.id===button.dataset.buildDrag);saveBuild([...new Set([...readBuild(),plugin.id])]);notify(plugin.name);syncDock()});
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){e.preventDefault();finish(null,true)}});window.addEventListener('blur',()=>finish(null,true));window.addEventListener('resize',()=>finish(null,true));window.addEventListener('pagehide',()=>finish(null,true));document.addEventListener('visibilitychange',()=>{if(document.hidden)finish(null,true)});
  }

  function initCardTilt(){
    const cards=[...document.querySelectorAll('.plugin-card,.gallery-card')];if(!cards.length)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));let hovered=null,frame=0,pending=null,sensorOn=false,baseline=null;
    const visibleCards=new Set();
    function reset(card){card.style.setProperty('--card-rx','0deg');card.style.setProperty('--card-ry','0deg');card.style.setProperty('--card-px','0px');card.style.setProperty('--card-py','0px');card.classList.remove('card-tilting')}
    function paint(card,x,y){if(reduced.matches||document.body.classList.contains('build-is-dragging'))return;const limit=card.classList.contains('gallery-card')?3.2:4.5;card.style.setProperty('--card-rx',(-y*limit).toFixed(2)+'deg');card.style.setProperty('--card-ry',(x*limit).toFixed(2)+'deg');card.style.setProperty('--card-px',(x*3).toFixed(2)+'px');card.style.setProperty('--card-py',(y*3).toFixed(2)+'px');card.style.setProperty('--card-light-x',((x+1)*50).toFixed(1)+'%');card.style.setProperty('--card-light-y',((y+1)*50).toFixed(1)+'%');card.classList.add('card-tilting')}
    function queue(card,x,y){pending={card,x,y};if(!frame)frame=requestAnimationFrame(()=>{frame=0;const value=pending;pending=null;if(value)paint(value.card,value.x,value.y)})}
    function clear(){cancelAnimationFrame(frame);frame=0;pending=null;hovered=null;cards.forEach(reset)}
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)visibleCards.add(entry.target);else{visibleCards.delete(entry.target);reset(entry.target)}}),{threshold:.1});
    cards.forEach(card=>{
      card.classList.add('tilt-ready');observer.observe(card);let rect=null;
      card.addEventListener('animationend',e=>{if(e.target===card&&e.animationName==='aeReveal'){card.style.animation='none';card.style.opacity='1';card.style.filter='none'}});
      card.addEventListener('pointerenter',e=>{if(e.pointerType!=='mouse'||e.buttons||reduced.matches)return;rect=card.getBoundingClientRect();hovered=card});
      card.addEventListener('pointermove',e=>{if(reduced.matches||(e.pointerType==='mouse'&&e.buttons)||document.body.classList.contains('build-is-dragging'))return;if(e.pointerType==='mouse'){if(!rect)rect=card.getBoundingClientRect();hovered=card}else if(!card.classList.contains('gallery-card')){if(!rect)rect=card.getBoundingClientRect()}else return;queue(card,clamp((e.clientX-rect.left)/rect.width*2-1,-1,1),clamp((e.clientY-rect.top)/rect.height*2-1,-1,1))});
      card.addEventListener('pointerleave',()=>{if(pending?.card===card){cancelAnimationFrame(frame);frame=0;pending=null}if(hovered===card)hovered=null;rect=null;reset(card)});
      card.addEventListener('pointerdown',e=>{rect=card.getBoundingClientRect();reset(card);cancelAnimationFrame(frame);frame=0;pending=null;if(e.pointerType==='touch'&&!card.classList.contains('gallery-card'))queue(card,clamp((e.clientX-rect.left)/rect.width*2-1,-1,1),clamp((e.clientY-rect.top)/rect.height*2-1,-1,1))});
      ['pointerup','pointercancel','lostpointercapture','blur'].forEach(type=>card.addEventListener(type,()=>reset(card)));
    });
    const controls=document.querySelector('.catalog-controls');let button=null,status=null;
    function orientation(e){if(!sensorOn||document.hidden||reduced.matches||!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;if(!baseline)baseline={beta:e.beta,gamma:e.gamma};let x=clamp((e.gamma-baseline.gamma)/20,-1,1),y=clamp((e.beta-baseline.beta)/20,-1,1);const angle=screen.orientation?.angle||0;if(angle===90)[x,y]=[y,-x];if(angle===270)[x,y]=[-y,x];visibleCards.forEach(card=>{if((!fine.matches||card!==hovered)&&!card.closest('[hidden]')&&!card.hidden)paint(card,x,y)})}
    function stopSensor(){sensorOn=false;baseline=null;window.removeEventListener('deviceorientation',orientation);if(button){button.setAttribute('aria-pressed','false');button.textContent='Наклон от движения телефона'}clear()}
    if(controls&&window.isSecureContext&&'DeviceOrientationEvent' in window&&!fine.matches){
      button=document.createElement('button');button.type='button';button.className='card-motion-toggle';button.setAttribute('aria-pressed','false');button.textContent='Наклон от движения телефона';button.hidden=reduced.matches;controls.append(button);
      status=document.createElement('span');status.className='card-motion-status';status.setAttribute('role','status');status.hidden=true;controls.append(status);
      button.addEventListener('click',async()=>{if(sensorOn){stopSensor();status.hidden=true;return}try{if(typeof DeviceOrientationEvent.requestPermission==='function'){const permission=await DeviceOrientationEvent.requestPermission();if(permission!=='granted'){status.hidden=false;status.textContent='Доступ к движению не разрешён. Наклон от касания остаётся доступен.';return}}if(reduced.matches)return;sensorOn=true;baseline=null;window.addEventListener('deviceorientation',orientation,{passive:true});button.setAttribute('aria-pressed','true');button.textContent='Наклон от движения включён';status.hidden=false;status.textContent='Слегка наклони телефон. Первое положение считается ровным.'}catch{status.hidden=false;status.textContent='Движение недоступно в этом браузере. Карточки реагируют на касание.'}});
    }
    window.addEventListener('scroll',()=>{if(!sensorOn&&fine.matches)clear()}, {passive:true});window.addEventListener('blur',clear);window.addEventListener('resize',()=>{baseline=null;clear()});window.addEventListener('pagehide',stopSensor);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();else baseline=null});reduced.addEventListener('change',()=>{if(reduced.matches)stopSensor();if(button)button.hidden=reduced.matches});
    // Dragging into the basket and panning the gallery take priority over decorative tilt.
    new MutationObserver(()=>{if(document.body.classList.contains('build-is-dragging'))clear()}).observe(document.body,{attributes:true,attributeFilter:['class']});
  }

  function initEvents(){
    $('#themeToggle')?.addEventListener('click',()=>{const d=!document.documentElement.classList.contains('dark-mode');applyTheme(d);localStorage.setItem(THEME_KEY,d?'dark':'light')});
    $('#menuToggle')?.addEventListener('click',()=>$('#navLinks')?.classList.toggle('open'));
    document.addEventListener('click',e=>{const b=e.target.closest('.favorite-btn[data-id]');if(b){e.preventDefault();toggleFavorite(b.dataset.id)}});
    const top=$('#backToTop');window.addEventListener('scroll',()=>top?.classList.toggle('show',window.scrollY>500));top?.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
  }
  document.addEventListener('DOMContentLoaded',()=>{injectUiFixes();initTheme();initWorkspace();initCart();initCommandPalette();initEmptyParticles();initMagneticBuild();initHeroPlayground();initSpider();initPluginGallery();initCardTilt();initVisits();initEvents();syncFavoriteUI();initFlowVersionSelector();initDownloads();initButtonGlow();initPluginReport();initVideoComparisons();if(page==='plugins'){initCatalog();initSortMenu();initTaskSearch()}setupReveals()});
})();
