const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = 'vahri-studio-canvas-v2';
const titles = { home: 'Home', about: 'About', work: 'Work', kantong: 'Kantong', 'kantong-flows': 'Kantong · Flows', 'kantong-prototype': 'Kantong · Prototype', gallery: 'Documentation', contact: 'Say hi' };
const kinds = new Set(['text', 'frame', 'sticker', 'comment']);
const blankState = () => Object.fromEntries(Object.keys(titles).map(key => [key,{nodes:[],strokes:[],offsets:{}}]));
let state = blankState(), page = 'home', tool = 'move', color = '#76a9ff', stamp = 'rocket', visitor = 'You', selected = null, gesture = null, suppressClick = false;
let openNoteId = null, pendingNoteFocus = null, editingCommentId = null;
const stickerNames = { rocket: 'Rocket', coffee: 'Coffee', dumbbell: 'Dumbbell', planet: 'Planet', headphones: 'Headphones', plane: 'Paper plane', cassette: 'Cassette', plant: 'Plant', bolt: 'Energy badge' };
const histories = { home: [], about: [], work: [], kantong: [], 'kantong-flows': [], 'kantong-prototype': [], gallery: [], contact: [] };
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  for (const key of Object.keys(titles)) {
    if (saved?.[key] && Array.isArray(saved[key].nodes) && Array.isArray(saved[key].strokes)) {
      state[key].nodes = saved[key].nodes.filter(n => kinds.has(n.kind) && Number.isFinite(n.x) && Number.isFinite(n.y)).slice(-100);
      state[key].strokes = saved[key].strokes.filter(s => Array.isArray(s.points)).slice(-100);
      state[key].offsets = saved[key].offsets || {};
    }
  }
  visitor = localStorage.getItem('vahri-canvas-name') || 'You';
} catch { /* An empty canvas also works when browser storage is unavailable. */ }
const canvas = $('#ink-canvas'), ctx = canvas.getContext('2d'), surface = $('#tool-surface');
const view = () => $(`[data-view="${page}"]`);
const layer = () => $(`[data-layer="${page}"]`);
const data = () => state[page];
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `mark-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const copy = value => JSON.parse(JSON.stringify(value));
function toast(message) {
  updateNoticePosition(); placeToast(); $('#toast').textContent = message; $('#toast').classList.add('visible'); document.body.classList.add('toast-active'); clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => { $('#toast').classList.remove('visible'); document.body.classList.remove('toast-active'); $('#toast').classList.remove('in-comments'); document.body.append($('#toast')); }, 2800);
}
function placeToast() {
  const element = $('#toast'), panel = $('#notes-panel');
  if (!panel.hidden) { panel.insertBefore(element, $('#notes-list')); element.classList.add('in-comments'); }
  else { document.body.append(element); element.classList.remove('in-comments'); }
}
function updateNoticePosition() {
  const top = $('.editing-toolbar').getBoundingClientRect().top;
  document.documentElement.style.setProperty('--notice-bottom', `${innerHeight - top + 14}px`);
}
function updateResetVisibility() {
  $('#reset-action').hidden = false; $('.action-divider').hidden = false;
}
function save() { updateResetVisibility(); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { toast('This canvas is full. Clear a few marks to save more.'); } }
function remember(target = page) { histories[target].push(copy(state[target])); if (histories[target].length > 40) histories[target].shift(); }
function closePopovers() { $('#sticker-popover').hidden = true; $('#options-popover').hidden = true; $('.tool-button[data-tool="sticker"]').setAttribute('aria-expanded', 'false'); $('#color-toggle').setAttribute('aria-expanded', 'false'); }
function clearSelection() { $$('.selected').forEach(el => el.classList.remove('selected')); selected = null; }
function select(el) { clearSelection(); if (el) {
  if(el.classList.contains('movable')){
    if(!el.querySelector(':scope > .construction-guide'))constructionParts(el);
    const shape=el.querySelector(':scope > .pill-tray')||el;
    const radius=parseFloat(getComputedStyle(shape).borderTopLeftRadius)||0;
    const guide=el.querySelector(':scope > .construction-guide');
    guide.querySelector('rect').setAttribute('rx',String(Math.min(radius+4,(el.offsetWidth+8)/2,(el.offsetHeight+8)/2)));
    updateFrameSize(el,el.offsetWidth,el.offsetHeight);
  }
  el.classList.add('selected'); selected = el;
} }
function setTool(next, options = {}) {
  if (gesture) finishGesture();
  if (next !== 'move' && !$('#notes-panel').hidden) toggleNotes(false);
  tool = next;
  document.body.dataset.tool = tool;
  document.body.classList.toggle('move-mode', tool === 'move');
  $$('.tool-button[data-tool]').forEach(button => { const active = button.dataset.tool === tool; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  surface.hidden = tool === 'move' || options.editing === true;
  closePopovers();
  const hints = { frame: 'Drag to draw a frame.', text: 'Click to add text.', pen: 'Draw on the canvas. Esc to finish.', sticker: 'Click to place a sticker.', comment: 'Click to leave a note.' };
  if (options.editing && (tool === 'text' || tool === 'comment')) hints[tool] = 'Type here. Return to finish.';
  updateNoticePosition();
  $('#tool-hint').hidden = !hints[tool]; $('#tool-hint').textContent = hints[tool] || '';
  if (tool === 'sticker' && options.picker !== false) { $('#sticker-popover').hidden = false; $('.tool-button[data-tool="sticker"]').setAttribute('aria-expanded', 'true'); surface.hidden = true; $('#tool-hint').hidden = true; layoutPopovers(); }
}
function route() {
  const requested = location.hash.slice(1).replace(/^calorie(?=-|$)/, "kantong");
  const next = requested==='documentation'?'gallery':requested;
  const destination = Object.hasOwn(titles, next) ? next : 'home';
  document.activeElement?.closest('.canvas-object textarea')?.blur();
  setPageMenu(false);
  const outgoing = view();
  const commit = () => {
  page = destination; editingCommentId = null;
  $$('[data-view]').forEach(el => { el.hidden = el.dataset.view !== page; });
  $$('[data-page]').forEach(a => { if (a.dataset.page === (page.startsWith('kantong')?'work':page)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if(page === 'about'||page === 'gallery'||page === 'work'||page.startsWith('kantong')) view().scrollTo({top:0,left:0,behavior:'instant'});
  $('.mobile-page-name').textContent = page.startsWith('kantong')?'Work':page==='gallery'?'Docs':titles[page];
  document.title = `Vahri’s studio · ${titles[page]}`;
  setPageMenu(false);
  clearSelection(); setTool('move'); renderPage();
  if (pendingNoteFocus) { const entry = pendingNoteFocus; pendingNoteFocus = null; requestAnimationFrame(() => focusComment(entry)); }
  if (page === 'home' && !matchMedia('(prefers-reduced-motion: reduce)').matches) { view().classList.remove('entering'); requestAnimationFrame(() => view().classList.add('entering')); }
  };
  if (outgoing && (outgoing.dataset.view !== destination || document.body.classList.contains('page-changing')) && window.playStudioPageTransition) {
    window.playStudioPageTransition(outgoing, destination, commit);
  } else commit();
}
function canvasPoint(e) { return { x: e.clientX, y: e.clientY + view().scrollTop }; }
function cleanColor(value) { return /^#[\da-f]{6}$/i.test(value || '') ? value : '#76a9ff'; }
function renderInk() {
  ctx.clearRect(0, 0, innerWidth, innerHeight); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const strokes = [...data().strokes]; if (gesture?.kind === 'pen') strokes.push(gesture.stroke);
  for (const stroke of strokes) {
    if (!stroke.points.length) continue;
    ctx.strokeStyle = cleanColor(stroke.color); ctx.beginPath();
    stroke.points.forEach((point, index) => { const y = point.y - view().scrollTop; if (index === 0) ctx.moveTo(point.x, y); else ctx.lineTo(point.x, y); });
    if (stroke.points.length === 1) ctx.lineTo(stroke.points[0].x + .1, stroke.points[0].y - view().scrollTop + .1);
    ctx.stroke();
  }
}
function resizeInk() { const ratio = Math.min(devicePixelRatio || 1, 2); canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); renderInk(); }
function styleNode(el, node) {
  const room = node.kind === 'comment' ? (node.text && node.collapsed === true ? 48 : Math.min(285, innerWidth - 24)) : node.kind === 'sticker' ? 86 : 60;
  const x = Math.max(12, Math.min(node.x, innerWidth - room));
  const y = page === 'home' && node.kind === 'comment' ? Math.max(90, Math.min(node.y, innerHeight - 155)) : node.y;
  el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.color = cleanColor(node.color); el.style.setProperty('--node-color', cleanColor(node.color));
}
const commentPalette = [
  ['#d0ede1', '#80b69d', '#355448'], ['#e4daf8', '#aa92d0', '#514366'],
  ['#c5dcff', '#82a9de', '#304363'], ['#f6dce6', '#d49db6', '#553d4b'],
  ['#f8edbb', '#c5b269', '#5a5030']
];
function colorComment(element, node) {
  const palette = commentPalette[Math.max(0, (node.number || 1) - 1) % commentPalette.length];
  ['--comment-fill', '--comment-stroke', '--comment-ink'].forEach((name, i) => element.style.setProperty(name, palette[i]));
}
function revealCommentEntry(id) {
  toggleNotes(true);
  requestAnimationFrame(() => {
    const item = $$('.note-list-item').find(el => el.dataset.commentId === id);
    if (!item) return;
    const list = $('#notes-list');
    list.scrollTo({ top: Math.max(0, list.scrollTop + item.getBoundingClientRect().top - list.getBoundingClientRect().top - 8), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
}
function nodeElement(node) {
  const el = document.createElement('div'); el.className = `canvas-object canvas-${node.kind}`; el.dataset.node = node.id; el.tabIndex = 0; styleNode(el, node);
  el.setAttribute('aria-label', node.kind === 'comment' ? `Note by ${node.author || 'You'}` : `${node.kind}: ${node.text || node.stamp || 'Untitled frame'}`);
  if (node.kind === 'text') {
    const content=document.createElement('span');content.className='canvas-text-content';content.textContent=node.text;content.tabIndex=0;content.setAttribute('role','button');content.setAttribute('aria-label','Edit canvas text');content.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();editText(el,node);}});el.append(content);constructionParts(el);el.querySelector('rect').setAttribute('rx','14');content.addEventListener('click', e => { e.stopPropagation(); if (!suppressClick) editText(el, node); });
  } else if (node.kind === 'sticker') {
    if (stickerNames[node.stamp]) { const image = document.createElement('img'); image.src = `stickers/${node.stamp}.svg`; image.alt = stickerNames[node.stamp]; image.draggable = false; el.append(image); } else { el.textContent = node.stamp; } el.style.rotate = `${node.rotation || 0}deg`;
  } else if (node.kind === 'frame') {
    el.style.width = `${node.width}px`; el.style.height = `${node.height}px`;
    const title = document.createElement('span'); title.className = 'frame-name'; title.textContent = node.text || 'My little frame'; title.addEventListener('dblclick', e => { e.stopPropagation(); remember(); title.contentEditable = 'true'; title.focus(); selectText(title); });
    title.addEventListener('blur', () => { title.contentEditable = 'false'; node.text = title.textContent.trim().slice(0, 100) || 'My little frame'; title.textContent = node.text; save(); });
    title.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); title.blur(); } });
    const resize = document.createElement('span'); resize.className = 'resize-handle'; resize.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--frame-fill',cleanColor(node.color));
    el.append(title, resize);constructionParts(el);updateFrameSize(el,node.width,node.height);
  } else if (node.kind === 'comment') {
    colorComment(el, node);
    el.classList.toggle('is-current',openNoteId===node.id);
    el.setAttribute('aria-label', node.text ? `Comment ${node.number}: ${node.text}` : 'New comment');
    if (node.text && node.collapsed === true && editingCommentId !== node.id) el.classList.add('collapsed');
    const pin = document.createElement('button'); pin.className = 'comment-pin';
    pin.textContent = node.text ? String(node.number || '') : '+';
    pin.setAttribute('aria-label', node.text ? `Open comment ${node.number}` : 'New comment pin');
    pin.setAttribute('aria-expanded', String(!el.classList.contains('collapsed')));
    const body = document.createElement('div'); body.className = 'comment-body';
    const outline=document.createElementNS('http://www.w3.org/2000/svg','svg');outline.classList.add('comment-outline');outline.setAttribute('aria-hidden','true');
    const outlineRect=document.createElementNS('http://www.w3.org/2000/svg','rect');outlineRect.setAttribute('x','2');outlineRect.setAttribute('y','2');outlineRect.setAttribute('width','calc(100% - 4px)');outlineRect.setAttribute('height','calc(100% - 4px)');outlineRect.setAttribute('rx','25');outline.append(outlineRect);body.append(outline);
    if (node.text && editingCommentId !== node.id) {
      body.setAttribute('role', 'group'); body.tabIndex = 0;
      body.setAttribute('aria-label', `Select comment ${node.number}: ${node.text}`);
      body.setAttribute('aria-expanded', 'true');
      const text = document.createElement('p'); text.textContent = node.text;
      text.tabIndex = 0; text.setAttribute('role','button'); text.setAttribute('aria-label',`Show comment ${node.number} in comments`);text.title='Double-click to edit';
      const edit = e => { e.stopPropagation(); if(suppressClick)return; editingCommentId=node.id; setTool('comment',{editing:true}); renderPage(); const entry=$(`[data-node="${node.id}"]`,view()); select(entry); focusCanvasInput(entry.querySelector('textarea'),true); };
      const show = e => { e.stopPropagation(); if(suppressClick)return; openNoteId=node.id; select(el); $$('.canvas-comment',view()).forEach(item=>item.classList.toggle('is-current',item===el)); save(); revealCommentEntry(node.id); };
      text.addEventListener('click',show);
      text.addEventListener('dblclick',edit);
      text.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(e);}else if(e.key==='F2'){e.preventDefault();edit(e);}});
      const time = document.createElement('time'); time.className = 'comment-timestamp';
      if (node.createdAt) time.dateTime = new Date(node.createdAt).toISOString();
      time.textContent = node.createdAt ? new Intl.DateTimeFormat('en', { timeZone: 'Asia/Pontianak', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(node.createdAt)) : 'Earlier';
      body.append(text, time);
      const collapse = e => { e.stopPropagation(); if (suppressClick) return; node.collapsed = true; openNoteId = node.id; save(); renderPage(); };
      body.addEventListener('click',show);
      body.addEventListener('dblclick', collapse);
      body.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); show(e); } });
    } else {
      const form = document.createElement('form'); form.className = 'comment-form';
      const input = document.createElement('textarea'); input.maxLength = 1000; input.rows = 1; input.value = node.text || ''; input.placeholder = 'Say something…'; input.setAttribute('aria-label', 'Your comment');
      const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'comment-submit'; submit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>'; submit.setAttribute('aria-label', node.text ? 'Save comment' : 'Post pinned comment');
      const submitNote = () => { const text = input.value.trim(); if (!text) { input.focus(); return; } const updated=!!node.text; remember(); node.text = text; node.createdAt ||= Date.now(); node.collapsed = false; editingCommentId=null; openNoteId = node.id; setTool('move'); save(); renderPage(); document.dispatchEvent(new CustomEvent('studio:sound',{detail:{kind:'comment'}})); toast(updated?'Comment updated.':'Comment added to Notes.'); };
      form.addEventListener('submit', e => { e.preventDefault(); submitNote(); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.stopPropagation(); submitNote(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if(node.text){editingCommentId=null;setTool('move');renderPage();}else removeComment(node.id); } });
      form.addEventListener('pointerdown', e => { e.stopPropagation(); setTool('comment', { editing: true }); select(el); });
      form.addEventListener('keydown', e => e.stopPropagation());
      body.addEventListener('click', e => { if (!e.target.closest('button') && !suppressClick) { setTool('comment', { editing: true }); select(el); input.focus(); } });
      input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(120, input.scrollHeight)}px`; });
      form.append(input, submit); body.append(form);
    }
    pin.addEventListener('click', e => { e.stopPropagation(); if (suppressClick || !node.text) return; node.collapsed = false; openNoteId = node.id; save(); renderPage(); select($(`[data-node="${node.id}"]`, view())); revealCommentEntry(node.id); });
    el.append(pin, body);
  }
  const remove = document.createElement('button');
  remove.type = 'button'; remove.className = 'canvas-remove'; remove.textContent = '×';
  remove.setAttribute('aria-label', `Remove ${node.kind}`); remove.title = `Remove ${node.kind}`;
  remove.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); });
  remove.addEventListener('keydown', e => e.stopPropagation());
  remove.addEventListener('click', e => { e.stopPropagation(); removeNode(node.id); });
  el.append(remove);
  return el;
}
function removeNode(id) {
  const node = data().nodes.find(node => node.id === id); if (!node) return;
  remember(); data().nodes = data().nodes.filter(node => node.id !== id);
  if (openNoteId === id) openNoteId = null;
  if (editingCommentId === id) editingCommentId = null;
  clearSelection(); save(); renderPage();
}
function renderPage() {
  updateResetVisibility();
  layer().replaceChildren(...data().nodes.map(nodeElement));
  $$('.movable', view()).forEach(el => { const offset = data().offsets[el.dataset.object]; el.style.translate = offset ? `${offset.x}px ${offset.y}px` : ''; });
  renderInk(); renderNotes();
}
function selectText(el) { const range = document.createRange(); range.selectNodeContents(el); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); }
function focusCanvasInput(input, selectAll = false) {
  if (!input) return;
  input.focus({ preventScroll: true });
  if (selectAll) input.select();
  // The embedded preview can finish native click focus after the DOM event.
  requestAnimationFrame(() => {
    if (input.isConnected && document.activeElement !== input) {
      input.focus({ preventScroll: true });
      if (selectAll) input.select();
    }
  });
}
function editText(el, node) {
  const content = el.querySelector('.canvas-text-content');
  if (!content || el.querySelector('.canvas-text-editor')) return;
  remember(); setTool('text', { editing: true }); select(el); el.classList.add('is-editing');
  const input = document.createElement('textarea'); input.className = 'canvas-text-editor';
  input.setAttribute('aria-label', 'Edit canvas text'); input.rows = 1; input.maxLength = 1000;
  input.value = node.text === 'Type…' ? '' : node.text; input.placeholder = 'Type…';
  const resize = () => {
    content.textContent = input.value || input.placeholder;
    input.style.width = `${Math.min(Math.max(16, content.getBoundingClientRect().width + 2), innerWidth - Math.max(12, el.getBoundingClientRect().left) - 30)}px`;
    input.style.height = '0px'; input.style.height = `${Math.max(23, input.scrollHeight)}px`;
  };
  input.addEventListener('pointerdown', e => e.stopPropagation());
  input.addEventListener('keydown', e => {
    e.stopPropagation();
    if ((e.key === 'Enter' && !e.shiftKey && !e.isComposing) || e.key === 'Escape') { e.preventDefault(); input.blur(); }
  });
  input.addEventListener('input', resize);
  input.addEventListener('blur', () => {
    node.text = input.value.trim().slice(0, 1000);
    if (!node.text) data().nodes = data().nodes.filter(n => n.id !== node.id);
    setTool('move'); save(); renderPage();
  }, { once: true });
  el.append(input); resize(); focusCanvasInput(input, true);
}

