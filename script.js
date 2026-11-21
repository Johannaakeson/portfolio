// karusell: faderar in + glider upp till sin plats första gången den rullas in i vy
const carouselRevealTarget = document.getElementById('carouselWrap');
const carouselRevealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      carouselRevealTarget.classList.add('in-view');
      carouselRevealObserver.unobserve(carouselRevealTarget);
    }
  });
}, { threshold: 0.2 });
carouselRevealObserver.observe(carouselRevealTarget);

// Infoknappen öppnar panelen och (CLOSE) stänger den.
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

// panelens bredd: på mobil täcker den hela skärmen (sätts i CSS via media query,
// ingen uträkning behövs). På desktop/tablet mäts vänsterkanten mot titelns
// vänsterkant, precis som tidigare.
const hdrRole = document.querySelector('.hdr-role');
function updatePanelWidth() {
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  if (mobile) {
    panel.style.width = ''; // låt CSS (100%) styra
    return;
  }
  const buffer = 14;
  const leftEdge = hdrRole.getBoundingClientRect().left - buffer;
  const width = window.innerWidth - leftEdge;
  panel.style.width = width + 'px';
}
updatePanelWidth();
window.addEventListener('resize', updatePanelWidth);

// ===== KARUSELL =====
const carousel = document.getElementById('carousel');
const wrap = document.getElementById('carouselWrap');

// Lägg kopior före och efter originalen så att karusellen kan loopa åt båda håll.
const projectCards = Array.from(carousel.children);
function cloneProjectCards() {
  return projectCards.map((card) => {
    const clone = card.cloneNode(true);
    clone.classList.add('card-clone');
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('img').forEach((image) => { image.alt = ''; });
    return clone;
  });
}
carousel.prepend(...cloneProjectCards());
carousel.append(...cloneProjectCards());

function getStep() {
  const firstCard = projectCards[0];
  const gap = Number.parseFloat(getComputedStyle(carousel).columnGap) || 0;
  return firstCard ? firstCard.getBoundingClientRect().width + gap : 500;
}
function getSetWidth() {
  return getStep() * projectCards.length;
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

// Klicka på en sida för att bläddra, eller dra tydligt i sidled.
let gesture = null;

wrap.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  gesture = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: carousel.scrollLeft,
    threshold: event.pointerType === 'touch' ? 24 : 10,
    axis: null,
  };
});
window.addEventListener('pointermove', (event) => {
  if (gesture?.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;

  if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= gesture.threshold) {
    gesture.axis = Math.abs(dx) >= Math.abs(dy) * 1.5 ? 'x' : 'y';
  }
  if (gesture.axis !== 'x') return;

  carousel.scrollLeft = gesture.left - dx;
  const beforeWrap = carousel.scrollLeft;
  normalizeScroll();
  gesture.left += carousel.scrollLeft - beforeWrap;
});
window.addEventListener('pointercancel', (event) => {
  if (gesture?.id !== event.pointerId) return;
  if (gesture.axis === 'x') snapToNearest();
  gesture = null;
});
window.addEventListener('pointerup', (event) => {
  if (gesture?.id !== event.pointerId) return;
  const { axis, x, y, threshold } = gesture;
  gesture = null;
  if (axis === 'x') {
    snapToNearest();
  } else if (!axis && Math.hypot(event.clientX - x, event.clientY - y) < threshold) {
    const rect = wrap.getBoundingClientRect();
    const direction = event.clientX - rect.left > rect.width / 2 ? 1 : -1;
    scrollToIndex(currentIndex() + direction);
  }
});

// Kräv en tydlig horisontell rörelse på styrplattan.
const wheelThreshold = 28;
const wheelPause = 150;
let wheelTravel = 0;
let wheelActive = false;
let wheelTimer;

function finishWheel() {
  if (wheelActive) snapToNearest();
  wheelTravel = 0;
  wheelActive = false;
}

wrap.addEventListener('wheel', (event) => {
  const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? carousel.clientWidth : 1;
  const dx = event.deltaX * scale;
  const dy = event.deltaY * scale;
  if (dx === 0 || Math.abs(dx) < Math.abs(dy) * 1.5) {
    clearTimeout(wheelTimer);
    finishWheel();
    return;
  }

  wheelTravel += dx;
  wheelActive ||= Math.abs(wheelTravel) >= wheelThreshold;
  if (wheelActive) {
    event.preventDefault();
    carousel.scrollLeft += dx * 0.75;
  }

  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(finishWheel, wheelPause);
}, { passive: false });
