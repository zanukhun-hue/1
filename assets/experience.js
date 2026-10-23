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
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting && !reduced.matches) entry.target.classList.add('is-melting');
      else entry.target.classList.remove('is-melting');
    }), {threshold:.6});
    titles.forEach(title=>observer.observe(title));
  }
  const friends = document.querySelector('.ae-friends');
  let eyeFrame = 0;
  let eyes = {x:0,y:0};
  friends?.addEventListener('pointermove',event=>{
    if (reduced.matches) return;
    const rect = friends.getBoundingClientRect();
    eyes = {x:((event.clientX-rect.left)/rect.width-.5)*18,y:((event.clientY-rect.top)/rect.height-.5)*20};
    if (!eyeFrame) eyeFrame = requestAnimationFrame(()=>{
      friends.style.setProperty('--eye-x',`${eyes.x}px`);
      friends.style.setProperty('--eye-y',`${eyes.y}px`);
      eyeFrame = 0;
    });
  });
  friends?.addEventListener('pointerleave',()=>{friends.style.setProperty('--eye-x','0px');friends.style.setProperty('--eye-y','0px');});
  // Stop CSS timelines outside the viewport as well as in background tabs.
  const motion = [...document.querySelectorAll('.ae-friends,.ae-emblem-stage,.ae-preset-preview')];
  const visible = new Set();
  function syncMotion() {
    motion.forEach(el=>el.querySelectorAll('.ae-friend,.ae-eye,.ae-emblem,.ae-type-play>span').forEach(child=>{
      child.style.animationPlayState = visible.has(el) && !document.hidden ? 'running' : 'paused';
    }));
  }
  if ('IntersectionObserver' in window) {
    const watcher = new IntersectionObserver(entries=>{entries.forEach(entry=>entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target));syncMotion();},{rootMargin:'80px'});
    motion.forEach(el=>watcher.observe(el));
  }
  document.addEventListener('visibilitychange',syncMotion);
})();
