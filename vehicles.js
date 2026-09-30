'use strict';
// Vehicle list: quick year + model lookup, and three views (cards, by year, list) over fit-list.js.
(() => {
  const data = window.DASHREV_FIT_LIST;
  const root = document.querySelector('[data-fit-root]');
  if (!data || !root) return;
  const $ = (s) => document.querySelector(s);
  // Keep the sticky lookup below the actual header at every desktop size.
  const header = $('.header');
  if (header) {
    const syncHeaderHeight = () => document.documentElement.style.setProperty('--fit-header-height', `${header.getBoundingClientRect().height}px`);
    syncHeaderHeight();
    if ('ResizeObserver' in window) new ResizeObserver(syncHeaderHeight).observe(header);
    else window.addEventListener('resize', syncHeaderHeight);
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const img = (r) => `assets/vehicles/${esc(r.img)}.webp`;
  const yearList = (r) => Array.isArray(r.years)
    ? [...new Set(r.years)].sort((a, b) => a - b)
    : Array.from({ length: r.to - r.from + 1 }, (_, i) => r.from + i);
  const ranges = (r) => yearList(r).reduce((out, y) => {
    const last = out[out.length - 1];
    if (last && last.to + 1 === y) last.to = y;
    else out.push({ from: y, to: y });
    return out;
  }, []);
  const rangeLabel = (r) => (r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`);
  const span = (r) => ranges(r).map(rangeLabel).join(', ');
  const inYear = (r, y) => yearList(r).includes(+y);
  const rows = data.makes.flatMap((m) => m.groups.flatMap((g) => g.models.map((r) => ({ ...r, make: m.name, makeId: m.id, group: g.name }))));
  const exceptions = (data.exceptions || []).map((r) => ({ ...r, makeId: data.makes.find((m) => m.name === r.make)?.id }));
  const [Y0, Y1] = data.years;

  let view = 'cards', make = 'all', year = '', query = '';

  const matches = (r) =>
    (make === 'all' || r.makeId === make) &&
    (!year || inYear(r, year)) &&
    (!query || `${r.model} ${r.chassis} ${r.variants} ${r.make}`.toLowerCase().includes(query));

  const card = (r) => `
    <li class="fit-card">
      <div class="fit-render"><img src="${img(r)}" alt="${esc(`${r.make} ${r.model} ${r.chassis}`)}" loading="lazy" width="900" height="480"></div>
      <div class="fit-copy">
        <div class="fit-line"><h4>${esc(r.model)}</h4><span class="fit-chip">${esc(r.chassis)}</span></div>
        <p class="fit-years">${span(r)}</p>
        <p class="fit-variants">${esc(r.variants)}</p>
      </div>
    </li>`;

  const byGroup = (list, render, wrap) => {
    const out = [];
    for (const m of data.makes) {
      const mine = list.filter((r) => r.makeId === m.id);
      if (!mine.length) continue;
      out.push(`<section class="fit-make"><header class="fit-make-head">${m.logo ? `<img src="${esc(m.logo)}" alt="" width="40" height="40">` : ''}<h2>${esc(m.name)}</h2><span>${mine.length} ${mine.length === 1 ? 'generation' : 'generations'}</span></header>`);
      for (const g of m.groups) {
        const gl = mine.filter((r) => r.group === g.name);
        if (gl.length) out.push(`<div class="fit-group"><h3>${esc(g.name)}</h3>${wrap(gl.map(render).join(''))}</div>`);
      }
      out.push('</section>');
    }
    return out.join('');
  };
  const cards = (list) => byGroup(list, card, (h) => `<ul class="fit-cards">${h}</ul>`);

  const years = [];
  for (let y = Y0; y <= Y1; y++) years.push(y);
  const timeline = (list) => {
    const head = `<div class="tl-row tl-head"><div class="tl-name"></div><div class="tl-track">${years.map((y) => `<span class="${+year === y ? 'is-on' : ''}">’${String(y).slice(2)}</span>`).join('')}</div></div>`;
    const families = [];
    list.forEach((r) => { const k = `${r.makeId}|${r.model}`; let f = families.find((x) => x.k === k); if (!f) families.push(f = { k, model: r.model, make: r.make, gens: [] }); f.gens.push(r); });
    const body = families.map((f) => {
      // Keep gaps blank. Overlapping generation transitions get separate lanes.
      const ends = [];
      const segments = f.gens.flatMap((r) => ranges(r).map((period) => ({ r, ...period })))
        .sort((a, b) => a.from - b.from || a.to - b.to)
        .map((period) => {
          let lane = ends.findIndex((end) => end < period.from);
          if (lane < 0) lane = ends.length;
          ends[lane] = period.to;
          return { ...period, lane: lane + 1 };
        });
      return `
      <div class="tl-row">
        <div class="tl-name"><img src="${img(f.gens[f.gens.length - 1])}" alt="" loading="lazy"><b>${esc(f.model)}</b></div>
        <div class="tl-track">${year ? `<span class="tl-yr" style="grid-column:${+year - Y0 + 1};grid-row:1 / ${ends.length + 1}"></span>` : ''}${segments.map(({ r, from, to, lane }) => `<span class="tl-bar${year && !(from <= +year && +year <= to) ? ' is-dim' : ''}" style="grid-column:${from - Y0 + 1} / ${to - Y0 + 2};grid-row:${lane}" title="${esc(`${r.model} ${r.chassis} ${rangeLabel({from,to})}`)}"><b>${esc(r.chassis)}</b><small>${rangeLabel({from,to})}</small></span>`).join('')}</div>
      </div>`;
    }).join('');
    return `<div class="fit-timeline" style="--tl-years:${years.length}">${head}${body}</div>
      <p class="tl-note">Supplier screening years, split by generation. Confirm fit by VIN or a dashboard photo.</p>`;
  };

  const table = (list) => `<table class="fit-table"><thead><tr><th scope="col"><span class="visually-hidden">Picture</span></th><th scope="col">Model</th><th scope="col">Chassis</th><th scope="col">Years</th><th scope="col">Body</th></tr></thead><tbody>${
    list.map((r) => `<tr><td><img src="${img(r)}" alt="" loading="lazy"></td><th scope="row">${esc(r.make)} ${esc(r.model)}</th><td><span class="fit-chip">${esc(r.chassis)}</span></td><td class="num">${span(r)}</td><td>${esc(r.variants)}</td></tr>`).join('')}</tbody></table>`;

  const matchingExceptions = () => exceptions.filter((r) =>
    (make === 'all' || r.makeId === make) && (!year || inYear(r, year)) &&
    (!query || `${r.make} ${r.model} ${r.chassis || ''}`.toLowerCase().includes(query)));

  const verificationNotes = (held) => {
    const target = $('[data-fit-exceptions]');
    if (!target) return;
    target.hidden = !held.length;
    target.innerHTML = held.length ? `<details class="fit-verification"${year ? ' open' : ''}>
      <summary>Some supplier-listed years need an extra check</summary>
      <p>These years are not confirmed generation matches. Send the VIN and a dashboard photo before quoting an adapter.</p>
      <ul>${held.map((r) => `<li><strong>${esc(r.make)} ${esc(r.model)} · ${span(r)}</strong><br>${esc(r.reason)}</li>`).join('')}</ul>
      <a href="sms:+16199537761">Text a VIN or dashboard photo</a>
      </details>` : '';
  };

  const verdict = (list, held) => {
    const v = $('[data-fit-verdict]');
    if (!v) return;
    if (!year && !query) { v.hidden = true; return; }
    v.hidden = false;
    const label = [year, query && query.toUpperCase()].filter(Boolean).join(' ');
    if (list.length) {
      const names = list.slice(0, 3).map((r) => `${r.make} ${r.model} ${r.chassis} (${span(r)})`).join(', ');
      v.className = 'fit-verdict is-yes';
      v.innerHTML = `<strong>${list.length === 1 ? 'On the list' : `${list.length} matches`}</strong> for ${esc(label)}: ${esc(names)}${list.length > 3 ? '…' : ''}. Confirm the screen and head unit before quoting.${year && held.length ? ' Other supplier-listed entries need the extra checks below.' : ''}`;
    } else if (held.length) {
      v.className = 'fit-verdict is-ask';
      v.innerHTML = `<strong>Verify this year and head unit</strong> for ${esc(label)}. The supplier lists it, but it is not a confirmed generation match here. <a href="sms:+16199537761">Text us the VIN or a dashboard photo</a>.`;
    } else {
      v.className = 'fit-verdict is-ask';
      v.innerHTML = `<strong>Not on this list</strong> for ${esc(label)}. That doesn’t rule it out: <a href="sms:+16199537761">text us the VIN or a dashboard photo</a>.`;
    }
  };

  const render = () => {
    const list = rows.filter(matches);
    const held = matchingExceptions();
    const tl = rows.filter((r) => (make === 'all' || r.makeId === make) && (!query || `${r.model} ${r.chassis} ${r.variants} ${r.make}`.toLowerCase().includes(query)));
    root.innerHTML = (view === 'timeline' ? tl.length : list.length) ? (view === 'cards' ? cards(list) : view === 'timeline' ? timeline(tl) : table(list))
      : '<p class="fit-empty">Nothing in this list matches. That doesn’t mean we can’t fit it. Text us the model and a dashboard photo.</p>';
    verificationNotes(held);
    verdict(list, held);
    document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    document.querySelectorAll('[data-make]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.make === make)));
    // Shared dealer links must preserve the actual lookup, not just the page URL.
    if (['http:', 'https:'].includes(location.protocol)) {
      const url = new URL(location.href);
      for (const [key, value] of Object.entries({ make: make === 'all' ? '' : make, year, q: query, view: view === 'cards' ? '' : view })) {
        if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
      }
      history.replaceState(null, '', url);
    }
  };

  const ysel = $('[data-fit-year]');
  if (ysel) ysel.innerHTML = '<option value="">Any year</option>' + years.slice().reverse().map((y) => `<option>${y}</option>`).join('');
  ysel?.addEventListener('change', () => { year = ysel.value; render(); });
  $('[data-fit-search]')?.addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); render(); });
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; render(); }));

  const picker = $('[data-fit-makes]');
  if (picker) {
    picker.innerHTML = `<button type="button" aria-pressed="true" data-make="all">All makes</button>` +
      data.makes.map((m) => `<button type="button" aria-pressed="false" data-make="${esc(m.id)}">${esc(m.name)}</button>`).join('') +
      (data.upcoming || []).map(([n]) => `<button type="button" disabled title="Added in the full build">${esc(n)}</button>`).join('');
    picker.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-make]'); if (!b) return;
      make = b.dataset.make; picker.querySelectorAll('button[data-make]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render();
    });
  }
  const p = new URLSearchParams(location.search);
  if (['cards', 'timeline', 'list'].includes(p.get('view'))) view = p.get('view');
  if (years.includes(Number(p.get('year'))) && ysel) { year = p.get('year'); ysel.value = year; }
  if (data.makes.some((m) => m.id === p.get('make'))) make = p.get('make');
  if (p.get('q')) { query = p.get('q').toLowerCase(); const s = $('[data-fit-search]'); if (s) s.value = p.get('q'); }

  const share = $('[data-fit-share]');
  share?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href.split('#')[0]); share.textContent = 'Link copied'; } catch { share.textContent = location.href; }
  });
  const makeCount = $('[data-fit-stat-makes]'), modelCount = $('[data-fit-stat-models]');
  if (makeCount) makeCount.textContent = data.makes.length;
  if (modelCount) modelCount.textContent = new Set(rows.map((r) => `${r.make}|${r.model}`)).size;
  render();
})();
