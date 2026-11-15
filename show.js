const one = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];
const still = matchMedia('(max-width: 700px), (prefers-reduced-motion: reduce)');
const camera = one('.camera');
const cameraImage = one('.camera img');
const target = one('.stroke-target');
const track = one('.track');
const header = one('header');
const chapterLinks = all('nav a').map(link => [link, document.querySelector(link.hash)]);
const shots = [[.5,.5,1],[.825,.347,4.7],[.861,.329,6.2]];
const notes = ['先看展出册页，再沿着同一笔放大。','看「赤」字中部的长横，左端微顿，笔画向右上斜提。','看同一横的右端，浓墨渐薄，边缘显出细碎的露白。'];
let selected = 0;
let manual = false;
let framePending = false;

function press(selector, key, value) {
  all(selector).forEach(button => button.setAttribute('aria-pressed', String(+button.dataset[key] === value)));
}

function cameraAt(position) {
  const index = Math.min(1, Math.floor(position));
  const fraction = position - index;
  const [x,y,z] = shots[index].map((value, i) => value + (shots[index+1][i]-value)*fraction);
  camera.style.setProperty('--x', ((.5-x)*z*cameraImage.offsetWidth) + 'px');
  camera.style.setProperty('--y', ((.5-y)*z*cameraImage.offsetHeight) + 'px');
  camera.style.setProperty('--z', z);
  target.style.left = 'calc(50% + ' + ((.846-x)*z*cameraImage.offsetWidth) + 'px)';
  target.style.top = 'calc(50% + ' + ((.338-y)*z*cameraImage.offsetHeight) + 'px)';
  target.style.opacity = cameraImage.naturalWidth ? Math.max(0,1-position*2) : 0;
  one('.camera-scale').textContent = Math.round(z*100)+'%';
  const nearest = Math.round(position);
  if (nearest !== selected) {
    press('[data-shot]', 'shot', nearest);
    one('#brush-note').textContent = notes[nearest];
    selected = nearest;
  }
}

function updateScroll() {
  framePending = false;
  const reading = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
  header.style.setProperty('--reading', Math.min(1, reading));
  const activeChapter = chapterLinks.findLastIndex(([, chapter]) => chapter.getBoundingClientRect().top <= innerHeight * .42);
  chapterLinks.forEach(([link], index) => {
    if (index === activeChapter) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  if (still.matches || manual) return;
  const distance = track.offsetHeight - one('.sticky').offsetHeight;
  if (distance <= 0) return;
  one('#brush-note').setAttribute('aria-live', 'off');
  const progress = Math.max(0, Math.min(1, (78-track.getBoundingClientRect().top)/distance));
  camera.classList.add('live');
  cameraAt(progress < .72 ? progress/.72*2 : (1-progress)/.28*2);
}

addEventListener('scroll', () => {
  if (!framePending) {
    framePending = true;
    requestAnimationFrame(updateScroll);
  }
}, {passive:true});
new ResizeObserver(() => {
  if (manual || still.matches) cameraAt(selected);
  else updateScroll();
}).observe(camera);
cameraImage.addEventListener('load', () => cameraAt(selected));
all('[data-shot]').forEach(button => button.addEventListener('click', () => {
  manual = true;
  one('#brush-note').setAttribute('aria-live', 'polite');
  camera.classList.remove('live');
  cameraAt(+button.dataset.shot);
}));
new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) manual = false;
}, {rootMargin:'150px'}).observe(track);

const compare = one('.compare');
const range = one('.compare input');
function mix(value) {
  range.value = value;
  range.setAttribute('aria-valuetext', '浓墨 '+value+'%，枯笔 '+(100-value)+'%');
  compare.dataset.mode = value === 0 ? 'dry' : value === 100 ? 'wet' : 'both';
  compare.style.setProperty('--cut', value+'%');
  press('[data-mix]', 'mix', value);
}
range.addEventListener('input', () => mix(+range.value));
all('[data-mix]').forEach(button => button.addEventListener('click', () => mix(+button.dataset.mix)));

all('[data-layout]').forEach(button => button.addEventListener('click', () => {
  const mode = +button.dataset.layout;
  press('[data-layout]', 'layout', mode);
  one('.marks').hidden = !mode;
  all('.marks button').forEach(mark => mark.setAttribute('aria-pressed','false'));
  one('#space-note').textContent = mode ? '选择画面上的标注。' : '先看扇面全幅。';
}));
all('.marks button').forEach(button => button.addEventListener('click', () => {
  all('.marks button').forEach(mark => mark.setAttribute('aria-pressed',String(mark === button)));
  one('#space-note').textContent = button.dataset.note;
}));