function addNode(node) {
  remember(); if (data().nodes.length >= 100) data().nodes.shift(); data().nodes.push(node); save(); renderPage(); const el = $(`[data-node="${node.id}"]`, view()); select(el); document.dispatchEvent(new CustomEvent('studio:sound',{detail:{kind:node.kind==='frame'?'frame-end':node.kind==='comment'?'comment':'place'}})); return el;
}
function allComments(includeDrafts = false) {
  return Object.keys(titles).flatMap(key => state[key].nodes.filter(n => n.kind === 'comment' && (includeDrafts || n.text)).map(node => ({ node, page: key })));
}
function nextCommentNumber() { return Math.max(0, ...allComments(true).map(entry => entry.node.number || 0)) + 1; }
function removeComment(id) {
  const entry = allComments(true).find(entry => entry.node.id === id); if (!entry) return;
  remember(entry.page); state[entry.page].nodes = state[entry.page].nodes.filter(n => n.id !== id); openNoteId = null; save(); renderPage();
}
function focusComment(entry) {
  entry.node.collapsed = false; openNoteId = entry.node.id; save();
  if (entry.page !== page) { pendingNoteFocus = entry; location.hash = entry.page; return; }
  window.dispatchEvent(new Event('studio:comment-focus'));
  editingCommentId=null; setTool('move'); toggleNotes(true);
  renderPage(); view().scrollTo({ top: Math.max(0, entry.node.y - innerHeight * .35), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  const el = $(`[data-node="${entry.node.id}"]`, view()); select(el); el?.focus({preventScroll:true}); revealCommentEntry(entry.node.id);
}
function placeAbove(popover, anchor, gap = 14) {
  if (popover.hidden) return;
  const button = anchor.getBoundingClientRect(); const width = Math.min(popover.offsetWidth, innerWidth - 24);
  const left = Math.max(12, Math.min(innerWidth - width - 12, button.left + button.width / 2 - width / 2));
  popover.style.left = `${left}px`; popover.style.right = 'auto'; popover.style.transform = 'none';
  popover.style.bottom = `${innerHeight - button.top + gap}px`;
  popover.style.setProperty('--tail-x', `${Math.max(20, Math.min(width - 20, button.left + button.width / 2 - left))}px`);
}
function layoutPopovers() {
  updateNoticePosition();
  placeAbove($('#sticker-popover'), $('.tool-button[data-tool="sticker"]'));
  placeAbove($('#options-popover'), $('#color-toggle'));
  placeAbove($('#notes-panel'), matchMedia('(max-width:760px)').matches ? $('.tool-button[data-tool="comment"]') : $('#notes-toggle'), 28);
}
function renderNotes() {
  const comments = allComments().sort((a, b) => (b.node.createdAt || 0) - (a.node.createdAt || 0) || (b.node.number || 0) - (a.node.number || 0));
  $('#note-count').textContent = comments.length; $('#panel-note-count').textContent = comments.length;
  const list = $('#notes-list'); list.replaceChildren();
  if (!comments.length) {
    const empty = document.createElement('div'); empty.className = 'empty-notes';
    const title = document.createElement('strong'); title.textContent = 'A fresh conversation.';
    const text = document.createElement('p'); text.textContent = 'Pin a comment to the canvas or write one below.'; empty.append(title, text); list.append(empty);
  }
  comments.forEach(entry => {
    const node = entry.node, card = document.createElement('article'); card.className = 'note-list-item'; card.dataset.commentId = node.id; colorComment(card, node);
    if (openNoteId === node.id) card.classList.add('is-current');
    const main = document.createElement('button'); main.className = 'note-entry-main'; main.type = 'button'; main.setAttribute('aria-label', `Go to comment ${node.number} on ${titles[entry.page]}`);
    const meta = document.createElement('span'); meta.className = 'note-meta';
    const number = document.createElement('span'); number.className = 'note-number'; number.textContent = node.number;
    const date = document.createElement('span');
    const stamp = node.createdAt ? new Intl.DateTimeFormat('en', { timeZone: 'Asia/Pontianak', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(node.createdAt)) : 'Earlier';
    date.textContent = `${stamp} · on ${node.anchor || titles[entry.page]}`; meta.append(number, date);
    const text = document.createElement('p'); text.textContent = node.text; main.append(meta, text); main.addEventListener('click', () => focusComment(entry));
    card.append(main); list.append(card);
  });
  $('#composer-avatar').textContent = visitor[0].toUpperCase(); layoutPopovers();
}
function updateVisitor() { $('#visitor-name .visitor-avatar').textContent = visitor[0].toUpperCase(); $('#visitor-name').title = 'Change your canvas avatar'; }
$('#visitor-name').addEventListener('click', () => { const names = ['Explorer', 'Curious one', 'Maker', 'Daydreamer', 'Pixel pal', 'You']; visitor = names[(names.indexOf(visitor) + 1) % names.length]; try { localStorage.setItem('vahri-canvas-name', visitor); } catch {} updateVisitor(); toast(`Make yourself at home, ${visitor}.`); });
function setPageMenu(open){document.body.classList.toggle('page-menu-open',open);$('.page-navigation').classList.toggle('menu-open',open);$$('.page-menu-toggle,.mobile-page-name').forEach(button=>button.setAttribute('aria-expanded',String(open)));}
$$('.page-menu-toggle,.mobile-page-name').forEach(button=>button.addEventListener('click',()=>setPageMenu(!$('.page-navigation').classList.contains('menu-open'))));
$$('.tool-button[data-tool]').forEach(button => button.addEventListener('click', () => { const next = button.dataset.tool; if(next==='comment'){setTool('comment');return;} const already = tool === next; if (next === 'sticker' && already && !$('#sticker-popover').hidden) setTool('move'); else setTool(next); }));
$$('[data-stamp]').forEach(button => button.addEventListener('click', () => { stamp = button.dataset.stamp; setTool('sticker', { picker: false }); }));
$$('[data-color]').forEach(button => button.addEventListener('click', () => { color = button.dataset.color; $$('[data-color]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); toast('A fresh color for your next mark.'); }));
$('#color-toggle').addEventListener('click', () => { const open = $('#options-popover').hidden; toggleNotes(false); closePopovers(); $('#options-popover').hidden = !open; $('#color-toggle').setAttribute('aria-expanded', String(open)); layoutPopovers(); });
function openComments() {
  if (!$('#notes-panel').hidden) { toggleNotes(false); return; }
  toggleNotes(true);
  const comments=allComments().sort((a,b)=>(b.node.createdAt||0)-(a.node.createdAt||0));
  const target=comments.find(entry=>entry.node.id===openNoteId)||comments.find(entry=>entry.page===page)||comments[0];
  if(target)focusComment(target);
}
function toggleNotes(open) { document.body.classList.toggle('notes-open', open); $('#notes-panel').hidden = !open; if ($('#toast').classList.contains('visible')) placeToast(); $('#notes-toggle').setAttribute('aria-expanded', String(open)); closePopovers(); if (open) { setTool('move'); renderNotes(); layoutPopovers(); } }
$('#notes-toggle').addEventListener('click', openComments);
$('#pin-comment').addEventListener('click',()=>setTool('comment')); $('#close-notes').addEventListener('click', () => toggleNotes(false));
$('#notes-composer').addEventListener('submit', e => {
  e.preventDefault(); const input = $('#notes-message'), text = input.value.trim(); if (!text) return;
  const node = { id: uid(), kind: 'comment', x: Math.max(20, Math.min(innerWidth - 60, innerWidth * .43)), y: view().scrollTop + innerHeight * .42, color, text, author: visitor, number: nextCommentNumber(), createdAt: Date.now(), anchor: titles[page] };
  openNoteId = node.id; addNode(node); input.value = ''; renderNotes(); toast('Comment added to this canvas.');
});
function undo() { if (!histories[page].length) { toast('A fresh canvas. Nothing to undo yet.'); return; } state[page] = histories[page].pop(); clearSelection(); save(); renderPage(); toast('One step back. Keep playing.'); }

$('#reset-action').addEventListener('click', () => { remember(); state[page] = blankState()[page]; clearSelection(); setTool('move'); save(); renderPage(); toast('A fresh canvas. Undo brings your marks back.'); });
const frameColors=['#c5dcff','#e4daf8','#d0ede1','#f6dce6','#f8edbb'];
function nextFrameColor(){const previous=data().nodes.filter(node=>node.kind==='frame').at(-1)?.color;const index=frameColors.indexOf(previous);return frameColors[(index+1)%frameColors.length];}
function constructionParts(el){
  el.insertAdjacentHTML('beforeend','<span class="construction-guide" aria-hidden="true"><svg><rect width="100%" height="100%" rx="32"/></svg><i></i><i></i><i></i><i></i></span><span class="construction-size" aria-hidden="true"></span>');
}
function updateFrameSize(el,width,height){const size=el.querySelector('.construction-size');if(size)size.textContent=`${Math.round(width)} × ${Math.round(height)}`;}
constructionParts($('#frame-preview'));
function framePreview(start, current) { const el = $('#frame-preview'); el.hidden = false; el.style.left = `${Math.min(start.x, current.x)}px`; el.style.top = `${Math.min(start.y, current.y) - view().scrollTop}px`; el.style.width = `${Math.abs(current.x - start.x)}px`; el.style.height = `${Math.abs(current.y - start.y)}px`; el.style.setProperty('--frame-fill',gesture?.color||nextFrameColor()); updateFrameSize(el,Math.abs(current.x-start.x),Math.abs(current.y-start.y)); }
surface.addEventListener('pointerdown', e => {
  if(page==='about'&&['first','second','third','fourth','fifth'].includes(document.body.dataset.aboutPhase))return;
  if (e.button !== 0) return; if (tool !== 'text' && tool !== 'comment') { e.preventDefault(); surface.setPointerCapture(e.pointerId); } const point = canvasPoint(e); clearSelection(); closePopovers();
  if (tool === 'pen') gesture = { kind: 'pen', stroke: { color, points: [point] } };
  else gesture = { kind: tool, start: point, end: point, color:tool==='frame'?nextFrameColor():color };
  if (tool === 'frame') framePreview(point, point); renderInk();
});
surface.addEventListener('pointermove', e => { if (!gesture) return; const point = canvasPoint(e); if (gesture.kind === 'pen') { const last = gesture.stroke.points.at(-1); if (Math.hypot(point.x - last.x, point.y - last.y) > 1.5 && gesture.stroke.points.length < 6000) gesture.stroke.points.push(point); renderInk(); } else { gesture.end = point; if (gesture.kind === 'frame') framePreview(gesture.start, point); } });
function finishGesture() {
  if (!gesture) return; const action = gesture; gesture = null; $('#frame-preview').hidden = true;
  if (action.kind === 'pen') { remember(); data().strokes.push(action.stroke); if (data().strokes.length > 100) data().strokes.shift(); save(); renderInk(); return; }
  if (action.kind === 'frame') { const wide = Math.abs(action.start.x - action.end.x) > 15; const tall = Math.abs(action.start.y - action.end.y) > 15; const node = { id: uid(), kind: 'frame', x: wide ? Math.min(action.start.x, action.end.x) : action.start.x, y: tall ? Math.min(action.start.y, action.end.y) : action.start.y, width: wide ? Math.abs(action.start.x - action.end.x) : 180, height: tall ? Math.abs(action.start.y - action.end.y) : 130, color:action.color, text: 'My little frame' }; setTool('move'); addNode(node); return; }
  if (action.kind === 'sticker') { const node = { id: uid(), kind: 'sticker', x: Math.max(6, action.start.x - 28), y: Math.max(85, action.start.y - 28), color, stamp, rotation: Math.round(Math.random() * 28 - 14) }; setTool('move'); addNode(node); return; }
  if (action.kind === 'text') { const node = { id: uid(), kind: 'text', x: Math.min(Math.max(10, action.start.x), innerWidth - 180), y: action.start.y, color, text: 'Type…' }; setTool('text', { editing: true }); const el = addNode(node); editText(el, node); return; }
  if (action.kind === 'comment') {
    const labels = { hello: 'Hello', portrait: 'Me', menu: 'Explore', elsewhere: 'Elsewhere', bio: 'About', beliefs: 'My approach', contact: 'Say hi' };
    const anchor = $$('.movable', view()).find(el => { const rect = el.getBoundingClientRect(); return action.start.x >= rect.left && action.start.x <= rect.right && action.start.y - view().scrollTop >= rect.top && action.start.y - view().scrollTop <= rect.bottom; });
    const node = { id: uid(), kind: 'comment', x: Math.min(Math.max(12, action.start.x - 12), innerWidth - Math.min(265, innerWidth - 24)), y: Math.max(90, action.start.y), color, text: '', author: visitor, number: nextCommentNumber(), anchor: labels[anchor?.dataset.object] || titles[page] };
    openNoteId = node.id; setTool('comment', { editing: true }); const el = addNode(node); focusCanvasInput($('textarea', el));
  }
}
surface.addEventListener('pointerup', () => { if (gesture?.kind !== 'text' && gesture?.kind !== 'comment') finishGesture(); });
surface.addEventListener('click', () => { if (gesture?.kind === 'text' || gesture?.kind === 'comment') finishGesture(); }); surface.addEventListener('pointercancel', () => { gesture = null; $('#frame-preview').hidden = true; renderInk(); });
document.addEventListener('pointerdown', e => {
  if (e.target.closest('.is-building-about')) return;
  if (e.target.closest('.approach-deck')&&!e.target.closest('.approach-coffee')) return;
  if (e.target.closest('.kantong-strip')) return;
  if (tool !== 'move' || e.button !== 0 || e.target.closest('dialog, .studio-header, .editing-toolbar, .tool-popover, .notes-panel')) return;
  if (e.target.closest('input,textarea,[contenteditable="true"],.gallery-panel pre')) return;
  const el = e.target.closest('.canvas-object,.movable');
  // Keep the contact stack stable during touch scrolling; its sticker stays draggable.
  if(matchMedia('(max-width:760px)').matches&&el?.matches('.contact-canvas > .movable'))return;
  if (e.target.closest('.canvas-text-content,.canvas-comment .comment-body p')) { select(el); return; }
  if (!el) { if (!e.target.closest('button,a')) clearSelection(); return; }
  const resize = e.target.closest('.resize-handle');
  if (e.target.closest('a,button') && !e.target.closest('.comment-pin')) return;
  const node = el.dataset.node ? data().nodes.find(n => n.id === el.dataset.node) : null;
  if (!node && !el.dataset.object) return;
  if(el.classList.contains('portrait-bubble'))e.preventDefault();
  select(el); const start = canvasPoint(e), initial = node ? { x: parseFloat(el.style.left), y: parseFloat(el.style.top), width: node.width, height: node.height } : (data().offsets[el.dataset.object] || { x: 0, y: 0 });
  document.body.classList.add('is-grabbing');document.dispatchEvent(new CustomEvent('studio:grab',{detail:{active:true}}));
  let moving = false; (e.target.closest('.comment-pin,.comment-body') || el).setPointerCapture(e.pointerId);
  const move = event => { const point = canvasPoint(event), dx = point.x - start.x, dy = point.y - start.y; if (!moving && Math.hypot(dx, dy) < 4) return; if (!moving) { remember(); moving = true; document.body.classList.add('is-dragging'); } if (resize && node?.kind === 'frame') { node.width = Math.max(60, initial.width + dx); node.height = Math.max(60, initial.height + dy); el.style.width = `${node.width}px`; el.style.height = `${node.height}px`; updateFrameSize(el,node.width,node.height); } else if (node) { node.x = Math.max(-10, Math.min(innerWidth - 35, initial.x + dx)); node.y = Math.max(70, initial.y + dy); styleNode(el, node); } else { data().offsets[el.dataset.object] = { x: initial.x + dx, y: initial.y + dy }; el.style.translate = `${initial.x + dx}px ${initial.y + dy}px`; } };
  const end = () => { window.removeEventListener('blur', end);el.removeEventListener('lostpointercapture', end);el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end); document.body.classList.remove('is-dragging','is-grabbing');document.dispatchEvent(new CustomEvent('studio:grab',{detail:{active:false,moved:moving}})); if (moving) { suppressClick = true; setTimeout(() => suppressClick = false, 100); save(); } };
  window.addEventListener('blur', end,{once:true});el.addEventListener('lostpointercapture',end);el.addEventListener('pointermove', move); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
});
document.addEventListener('click', e => { if (!e.target.closest('.tool-popover, .editing-toolbar')) closePopovers(); if (!e.target.closest('.page-navigation')) { setPageMenu(false); } });
document.addEventListener('keydown', e => {
  const editing = e.target.closest('input,textarea,[contenteditable="true"],#docs-preview-mount') || document.activeElement?.closest('input,textarea,[contenteditable="true"],#docs-preview-mount');
  if (e.defaultPrevented || e.isComposing) return;
  if (e.key === 'Escape') { if (editing) e.target.blur(); setTool('move'); clearSelection(); closePopovers(); setPageMenu(false); return; }
  if (editing || $('dialog[open]')) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selected?.dataset.node) { e.preventDefault(); removeNode(selected.dataset.node); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const shortcuts = { v: 'move', f: 'frame', t: 'text', p: 'pen', s: 'sticker', c: 'comment' }; if (shortcuts[e.key.toLowerCase()]) { e.preventDefault(); setTool(shortcuts[e.key.toLowerCase()]); }
});
$$('.copy-email').forEach(button => button.addEventListener('click', async () => { try { await navigator.clipboard.writeText('vhrimlna@gmail.com'); toast('Email copied. Say hello whenever you like!'); } catch { toast('My email is vhrimlna@gmail.com'); } }));
const projectDetails = { clearclaim: { title: 'ClearClaim', category: 'SAAS · REIMBURSEMENT MANAGEMENT', description: 'A reimbursement management tool for teams. An exploration of making complex administrative workflows feel clearer and easier to navigate.' }, zesty: { title: 'Zesty', category: 'HEALTH · MOBILE APP', description: 'A mobile kantong-tracking app. An exploration of thoughtful interfaces for everyday habits and a more approachable way to present nutrition information.' }, indolink: { title: 'IndoLink', category: 'E-COMMERCE · LINK-IN-BIO BUILDER', description: 'A link-in-bio builder for e-commerce brands. An exploration of tools that help brands bring their online presence together.' } };
let projectTrigger;
$$('[data-project]').forEach(button => button.addEventListener('click', () => {
  const project = projectDetails[button.dataset.project]; projectTrigger = button; const detail = document.createElement('article'); detail.className = 'project-detail';
  const eyebrow = document.createElement('span'); eyebrow.className = 'eyebrow'; eyebrow.textContent = project.category; const title = document.createElement('h2'); title.id = 'project-title'; title.textContent = project.title; const description = document.createElement('p'); description.textContent = project.description;
  const visual = $('.project-visual', button).cloneNode(true); const note = document.createElement('div'); note.className = 'detail-note'; note.textContent = 'An early look at the visual direction. This preview is an illustrative interface study. Original project screens, design decisions, and outcomes will be added to the full case study.';
  const link = document.createElement('a'); link.className = 'pill mint'; link.textContent = 'Ask me about this project ↗'; link.href = `mailto:vhrimlna@gmail.com?subject=${encodeURIComponent(`Let’s talk about ${project.title}`)}`;
  detail.append(eyebrow, title, description, visual, note, link); $('#project-content').replaceChildren(detail); $('#project-dialog').showModal();
}));
$$('dialog').forEach(dialog => { $('.dialog-close', dialog).addEventListener('click', () => dialog.close()); dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } }); });
$('#project-dialog').addEventListener('close', () => projectTrigger?.focus({ preventScroll: true }));
$$('[data-view]').forEach(el => el.addEventListener('scroll', renderInk, { passive: true }));
let legacyNumber = Math.max(0, ...allComments(true).map(entry => entry.node.number || 0)); allComments(true).forEach(entry => { if (!entry.node.number) entry.node.number = ++legacyNumber; });
addEventListener('resize', () => { layoutPopovers(); data().nodes.forEach(node => { const el = $(`[data-node="${node.id}"]`, view()); if (el) styleNode(el, node); }); });
addEventListener('hashchange', route); addEventListener('resize', resizeInk); updateVisitor(); route(); resizeInk();

// Spotify controls playback inside the embed; opening the panel never auto-plays audio.
const spotifyUrl = 'https://open.spotify.com/embed/playlist/6yhMQJRkJN6nZE0iV7P7aE?utm_source=generator&theme=0';
function toggleMusic(open) {
  const panel = $('#music-panel');
  panel.hidden = !open;
  $('#music-toggle').setAttribute('aria-expanded', String(open));
  if (open && !$('#spotify-frame').getAttribute('src')) $('#spotify-frame').src = spotifyUrl;
}
$('#music-toggle').addEventListener('click', () => toggleMusic($('#music-panel').hidden));
document.addEventListener('click', e => { if (!e.target.closest('.music-widget')) toggleMusic(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMusic(false); });

// The résumé destination will be connected when the full page is ready.
document.querySelector('.chapter-resume')?.addEventListener('click',()=>toast('My full résumé is coming soon.'));

// A contained, manual carousel: arrows, dots, keyboard, and horizontal swipe.
(() => {
  const deck=document.querySelector('.approach-deck');if(!deck)return;
  const slides=[...deck.querySelectorAll('.approach-slide')],dots=[...deck.querySelectorAll('[data-approach]')],region=deck.querySelector('.approach-slides');
  let current=0,busy=false,touchStart=null;
  async function show(index){
    if(busy||deck.closest('.awaiting-build,.is-building-about'))return;
    const next=(index+slides.length)%slides.length;if(next===current)return;
    busy=true;deck.dataset.swiping='true';
    const previous=current,direction=index>current?1:-1,motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
    const outgoing=slides[previous],incoming=slides[next],oldHeight=outgoing.getBoundingClientRect().height,width=region.clientWidth;
    const previousStyle={position:outgoing.style.position,left:outgoing.style.left,top:outgoing.style.top,width:outgoing.style.width};
    region.classList.add('is-swiping');region.style.height=`${oldHeight}px`;
    Object.assign(outgoing.style,{position:'absolute',left:'0',top:'0',width:'100%'});incoming.hidden=false;
    const newHeight=incoming.getBoundingClientRect().height;current=next;
    dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===current)));
    deck.querySelector('.approach-counter').textContent=`0${current+1} / 03`;
    deck.querySelector('.approach-status').textContent=`${current+1} of ${slides.length}: ${slides[current].querySelector('h3').textContent}`;
    if(motion){
      const options={duration:540,easing:'cubic-bezier(.22,.8,.25,1)'},distance=width+24;
      const transitions=[outgoing.animate([{transform:'translateX(0)'},{transform:`translateX(${-direction*distance}px)`}],options),incoming.animate([{transform:`translateX(${direction*distance}px)`},{transform:'translateX(0)'}],options),region.animate([{height:`${oldHeight}px`},{height:`${newHeight}px`}],options)];
      await Promise.all(transitions.map(animation=>animation.finished.catch(()=>{})));
    }
    outgoing.hidden=true;Object.assign(outgoing.style,previousStyle);region.style.height='';region.classList.remove('is-swiping');deck.dataset.swiping='false';
    busy=false;
  }
  deck.querySelector('.approach-prev').addEventListener('click',()=>show(current-1));
  deck.querySelector('.approach-next').addEventListener('click',()=>show(current+1));
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i)));
  deck.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();show(current+(event.key==='ArrowRight'?1:-1));}});
  region.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')touchStart={x:event.clientX,y:event.clientY};});
  region.addEventListener('pointerup',event=>{if(!touchStart)return;const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)show(current+(dx<0?1:-1));});
  region.addEventListener('pointercancel',()=>touchStart=null);
})();

document.querySelector('.more-resume')?.addEventListener('click',()=>toast('My full résumé is coming soon.'));
