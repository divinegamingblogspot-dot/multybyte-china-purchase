const DATA_URL = './data.json';
const AUTO_REFRESH_MS = 60 * 1000;

let allProducts = [];
let requestTimer = null;
let lastUpdated = '';
let loading = false;

const $ = id => document.getElementById(id);

function setState(name, show) {
  $(name).classList.toggle('hidden', !show);
}

async function loadData(showLoading = true) {
  if (loading) return;
  loading = true;

  if (showLoading) {
    setState('loading', true);
    setState('error', false);
    setState('empty', false);
    $('statusText').textContent = 'Checking latest purchase data…';
  }

  try {
    const cacheBust = Date.now() + '-' + Math.random().toString(36).slice(2);
    const response = await fetch(DATA_URL + '?v=' + cacheBust, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
    });
    if (!response.ok) throw new Error('Data server returned HTTP ' + response.status);

    const data = await response.json();
    if (!data || data.success !== true || !Array.isArray(data.data)) {
      throw new Error('Invalid purchase data');
    }

    const incomingUpdated = data.updated || '';
    const changed = incomingUpdated !== lastUpdated || allProducts.length === 0;

    if (changed) {
      allProducts = data.data.map(p => ({
        ...p,
        productLink: normalizeUrl(p.productLink),
        image: normalizeUrl(p.image)
      }));
      lastUpdated = incomingUpdated;
      render();
    }

    $('countBadge').textContent = `${allProducts.length} item${allProducts.length === 1 ? '' : 's'}`;
    $('statusText').textContent = incomingUpdated
      ? `Updated ${new Date(incomingUpdated).toLocaleString()}`
      : 'Data synced';

    setState('loading', false);
    setState('error', false);
    loading = false;
  } catch (error) {
    console.error(error);
    loading = false;
    if (showLoading || allProducts.length === 0) {
      showError('Could not load the China purchase data. Try Refresh again.');
    }
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

$('refreshBtn').addEventListener('click', () => loadData(true));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// Check GitHub for new Sheet data automatically every minute.
// The GitHub Action publishes fresh data approximately every 5 minutes.
setInterval(() => loadData(false), AUTO_REFRESH_MS);

loadData(true);
