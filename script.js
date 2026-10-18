// header: byter färg när man scrollat förbi herovideon
const heroHeight = document.querySelector('.hero').offsetHeight;
window.addEventListener('scroll', () => {
  document.body.classList.toggle('scrolled', window.scrollY > heroHeight - 80);
});

// hero: snabb inblandning när videon är redo att spelas, så bara en kort
// neutral gråton syns innan dess (istället för en abrupt växling)
const heroVideo = document.getElementById('heroVideo');
function markHeroReady() { heroVideo.classList.add('is-ready'); }
if (heroVideo.readyState >= 2) markHeroReady();
heroVideo.addEventListener('loadeddata', markHeroReady);

// info-panel: Info-knappen i headern öppnar, (Close) stänger
const panel = document.getElementById('infoPanel');
const openBtn = document.getElementById('infoToggle');
const closeBtn = document.getElementById('closeBtn');
const heroVideos = document.querySelectorAll('.hero-media');
function setPanel(open) {
  panel.classList.toggle('open', open);
  document.body.classList.toggle('panel-open', open);
  heroVideos.forEach(v => { open ? v.pause() : v.play(); });
}
openBtn.addEventListener('click', () => setPanel(true));
closeBtn.addEventListener('click', () => setPanel(false));

// panelens bredd: vänsterkanten hamnar vid den centrerade titelns vänsterkant
const hdrRole = document.querySelector('.hdr-role');
function updatePanelWidth() {
  const rect = hdrRole.getBoundingClientRect();
  const buffer = 14;
  const leftEdge = rect.left - buffer;
  const width = window.innerWidth - leftEdge;
  panel.style.width = width + 'px';
}
updatePanelWidth();
window.addEventListener('resize', updatePanelWidth);

// ===== KARUSELL =====
const carousel = document.getElementById('carousel');
const wrap = document.getElementById('carouselWrap');
let autoScrollTimer;
let autoPaused = false;
function isMobile() {
  return window.matchMedia('(max-width: 700px)').matches;
}

// Oändlig skroll åt båda håll: korten ligger som tre set i DOM:en (klon-FÖRE +
// original + klon-EFTER). Vi startar i mitten och hoppar tyst +/- ett sets
// bredd när man skrollar in i ett klon-set, så det känns som en oändlig loop.
const REAL_COUNT = 6;
function getStep() {
  const firstCard = carousel.querySelector('.card-item');
  return firstCard ? firstCard.getBoundingClientRect().width + 12 : 500;
}
function getSetWidth() {
  return getStep() * REAL_COUNT;
}
function normalizeScroll() {
  const w = getSetWidth();
  if (carousel.scrollLeft < w * 0.5) {
    carousel.scrollLeft += w;
  } else if (carousel.scrollLeft >= w * 1.5) {
    carousel.scrollLeft -= w;
  }
}
carousel.scrollLeft = getSetWidth();

// autoscroll (endast mobil)
function startAutoScroll() {
  clearInterval(autoScrollTimer);
  if (!isMobile()) return;
  autoScrollTimer = setInterval(() => {
    if (autoPaused) return;
    carousel.scrollLeft += 1;
    normalizeScroll();
  }, 30);
}
startAutoScroll();
window.addEventListener('resize', startAutoScroll);

// indexbaserad snap: varje "sida" är en kortbredd (+ gap) från start, så ett
// kort alltid landar exakt i marginalen oavsett drag, klick eller skrollhjul
function currentIndex() {
  return Math.round(carousel.scrollLeft / getStep());
}
function scrollToIndex(idx) {
  const step = getStep();
  carousel.scrollTo({ left: idx * step, behavior: 'smooth' });
  clearTimeout(scrollToIndex._t);
  scrollToIndex._t = setTimeout(normalizeScroll, 450);
}
function snapToNearest() {
  scrollToIndex(currentIndex());
}

// dra med handen, + klick vänster/höger för att bläddra
let isDown = false, dragged = false, startX = 0, scrollStart = 0;

wrap.addEventListener('pointerdown', (e) => {
  isDown = true; dragged = false; autoPaused = true;
  startX = e.clientX; scrollStart = carousel.scrollLeft;
});
window.addEventListener('pointermove', (e) => {
  if (!isDown) return;
  const dx = e.clientX - startX;
  if (Math.abs(dx) > 6) dragged = true;
  carousel.scrollLeft = scrollStart - dx;
  // tyst hopp mellan set mitt i en dragning (för långa svep)
  const w = getSetWidth();
  if (carousel.scrollLeft < w * 0.5) {
    carousel.scrollLeft += w; scrollStart += w;
  } else if (carousel.scrollLeft >= w * 1.5) {
    carousel.scrollLeft -= w; scrollStart -= w;
  }
});
window.addEventListener('pointerup', (e) => {
  if (!isDown) return;
  isDown = false;
  if (!dragged) {
    const rect = wrap.getBoundingClientRect();
    const isRight = (e.clientX - rect.left) > rect.width / 2;
    scrollToIndex(currentIndex() + (isRight ? 1 : -1));
  } else {
    snapToNearest();
  }
  setTimeout(() => { autoPaused = false; }, 600);
});

// skrollhjul/styrplatta bläddrar karusellen, med en kort fördröjning så
// vanlig sidskroll hinner passera förbi karusellen ner till footern innan
// karusellen tar över det horisontella skrollet
const WHEEL_ENGAGE_DELAY = 500;
const WHEEL_IDLE_RESET = 500;
let wheelEngaged = false;
let wheelEngageTimer = null;
let wheelIdleTimer = null;
let wheelSnapTimer;

function disengageWheel() {
  wheelEngaged = false;
  clearTimeout(wheelEngageTimer);
  wheelEngageTimer = null;
}
wrap.addEventListener('mouseleave', disengageWheel);

wrap.addEventListener('wheel', (e) => {
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (delta === 0) return;

  clearTimeout(wheelIdleTimer);
  wheelIdleTimer = setTimeout(disengageWheel, WHEEL_IDLE_RESET);

  if (!wheelEngaged) {
    if (!wheelEngageTimer) {
      wheelEngageTimer = setTimeout(() => { wheelEngaged = true; }, WHEEL_ENGAGE_DELAY);
    }
    return;
  }

  e.preventDefault();
  autoPaused = true;
  carousel.scrollLeft += delta;
  clearTimeout(wheelSnapTimer);
  wheelSnapTimer = setTimeout(() => {
    snapToNearest();
    autoPaused = false;
  }, 120);
}, { passive: false });
