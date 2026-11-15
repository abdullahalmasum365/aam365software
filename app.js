/**
 * aam365 SOFTWARE - Apple Full-Screen Scrollytelling Engine
 * First view: Only the 3D Puzzle. Text reveals only on scroll down.
 */

document.addEventListener('DOMContentLoaded', () => {
  initFullScreenScrollytelling();
  initMobileNav();
  initModals();
  initSmoothScroll();
});

/* ============================================================
   1. FULL SCREEN SCROLLYTELLING CANVAS & SCROLL-TRIGGERED NARRATIVE
   ============================================================ */
function initFullScreenScrollytelling() {
  const canvas = document.getElementById('hero-canvas');
  const track = document.getElementById('hero-scroll-track');
  const scrollPrompt = document.getElementById('scroll-prompt');

  // Chapters
  const ch1 = document.getElementById('story-ch-1');
  const ch2 = document.getElementById('story-ch-2');
  const ch3 = document.getElementById('story-ch-3');

  if (!canvas || !track) return;
  const ctx = canvas.getContext('2d');

  const TOTAL_FRAMES = 120;
  const frames = [];
  let currentFrameIndex = 0;

  const getFramePath = (index) => {
    const pad = String(index).padStart(3, '0');
    return `assets/frames/frame_${pad}.webp`;
  };

  // Preload first frame immediately
  const firstFrame = new Image();
  firstFrame.src = getFramePath(0);
  firstFrame.onload = () => {
    frames[0] = firstFrame;
    renderFrame(0);
    preloadRemaining();
  };

  function preloadRemaining() {
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        frames[i] = img;
      };
    }
  }

  // Resize canvas to full viewport with device pixel ratio
  function resizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    renderFrame(currentFrameIndex);
  }

  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 50);

  // Render frame full bleed (object-cover)
  function renderFrame(index) {
    const img = frames[index] || frames[0];
    if (!img || !img.complete) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    // Compute object-cover scale
    const scale = Math.max(w / img.width, h / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const offX = (w - drawW) / 2;
    const offY = (h - drawH) / 2;

    ctx.drawImage(img, offX, offY, drawW, drawH);
  }

  // Smooth scroll sync with requestAnimationFrame
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScrollState();
        ticking = false;
      });
      ticking = true;
    }
  }

  function updateScrollState() {
    const rect = track.getBoundingClientRect();
    const maxScroll = rect.height - window.innerHeight;
    if (maxScroll <= 0) return;

    const rawProgress = -rect.top / maxScroll;
    const progress = Math.max(0, Math.min(1, rawProgress));

    // Map scroll progress to video frames 0..119
    const targetFrame = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * TOTAL_FRAMES));
    if (targetFrame !== currentFrameIndex) {
      currentFrameIndex = targetFrame;
      renderFrame(currentFrameIndex);
    }

    // Helper for smooth opacity curve
    function updateChapter(element, start, peakStart, peakEnd, end) {
      if (!element) return;
      if (progress < start || progress > end) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(24px) scale(0.97)';
        element.style.pointerEvents = 'none';
        return;
      }

      let opacity = 1;
      let translateY = 0;

      if (progress < peakStart) {
        const factor = (progress - start) / (peakStart - start);
        opacity = factor;
        translateY = (1 - factor) * 24;
      } else if (progress > peakEnd) {
        const factor = 1 - (progress - peakEnd) / (end - peakEnd);
        opacity = factor;
        translateY = (1 - factor) * -24;
      }

      element.style.opacity = Math.max(0, Math.min(1, opacity)).toFixed(2);
      element.style.transform = `translateY(${translateY.toFixed(1)}px) scale(1)`;
      element.style.pointerEvents = opacity > 0.4 ? 'auto' : 'none';
    }

    // INITIAL VIEW: If progress < 0.08, ONLY THE 3D PUZZLE IS VISIBLE (Zero text)
    // CHAPTER 1 (Headline & Mission): Reveals only as user scrolls down (0.10 to 0.38)
    updateChapter(ch1, 0.09, 0.16, 0.28, 0.36);

    // CHAPTER 2 (Cross-Platform Complexity Solved): Reveals on continued scroll (0.39 to 0.68)
    updateChapter(ch2, 0.39, 0.46, 0.58, 0.66);

    // CHAPTER 3 (Privacy-First & Store Ready): Reveals at solved state (0.69 to 0.98)
    updateChapter(ch3, 0.69, 0.76, 0.94, 0.99);

    // Scroll prompt fades out once user starts scrolling
    if (scrollPrompt) {
      scrollPrompt.style.opacity = progress > 0.06 ? '0' : '1';
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateScrollState();
}

/* ============================================================
   2. GLOBAL TOAST NOTIFICATION
   ============================================================ */
function showToast(message) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'fixed bottom-6 right-6 z-50 bg-zinc-900/95 text-white border border-white/20 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 transition-all duration-300 transform translate-y-12 opacity-0 text-sm font-medium';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
    <span>${message}</span>
  `;
  toast.classList.remove('translate-y-12', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-12', 'opacity-0');
  }, 3000);
}

/* ============================================================
   3. MOBILE NAVIGATION DRAWER
   ============================================================ */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('mobile-drawer-close');
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  if (toggleBtn && drawer) {
    toggleBtn.addEventListener('click', () => {
      drawer.classList.remove('translate-x-full');
      document.body.style.overflow = 'hidden';
    });

    const closeDrawer = () => {
      drawer.classList.add('translate-x-full');
      document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    navLinks.forEach(link => link.addEventListener('click', closeDrawer));
  }
}


/* ============================================================
   5. PRIVACY POLICY & TERMS MODALS
   ============================================================ */
function initModals() {
  const privacyModal = document.getElementById('modal-privacy');
  const termsModal = document.getElementById('modal-terms');
  
  const openPrivacyBtn = document.getElementById('btn-open-privacy');
  const openTermsBtn = document.getElementById('btn-open-terms');
  
  const closePrivacyBtn = document.getElementById('btn-close-privacy');
  const closeTermsBtn = document.getElementById('btn-close-terms');

  const openModal = (m) => {
    if (!m) return;
    m.classList.remove('hidden');
    m.classList.add('flex');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = (m) => {
    if (!m) return;
    m.classList.add('hidden');
    m.classList.remove('flex');
    document.body.style.overflow = '';
  };

  if (openPrivacyBtn) openPrivacyBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(privacyModal); });
  if (openTermsBtn) openTermsBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(termsModal); });
  if (closePrivacyBtn) closePrivacyBtn.addEventListener('click', () => closeModal(privacyModal));
  if (closeTermsBtn) closeTermsBtn.addEventListener('click', () => closeModal(termsModal));

  [privacyModal, termsModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    }
  });
}

/* ============================================================
   6. SMOOTH SCROLL FOR ALL ANCHORS
   ============================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}
