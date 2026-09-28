'use strict';
// Shared editable business details. No analytics, network form submission or storage.
const NORTHLINE = { phone: '+16199537761' };
const VEHICLE_CATALOG = window.NORTHLINE_VEHICLES?.makes || [];
const OTHER_VEHICLE = 'Other / not sure';
function fillMakes(select) {
  select.replaceChildren(new Option('Choose a brand', ''));
  for (const make of VEHICLE_CATALOG) select.add(new Option(make.name, make.name));
  select.add(new Option(OTHER_VEHICLE, OTHER_VEHICLE));
}
function setupVehicleSelectors(container) {
  const make = container.querySelector('[name=make]');
  const model = container.querySelector('[name=model]');
  const details = container.querySelector('[data-vehicle-details]');
  const detailsInput = details.querySelector('input');
  fillMakes(make);
  function updateDetails() {
    const show = make.value === OTHER_VEHICLE || model.value === OTHER_VEHICLE;
    details.hidden = !show;
    detailsInput.disabled = !show;
    if (!show) detailsInput.value = '';
  }
  function updateModels() {
    model.replaceChildren(new Option(make.value ? 'Choose a model' : 'Choose a make first', ''));
    model.disabled = !make.value;
    for (const entry of VEHICLE_CATALOG.find(entry => entry.name === make.value)?.models || []) {
      model.add(new Option(entry.name, entry.name));
    }
    if (make.value) model.add(new Option(OTHER_VEHICLE, OTHER_VEHICLE));
    if (make.value === OTHER_VEHICLE) model.value = OTHER_VEHICLE;
    model.setCustomValidity('');
    detailsInput.value = '';
    updateDetails();
  }
  make.addEventListener('change', updateModels);
  model.addEventListener('change', () => { model.setCustomValidity(''); updateDetails(); });
  updateModels();
}
function vehicleDescription(container) {
  const value = name => container.querySelector('[name=' + name + ']').value.trim();
  const details = container.querySelector('[name=vehicleDetails]');
  const known = [value('year'), value('make'), value('model')].filter(v => v && v !== OTHER_VEHICLE);
  const extra = !details.disabled && details.value.trim();
  if (extra) known.push(extra);
  if (!known.length) return 'Vehicle details to confirm';
  if (!extra && (!value('make') || value('make') === OTHER_VEHICLE || value('model') === OTHER_VEHICLE)) known.push('vehicle — details to confirm');
  return known.join(' ');
}
function setContactLinks(container, message) {
  const isApple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  container.querySelector('[data-sms]').href = `sms:${NORTHLINE.phone}${isApple ? '&' : '?'}body=${encodeURIComponent(message)}`;
  container.querySelector('[data-whatsapp]').href = `https://wa.me/${NORTHLINE.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  container.dataset.message = message;
}
async function copyMessage(message, status) {
  try { await navigator.clipboard.writeText(message.value); status.textContent = 'Message copied. Paste it into your preferred messaging app.'; }
  catch {
    const preview = message.closest('details'); if (preview) preview.open = true;
    message.focus(); message.select();
    status.textContent = 'Your message is selected. Use your device’s Copy command.';
  }
}
function showResult(form, result, heading) {
  form.hidden = true; result.hidden = false;
  document.querySelector('.mobile-bar')?.classList.remove('form-active');
  heading.focus({ preventScroll: true });
  result.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  const mobileButton = document.querySelector('.mobile-bar .btn');
  if (mobileButton) {
    if (!mobileButton.dataset.originalHref) { mobileButton.dataset.originalHref = mobileButton.getAttribute('href'); mobileButton.dataset.originalLabel = mobileButton.textContent; }
    mobileButton.href = result.querySelector('[data-sms]').href;
    mobileButton.textContent = form.id === 'fleet-form' ? 'Text my vehicle list ↗' : result.dataset.availability === 'yes' ? 'Confirm my vehicle ↗' : 'Ask about options ↗';
  }
}
function restoreForm(form, result) {
  result.hidden = true; form.hidden = false; form.querySelector('select,input').focus();
  const mobileButton = document.querySelector('.mobile-bar .btn');
  if (mobileButton?.dataset.originalHref) { mobileButton.href = mobileButton.dataset.originalHref; mobileButton.textContent = mobileButton.dataset.originalLabel; }
}
// A match refers only to supplier-listed CarPlay model years, not every trim or screen.
function checkVehicleAvailability(make, model, year) {
  const entry = VEHICLE_CATALOG.find(item => item.name === make)?.models.find(item => item.name === model);
  return Boolean(entry?.carplayYears.includes(Number(year)));
}
const ownerForm = document.querySelector('#owner-form');
if (ownerForm) {
  setupVehicleSelectors(ownerForm);
  const result = document.querySelector('#owner-result');
  function renderOwnerResult(manual = false) {
    const data = new FormData(ownerForm);
    const model = String(data.get('model') || '').trim();
    if (!manual && !model) { ownerForm.elements.model.setCustomValidity('Please choose your model.'); ownerForm.reportValidity(); return; }
    const vehicle = vehicleDescription(ownerForm);
    const available = !manual && checkVehicleAvailability(data.get('make'), model, data.get('year'));
    const heading = document.querySelector('#owner-result-title'); heading.textContent = vehicle;
    result.dataset.availability = available ? 'yes' : 'no';
    document.querySelector('#owner-verdict').textContent = available ? 'Yes — compatible*' : 'Needs a manual check';
    document.querySelector('#owner-verdict-note').textContent = available
      ? '*A CarPlay kit is listed for this model and year. Photo confirmation recommended to verify your factory system and installed price.'
      : 'Let’s review your vehicle individually. Send a photo of the main menu and center console so we can check available kits or screen upgrades.';
    result.querySelector('[data-sms]').textContent = available ? 'Confirm via text ↗' : 'Ask via text ↗';
    result.querySelector('[data-whatsapp]').textContent = available ? 'Confirm via WhatsApp ↗' : 'Ask via WhatsApp ↗';
    const request = available
      ? 'Your checker shows a listed CarPlay option. Please confirm my factory setup and installed price. I will attach a photo of the main menu and center console.'
      : 'Your checker recommends a manual check. Could you check other CarPlay kits or screen upgrades? I will attach a photo of the main menu and center console.';
    setContactLinks(result, `Hi Dash Rev! My vehicle is ${vehicle}. ${request} My installation location is: `);
    document.querySelector('#owner-message').value = result.dataset.message;
    document.querySelector('[data-owner-copy-status]').textContent = '';
    showResult(ownerForm, result, heading);
  }
  ownerForm.addEventListener('submit', event => {
    event.preventDefault(); renderOwnerResult();
  });
  document.querySelector('[data-manual-check]').addEventListener('click', () => renderOwnerResult(true));
  document.querySelector('[data-copy-owner]').addEventListener('click', () => copyMessage(document.querySelector('#owner-message'), document.querySelector('[data-owner-copy-status]')));
  ownerForm.elements.model.addEventListener('input', () => ownerForm.elements.model.setCustomValidity(''));
  document.querySelector('[data-edit-owner]').addEventListener('click', () => restoreForm(ownerForm, result));
}
const fleetForm = document.querySelector('#fleet-form');
if (fleetForm) {
  const rows = document.querySelector('#fleet-rows');
  const add = document.querySelector('#add-vehicle');
  const result = document.querySelector('#fleet-result');
  let serial = 0;
  function renumber() {
    const all = [...rows.children];
    all.forEach((row, i) => { row.querySelector('legend').textContent = `Vehicle ${i + 1}`; row.querySelector('.remove-row').hidden = all.length === 1; row.querySelector('.remove-row').setAttribute('aria-label', `Remove vehicle ${i + 1}`); });
    add.disabled = all.length >= 10;
    add.textContent = all.length >= 10 ? '10 vehicles added — mention any others in your message' : '＋ Add another vehicle';
  }
  function setCollapsed(row, collapsed) {
    row.classList.toggle('is-collapsed', collapsed);
    const button = row.querySelector('.fleet-edit');
    button.setAttribute('aria-expanded', String(!collapsed));
    button.textContent = collapsed ? 'Edit' : 'Done';
    row.querySelector('.fleet-row-summary').textContent = collapsed ? vehicleDescription(row) : 'Vehicle details';
  }
  function collapseCompletedRows() {
    for (const row of rows.children) {
      const complete = [...row.querySelectorAll('input,select')].every(input => input.disabled || input.checkValidity());
      if (complete) setCollapsed(row, true);
    }
  }
  function addVehicle(focus = true) {
    const id = ++serial;
    const fieldset = document.createElement('fieldset'); fieldset.className = 'fleet-row';
    fieldset.innerHTML = `<legend>Vehicle</legend><div class="fields"><div class="field full"><label for="make-${id}">Make</label><select id="make-${id}" name="make" required><option value="">Choose a brand</option></select></div><div class="field full"><label for="model-${id}">Model</label><select id="model-${id}" name="model" required disabled><option value="">Choose a make first</option></select></div><div class="field"><label for="year-${id}">Year</label><input id="year-${id}" name="year" type="number" min="1980" max="2027" inputmode="numeric" placeholder="e.g. 2016" required></div><div class="field full" data-vehicle-details hidden><label for="vehicle-details-${id}">Vehicle details (optional)</label><input id="vehicle-details-${id}" name="vehicleDetails" maxlength="100" placeholder="Tell us the make or model, if known" disabled></div></div><button type="button" class="remove-row">Remove vehicle</button>`;
    setupVehicleSelectors(fieldset);
    const header = document.createElement('div'); header.className = 'fleet-row-heading';
    header.innerHTML = `<strong class="fleet-row-summary">Vehicle details</strong><button type="button" class="fleet-edit" aria-expanded="true" aria-controls="vehicle-fields-${id}">Done</button>`;
    fieldset.querySelector('.fields').id = `vehicle-fields-${id}`;
    fieldset.insertBefore(header, fieldset.querySelector('.fields'));
    header.querySelector('button').addEventListener('click', () => {
      if (fieldset.classList.contains('is-collapsed')) { setCollapsed(fieldset, false); fieldset.querySelector('select').focus(); }
      else {
        const invalid = [...fieldset.querySelectorAll('input,select')].find(input => !input.disabled && !input.checkValidity());
        if (invalid) { invalid.reportValidity(); return; }
        setCollapsed(fieldset, true);
      }
    });
    fieldset.addEventListener('invalid', () => setCollapsed(fieldset, false), true);
    fieldset.querySelector('.remove-row').addEventListener('click', () => { fieldset.remove(); renumber(); add.focus(); });
    fieldset.querySelector('[name=model]').addEventListener('input', e => e.target.setCustomValidity(''));
    rows.append(fieldset); renumber(); if (focus) fieldset.querySelector('select').focus();
  }
  addVehicle(false); add.addEventListener('click', () => { collapseCompletedRows(); addVehicle(); });
  fleetForm.elements.location.addEventListener('input', e => e.target.setCustomValidity(''));
  fleetForm.addEventListener('submit', event => {
    event.preventDefault();
    for (const input of fleetForm.querySelectorAll('input[type=text],input:not([type])')) { if (input.required && !input.disabled && !input.value.trim()) { input.setCustomValidity('Please enter a value.'); input.reportValidity(); return; } }
    const vehicles = [...rows.children].map((row, i) => `${i + 1}. ${vehicleDescription(row)}`);
    const message = `Hi Dash Rev! I'm a host / fleet owner interested in CarPlay and screen upgrades.\n\nVehicles:\n${vehicles.join('\n')}\n\nBased in: ${fleetForm.elements.location.value.trim()}\n\nPlease review the right setup and quote each vehicle. I'd like to discuss installation between bookings. I'll attach labeled dashboard photos.`;
    document.querySelector('#fleet-message').value = message; setContactLinks(result, message);
    const heading = document.querySelector('#fleet-result-title'); heading.textContent = `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'}. Let’s make a plan.`;
    document.querySelector('#copy-status').textContent = '';
    showResult(fleetForm, result, heading);
  });
  document.querySelector('[data-edit-fleet]').addEventListener('click', () => { setCollapsed(rows.firstElementChild, false); restoreForm(fleetForm, result); });
  document.querySelector('#copy-message').addEventListener('click', () => copyMessage(document.querySelector('#fleet-message'), document.querySelector('#copy-status')));
}

