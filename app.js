const DATA_URL = 'https://raw.githubusercontent.com/divinegamingblogspot-dot/multybyte-china-purchase/main/data.json';
const IMAGE_BASE_URL = 'https://cdn.jsdelivr.net/gh/divinegamingblogspot-dot/multybyte-china-purchase@main/';
const AUTO_REFRESH_MS = 10 * 1000;

// Authentication backend will be connected here in the next stage.
// Never put real vendor passwords in this file or in GitHub Pages.
const AUTH_API_URL = '';
const PREVIEW_MODE = new URLSearchParams(location.search).get('preview') === '1';

let allProducts = [];
let requestTimer = null;
let lastUpdated = '';
let loading = false;

const $ = id => document.getElementById(id);

function setState(name, show) {
  $(name).classList.toggle('hidden', !show);
}

function showPortal(vendorName = 'Preview') {
  setState('loginView', false);
  setState('portalView', true);
  setState('refreshBtn', true);
  setState('logoutBtn', true);
  setState('vendorBadge', true);
  $('vendorBadge').textContent = vendorName;
  loadData(true);
}

function showLogin() {
  setState('loginView', true);
  setState('portalView', false);
  setState('refreshBtn', false);
  setState('logoutBtn', false);
  setState('vendorBadge', false);
  $('vendorBadge').textContent = '';
}

async function authenticate(vendorId, password) {
  if (!AUTH_API_URL) {
    throw new Error('Authentication backend is not connected yet.');
  }

  const response = await fetch(AUTH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendorId, password })
  });

  if (!response.ok) throw new Error('Authentication server error.');
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Invalid vendor ID or password.');
  return result;
}

async function handleLogin(event) {
  event.preventDefault();
  const vendorId = $('vendorId').value.trim();
  const password = $('vendorPassword').value;
  const error = $('loginError');

  error.classList.add('hidden');
  if (!vendorId || !password) return;

  try {
    const result = await authenticate(vendorId, password);
    localStorage.setItem('vendorSession', JSON.stringify({
      token: result.token,
      vendorId: result.vendorId || vendorId,
      vendorName: result.vendorName || vendorId
    }));
    showPortal(result.vendorName || vendorId);
  } catch (err) {
    error.textContent = err.message;
    error.classList.remove('hidden');
  }
}

function logout() {
  localStorage.removeItem('vendorSession');
  allProducts = [];
  lastUpdated = '';
  $('products').replaceChildren();
  $('vendorId').value = '';
  $('vendorPassword').value = '';
  showLogin();
}

async function loadData(showLoading = true) {
  if (loading) return;
  loading = true;

  if (showLoading) {
    setState('loading', true);
    setState('error', false);
    setState('empty', false);
    $('statusText').textContent = 'Checking latest product data…';
  }

  try {
    const cacheBust = Date.now() + '-' + Math.random().toString(36).slice(2);
    const response = await fetch(DATA_URL + '?v=' + cacheBust, { cache: 'no-store' });
    if (!response.ok) throw new Error('Data server returned HTTP ' + response.status);

    const data = await response.json();
    if (!data || data.success !== true || !Array.isArray(data.data)) {
      throw new Error('Invalid product data');
    }

    const incomingUpdated = data.updated || '';
    const changed = incomingUpdated !== lastUpdated || allProducts.length === 0;

    if (changed) {
      allProducts = data.data
        .filter(p => p && (p.sku || p.productName || p.productLink))
        .map(p => ({
          ...p,
          productLink: normalizeUrl(p.productLink),
          image: normalizeImageUrl(p.image)
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
    console.error('Vendor portal data load failed:', error);
    loading = false;
    if (showLoading || allProducts.length === 0) {
      showError('Could not load the product data. Try Refresh again.');
    }
  }
}

function normalizeUrl(value) {
  if (!value) return '';
  let url = String(value).trim().replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
  if (url.startsWith('//')) url = 'https:' + url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('./') || url.startsWith('../') || url.startsWith('/')) return url;
  return '';
}

function normalizeImageUrl(value) {
  if (!value) return '';
  let url = String(value).trim().replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
  if (url.startsWith('//')) return 'https:' + url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('./')) return IMAGE_BASE_URL + url.slice(2);
  if (url.startsWith('../')) return IMAGE_BASE_URL + url.replace(/^\.\.\//, '');
  if (url.startsWith('/')) return IMAGE_BASE_URL + url.slice(1);
  return '';
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
    const text = [p.sku, p.productName, p.supplier, p.quantity, p.price, p.rmbPrice, p.remarks].join(' ').toLowerCase();
    return !query || text.includes(query);
  });

  $('products').replaceChildren();
  setState('empty', filtered.length === 0);

  const template = $('productTemplate');
  filtered.forEach(p => {
    const node = template.content.cloneNode(true);
    const imageWrap = node.querySelector('.image-wrap');
    const img = node.querySelector('.product-image');

    node.querySelector('.sku').textContent = p.sku || 'NO SKU';
    node.querySelector('.product-name').textContent = p.productName || 'Product information unavailable';
    node.querySelector('.quantity').textContent = p.quantity || '—';
    node.querySelector('.supplier').textContent = p.supplier || '—';
    node.querySelector('.price').textContent = p.price ?? p.rmbPrice ?? p.RMBPrice ?? '—';
    node.querySelector('.remarks').textContent = p.remarks ?? p.remark ?? '—';

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

    const link = node.querySelector('.product-link');
    if (p.productLink) {
      link.href = p.productLink;
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
  return [p.sku, p.productName, p.quantity, p.supplier, p.productLink, p.image, p.price, p.remarks].join('|');
}

$('loginForm').addEventListener('submit', handleLogin);
$('logoutBtn').addEventListener('click', logout);
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
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

setInterval(() => {
  if (!$('portalView').classList.contains('hidden')) loadData(false);
}, AUTO_REFRESH_MS);

if (PREVIEW_MODE) {
  showPortal('Preview Mode');
} else {
  showLogin();
}
