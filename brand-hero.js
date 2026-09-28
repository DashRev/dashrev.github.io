'use strict';

// One shared page and one existing hero image. No URL-derived paths, tracking,
// storage, compatibility assumptions, layout changes or additional DOM images.
(() => {
  const figure = document.querySelector('.product-hero .product-image');
  const image = figure?.querySelector(':scope > img');
  const title = figure?.querySelector('.photo-caption-title');
  const caption = figure?.querySelector('.photo-caption-support');
  if (!image || !title || !caption) return;

  // The static HTML remains the BMW/no-JavaScript fallback and source of truth.
  const bmw = {
    src: image.getAttribute('src'),
    alt: image.alt,
    title: title.textContent,
    caption: caption.textContent
  };
  const brands = new Map([
    ['mercedes', {
      src: 'assets/mercedes-carplay-reference.png',
      alt: 'Mercedes-Benz dashboard showing Apple CarPlay on its screen',
      title: 'CarPlay & Android Auto for your Mercedes.',
      caption: 'Example shown: CarPlay in a Mercedes-Benz dashboard.'
    }],
    ['audi', {
      src: 'assets/brand-hero/audi.jpg',
      alt: 'Audi dashboard showing Apple CarPlay on its screen',
      title: 'CarPlay & Android Auto for your Audi.',
      caption: 'Example shown: CarPlay in an Audi dashboard.'
    }],
    ['land-rover', {
      src: 'assets/brand-hero/land-rover.png',
      alt: 'Land Rover dashboard showing Apple CarPlay on its screen',
      title: 'CarPlay & Android Auto for your Land Rover.',
      caption: 'Example shown: CarPlay in a Land Rover dashboard.'
    }],
    ['volvo', {
      src: 'assets/brand-hero/volvo.png',
      alt: 'Volvo dashboard showing Apple CarPlay on its portrait screen',
      title: 'CarPlay & Android Auto for your Volvo.',
      caption: 'Example shown: CarPlay in a Volvo dashboard.'
    }]
  ]);
  const brand = (new URLSearchParams(window.location.search).get('brand') || '').trim().toLowerCase();
  const selected = brands.get(brand);

  function apply(data, key, state) {
    if (image.getAttribute('src') !== data.src) image.setAttribute('src', data.src);
    image.alt = data.alt;
    title.textContent = data.title;
    caption.textContent = data.caption;
    image.dataset.heroBrand = key;
    image.dataset.heroState = state;
  }
  function fallback() { apply(bmw, 'bmw', 'fallback'); }

  image.dataset.heroBrand = 'bmw';
  image.dataset.heroState = selected ? 'loading' : 'default';
  if (!selected) return; // BMW, ordinary visits and all unknown values.

  // Also recover if the actual DOM image fails after the preload succeeded.
  // Never retry a failed BMW image endlessly.
  image.addEventListener('error', () => {
    if (image.getAttribute('src') !== bmw.src) fallback();
  });

  // Preload/decode off-DOM: BMW stays visible until the selected image is ready.
  // Update the existing image and both captions together; never show a broken
  // brand image or a brand caption paired with an unready photograph.
  const candidate = new Image();
  candidate.decoding = 'async';
  candidate.fetchPriority = 'high';
  let settled = false;
  const timeout = window.setTimeout(() => finish(false), 10000);
  function finish(ok) {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeout);
    candidate.onload = null;
    candidate.onerror = null;
    if (ok) apply(selected, brand, 'ready');
    else fallback();
  }
  candidate.onerror = () => finish(false);
  candidate.onload = async () => {
    try {
      if (typeof candidate.decode === 'function') await candidate.decode();
      finish(candidate.naturalWidth > 0 && candidate.naturalHeight > 0);
    } catch { finish(false); }
  };
  candidate.src = selected.src;
})();
