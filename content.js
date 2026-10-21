// Floating Board for Lichess: verplaatst bord, klokken en namen van een lopende partij naar
// een Document Picture-in-Picture-venster. Zie de developer brief.

// Alle Lichess-selectors op één plek. Verifiëren op een live partij.
const SELECTORS = {
  app: '.round__app',
  finished: '.result-wrap',
  moved: ['.ruser-top', '.rclock-top', '.round__app__board', '.rclock-bottom', '.ruser-bottom'],
};

const DEFAULT_SIZE = { width: 320, height: 380 };
const DEBUG = false;

const log = (...args) => DEBUG && console.log('[lichess-pip]', ...args);
const t = key => chrome.i18n.getMessage(key);

let pip = null;
let button = null;

// --- Opslag -----------------------------------------------------------------

// Na het herladen van de extensie verliest een al geladen content script chrome.*; dan defaults.
async function loadSize() {
  try {
    const { pipSize } = await chrome.storage.local.get('pipSize');
    return pipSize ?? DEFAULT_SIZE;
  } catch {
    return DEFAULT_SIZE;
  }
}

function saveSize(win) {
  try {
    chrome.storage.local.set({ pipSize: { width: win.innerWidth, height: win.innerHeight } });
  } catch {}
}

// --- Detectie ---------------------------------------------------------------

function isLiveGame() {
  return !!document.querySelector(SELECTORS.app) && !document.querySelector(SELECTORS.finished);
}

// --- PiP --------------------------------------------------------------------

function copyAttributes(from, to) {
  for (const { name, value } of from.attributes) to.setAttribute(name, value);
}

function copyStyles(target) {
  // Het PiP-document is about:blank; zonder base lopen relatieve url()'s in <style> en CSS-variabelen dood.
  const base = target.createElement('base');
  base.href = document.baseURI;
  target.head.appendChild(base);
  for (const node of document.querySelectorAll('link[rel=stylesheet], style')) {
    target.head.appendChild(node.cloneNode(true));
  }
  // Constructable stylesheets kunnen niet tussen documenten gedeeld worden; tekst kopiëren.
  for (const sheet of document.adoptedStyleSheets) {
    const style = target.createElement('style');
    style.textContent = [...sheet.cssRules].map(r => r.cssText).join('\n');
    target.head.appendChild(style);
  }
  copyAttributes(document.documentElement, target.documentElement);
  copyAttributes(document.body, target.body);
}

// Lichess-CSS hangt aan voorouders (bv. `#main-wrap.is2d`). Bouw die keten leeg na in PiP,
// zodat de selectors blijven matchen; tussenlagen krijgen display:contents, de binnenste wordt onze flex-root.
function mirrorAncestors(target, el) {
  const chain = [];
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    chain.unshift(node);
  }
  let parent = target.body;
  for (const node of chain) {
    const clone = target.createElement(node.localName);
    copyAttributes(node, clone);
    clone.style.display = 'contents';
    parent.appendChild(clone);
    parent = clone;
  }
  parent.removeAttribute('style');
  parent.setAttribute('data-pip-root', '');
  return parent;
}

function layoutStyles(target) {
  const style = target.createElement('style');
  style.textContent = `
    html, body { margin: 0; height: 100%; overflow: hidden; }
    [data-pip-root] { display: flex !important; flex-direction: column; align-items: center; height: 100%; }
    [data-pip-root] > * { flex: none; width: 100%; }
    [data-pip-root] > .round__app__board { width: var(--pip-board); height: var(--pip-board); position: relative; }
    [data-pip-root] > .round__app__board > .cg-wrap { width: 100% !important; height: 100% !important; padding: 0 !important; }
  `;
  target.head.appendChild(style);
}

// Chessground herberekent zijn bounds op dit event in het hoofddocument.
function recalcBoard() {
  document.body.dispatchEvent(new Event('chessground.resize'));
  window.dispatchEvent(new Event('resize'));
}

// Vierkant bord: grootste zijde die past naast namen en klokken. Via een CSS-variabele op onze
// eigen root, zodat we geen inline styles op Lichess-elementen achterlaten.
function fitBoard(win, root, board) {
  const others = [...root.children]
    .filter(el => el !== board)
    .reduce((sum, el) => sum + el.getBoundingClientRect().height, 0);
  const size = Math.max(100, Math.floor(Math.min(win.innerWidth, win.innerHeight - others)));
  root.style.setProperty('--pip-board', `${size}px`);
  recalcBoard();
}

// Chessground vangt mousemove/mouseup op het hoofddocument; in PiP komen die daar nooit aan,
// waardoor zowel slepen als klik-klik blijven hangen. Doorsturen met dezelfde coördinaten
// (chessground meet het bord in PiP, dus PiP-coördinaten kloppen).
const FORWARDED_EVENTS = ['mousemove', 'mouseup', 'touchmove', 'touchend', 'touchcancel'];

