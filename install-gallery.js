'use strict';
// Real installs: one card at a time once scripts run; without scripts every card stays visible.
document.querySelectorAll('[data-ig]').forEach(gallery => {
  const picker = gallery.querySelector('.ig-picker');
  const chips = [...picker.querySelectorAll('button')];
  const cards = chips.map(chip => document.getElementById(chip.getAttribute('aria-controls')));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 0;
  gallery.classList.add('ig-ready');

  function render() {
    cards.forEach((card, i) => {
      card.hidden = i !== selected;
      if (card.hidden) card.querySelectorAll('video').forEach(video => video.pause());
    });
    chips.forEach((chip, i) => chip.setAttribute('aria-pressed', String(i === selected)));
  }
  function select(index, { scroll = false } = {}) {
    selected = (index + cards.length) % cards.length;
    render();
    chips[selected].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    if (scroll) picker.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }

  chips.forEach((chip, i) => chip.addEventListener('click', () => select(i)));
  cards.forEach((card, i) => {
    const next = card.querySelector('[data-ig-next]');
    if (next) {
      // Name the next car so the button says where it goes.
      if (i < cards.length - 1) next.firstChild.textContent = 'Next: ' + cards[i + 1].dataset.name + ' ';
      next.dataset.ready = '';
      next.addEventListener('click', () => select(i + 1, { scroll: true }));
    }
    const compare = card.querySelector('.ig-compare');
    card.querySelectorAll('[data-ig-show]').forEach(button => button.addEventListener('click', () => {
      compare.dataset.show = button.dataset.igShow;
      card.querySelectorAll('[data-ig-show]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    }));
    card.querySelectorAll('video').forEach(video => video.addEventListener('play', () => { video.dataset.started = 'true'; }));
  });

  function followHash() {
    const index = cards.findIndex(card => '#' + card.id === location.hash);
    if (index >= 0) { select(index); cards[index].scrollIntoView({ block: 'start' }); }
  }
  window.addEventListener('hashchange', followHash);
  render();
  followHash();
});
