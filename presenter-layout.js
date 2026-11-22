const COPY_SELECTOR = '.premise-copy,.stacked-list,.series-content,.episode-copy,.marketing-sections,.funding-groups';
const TEXT_SELECTOR = 'h1,h2,h3,p,li';

function textRects(slide) {
  return [...slide.querySelectorAll(TEXT_SELECTOR)].flatMap(element => {
    if (element.closest('.presenter')) return [];
    const range = document.createRange();
    range.selectNodeContents(element);
    return [...range.getClientRects()].filter(rect => rect.width && rect.height);
  });
}
function overlaps(a, b, gap = 0) {
  return a.right > b.left - gap && a.left < b.right + gap &&
    a.bottom > b.top - gap && a.top < b.bottom + gap;
}

export class PresenterLayout {
  constructor({ host, navigation, isPresenting }) {
    this.host = host;
    this.navigation = navigation;
    this.isPresenting = isPresenting;
    this.slide = null;
    this.frame = 0;
    this.observer = new ResizeObserver(() => this.schedule());
    this.onViewport = () => this.schedule();
    window.addEventListener('resize', this.onViewport);
    window.visualViewport?.addEventListener('resize', this.onViewport);
    document.fonts.ready.then(() => this.schedule());
  }
  activate(slide) {
    if (this.slide) this.clear(this.slide);
    this.observer.disconnect();
    this.slide = slide;
    this.observer.observe(slide);
    this.schedule();
  }
  clear(slide) {
    for (const name of ['--copy-right', '--copy-top', '--copy-spacing', '--glow-left', '--glow-top', '--glow-width', '--glow-height', '--glow-video-x', '--glow-video-y', '--glow-video-radius']) {
      slide.style.removeProperty(name);
    }
    delete slide.dataset.presenterLayout;
  }
  schedule() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.update();
      this.updateGlow();
    });
  }
  update() {
    const slide = this.slide;
    if (!slide || slide.hidden) return;
    this.clear(slide);
    this.host.style.removeProperty('--presenter-offset-bottom');
    const presenting = this.isPresenting();
    const reserved = !presenting || this.host.dataset.recording === 'true';
    if (!reserved) return;
    const bounds = slide.getBoundingClientRect();
    const gap = bounds.width * .018;
    let bubble = this.host.getBoundingClientRect();
    if (!presenting) {
      const nav = this.navigation.getBoundingClientRect();
      if (nav.width && overlaps(bubble, nav, gap / 2)) {
        this.host.style.setProperty('--presenter-offset-bottom', (bounds.bottom - nav.top + gap) + 'px');
        bubble = this.host.getBoundingClientRect();
      }
    }
    const copy = slide.querySelector(COPY_SELECTOR);
    if (!copy || !textRects(slide).some(rect => overlaps(rect, bubble, gap))) return;

    // Reserve the same right-hand lane on any slide whose actual text needs it.
    slide.style.setProperty('--copy-right', (bounds.right - bubble.left + gap) + 'px');
    const headingBottom = Math.max(...[...slide.querySelectorAll(':scope > h2,:scope > .funding-subtitle')]
      .map(element => element.getBoundingClientRect().bottom), bounds.top);
    const minimumTop = headingBottom + bounds.width * .012;
    const maximumBottom = bounds.bottom - bounds.width * .018;
    let copyBounds = copy.getBoundingClientRect();
    if (copyBounds.bottom > maximumBottom && copyBounds.top > minimumTop) {
      const rise = Math.min(copyBounds.bottom - maximumBottom, copyBounds.top - minimumTop);
      slide.style.setProperty('--copy-top', (copyBounds.top - bounds.top - rise) + 'px');
    }
    // Only spacing may tighten; words, fonts, font sizes and line heights stay intact.
    for (let spacing = .9; copy.getBoundingClientRect().bottom > maximumBottom && spacing >= .49; spacing -= .1) {
      slide.style.setProperty('--copy-spacing', spacing.toFixed(1));
    }
    slide.dataset.presenterLayout = 'reserved';
  }
  updateGlow() {
    const slide = this.slide;
    if (!slide || slide.hidden) return;
    const rects = textRects(slide);
    if (!rects.length) return;
    const bounds = slide.getBoundingClientRect();
    const padding = bounds.width * .07;
    const left = Math.min(...rects.map(rect => rect.left)) - padding;
    const top = Math.min(...rects.map(rect => rect.top)) - padding;
    const right = Math.max(...rects.map(rect => rect.right)) + padding;
    const bottom = Math.max(...rects.map(rect => rect.bottom)) + padding;
    const geometry = {
      '--glow-left': left - bounds.left,
      '--glow-top': top - bounds.top,
      '--glow-width': right - left,
      '--glow-height': bottom - top
    };
    // Leave the fixed circular player and its immediate surroundings untouched.
    if (getComputedStyle(this.host).visibility !== 'hidden') {
      const bubble = this.host.getBoundingClientRect();
      geometry['--glow-video-x'] = (bubble.left + bubble.right) / 2 - left;
      geometry['--glow-video-y'] = (bubble.top + bubble.bottom) / 2 - top;
      geometry['--glow-video-radius'] = bubble.width / 2 + bounds.width * .01;
    }
    for (const [name, value] of Object.entries(geometry)) {
      slide.style.setProperty(name, value + 'px');
    }
  }
  destroy() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    window.removeEventListener('resize', this.onViewport);
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    if (this.slide) this.clear(this.slide);
    this.slide = null;
  }
}