function forwardPointerEvents(win) {
  for (const type of FORWARDED_EVENTS) {
    win.document.addEventListener(type, e => {
      const init = {
        bubbles: true, cancelable: true,
        clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
        button: e.button, buttons: e.buttons,
        ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey,
      };
      const forwarded = e instanceof win.TouchEvent
        ? new TouchEvent(type, { ...init, touches: [...e.touches], changedTouches: [...e.changedTouches] })
        : new MouseEvent(type, init);
      document.dispatchEvent(forwarded);
    }, { passive: true });
  }
}

// Chessground meet het bord bij de eerste render te vroeg (0x0, alle stukken op a8). Een
// echte maatwijziging laat zijn ResizeObserver opnieuw meten; dus kort 1px kleiner en terug.
// Die observer draait in de hoofdtab en moet elke stap zien: daarom ruime pauzes, geen frames.
const NUDGE_DELAY = 250;

function nudgeBoard(win, root) {
  const size = root.style.getPropertyValue('--pip-board');
  setTimeout(() => root.style.setProperty('--pip-board', `${parseInt(size) - 1}px`), NUDGE_DELAY);
  setTimeout(() => !win.closed && root.style.setProperty('--pip-board', size), NUDGE_DELAY * 2);
}

async function openPip() {
  if (pip) return pip.focus();
  if (!('documentPictureInPicture' in window)) {
    return setButtonError(t('errorUnsupported'));
  }

  const elements = SELECTORS.moved.map(sel => document.querySelector(sel));
  const missing = SELECTORS.moved.filter((_, i) => !elements[i]);
  if (missing.length) {
    log('ontbrekende selectors', missing);
    if (!elements[SELECTORS.moved.indexOf('.round__app__board')]) {
      return setButtonError(t('errorBoardNotFound'));
    }
  }

  // De user gesture blijft ~5s geldig, dus een korte storage-read vooraf mag.
  pip = await documentPictureInPicture.requestWindow(await loadSize());

  copyStyles(pip.document);
  layoutStyles(pip.document);
  const board = elements[SELECTORS.moved.indexOf('.round__app__board')];
  const root = mirrorAncestors(pip.document, board);
  // Maat zetten vóór het verplaatsen: chessground meet het bord bij de eerste render in PiP,
  // en bij 0x0 belanden alle stukken op a8. ~120px is een schatting voor namen + klokken.
  root.style.setProperty('--pip-board', `${Math.max(100, Math.min(pip.innerWidth, pip.innerHeight - 120))}px`);

  const slots = elements.filter(Boolean).map(el => {
    const placeholder = document.createComment('lichess-pip');
    el.replaceWith(placeholder);
    root.appendChild(el);
    return [placeholder, el];
  });

  fitBoard(pip, root, board);
  nudgeBoard(pip, root);
  forwardPointerEvents(pip);
  let resizeTimer;
  pip.addEventListener('resize', () => {
    fitBoard(pip, root, board);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => saveSize(pip), 300);
  });
  pip.document.addEventListener('keydown', onKeydown);

  pip.addEventListener('pagehide', () => {
    saveSize(pip);
    for (const [placeholder, el] of slots) {
      if (placeholder.isConnected) placeholder.replaceWith(el);
      else log('placeholder verdwenen, element niet teruggezet', el);
    }
    pip = null;
    recalcBoard();
    updateButton();
  });

  updateButton();
}

// --- Knop en sneltoets ------------------------------------------------------

function setButtonError(message) {
  log(message);
  if (!button) return;
  button.textContent = '⚠';
  button.title = message;
}

function updateButton() {
  const show = !!pip || isLiveGame();
  if (show && !button) {
    button = document.createElement('button');
    button.id = 'lichess-pip-button';
    button.textContent = t('buttonLabel');
    button.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:9999;padding:8px 14px;' +
      'font-size:14px;font-weight:bold;border-radius:20px;border:none;cursor:pointer;' +
      'background:var(--c-primary,#3692e7);color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3)';
    button.addEventListener('click', togglePip);
    document.body.appendChild(button);
  } else if (!show && button) {
    button.remove();
    button = null;
  }
  if (button) button.title = t(pip ? 'buttonClose' : 'buttonOpen');
}

function togglePip() {
  if (pip) pip.close();
  else openPip().catch(e => setButtonError(e.message));
}

function onKeydown(e) {
  if (e.altKey && e.code === 'KeyP' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    if (!pip && !isLiveGame()) return;
    e.preventDefault();
    togglePip();
  }
}

// --- Init -------------------------------------------------------------------

document.addEventListener('keydown', onKeydown);
if (document.querySelector(SELECTORS.app)) {
  updateButton();
  // Einde partij detecteren; Lichess rendert de resultaatbalk dynamisch.
  new MutationObserver(updateButton).observe(document.querySelector(SELECTORS.app), {
    childList: true,
    subtree: true,
  });
}