// Form anchors stay useful after results; never discard a customer's entries.
document.querySelectorAll('[data-form-jump]').forEach(link => link.addEventListener('click', event => {
  const href = link.getAttribute('href');
  if (!href?.startsWith('#')) return;
  const panel = document.querySelector(href);
  const form = panel?.querySelector('form');
  const result = panel?.querySelector('.result');
  if (!panel || !form) return;
  event.preventDefault();
  const target = result && !result.hidden ? result : panel;
  target.scrollIntoView({block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  // Focus the heading, not an input, so tapping the CTA doesn't open the phone keyboard.
  const heading = target.querySelector('h3');
  if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
}));
// Yield screen space to the keyboard or the visible submit button on phones.
const activeForm = ownerForm || fleetForm;
const bottomBar = document.querySelector('.mobile-bar');
const heroAction = document.querySelector('.product-actions .btn');
if (bottomBar && heroAction) {
  // The hero already has the primary action. Show the fixed action only after it passes.
  bottomBar.classList.add('hero-active');
  new IntersectionObserver(entries => {
    bottomBar.classList.toggle('hero-active', entries[0].boundingClientRect.bottom > 84);
  }, {rootMargin:'-84px 0px 0px 0px',threshold:[0,1]}).observe(heroAction);
}
if (activeForm && bottomBar) {
  let submitVisible = false;
  const refreshBar = () => {
    const editing = activeForm.contains(document.activeElement) && document.activeElement.matches('input,select,textarea');
    bottomBar.classList.toggle('form-active', !activeForm.hidden && (submitVisible || editing));
  };
  new IntersectionObserver(entries => { submitVisible = entries[0].isIntersecting; refreshBar(); }, {rootMargin:'-90px 0px 0px 0px',threshold:0.1}).observe(activeForm.querySelector('[type=submit]'));
  document.addEventListener('focusin', refreshBar);
  document.addEventListener('focusout', () => requestAnimationFrame(refreshBar));
}
const allVideos = [...document.querySelectorAll('video')];
allVideos.forEach(video => video.addEventListener('play', () => allVideos.forEach(other => { if (other !== video) other.pause(); })));
document.querySelectorAll('[data-comparison]').forEach(comparison => {
  const mobile = matchMedia('(max-width:760px)');
  const panes = [...comparison.querySelectorAll('.comparison-pane')];
  const buttons = [...comparison.querySelectorAll('[data-compare]')];
  let selected = 1;
  function updateComparison() {
    panes.forEach((pane, i) => {
      pane.hidden = mobile.matches && selected !== i;
      if (pane.hidden) pane.querySelector('video')?.pause();
    });
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(selected === i)));
  }
  buttons.forEach((button, i) => button.addEventListener('click', () => { selected = i; updateComparison(); }));
  mobile.addEventListener('change', updateComparison);
  updateComparison();
});
// One selected installation on desktop; native scroll-snap swiping on phones.
document.querySelectorAll('[data-installation-gallery]').forEach(gallery => {
  const track = gallery.querySelector('.installation-track');
  const panels = [...track.children];
  const buttons = [...gallery.querySelectorAll('[data-installation]')];
  const mobile = matchMedia('(max-width:760px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
  const status = gallery.querySelector('[data-installation-status]');
  const navigation = gallery.querySelector('.installation-nav');
  const statusRow = status.closest('.installation-status');
  const names = ['2009 BMW X5', '2013 BMW X5', '2015 BMW 328i GT'];
  let selected = 0, frame;
  gallery.classList.add('gallery-ready');
  function render() {
    panels.forEach((panel, i) => {
      const inactive = selected !== i;
      panel.hidden = !mobile.matches && inactive;
      panel.inert = inactive;
      panel.setAttribute('aria-hidden', String(inactive));
      if (inactive) panel.querySelectorAll('video').forEach(video => video.pause());
    });
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
    status.textContent = (selected + 1) + ' / ' + panels.length + ' · ' + names[selected];
  }
  function scrollToSelected(behavior = 'instant') {
    if (mobile.matches) track.scrollTo({ left: panels[selected].offsetLeft - panels[0].offsetLeft, behavior });
  }
  function select(index) {
    selected = index;
    render();
    scrollToSelected(reducedMotion.matches ? 'instant' : 'smooth');
  }
  buttons.forEach((button, i) => button.addEventListener('click', () => select(i)));
  track.addEventListener('scroll', () => {
    if (!mobile.matches) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const index = Math.max(0, Math.min(panels.length - 1, Math.round(track.scrollLeft / (panels[0].offsetWidth + 20))));
      if (index !== selected) { selected = index; render(); }
    });
  });
  function placeControls() {
    // Match reading/tab order to the mobile visual order without cloning controls.
    if (mobile.matches && (navigation.nextElementSibling !== statusRow || statusRow.nextElementSibling !== track)) {
      track.before(navigation, statusRow);
    } else if (!mobile.matches && track.nextElementSibling !== navigation) {
      track.after(navigation, statusRow);
    }
  }
  const resetLayout = () => { placeControls(); render(); scrollToSelected(); };
  mobile.addEventListener('change', resetLayout);
  window.addEventListener('resize', resetLayout);
  function followAnchor() {
    const index = panels.findIndex(panel => '#' + panel.id === location.hash);
    if (index >= 0) { selected = index; render(); scrollToSelected(); }
  }
  window.addEventListener('hashchange', followAnchor);
  document.querySelectorAll('a[href="#screen-upgrade"]').forEach(link => link.addEventListener('click', () => { selected = 0; render(); scrollToSelected(); }));
  gallery.querySelectorAll('video').forEach(video => {
    // Crop only the poster. Playback always reveals the complete original frame.
    video.addEventListener('play', () => { video.dataset.started = 'true'; });
  });
  placeControls(); render(); followAnchor();
});
