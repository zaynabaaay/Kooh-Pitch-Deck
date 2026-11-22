const PERSON = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="11" r="5"/><path d="M6 28c0-7 4-10 10-10s10 3 10 10"/></svg>';
const PLAY = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 2l13 8L4 18z"/></svg>';

export class PresenterController {
  constructor({ recordings, onChange = () => {} }) {
    this.recordings = recordings;
    this.onChange = onChange;
    this.availability = new Map();
    this.probes = new Map();
    this.generation = 0;
    this.activeSlide = null;
    this.handlers = [];
    this.host = document.createElement('aside');
    this.host.className = 'presenter';
    this.host.dataset.recording = 'false';
    this.host.dataset.state = 'empty';
    this.host.setAttribute('aria-label', 'Presenter recording');
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('webkit-playsinline', '');
    this.video.preload = 'metadata';
    this.video.controls = false;
    this.video.muted = false;
    this.video.defaultMuted = false;
    this.video.hidden = true;
    this.video.draggable = false;
    this.placeholder = document.createElement('div');
    this.placeholder.className = 'presenter-placeholder';
    this.placeholder.innerHTML = PERSON;
    this.playButton = document.createElement('button');
    this.playButton.type = 'button';
    this.playButton.className = 'presenter-play';
    this.playButton.hidden = true;
    this.playButton.innerHTML = PLAY;
    this.playButton.setAttribute('aria-label', 'Play presenter recording with sound');
    this.playButton.addEventListener('click', () => {
      if (this.video.ended) this.video.currentTime = 0;
      this.play(this.generation);
    });
    this.host.append(this.video, this.placeholder, this.playButton);
    this.prepare();
  }
  probe(id) {
    if (this.probes.has(id)) return this.probes.get(id);
    const source = this.recordings[id];
    const task = (async () => {
      if (!source) return false;
      const url = new URL(source, document.baseURI);
      // External media can play without fetch CORS permission; let the video decide.
      if (url.origin !== location.origin) return null;
      try {
        const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        if (response.status === 404 || response.status === 410) return false;
        if (!response.ok) return null;
        const type = response.headers.get('content-type') || '';
        return !type.includes('text/html');
      } catch {
        return null;
      }
    })().then(available => {
      this.availability.set(id, available);
      return available;
    });
    this.probes.set(id, task);
    return task;
  }
  prepare() {
    return Promise.all(Object.keys(this.recordings).map(id => this.probe(id)));
  }
  setState(state, recording) {
    this.host.dataset.state = state;
    this.host.dataset.recording = String(recording);
    this.video.hidden = !recording;
    this.placeholder.hidden = recording;
    this.playButton.hidden = !['blocked', 'paused', 'ended'].includes(state);
    this.playButton.setAttribute('aria-label', state === 'ended' ? 'Replay presenter recording with sound' : 'Play presenter recording with sound');
    this.onChange();
  }
  stop() {
    this.generation += 1;
    for (const [type, handler] of this.handlers) this.video.removeEventListener(type, handler);
    this.handlers = [];
    this.video.pause();
    try { this.video.currentTime = 0; } catch {}
    this.video.removeAttribute('src');
    this.video.load();
    this.setState('empty', false);
  }
  activate(slide) {
    this.stop();
    this.activeSlide = slide;
    slide.append(this.host);
    this.host.setAttribute('aria-label', 'Presenter recording for slide ' + slide.id.replace('slide-', ''));
    this.placeholder.setAttribute('title', 'Add this slide’s recording to the videos folder.');
    const generation = this.generation;
    const open = available => {
      if (generation !== this.generation || this.activeSlide !== slide || available === false) return;
      this.open(this.recordings[slide.id], generation);
    };
    if (this.availability.has(slide.id)) open(this.availability.get(slide.id));
    else this.probe(slide.id).then(open);
  }
  open(source, generation) {
    if (!source || generation !== this.generation) return;
    const listen = (type, callback) => {
      const handler = () => { if (generation === this.generation) callback(); };
      this.video.addEventListener(type, handler);
      this.handlers.push([type, handler]);
    };
    listen('playing', () => this.setState('playing', true));
    listen('pause', () => {
      if (!this.video.ended && this.host.dataset.recording === 'true') this.setState('paused', true);
    });
    listen('ended', () => this.setState('ended', true));
    listen('error', () => {
      this.availability.set(this.activeSlide.id, false);
      this.setState('empty', false);
    });
    this.setState('loading', true);
    this.video.muted = false;
    this.video.defaultMuted = false;
    this.video.src = new URL(source, document.baseURI).href;
    this.video.load();
    // No muted retry: narration is always preserved.
    this.play(generation);
  }
  play(generation = this.generation) {
    if (!this.video.getAttribute('src')) return;
    try {
      const attempt = this.video.play();
      attempt?.catch(error => {
        if (generation === this.generation && error.name !== 'AbortError' && !this.video.error) {
          this.setState('blocked', true);
        }
      });
    } catch {
      if (generation === this.generation) this.setState('blocked', true);
    }
  }
  resumeFromGesture() {
    if (this.host.dataset.recording === 'true' && this.video.paused && !this.video.ended) this.play();
  }
  destroy() {
    this.stop();
    this.host.remove();
  }
}

