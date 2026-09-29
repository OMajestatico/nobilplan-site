(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 1.65 } });
  $('#year').textContent = new Date().getFullYear();

  const header = $('.site-header');
  const syncHeader = () => header.classList.toggle('scrolled', window.scrollY > 24);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  // Entrada suave dos blocos
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px' });
  $$('.reveal').forEach(el => io.observe(el));

  // Menu mobile: o overlay nunca participa da navegação por âncora.
  // Isso evita o navegador tentar rolar o próprio menu/focar o link antes de
  // rolar a página, que era a causa do estado de scroll "preso" nas aberturas seguintes.
  const menu = $('#mobile-menu');
  const openBtn = $('.menu-toggle');
  const closeBtn = $('.menu-close');
  const headerOffset = () => (header?.offsetHeight || 72) + 12;

  const resetMenuScroll = () => {
    menu.scrollTop = 0;
    const inner = $('.mobile-menu-inner', menu);
    if (inner) inner.scrollTop = 0;
  };

  const openMenu = () => {
    // Sempre começa do topo, inclusive depois de telas baixas onde o menu precisou rolar.
    resetMenuScroll();
    document.documentElement.classList.add('menu-locked');
    document.body.classList.add('menu-locked');
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(resetMenuScroll);
  };

  const closeMenu = ({ restoreFocus = true } = {}) => {
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('menu-locked');
    document.body.classList.remove('menu-locked');
    resetMenuScroll();
    if (restoreFocus) openBtn.focus({ preventScroll: true });
  };

  openBtn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', () => closeMenu());

  $$('.mobile-nav a').forEach(link => link.addEventListener('click', e => {
    // Impede a navegação nativa do href=#..., que pode rolar um container errado
    // enquanto o overlay ainda está aberto. Fazemos uma única rolagem, da página.
    e.preventDefault();
    e.stopPropagation();

    const selector = link.getAttribute('href');
    const target = selector ? $(selector) : null;
    if (!target) {
      closeMenu();
      return;
    }

    // Calcula o destino ANTES de remover o lock para não depender de relayout.
    const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - headerOffset());

    link.blur();
    closeMenu({ restoreFocus: false });

    // Um frame garante que o overflow da página já foi restaurado.
    requestAnimationFrame(() => {
      window.scrollTo({ top, behavior: 'smooth' });
      // Atualiza a URL sem disparar outra rolagem automática.
      try { history.replaceState(null, '', selector); } catch (_) {}
      openBtn.focus({ preventScroll: true });
    });
  }));

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu();
  });

  // Parallax discreto no hero apenas em dispositivos com ponteiro preciso.
  const hero = $('.hero');
  const heroMedia = $('[data-parallax]');
  if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      heroMedia.style.transform = `translate3d(${x * -14}px, ${y * -10}px, 0) scale(1.018)`;
    });
    hero.addEventListener('pointerleave', () => heroMedia.style.transform = 'translate3d(0,0,0) scale(1.018)');
  }

  // Carrosséis nativos no toque. No desktop, adiciona arraste por mouse sem interferir no scroll vertical mobile.
  const setupCarousel = track => {
    const items = [...track.children];
    if (!items.length) return;

    let isMouseDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      isMouseDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.style.cursor = 'grabbing';
    });
    window.addEventListener('pointermove', e => {
      if (!isMouseDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = startScroll - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      track.style.cursor = '';
    });
    track.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);

    const dots = document.querySelector(`[data-dots-for="${track.id}"]`);
    if (dots) {
      items.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.classList.toggle('active', i === 0);
        dots.appendChild(dot);
      });
      const dotEls = [...dots.children];
      const updateDots = () => {
        const center = track.scrollLeft + track.clientWidth / 2;
        let best = 0, bestDist = Infinity;
        items.forEach((item, i) => {
          const itemCenter = item.offsetLeft + item.offsetWidth / 2 - track.offsetLeft;
          const dist = Math.abs(center - itemCenter);
          if (dist < bestDist) { bestDist = dist; best = i; }
        });
        dotEls.forEach((d, i) => d.classList.toggle('active', i === best));
      };
      let raf = 0;
      track.addEventListener('scroll', () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(updateDots);
      }, { passive: true });
    }

    const prev = document.querySelector(`[data-carousel-prev="${track.id}"]`);
    const next = document.querySelector(`[data-carousel-next="${track.id}"]`);
    const getStep = () => (items[0]?.getBoundingClientRect().width || track.clientWidth) + 18;
    prev?.addEventListener('click', () => track.scrollBy({ left: -getStep(), behavior: 'smooth' }));
    next?.addEventListener('click', () => track.scrollBy({ left: getStep(), behavior: 'smooth' }));
  };
  $$('.carousel-track').forEach(setupCarousel);

  // Profundidade 3D nos cards do processo, só no desktop.
  if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('.tilt-card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - .5) * -4;
        const ry = ((e.clientX - r.left) / r.width - .5) * 5;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
        card.style.boxShadow = '0 24px 45px rgba(36,31,24,.08)';
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
        card.style.boxShadow = '';
      });
    });
  }
})();
