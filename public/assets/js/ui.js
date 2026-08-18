/* ============================================================
   BlackLine Auto Care — UI behaviour
   Хедер, мобільне меню, reveal-анімації, before/after слайдер.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- sticky header ---------- */
  const header = document.getElementById('siteHeader');
  if (header) {
    let ticking = false;
    const onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        header.classList.toggle('scrolled', window.scrollY > 40);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- burger / mobile nav ---------- */
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');

  if (burger && navLinks) {
    const setOpen = function (open) {
      navLinks.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    };

    burger.addEventListener('click', function () {
      setOpen(!navLinks.classList.contains('open'));
    });

    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        setOpen(false);
        burger.focus();
      }
    });
  }

  /* ---------- reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- before / after slider ---------- */
  const baWrap = document.getElementById('baWrap');
  const baAfter = document.getElementById('baAfter');
  const baDivider = document.getElementById('baDivider');
  const baHandle = document.getElementById('baHandle');

  if (baWrap && baAfter && baDivider && baHandle) {
    let dragging = false;
    let pos = 50;

    const setPos = function (x) {
      pos = Math.max(0, Math.min(100, x));
      baAfter.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';
      baDivider.style.left = pos + '%';
      baHandle.style.left = pos + '%';
      baHandle.setAttribute('aria-valuenow', String(Math.round(pos)));
    };

    const fromClientX = function (clientX) {
      const rect = baWrap.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    };

    setPos(50);

    baHandle.addEventListener('pointerdown', function (e) {
      dragging = true;
      baHandle.setPointerCapture(e.pointerId);
    });

    baWrap.addEventListener('pointerdown', function (e) {
      if (e.target === baHandle) return;
      dragging = true;
      setPos(fromClientX(e.clientX));
    });

    window.addEventListener('pointermove', function (e) {
      if (dragging) setPos(fromClientX(e.clientX));
    });

    window.addEventListener('pointerup', function () { dragging = false; });
    window.addEventListener('pointercancel', function () { dragging = false; });

    baHandle.addEventListener('keydown', function (e) {
      const step = e.shiftKey ? 10 : 5;
      if (e.key === 'ArrowLeft') { setPos(pos - step); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPos(pos + step); e.preventDefault(); }
      if (e.key === 'Home') { setPos(0); e.preventDefault(); }
      if (e.key === 'End') { setPos(100); e.preventDefault(); }
    });
  }
})();
