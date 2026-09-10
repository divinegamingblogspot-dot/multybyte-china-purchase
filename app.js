const API_URL = 'https://script.google.com/macros/s/AKfycbwDHq7TB9vSxTlSeG9i55HyuhPzAP8oryRWdLsKhPZVHQubgdIAs8CJ7sknQTJLmabj/exec';

let allProducts = [];
let requestTimer = null;

const $ = id => document.getElementById(id);

function setState(name, show) {
  $(name).classList.toggle('hidden', !show);
}

function loadData() {
  setState('loading', true);
  setState('error', false);
  setState('empty', false);
  $('statusText').textContent = 'Connecting to purchase data…';

  const callback = 'multybyteCallback_' + Date.now();
  const script = document.createElement('script');
  const timeout = setTimeout(() => {
    cleanup();
    showError('Could not connect to the purchase database. Check the Apps Script deployment and internet connection.');
  }, 20000);

  function cleanup() {
    clearTimeout(timeout);
    delete window[callback];
    script.remove();
  }

  window[callback] = data => {
    cleanup();
    setState('loading', false);

    if (!data || data.success !== true || !Array.isArray(data.data)) {
      showError(data && data.error ? data.error : 'Invalid data received from server.');
      return;
    }

    allProducts = data.data;
    $('countBadge').textContent = `${allProducts.length} item${allProducts.length === 1 ? '' : 's'}`;
    $('statusText').textContent = `Updated ${new Date(data.updated || Date.now()).toLocaleString()}`;
    render();
  };

  script.onerror = () => {
    cleanup();
    showError('Network error while connecting to the purchase database.');
  };

  script.src = `${API_URL}?action=data&callback=${encodeURIComponent(callback)}&_=${Date.now()}`;
  document.body.appendChild(script);
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
      img.src = p.image;
      img.alt = p.productName || p.sku || 'Product image';
      img.onerror = () => imageWrap.classList.add('no-photo');
    } else {
      imageWrap.classList.add('no-photo');
    }

    if (p.productLink && /^https?:\/\//i.test(p.productLink)) {
      link.href = p.productLink;
    } else {
      link.removeAttribute('href');
      link.textContent = 'No product link';
      link.style.opacity = '.5';
    }

    $('products').appendChild(node);
  });
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
