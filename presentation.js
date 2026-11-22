import { PRESENTER_VIDEOS } from './presenter-videos.js';
import { PresenterController } from './presenter.js';
import { PresenterLayout } from './presenter-layout.js?v=body-glow-2';

export function createPresentation({ recordings = PRESENTER_VIDEOS } = {}) {
  const slides = [...document.querySelectorAll('.slide')];
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const fullscreenButton = document.getElementById('fullscreen');
  const status = document.getElementById('presentation-status');
  const navigation = document.querySelector('.deck-nav');
  const root = document.documentElement;
  const cleanups = [];
  const on = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };
  let current = 0;
  let activeSlide = null;
  let presentationView = false;
  let layout;
  const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  const isPresenting = () => Boolean(fullscreenElement()) || presentationView;
  const presenter = new PresenterController({ recordings, onChange: () => layout?.schedule() });
  layout = new PresenterLayout({ host: presenter.host, navigation, isPresenting });

  function syncPresentation() {
    const active = isPresenting();
    root.classList.toggle('is-presenting', active);
    navigation.inert = active;
    navigation.setAttribute('aria-hidden', String(active));
    fullscreenButton.textContent = active ? 'Exit full screen' : 'Full screen';
    fullscreenButton.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
    fullscreenButton.setAttribute('aria-pressed', String(active));
    if (active && navigation.contains(document.activeElement)) document.activeElement.blur();
    layout.schedule();
  }
  async function enterPresentation() {
    presentationView = true;
    status.textContent = 'Presentation started. Swipe down, or press Escape or F, to exit.';
    syncPresentation();
    presenter.resumeFromGesture();
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (request) {
      try {
        await request.call(root);
        if (fullscreenElement()) presentationView = false;
      } catch {
        // iPad and restricted browsers retain the same clean, viewport-sized view.
      }
    }
    syncPresentation();
  }
  async function exitPresentation() {
    presentationView = false;
    if (fullscreenElement()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      try { await exit.call(document); }
      catch { status.textContent = 'Use your browser’s full-screen exit gesture or Escape.'; }
    }
    syncPresentation();
  }
  function togglePresentation() {
    return isPresenting() ? exitPresentation() : enterPresentation();
  }
  on(fullscreenButton, 'click', togglePresentation);
  const fullscreenChanged = () => {
    if (fullscreenElement()) presentationView = false;
    syncPresentation();
  };
  on(document, 'fullscreenchange', fullscreenChanged);
  on(document, 'webkitfullscreenchange', fullscreenChanged);

  function showSlide() {
    const requested = Number(location.hash.replace('#slide-', '')) || 1;
    current = Math.max(0, Math.min(slides.length - 1, requested - 1));
    slides.forEach((slide, index) => { slide.hidden = index !== current; });
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    document.getElementById('slide-count').textContent = (current + 1) + ' / ' + slides.length;
    document.title = current === 0 ? 'Kooh — A New Unscripted Series' : slides[current].querySelector('h2').textContent + ' — Kooh';
    if (activeSlide !== slides[current]) {
      activeSlide = slides[current];
      presenter.activate(activeSlide);
      layout.activate(activeSlide);
    }
  }
  function moveSlide(direction) {
    const target = Math.max(0, Math.min(slides.length - 1, current + direction));
    if (target !== current) {
      location.hash = 'slide-' + (target + 1);
      showSlide(); // Stop the old recording within this same navigation gesture.
    }
  }
  on(previous, 'click', () => moveSlide(-1));
  on(next, 'click', () => moveSlide(1));
  on(window, 'hashchange', showSlide);
  on(document, 'keydown', event => {
    if (event.target.closest?.('input,textarea,select,[contenteditable="true"]') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === ' ' && event.target.closest?.('button,a')) return;
    if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      if (!event.repeat) togglePresentation();
      return;
    }
    if (event.key === 'Escape' && isPresenting()) { event.preventDefault(); exitPresentation(); return; }
    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); moveSlide(1); }
    if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); moveSlide(-1); }
  });

  let touchStart = null;
  on(document, 'touchstart', event => {
    if (event.touches.length === 1 && !event.target.closest('nav')) {
      touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else touchStart = null;
  }, { passive: true });
  on(document, 'touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (event.cancelable) event.preventDefault();
      moveSlide(dx < 0 ? 1 : -1);
    } else if (isPresenting() && dy > 80 && dy > Math.abs(dx) * 1.2) {
      if (event.cancelable) event.preventDefault();
      exitPresentation();
    }
  }, { passive: false });
  on(document, 'touchcancel', () => { touchStart = null; }, { passive: true });
  syncPresentation();
  showSlide();
  return {
    presenter, layout, moveSlide, isPresenting, enterPresentation, exitPresentation,
    destroy() {
      cleanups.forEach(cleanup => cleanup());
      presenter.destroy();
      layout.destroy();
      root.classList.remove('is-presenting');
      navigation.inert = false;
      navigation.removeAttribute('aria-hidden');
    }
  };
}