const dialog = one('dialog');
const viewport = one('.viewer');
const viewImage = one('.viewer img');
const status = one('.viewer-status');
const names = {brush:'张瑞图 ·《赤壁赋》展出册页',ink:'王铎 · 临《贤兄帖》',space:'沈周 ·《赠汉文诗》'};
let zoom = 1, x = 0, y = 0, opener, request = 0;
const contacts = new Map();

function renderViewer() {
  const limitX = Math.max(0,(viewImage.offsetWidth*zoom-viewport.clientWidth)/2);
  const limitY = Math.max(0,(viewImage.offsetHeight*zoom-viewport.clientHeight)/2);
  x = Math.max(-limitX,Math.min(limitX,x));
  y = Math.max(-limitY,Math.min(limitY,y));
  viewImage.style.setProperty('--zoom',zoom);
  viewImage.style.setProperty('--px',x+'px');
  viewImage.style.setProperty('--py',y+'px');
}

function zoomAt(level, pointX = 0, pointY = 0) {
  const next = Math.max(1,Math.min(8,level));
  const ratio = next / zoom;
  x = pointX - (pointX - x) * ratio;
  y = pointY - (pointY - y) * ratio;
  zoom = next;
  renderViewer();
}

function changeZoom(direction) {
  zoomAt(direction ? zoom * Math.pow(1.4,direction) : 1);
}

all('[data-art]').forEach(button => button.addEventListener('click', () => {
  const art = button.dataset.art;
  const current = ++request;
  opener = button;
  one('#viewer-title').textContent = names[art];
  viewImage.alt = names[art];
  viewImage.src = art+'-preview.webp';
  status.textContent = '正在加载高清图…';
  dialog.showModal();
  changeZoom(0);
  one('#close').focus();
  const hd = new Image();
  hd.onload = () => {
    if (current !== request || !dialog.open) return;
    viewImage.src = hd.src;
    status.textContent = '放大后可拖动查看';
  };
  hd.onerror = () => {
    if (current === request && dialog.open) status.textContent = '高清图暂时无法加载，当前显示预览图。';
  };
  hd.src = art+'.jpg';
}));
viewImage.addEventListener('load', renderViewer);
new ResizeObserver(renderViewer).observe(viewport);
one('#close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  contacts.clear();
  opener?.focus({preventScroll:true});
});
all('[data-zoom]').forEach(button => button.addEventListener('click', () => changeZoom(+button.dataset.zoom)));
viewport.addEventListener('pointerdown', event => {
  if (event.button !== 0 || contacts.size >= 2) return;
  viewport.setPointerCapture(event.pointerId);
  contacts.set(event.pointerId, {x:event.clientX,y:event.clientY});
});
viewport.addEventListener('pointermove', event => {
  const previous = contacts.get(event.pointerId);
  if (!previous) return;
  const next = {x:event.clientX,y:event.clientY};
  contacts.set(event.pointerId,next);
  if (contacts.size === 1) {
    x += next.x - previous.x;
    y += next.y - previous.y;
    renderViewer();
    return;
  }
  const other = [...contacts.entries()].find(([id]) => id !== event.pointerId)[1];
  const before = Math.hypot(previous.x-other.x,previous.y-other.y);
  const after = Math.hypot(next.x-other.x,next.y-other.y);
  const box = viewport.getBoundingClientRect();
  zoomAt(zoom * after / Math.max(1,before), (next.x+other.x)/2-box.left-box.width/2, (next.y+other.y)/2-box.top-box.height/2);
});
viewport.addEventListener('lostpointercapture', event => contacts.delete(event.pointerId));
viewport.addEventListener('wheel', event => {
  event.preventDefault();
  const box = viewport.getBoundingClientRect();
  zoomAt(zoom * Math.exp(-Math.sign(event.deltaY) * .16), event.clientX-box.left-box.width/2,event.clientY-box.top-box.height/2);
}, {passive:false});
viewport.addEventListener('keydown', event => {
  const directions = {ArrowLeft:[35,0],ArrowRight:[-35,0],ArrowUp:[0,35],ArrowDown:[0,-35]};
  const delta = directions[event.key];
  if (!delta) return;
  event.preventDefault();
  x += delta[0];
  y += delta[1];
  renderViewer();
});



new IntersectionObserver(([entry], observer) => {
  if (!entry.isIntersecting) return;
  observer.disconnect();
  const detail = new Image();
  detail.onload = () => { cameraImage.src = detail.src; };
  detail.src = 'brush.jpg';
}, {rootMargin:'180px'}).observe(camera);
