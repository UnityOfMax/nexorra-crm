/* Wagsworth & Co. — Site JS */

(function () {
  // ===== Sticky header =====
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 40) header.classList.add('solid');
      else header.classList.remove('solid');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ===== Mobile nav toggle =====
  const navToggle = document.querySelector('.nav-toggle');
  if (navToggle && header) {
    navToggle.addEventListener('click', () => {
      header.classList.toggle('nav-open');
    });
  }

  // ===== Reveal on scroll =====
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // ===== FAQ accordion =====
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // close siblings in the same list
      const list = item.parentElement;
      list.querySelectorAll('.faq-item.open').forEach((i) => {
        if (i !== item) {
          i.classList.remove('open');
          const aa = i.querySelector('.faq-a'); if (aa) aa.style.maxHeight = '0px';
        }
      });
      if (isOpen) {
        item.classList.remove('open');
        a.style.maxHeight = '0px';
      } else {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  // ===== Service chips (contact form) =====
  document.querySelectorAll('.chips').forEach((group) => {
    const hidden = group.parentElement.querySelector('input[type=hidden]');
    group.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        group.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
        chip.classList.add('on');
        if (hidden) hidden.value = chip.dataset.value || chip.textContent.trim();
      });
    });
  });

  // ===== Contact form (fake submit) =====
  const form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const success = form.querySelector('.form-success');
      if (success) success.classList.remove('hidden');
      form.querySelectorAll('input[type=text], input[type=email], input[type=tel], textarea').forEach((i) => { i.value = ''; });
      form.querySelectorAll('.chip.on').forEach((c) => c.classList.remove('on'));
      const hidden = form.querySelector('input[type=hidden]');
      if (hidden) hidden.value = '';
      // Auto-hide after a moment
      setTimeout(() => { if (success) success.classList.add('hidden'); }, 6000);
    });
  }

  // ===== Hero video graceful fallback =====
  document.querySelectorAll('video[data-hero]').forEach((v) => {
    const stopVideo = () => {
      v.querySelectorAll('source').forEach((s) => s.remove());
      v.removeAttribute('src');
      try { v.load(); } catch (_) {}
      // Keep the element visible so the poster image remains as the hero background
    };
    v.addEventListener('error', stopVideo);
    // If after 4 s the video hasn't started playing, drop the sources but keep the poster
    setTimeout(() => { if (v.readyState < 2) stopVideo(); }, 4000);
  });

  // ===== Gallery lightbox-lite =====
  const galleryItems = document.querySelectorAll('.g-item');
  if (galleryItems.length) {
    const overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    overlay.innerHTML = '<button class="lb-close" aria-label="Close">×</button><img alt=""><div class="lb-caption"></div>';
    document.body.appendChild(overlay);
    const lbImg = overlay.querySelector('img');
    const lbCap = overlay.querySelector('.lb-caption');
    const close = () => { overlay.classList.remove('on'); document.body.style.overflow = ''; };
    overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.classList.contains('lb-close')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    galleryItems.forEach((it) => {
      it.style.cursor = 'zoom-in';
      it.addEventListener('click', () => {
        const img = it.querySelector('img');
        const tag = it.querySelector('.tag');
        if (!img) return;
        lbImg.src = img.src;
        lbCap.textContent = tag ? tag.textContent : '';
        overlay.classList.add('on');
        document.body.style.overflow = 'hidden';
      });
    });
  }
})();

// Lightbox styles injected
(function () {
  const css = `
  .lb-overlay {
    position: fixed; inset: 0;
    background: rgba(26,22,18,0.92);
    backdrop-filter: blur(6px);
    z-index: 200;
    display: none;
    align-items: center; justify-content: center;
    padding: 40px;
  }
  .lb-overlay.on { display: flex; }
  .lb-overlay img { max-width: 92vw; max-height: 85vh; object-fit: contain; border-radius: 4px; }
  .lb-overlay .lb-close {
    position: absolute; top: 20px; right: 24px;
    color: var(--cream); font-size: 36px; line-height: 1;
    width: 48px; height: 48px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    transition: background 0.2s;
  }
  .lb-overlay .lb-close:hover { background: rgba(255,255,255,0.18); }
  .lb-caption {
    position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
    color: rgba(243,237,225,0.75);
    font-family: var(--font-mono, monospace);
    font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
  }
  `;
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
})();
