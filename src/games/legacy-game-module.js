function readPath(value, path) { return path.reduce((current, key) => current?.[key], value); }

export function createLegacyGameModule(config) {
  let frame = null;
  let timer = null;
  let lastSignature = '';
  let context = null;

  const module = {
    id: config.id,
    title: config.title,
    description: config.description,
    difficulty: config.difficulty,

    create(container, shellContext = {}) {
      context = shellContext;
      frame = document.createElement('iframe');
      frame.className = 'game-frame';
      frame.title = `${config.title} game`;
      frame.src = new URL('./legacy/index.html', config.moduleUrl).href;
      frame.allow = 'autoplay';
      container.replaceChildren(frame);
      frame.addEventListener('load', () => {
        harmonizeFrame(frame, () => context?.onHint?.());
        context.onReady?.();
        checkProgress();
      });
      timer = window.setInterval(checkProgress, 1200);
      window.addEventListener('storage', checkProgress);
      return module;
    },

    destroy() {
      window.clearInterval(timer);
      window.removeEventListener('storage', checkProgress);
      frame?.remove(); frame = null; context = null; lastSignature = '';
    },

    pause() { if (frame) { frame.inert = true; frame.setAttribute('aria-hidden', 'true'); } },
    resume() { if (frame) { frame.inert = false; frame.removeAttribute('aria-hidden'); frame.focus(); } },
    restart() { frame?.contentWindow?.location.reload(); },
    hint() {
      const doc = frame?.contentDocument;
      const control = doc?.querySelector('#hintBtn, [data-action="hint"], [data-action="show-hint"], button[class*="hint"]');
      if (control && !control.disabled) { control.click(); return true; }
      return false;
    },
  };

  function checkProgress() {
    let stored;
    try { stored = JSON.parse(localStorage.getItem(config.storageKey)); } catch { return; }
    if (!stored) return;
    const progress = config.statePath.length ? readPath(stored, config.statePath) : stored;
    const completed = progress?.[config.completedField ?? 'completedLevels'] ?? [];
    const score = Number(progress?.[config.scoreField ?? 'totalScore'] ?? progress?.score ?? 0);
    const signature = `${completed.length}:${score}`;
    if (signature === lastSignature) return;
    lastSignature = signature;
    context?.onProgress?.({ completed: completed.length, total: config.requiredLevels, score });
    if (completed.length >= config.requiredLevels) {
      const stars = score > config.requiredLevels * 500 ? 3 : score > config.requiredLevels * 150 ? 2 : 1;
      context?.onComplete?.({ score, stars, hintsUsed: context.hintsUsed?.() ?? 0 });
    }
  }

  return module;
}

function harmonizeFrame(frame, onHint) {
  try {
    const doc = frame.contentDocument;
    const style = doc.createElement('style');
    style.textContent = `
      :root { --arcade-ink:#25264d; --arcade-accent:#6d5ce8; }
      body { background: transparent !important; }
      .site-header,.app-header,.topbar,body>.app-shell>.topbar,body>footer,.campaign-footer { display:none !important; }
      main,#main-content,#app-main,#game-main { margin-top:0 !important; min-height:auto !important; }
      :focus-visible { outline:3px solid #f3a712 !important; outline-offset:3px !important; }
      @media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation:none!important; scroll-behavior:auto!important; transition:none!important; } }
    `;
    doc.head.append(style);
    doc.addEventListener('click', (event) => {
      if (event.target.closest?.('#hintBtn, [data-action="hint"], [data-action="show-hint"], button[class*="hint"]')) onHint();
    }, true);
  } catch { /* Same-origin integration is expected; leave gameplay usable if unavailable. */ }
}
