/* No canvas or downloaded models: each cover remains a real, accessible link. */
(() => {
  'use strict';
  const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const tau = Math.PI * 2;
  const angleMix = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const instances = [];

  class CoverOrbit {
    constructor(stage) {
      this.stage = stage;
      this.world = stage.querySelector('.ae-orbit-world');
      this.tiles = [...stage.querySelectorAll('.ae-orbit-tile')];
      if (!this.world || !this.tiles.length) return;
      this.hero = stage.dataset.variant === 'hero';
      this.visible = false;
      this.hovered = null;
      this.focused = null;
      this.frame = 0;
      this.last = 0;
      this.yaw = -.62;
      this.pitch = -.22;
      this.userYaw = 0;
      this.userPitch = 0;
      this.pointerX = 0;
      this.pointerY = 0;
      this.parallaxX = 0;
      this.parallaxY = 0;
      this.morph = 0;
      this.targetMorph = 0;
      this.drag = null;
      this.cancelClick = false;
      this.width = this.height = 0;
      this.points = this.tiles.map((tile, i) => this.makePoint(tile, i));
      this.animate = this.animate.bind(this);
      this.measure = this.measure.bind(this);
      this.refreshProgress = this.refreshProgress.bind(this);
      this.resizeObserver = new ResizeObserver(this.measure);
      this.resizeObserver.observe(stage);
      this.intersectionObserver = new IntersectionObserver(entries => {
        this.visible = entries[0].isIntersecting;
        if (this.visible) {
          this.refreshProgress();
          this.wake();
        } else {
          cancelAnimationFrame(this.frame);
          this.frame = 0;
          this.last = 0;
        }
      }, { rootMargin: '100px' });
      this.intersectionObserver.observe(stage);
      this.bindEvents();
      this.measure();
      stage.classList.add('is-ready');
      instances.push(this);
    }

    makePoint(tile, i) {
      // Four tightly tiled covers per face keep the volume intact throughout
      // the morph. Projecting the cube onto a sphere preserves neighbours;
      // interpolating to unrelated Fibonacci points makes cards fly apart.
      const face = Math.floor(i / 4) % 6;
      const slot = i % 4;
      const u = slot % 2 ? .5 : -.5;
      const v = slot < 2 ? -.46 : .46;
      let cube, cubeYaw = 0, cubePitch = 0;
      if (face === 0) cube = [u, v, 1];
      if (face === 1) { cube = [1, v, -u]; cubeYaw = Math.PI / 2; }
      if (face === 2) { cube = [-u, v, -1]; cubeYaw = Math.PI; }
      if (face === 3) { cube = [-1, v, u]; cubeYaw = -Math.PI / 2; }
      if (face === 4) { cube = [u, -1, v]; cubePitch = Math.PI / 2; }
      if (face === 5) { cube = [u, 1, -v]; cubePitch = -Math.PI / 2; }
      const length = Math.hypot(...cube);
      const sphere = cube.map(axis => axis / length);
      tile.draggable = false;
      tile.querySelector('img')?.setAttribute('draggable', 'false');
      return {
        tile, cube, sphere, cubeYaw, cubePitch,
        sphereYaw: Math.atan2(sphere[0], sphere[2]),
        spherePitch: -Math.asin(sphere[1]),
        yaw: cubeYaw, pitch: cubePitch, lift: 0
      };
    }

    measure() {
      const width = this.stage.clientWidth;
      const height = this.stage.clientHeight;
      if (!width || !height) return;
      this.width = width;
      this.height = height;
      // The front-most cards enlarge naturally in the camera's perspective.
      this.radius = Math.min(width * .29, height * .30, this.hero ? 118 : 205);
      this.cardWidth = this.radius * 1.03;
      this.cardHeight = this.radius * .95;
      this.stage.style.setProperty('--orbit-card-width', `${this.cardWidth.toFixed(1)}px`);
      this.stage.style.setProperty('--orbit-card-height', `${this.cardHeight.toFixed(1)}px`);
      this.refreshProgress();
      this.draw();
      this.wake();
    }

    refreshProgress() {
      if (!this.visible && this.width) return;
      const rect = this.stage.getBoundingClientRect();
      const viewport = window.innerHeight;
      const progress = clamp((viewport * .83 - rect.top) / (viewport * .63 + rect.height * .4));
      this.targetMorph = reduced.matches ? .48 : smooth(progress);
      this.bounds = { left: rect.left, top: rect.top };
      this.wake();
    }

    bindEvents() {
      this.stage.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch' && !this.drag) return;
        const bounds = this.bounds;
        if (bounds) {
          this.pointerX = clamp((event.clientX - bounds.left) / this.width, 0, 1) * 2 - 1;
          this.pointerY = clamp((event.clientY - bounds.top) / this.height, 0, 1) * 2 - 1;
        }
        if (this.drag && event.pointerId === this.drag.id) {
          const dx = event.clientX - this.drag.x;
          const dy = event.clientY - this.drag.y;
          if (!this.drag.moved && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) {
            this.drag.moved = true;
            this.hovered = null;
            this.stage.classList.add('is-dragging');
            this.stage.setPointerCapture(event.pointerId);
          }
          if (this.drag.moved) {
            if (event.cancelable) event.preventDefault();
            this.userYaw = this.drag.yaw + dx * .008;
            this.userPitch = clamp(this.drag.pitch - dy * .005, -.65, .65);
          }
        }
        this.wake();
      });
      this.stage.addEventListener('pointerleave', () => {
        this.pointerX = this.pointerY = 0;
        this.hovered = null;
        this.wake();
      });
      this.stage.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        this.cancelClick = false;
        this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
          yaw: this.userYaw, pitch: this.userPitch, moved: false };
      });
      const endDrag = event => {
        if (!this.drag || event.pointerId !== this.drag.id) return;
        this.cancelClick = this.drag.moved;
        this.drag = null;
        this.stage.classList.remove('is-dragging');
        if (this.stage.hasPointerCapture(event.pointerId)) this.stage.releasePointerCapture(event.pointerId);
        this.wake();
      };
      // A release outside the stage must also clear a pointer that never dragged.
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      this.stage.addEventListener('lostpointercapture', endDrag);
      this.stage.addEventListener('click', event => {
        if (this.cancelClick) {
          event.preventDefault();
          event.stopPropagation();
          this.cancelClick = false;
        }
      }, true);
      this.points.forEach(point => {
        point.tile.addEventListener('pointerenter', () => {
          if (this.drag?.moved) return;
          this.hovered = point;
          this.wake();
        });
        point.tile.addEventListener('pointerleave', () => {
          if (this.hovered === point) this.hovered = null;
          this.wake();
        });
        point.tile.addEventListener('focus', () => {
          // Pointer focus should preserve the card under the cursor.
          if (!point.tile.matches(':focus-visible')) return;
          this.focused = point;
          this.wake();
        });
        point.tile.addEventListener('blur', () => {
          this.focused = null;
          this.wake();
        });
      });
    }

    wake() {
      if (!this.visible || this.frame || document.hidden) return;
      this.frame = requestAnimationFrame(this.animate);
    }

    animate(now) {
      this.frame = 0;
      if (!this.visible || document.hidden) { this.last = 0; return; }
      const delta = this.last ? Math.min((now - this.last) / 1000, .05) : 1 / 60;
      this.last = now;
      const ease = reduced.matches ? 1 : 1 - Math.exp(-delta * 7);
      const resting = this.hovered || this.focused || this.drag;
      if (!resting && !reduced.matches) this.yaw += delta * (this.hero ? .12 : .095);
      const pointerX = reduced.matches ? 0 : this.pointerX;
      const pointerY = reduced.matches ? 0 : this.pointerY;
      this.parallaxX = mix(this.parallaxX, pointerX, ease);
      this.parallaxY = mix(this.parallaxY, pointerY, ease);
      this.morph = mix(this.morph, this.targetMorph, reduced.matches ? 1 : ease * .7);
      if (Math.abs(this.morph - this.targetMorph) < .0002) this.morph = this.targetMorph;
      this.draw(ease);
      const settling = Math.abs(this.parallaxX - pointerX) > .002 ||
        Math.abs(this.parallaxY - pointerY) > .002 ||
        Math.abs(this.morph - this.targetMorph) > .0002 ||
        this.points.some(point => Math.abs(point.lift - (point === this.hovered || point === this.focused ? 1 : 0)) > .003);
      const focusSettling = this.focused && (
        Math.abs(Math.atan2(Math.sin(-this.focused.yaw - this.focusYaw), Math.cos(-this.focused.yaw - this.focusYaw))) > .001 ||
        Math.abs(-this.focused.pitch - this.focusPitch) > .001
      );
      if (!reduced.matches || settling || focusSettling) this.wake();
    }

    draw(ease = 1) {
      if (!this.radius) return;
      const morph = this.morph;
      const radius = this.radius;
      this.points.forEach(point => {
        const t = morph;
        // The sphere expands slightly, giving every cover its own breathing room.
        const x = mix(point.cube[0], point.sphere[0] * 1.31, t) * radius;
        const y = mix(point.cube[1], point.sphere[1] * 1.31, t) * radius;
        const z = mix(point.cube[2], point.sphere[2] * 1.31, t) * radius;
        point.yaw = angleMix(point.cubeYaw, point.sphereYaw, t);
        point.pitch = angleMix(point.cubePitch, point.spherePitch, t);
        const active = point === this.hovered || point === this.focused;
        point.lift = mix(point.lift, active ? 1 : 0, ease);
        point.tile.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateY(${point.yaw.toFixed(4)}rad) rotateX(${point.pitch.toFixed(4)}rad) translateZ(${(point.lift * 27).toFixed(2)}px) scale(${(1 + point.lift * .08).toFixed(3)})`;
      });
      let yaw = this.yaw + this.userYaw + this.parallaxX * .08;
      let pitch = this.pitch + this.userPitch - this.parallaxY * .065;
      if (this.focused) {
        this.focusYaw = angleMix(this.focusYaw ?? yaw, -this.focused.yaw, ease);
        this.focusPitch = mix(this.focusPitch ?? pitch, -this.focused.pitch, ease);
        yaw = this.focusYaw;
        pitch = this.focusPitch;
      } else {
        this.focusYaw = this.focusPitch = null;
      }
      this.world.style.transform = `rotateX(${pitch.toFixed(4)}rad) rotateY(${(yaw % tau).toFixed(4)}rad)`;
    }
  }

  const init = () => document.querySelectorAll('[data-orbit-gallery]').forEach(stage => new CoverOrbit(stage));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  let scrollFrame = 0;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      instances.forEach(orbit => { if (orbit.visible) orbit.refreshProgress(); });
    });
  }, { passive: true });
  window.addEventListener('resize', () => instances.forEach(orbit => orbit.refreshProgress()), { passive: true });
  document.addEventListener('visibilitychange', () => instances.forEach(orbit => {
    orbit.last = 0;
    if (document.hidden) { cancelAnimationFrame(orbit.frame); orbit.frame = 0; }
    else orbit.wake();
  }));
  reduced.addEventListener('change', () => instances.forEach(orbit => {
    orbit.refreshProgress();
    orbit.wake();
  }));
})();
