(function(){
  const FAVORITES_KEY='aePluginFavorites';
  const THEME_KEY='theme';
  const VISITS_KEY='aeSiteVisits';
  const EDIT_SUBMISSIONS_KEY='aeEditSubmissions';
  const page=document.body.dataset.page||'home';
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));

  function injectUiFixes(){
    if($('#uiFixes')) return;
    const style=document.createElement('style');
    style.id='uiFixes';
    style.textContent=`
      .hero-grid,.page-hero-home,.page-hero-home .container{overflow:visible!important}
      .stable-visual{height:500px!important;min-height:500px!important;overflow:visible!important;contain:layout!important;padding:56px!important;margin:-56px!important;isolation:isolate}
      .visual-float-ae{left:6%!important;top:10%!important;z-index:3}.visual-float-plugin{right:5%!important;top:18%!important;z-index:2}.visual-float-download{left:43%!important;bottom:7%!important;z-index:1}
      .visual-element{box-shadow:0 34px 95px rgba(99,102,241,.48)!important}.visual-element:hover{box-shadow:0 44px 110px rgba(99,102,241,.58)!important}
      .plugin-detail-content .hero-actions{align-items:center!important;gap:14px!important}
      .plugin-detail-content .hero-actions .btn.favorite-btn,.hero-actions .btn.favorite-btn{width:auto!important;min-width:168px!important;height:auto!important;min-height:52px!important;padding:14px 18px!important;border-radius:16px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:10px!important;flex:0 0 auto!important;white-space:nowrap!important;line-height:1!important;font-size:.96rem!important;background:var(--surface)!important;color:var(--text)!important;border-color:var(--border)!important;box-shadow:var(--shadow-soft)!important}
      .plugin-detail-content .hero-actions .btn.favorite-btn i,.hero-actions .btn.favorite-btn i{width:auto!important;height:auto!important;margin:0!important;line-height:1!important}
      .plugin-detail-content .hero-actions .btn.favorite-btn.active,.hero-actions .btn.favorite-btn.active{color:#ef4444!important;background:rgba(239,68,68,.12)!important;border-color:rgba(239,68,68,.28)!important}
      .plugin-detail-content .hero-actions .btn.favorite-btn:hover,.hero-actions .btn.favorite-btn:hover{transform:translateY(-2px)!important;box-shadow:var(--shadow)!important}
      .version-selector{margin:22px 0 4px;border:1px solid var(--border);border-radius:20px;background:var(--surface);box-shadow:var(--shadow-soft);max-width:560px;overflow:hidden}
      .version-selector summary{list-style:none;cursor:pointer;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;font-weight:900;color:var(--text)}
      .version-selector summary::-webkit-details-marker{display:none}.version-selector summary span{display:flex;align-items:center;gap:10px}.version-selector summary .chevron{transition:transform .2s ease}.version-selector[open] summary .chevron{transform:rotate(180deg)}
      .version-selector-body{padding:0 18px 18px}.version-selector-list{display:flex;flex-wrap:wrap;gap:10px}.version-option{border:1px solid var(--border);background:var(--surface-2);color:var(--text);border-radius:14px;padding:12px 14px;font-weight:900;display:inline-flex;align-items:center;gap:8px;transition:var(--transition);text-decoration:none}
      .version-option.active{background:linear-gradient(135deg,var(--primary),#8b5cf6);border-color:transparent;color:#fff}.version-option:hover{transform:translateY(-2px);box-shadow:var(--shadow-soft)}.version-note{margin-top:12px;color:var(--muted);font-size:.9rem;font-weight:700}
      @media(max-width:900px){.stable-visual{height:390px!important;min-height:390px!important;padding:38px!important;margin:-38px!important}.visual-float-ae{left:4%!important;top:9%!important}.visual-float-plugin{right:4%!important;top:19%!important}.visual-float-download{left:40%!important;bottom:5%!important}.ae-card{width:164px!important;height:164px!important}.visual-element{width:122px!important;height:122px!important}.plugin-detail-content .hero-actions .btn.favorite-btn,.hero-actions .btn.favorite-btn{min-width:156px!important;min-height:50px!important}.version-selector-list{flex-direction:column}.version-option{justify-content:center;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch(e){return fallback}}
  function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function getFavorites(){return readJson(FAVORITES_KEY,[])}
  function saveFavorites(items){writeJson(FAVORITES_KEY,items)}

  function syncFavoriteUI(){
    const favorites=getFavorites();
    $$('#favoriteCount').forEach(el=>el.textContent=favorites.length);
    $$('.favorite-btn[data-id]').forEach(btn=>{
      const active=favorites.includes(btn.dataset.id);
      const isWide=btn.classList.contains('btn');
      btn.classList.toggle('active',active);
      btn.innerHTML=active?`<i class="fas fa-heart"></i>${isWide?' В избранном':''}`:`<i class="far fa-heart"></i>${isWide?' В избранное':''}`;
      btn.title=active?'Убрать из избранного':'В избранное';
    });
  }

  function toggleFavorite(id){
    const favorites=getFavorites();
    const index=favorites.indexOf(id);
    if(index>=0) favorites.splice(index,1); else favorites.push(id);
    saveFavorites(favorites);
    syncFavoriteUI();
    filterCatalog();
  }

  function applyTheme(isDark){
    document.documentElement.classList.toggle('dark-mode',isDark);
    document.documentElement.classList.toggle('light-mode',!isDark);
    document.body.classList.toggle('dark-mode',isDark);
    document.body.classList.toggle('light-mode',!isDark);
    const icon=$('#themeToggle i');
    if(icon) icon.className=isDark?'fas fa-sun':'fas fa-moon';
  }

  function initTheme(){const saved=localStorage.getItem(THEME_KEY);applyTheme(saved?saved==='dark':true)}
  function initVisits(){
    const visits=readJson(VISITS_KEY,{});
    visits.total=(visits.total||0)+1;
    visits[page]=(visits[page]||0)+1;
    writeJson(VISITS_KEY,visits);
    $$('#localVisitCount').forEach(el=>el.textContent=visits.total);
  }

  function setupReveals(){
    const items=$$('.reveal:not(.revealed)');
    if(!('IntersectionObserver' in window)){items.forEach(item=>item.classList.add('revealed'));return}
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target)}})},{threshold:.08});
    items.forEach(item=>observer.observe(item));
  }

  function cardText(card){return [card.dataset.name||'',card.textContent||''].join(' ').toLowerCase()}
  function sortCards(cards,sort){
    return cards.sort((a,b)=>{
      const an=a.dataset.name||'',bn=b.dataset.name||'';
      if(sort==='az') return an.localeCompare(bn,'ru');
      if(sort==='available') return Number(b.dataset.status==='available')-Number(a.dataset.status==='available')||an.localeCompare(bn,'ru');
      if(sort==='size') return Number(a.dataset.size||0)-Number(b.dataset.size||0);
      if(sort==='new') return Number(/нов/i.test(b.textContent))-Number(/нов/i.test(a.textContent))||an.localeCompare(bn,'ru');
      return Number(/популяр/i.test(b.textContent))-Number(/популяр/i.test(a.textContent))||Number(b.dataset.status==='available')-Number(a.dataset.status==='available')||an.localeCompare(bn,'ru');
    });
  }

  function filterCatalog(){
    const grid=$('#pluginsGrid');
    if(!grid) return;
    const cards=$$('[data-plugin-card]',grid);
    const query=($('#pluginSearch')?.value||'').trim().toLowerCase();
    const active=$('#categoryFilters .filter-btn.active')?.dataset.category||'all';
    const onlyFavorites=$('#favoritesOnly')?.classList.contains('active');
    const favorites=getFavorites();
    let visible=0;
    cards.forEach(card=>{
      const okCategory=active==='all'||card.dataset.category===active;
      const okSearch=!query||cardText(card).includes(query);
      const okFavorite=!onlyFavorites||favorites.includes(card.dataset.id);
      const show=okCategory&&okSearch&&okFavorite;
      card.style.display=show?'':'none';
      card.hidden=!show;
      if(show) visible++;
    });
    sortCards(cards,$('#sortPlugins')?.value||'popular').forEach(card=>grid.appendChild(card));
    const result=$('#resultCount');if(result) result.textContent=`Найдено: ${visible}`;
    const label=$('#activeFilterLabel');if(label) label.textContent=($('#categoryFilters .filter-btn.active')?.textContent||'Все категории')+(onlyFavorites?' · избранное':'');
    const empty=$('#emptyState');if(empty) empty.hidden=visible!==0;
  }

  function initCatalog(){
    const params=new URLSearchParams(location.search);
    if(params.get('favorites')==='1') $('#favoritesOnly')?.classList.add('active');
    document.addEventListener('input',event=>{if(event.target&&event.target.id==='pluginSearch') filterCatalog()});
    $('#pluginSearch')?.addEventListener('keyup',filterCatalog);
    $('#clearSearch')?.addEventListener('click',()=>{const input=$('#pluginSearch');if(input){input.value='';input.focus()}filterCatalog()});
    $('#sortPlugins')?.addEventListener('change',filterCatalog);
    $('#favoritesOnly')?.addEventListener('click',()=>{$('#favoritesOnly')?.classList.toggle('active');filterCatalog()});
    $('#categoryFilters')?.addEventListener('click',event=>{const button=event.target.closest('.filter-btn');if(!button)return;$$('.filter-btn',$('#categoryFilters')).forEach(item=>item.classList.remove('active'));button.classList.add('active');filterCatalog()});
    filterCatalog();
  }

  function initCommunity(){
    const grid=$('#communityGrid');if(!grid)return;
    function apply(){
      const query=($('#editSearch')?.value||'').trim().toLowerCase();
      const active=$('#editFilters .filter-btn.active')?.dataset.platform||'all';
      let visible=0;
      $$('.edit-card',grid).forEach(card=>{const text=card.textContent.toLowerCase();const platform=text.includes('tiktok')?'tiktok':text.includes('youtube')?'youtube':'video';const show=(active==='all'||platform===active)&&(!query||text.includes(query));card.hidden=!show;if(show)visible++});
      const count=$('#editCount');if(count)count.textContent=`Работ: ${visible}`;const empty=$('#communityEmpty');if(empty)empty.hidden=visible!==0;
    }
    document.addEventListener('input',event=>{if(event.target&&event.target.id==='editSearch') apply()});
    $('#clearEditSearch')?.addEventListener('click',()=>{const input=$('#editSearch');if(input){input.value='';input.focus()}apply()});
    $('#editFilters')?.addEventListener('click',event=>{const button=event.target.closest('.filter-btn');if(!button)return;$$('.filter-btn',$('#editFilters')).forEach(item=>item.classList.remove('active'));button.classList.add('active');apply()});
    apply();
  }

  function escapeHtml(value){return String(value||'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
  function readSubmissions(){return readJson(EDIT_SUBMISSIONS_KEY,[])}
  function renderSubmissions(){
    const grid=$('#mySubmissionsGrid');if(!grid)return;
    const list=readSubmissions();
    grid.innerHTML=list.map(item=>`<article class="edit-card revealed"><div class="edit-body"><div class="badge-stack"><span class="pending-badge"><i class="fas fa-clock"></i> На проверке</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description||'Пользовательская работа After Effects.')}</p><div class="edit-meta"><span><i class="fas fa-user"></i> ${escapeHtml(item.author)}</span>${item.plugins?`<span><i class="fas fa-plug"></i> ${escapeHtml(item.plugins)}</span>`:''}</div></div><div class="edit-actions"><a class="details-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener"><i class="fas fa-up-right-from-square"></i> Открыть</a></div></article>`).join('');
    const empty=$('#mySubmissionsEmpty');if(empty)empty.hidden=list.length!==0;
  }
  function initSubmit(){renderSubmissions();$('#editSubmitForm')?.addEventListener('submit',event=>{event.preventDefault();const item={id:'local-'+Date.now(),url:$('#editUrl')?.value||'',title:$('#editTitle')?.value||'Без названия',author:$('#editAuthor')?.value||'Автор',plugins:$('#editPlugins')?.value||'',description:$('#editDescription')?.value||'',created:new Date().toISOString()};const list=readSubmissions();list.unshift(item);writeJson(EDIT_SUBMISSIONS_KEY,list);event.target.reset();renderSubmissions()})}

  function initFlowVersionSelector(){
    if(location.pathname!=='/plugin/flow') return;
    const actions=$('.plugin-detail-content .hero-actions');
    const downloadBtn=$('.plugin-detail-content .hero-actions .btn-primary');
    if(!actions||!downloadBtn||$('#flowVersionSelector')) return;
    const box=document.createElement('details');
    box.id='flowVersionSelector';
    box.className='version-selector reveal revealed';
    box.innerHTML=`<summary><span><i class="fas fa-code-branch"></i> Выбрать версию Flow</span><i class="fas fa-chevron-down chevron"></i></summary><div class="version-selector-body"><div class="version-selector-list"><a class="version-option" href="/download/flow?version=v141" target="_blank" rel="noopener"><i class="fas fa-download"></i> Скачать v1.4.1</a><a class="version-option active" href="/download/flow" target="_blank" rel="noopener"><i class="fas fa-check-circle"></i> Скачать v1.5.2</a></div><div class="version-note">Нажми на нужную версию. Основная кнопка скачивания ведёт на Flow v1.5.2.</div></div>`;
    actions.parentNode.insertBefore(box,actions);
    downloadBtn.innerHTML='<i class="fas fa-download"></i> Скачать v1.5.2';
  }

  function initEvents(){
    $('#themeToggle')?.addEventListener('click',()=>{const dark=!document.documentElement.classList.contains('dark-mode');applyTheme(dark);localStorage.setItem(THEME_KEY,dark?'dark':'light')});
    $('#menuToggle')?.addEventListener('click',()=>$('#navLinks')?.classList.toggle('open'));
    document.addEventListener('click',event=>{const button=event.target.closest('.favorite-btn[data-id]');if(!button)return;event.preventDefault();toggleFavorite(button.dataset.id)});
    const top=$('#backToTop');window.addEventListener('scroll',()=>top?.classList.toggle('show',window.scrollY>500));top?.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
  }

  document.addEventListener('DOMContentLoaded',()=>{
    injectUiFixes();initTheme();initVisits();initEvents();syncFavoriteUI();initFlowVersionSelector();
    if(page==='plugins') initCatalog();
    if(page==='community') initCommunity();
    if(page==='submit') initSubmit();
    setupReveals();
  });
})();
