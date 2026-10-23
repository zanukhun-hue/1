(() => {
  'use strict';
  const header = document.querySelector('.ae-header');
  const menu = document.querySelector('#aeMenu');
  const toggle = document.querySelector('#aeMenuToggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const updateHeader = () => header?.classList.toggle('is-condensed', scrollY > 180);
  updateHeader();
  addEventListener('scroll', updateHeader, {passive:true});
  function closeMenu() { menu?.close(); }
  toggle?.addEventListener('click', () => {
    if (!menu) return;
    if (menu.open) closeMenu();
    else {menu.showModal(); document.body.classList.add('ae-menu-open'); toggle.setAttribute('aria-expanded','true');}
  });
  menu?.querySelector('[data-menu-close]')?.addEventListener('click', closeMenu);
  menu?.addEventListener('click', event => {
    if (event.target === menu) {
      const r = menu.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeMenu();
    }
    if (event.target.closest('a,[data-cart-open],[data-command-open]')) closeMenu();
  });
  menu?.addEventListener('close', () => {
    document.body.classList.remove('ae-menu-open');
    toggle?.setAttribute('aria-expanded','false');
    toggle?.focus({preventScroll:true});
  });
  const titles = [...document.querySelectorAll('[data-fluid-title]')];
  const pendingTitles = new Set(titles);
  let titleFrame = 0;
  function resolveTitle(title) {
    title.dataset.titleRevealed = 'true';
    title.style.removeProperty('filter');
    title.style.removeProperty('opacity');
    title.style.removeProperty('transform');
    pendingTitles.delete(title);
  }
  function updateTitles() {
    titleFrame = 0;
    const viewport = innerHeight;
    pendingTitles.forEach(title => {
      if (reduced.matches) return resolveTitle(title);
      const top = title.getBoundingClientRect().top;
      if (top > viewport) return;
      const progress = Math.min(1, Math.max(0, (viewport - top + 25) / 180));
      const remaining = (1-progress) ** 2;
      if (progress >= 1) return resolveTitle(title);
      title.style.filter = `blur(${(9*remaining).toFixed(2)}px)`;
      title.style.opacity = String(1-.28*remaining);
      title.style.transform = `scaleY(${(1-.08*remaining).toFixed(3)}) skewX(${(-3*remaining).toFixed(2)}deg)`;
    });
  }
  function queueTitles() { if (!titleFrame && pendingTitles.size) titleFrame = requestAnimationFrame(updateTitles); }
  addEventListener('scroll',queueTitles,{passive:true});
  addEventListener('resize',queueTitles,{passive:true});
  addEventListener('pageshow',queueTitles);
  document.fonts?.ready.then(queueTitles);
  reduced.addEventListener('change',()=>{document.documentElement.classList.toggle('ae-motion-enabled',!reduced.matches);queueTitles();});
  updateTitles();
  // Stop CSS timelines outside the viewport as well as in background tabs.
  const motion = [...document.querySelectorAll('.ae-preset-objects,.ae-preset-preview')];
  const visible = new Set();
  function syncMotion() {
    motion.forEach(el=>el.querySelectorAll('.ae-preset-file,.ae-keyframe-panel,.ae-curve-dot,.ae-playhead,.ae-type-play>span').forEach(child=>{
      child.style.animationPlayState = visible.has(el) && !document.hidden ? 'running' : 'paused';
    }));
  }
  if ('IntersectionObserver' in window) {
    const watcher = new IntersectionObserver(entries=>{entries.forEach(entry=>entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target));syncMotion();},{rootMargin:'80px'});
    motion.forEach(el=>watcher.observe(el));
  }
  document.addEventListener('visibilitychange',syncMotion);
})();
