// Full lines: keep the last two words of each text together, so no word sits alone on the last line.
(function () {
  var els = document.querySelectorAll('main p, main li, main dd, main figcaption, main blockquote, footer p');
  Array.prototype.forEach.call(els, function (el) {
    if (el.closest('.ab-toolkit')) return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), node, last = null;
    while ((node = walker.nextNode())) { if (node.nodeValue.trim()) last = node; }
    if (!last) return;
    var t = last.nodeValue, end = t.replace(/\s+$/, '').length, i = t.lastIndexOf(' ', end - 1);
    if (i > 0 && t.slice(0, i).trim()) last.nodeValue = t.slice(0, i) + ' ' + t.slice(i + 1);
  });
})();

// Tool lists ("Figma · Miro"): each tool stays whole, and the dot stays at the end of a line, never the start.
(function () {
  var lists = document.querySelectorAll('.ab-toolkit p:not(.ab-kicker)');
  Array.prototype.forEach.call(lists, function (p) {
    if (p.children.length) return;
    var items = p.textContent.split(' · ');
    if (items.length < 2) return;
    p.textContent = '';
    items.forEach(function (item, i) {
      var span = document.createElement('span');
      span.className = 'tool';
      span.textContent = item + (i < items.length - 1 ? ' ·' : '');
      p.appendChild(span);
      if (i < items.length - 1) p.appendChild(document.createTextNode(' '));
    });
  });
})();

// Small motion layer. Everything stays readable if this script never runs.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header gets a soft shadow once the page scrolls.
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Signature move: the logo draws itself.
  var mark = document.querySelector('.hero-mark');
  if (mark && !reduce) { mark.classList.add('ready'); requestAnimationFrame(function () { requestAnimationFrame(function () { mark.classList.add('drawn'); }); }); }

  // Entrances: the parts of each section rise in, one after the other.
  var groups = [
    '.side-design > *, .split-photo, .side-manage > *, .split-intro > *, .ab-hero-grid > div > *',
    '.page-head .wrap > *',
    '.project-hero .back, .project-hero h1, .project-hero .lead, .facts > div'
  ];
  var perSection = '.section-head > *, .about-photo, .about-text > *, .timeline > li, .path > li, .card, .tile, .feature, .ab-side, .ab-hl-card, .ab-cv-grid > div, .ab-toolkit > div, .ab-story-grid > *, .ab-cta .wrap > *, .bg-grid > div, .highlight, .row-head, .skills > div, .band .words > *, .band figure, .contact > div > *, .contact-links .btn, .article > *, .next';

  var items = [];
  groups.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el, i) { el.style.setProperty('--d', (i * 80) + 'ms'); items.push(el); });
  });
  document.querySelectorAll('main section, main article, main .next').forEach(function (sec) {
    sec.querySelectorAll(perSection).forEach(function (el, i) {
      if (items.indexOf(el) === -1) { el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms'); items.push(el); }
    });
  });

  // The hero logo leans towards the pointer.
  var hero = document.querySelector('.hero');
  var logo = mark && mark.querySelector('.logo');
  if (hero && logo && !reduce && window.matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      logo.style.transform = 'translate(' + (x * 18).toFixed(1) + 'px,' + (y * 14).toFixed(1) + 'px) rotate(' + (x * 4).toFixed(1) + 'deg)';
    });
    hero.addEventListener('pointerleave', function () { logo.style.transform = ''; });
  }

  if (reduce || !('IntersectionObserver' in window)) return;
  items.forEach(function (el) { el.classList.add('reveal'); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  items.forEach(function (el) { io.observe(el); });
})();
