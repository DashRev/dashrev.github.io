'use strict';
// Real installs: one card at a time once scripts run; without scripts every card stays visible.
// Chips carry data-make and data-type; the filter bar is built from them, so adding a car needs no filter edit.
const IG_TYPES = { new: 'New display', kept: 'Kept factory screen' };
const igSlug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

document.querySelectorAll('[data-ig]').forEach(gallery => {
  const picker = gallery.querySelector('.ig-picker');
  const chips = [...picker.querySelectorAll('button')];
  const cards = chips.map(chip => document.getElementById(chip.getAttribute('aria-controls')));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const filter = { make: 'all', type: 'all' };
  let selected = 0;
  gallery.classList.add('ig-ready');

  const fits = (chip, f) => (f.make === 'all' || igSlug(chip.dataset.make || '') === f.make) && (f.type === 'all' || chip.dataset.type === f.type);
  const shown = () => chips.flatMap((chip, i) => (chip.hidden ? [] : [i]));

  // Most installs first, so the core make leads no matter where its cards sit.
  const installsOf = make => chips.filter(chip => chip.dataset.make === make).length;
  const makes = [...new Set(chips.map(chip => chip.dataset.make).filter(Boolean))]
    .sort((a, b) => installsOf(b) - installsOf(a) || a.localeCompare(b));
  const types = Object.keys(IG_TYPES).filter(type => chips.some(chip => chip.dataset.type === type));
  const group = (axis, label, options) => `<div class="ig-filter" role="group" aria-label="${label}" data-ig-axis="${axis}">` +
    options.map(([value, text]) => `<button type="button" data-value="${value}" aria-pressed="false">${text}<span></span></button>`).join('') + '</div>';
  const bar = document.createElement('div');
  bar.className = 'ig-filters';
  bar.innerHTML = group('make', 'Filter installs by make', [['all', 'All makes'], ...makes.map(make => [igSlug(make), make])]) +
    group('type', 'Filter installs by upgrade', [['all', 'All upgrades'], ...types.map(type => [type, IG_TYPES[type]])]) +
    '<p class="ig-filter-status" role="status"></p>';
  picker.before(bar);
  const status = bar.querySelector('.ig-filter-status');

  function render() {
    cards.forEach((card, i) => {
      card.hidden = i !== selected;
      if (card.hidden) card.querySelectorAll('video').forEach(video => video.pause());
    });
    chips.forEach((chip, i) => chip.setAttribute('aria-pressed', String(i === selected)));
    // Name the next car in the current filter so the button says where it goes.
    const next = cards[selected].querySelector('[data-ig-next]');
    if (next) {
      const order = shown();
      const pos = order.indexOf(selected);
      const last = pos === order.length - 1;
      next.hidden = order.length < 2;
      next.firstChild.textContent = last ? 'Back to first install ' : 'Next: ' + cards[order[pos + 1]].dataset.name + ' ';
      next.lastElementChild.textContent = last ? '↺' : '→';
    }
  }
  // Scroll the picker sideways (phones) so the selected chip is visible, without moving the page.
  function revealChip() {
    const chip = chips[selected].getBoundingClientRect();
    const box = picker.getBoundingClientRect();
    if (chip.left >= box.left && chip.right <= box.right) return;
    picker.scrollTo({ left: picker.scrollLeft + chip.left - box.left, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
  function select(index, { scroll = false, focus = false } = {}) {
    selected = index;
    render();
    revealChip();
    if (scroll) picker.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    // The button that was clicked is now hidden, so hand focus to the new card's title.
    if (focus) {
      const title = cards[selected].querySelector('h3');
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    }
  }
  function applyFilter({ updateUrl = true } = {}) {
    chips.forEach(chip => { chip.hidden = !fits(chip, filter); });
    if (chips[selected].hidden) selected = shown()[0];
    bar.querySelectorAll('[data-ig-axis]').forEach(row => {
      const axis = row.dataset.igAxis;
      row.querySelectorAll('button').forEach(button => {
        const count = chips.filter(chip => fits(chip, { ...filter, [axis]: button.dataset.value })).length;
        button.setAttribute('aria-pressed', String(filter[axis] === button.dataset.value));
        button.disabled = count === 0;
        button.lastChild.textContent = ' ' + count;
      });
    });
    const count = shown().length;
    status.textContent = count === chips.length ? `${count} installs` : `Showing ${count} of ${chips.length} installs`;
    if (updateUrl) {
      // Shareable filtered views, like the vehicles page: ?make=bmw&type=kept
      const params = new URLSearchParams(location.search);
      for (const axis of ['make', 'type']) filter[axis] === 'all' ? params.delete(axis) : params.set(axis, filter[axis]);
      const query = params.toString();
      const hiddenTarget = cards.some((card, i) => chips[i].hidden && '#' + card.id === location.hash);
      try { history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + (hiddenTarget ? '' : location.hash)); } catch (error) { /* file: previews */ }
    }
    render();
    revealChip();
  }

  chips.forEach((chip, i) => chip.addEventListener('click', () => select(i)));
  bar.addEventListener('click', event => {
    const button = event.target.closest('button[data-value]');
    if (!button || button.disabled) return;
    const axis = button.closest('[data-ig-axis]').dataset.igAxis;
    // Clicking the active filter again clears it.
    filter[axis] = filter[axis] === button.dataset.value ? 'all' : button.dataset.value;
    applyFilter();
  });
  cards.forEach((card, i) => {
    const next = card.querySelector('[data-ig-next]');
    if (next) {
      next.dataset.ready = '';
      next.addEventListener('click', () => {
        const order = shown();
        select(order[(order.indexOf(i) + 1) % order.length], { scroll: true, focus: true });
      });
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
    if (index < 0) return;
    // A deep link wins over a filter that would hide its car; clear only as much of the filter as it takes.
    if (!fits(chips[index], filter)) {
      Object.assign(filter, [{ make: 'all' }, { type: 'all' }, { make: 'all', type: 'all' }].find(reset => fits(chips[index], { ...filter, ...reset })));
      applyFilter();
    }
    select(index);
    cards[index].scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', followHash);

  // Read ?make=&type= (any case); unknown or impossible values fall back to "all" and the address bar is corrected.
  function readUrl() {
    const params = new URLSearchParams(location.search);
    const make = igSlug(params.get('make') || '');
    const type = (params.get('type') || '').toLowerCase();
    filter.make = makes.some(m => igSlug(m) === make) ? make : 'all';
    filter.type = types.includes(type) ? type : 'all';
    if (!chips.some(chip => fits(chip, filter))) filter.type = 'all';
    applyFilter({ updateUrl: false });
    followHash();
    applyFilter();
  }
  // Back/forward restores an older address; show the filter it describes.
  window.addEventListener('popstate', readUrl);
  readUrl();
});
