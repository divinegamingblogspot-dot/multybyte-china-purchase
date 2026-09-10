const DATA_URL = './data.json';

let allProducts = [];
let requestTimer = null;

const $ = id => document.getElementById(id);

function setState(name, show) {
  $(name).classList.toggle('hidden', !show);
}

async function loadData() {
  setState('loading', true);
  setState('error', false);
  setState('empty', false);
  $('statusText').textContent = 'Loading purchase data…';

  try {
    // Strong cache-buster so every refresh asks GitHub Pages for the newest data.json.
    const cacheBust = Date.now() + '-' + Math.random().toString(36).slice(2);
    const response = await fetch(DATA_URL + '?v=' + cacheBust, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) throw new Error('Data server returned HTTP ' + response.status);

    const data = await response.json();
    if (!data || data.success !== true || !Array.isArray(data.data)) {
      throw new Error('Invalid purchase data');
    }

    allProducts = data.data.map(p => ({
      ...p,
      productLink: normalizeUrl(p.productLink),
      image: normalizeUrl(p.image)
    }));

    $('countBadge').textContent = `${allProducts.length} item${allProducts.length === 1 ? '' : 's'}`;
    $('statusText').textContent = data.updated
      ? `Updated ${new Date(data.updated).toLocaleString()}`
      : 'Data synced';

    setState('loading', false);
    render();
  } catch (error) {
    console.error(error);
    showError('Could not load the China purchase data. Try Refresh again.');
  }
}

function normalizeUrl(value) {
  if (!value) return '';
  let url = String(value).trim().replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
  if (url.startsWith('//')) url = 'https:' + url;
  return /^https?:\/\//i.test(url) ? url : '';
}

function showError(message) {
  setState('loading', false);
  setState('error', true);
  $('error').textContent = message;
  $('statusText').textContent = 'Connection problem';
}

function render() {
  const query = $('searchInput').value.trim().toLowerCase();
  const filtered = allProducts.filter(p => {
    const text = [p.sku, p.productName, p.supplier, p.quantity].join(' ').toLowerCase();
    return !query || text.includes(query);
  });

  $('products').replaceChildren();
  setState('empty', filtered.length === 0);

  const template = $('productTemplate');
  filtered.forEach(p => {
    const node = template.content.cloneNode(true);
    const imageWrap = node.querySelector('.image-wrap');
    const img = node.querySelector('.product-image');
    const sku = node.querySelector('.sku');
    const name = node.querySelector('.product-name');
    const quantity = node.querySelector('.quantity');
    const supplier = node.querySelector('.supplier');
    const link = node.querySelector('.product-link');

    sku.textContent = p.sku || 'NO SKU';
    name.textContent = p.productName || 'Product information unavailable';
    quantity.textContent = p.quantity || '—';
    supplier.textContent = p.supplier || '—';

    if (p.image) {
      // Also bust image CDN/browser cache when the image URL changes.
      const separator = p.image.includes('?') ? '&' : '?';
      img.src = p.image + separator + 'v=' + encodeURIComponent(dataVersion(p));
      img.alt = p.productName || p.sku || 'Product image';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => {
        img.removeAttribute('src');
        imageWrap.classList.add('no-photo');
      };
    } else {
      imageWrap.classList.add('no-photo');
    }

    if (p.productLink) {
      link.href = p.productLink;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open Product';
    } else {
      link.removeAttribute('href');
      link.textContent = 'No product link';
      link.style.opacity = '.5';
    }

    $('products').appendChild(node);
  });
}

function dataVersion(p) {
  return [p.sku, p.productName, p.quantity, p.supplier, p.productLink, p.image].join('|');
}

$('searchInput').addEventListener('input', () => {
  clearTimeout(requestTimer);
  requestTimer = setTimeout(render, 80);
});

$('clearBtn').addEventListener('click', () => {
  $('searchInput').value = '';
  render();
  $('searchInput').focus();
});

$('refreshBtn').addEventListener('click', loadData);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

loadData();
