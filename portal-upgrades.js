(() => {
  'use strict';

  const REMEMBER_KEY = 'mb_remember_login';

  const $ = (id) => document.getElementById(id);
  const toast = (message, type = 'info') => {
    if (typeof window.toast === 'function') return window.toast(message, type);
    const stack = $('toastStack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  };

  function setupLoginEnhancements() {
    const id = $('loginId');
    const password = $('loginPassword');
    const remember = $('rememberLogin');
    const showPassword = $('showPasswordBtn');
    const clear = $('clearLoginBtn');
    if (!id || !password) return;

    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
      if (saved?.id) {
        id.value = saved.id;
        if (remember) remember.checked = true;
      }
    } catch (_) {}

    showPassword?.addEventListener('click', () => {
      const visible = password.type === 'text';
      password.type = visible ? 'password' : 'text';
      showPassword.textContent = visible ? '◉' : '◌';
      showPassword.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
    });

    clear?.addEventListener('click', () => {
      id.value = '';
      password.value = '';
      id.focus();
      localStorage.removeItem(REMEMBER_KEY);
      if (remember) remember.checked = false;
    });

    $('loginForm')?.addEventListener('submit', () => {
      if (remember?.checked && id.value.trim()) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ id: id.value.trim() }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    }, true);
  }

  function getVisibleProductCards(root) {
    return [...(root || document).querySelectorAll('.card')].filter(card => {
      const style = getComputedStyle(card);
      return style.display !== 'none' && card.offsetParent !== null;
    });
  }

  function text(card, selector) {
    return card.querySelector(selector)?.textContent?.trim() || '—';
  }

  function imageUrl(card) {
    const img = card.querySelector('.product-image');
    return img?.currentSrc || img?.src || '';
  }

  function loadImageData(url) {
    return new Promise((resolve) => {
      if (!url || /^data:/i.test(url)) return resolve(url || null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const max = 900;
          const scale = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
          canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        } catch (_) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url + (url.includes('?') ? '&' : '?') + '_pdf=' + Date.now();
    });
  }

  function fitContain(doc, data, x, y, w, h) {
    try {
      const props = doc.getImageProperties(data);
      const ratio = props.width / props.height;
      let dw = w, dh = w / ratio;
      if (dh > h) { dh = h; dw = h * ratio; }
      doc.addImage(data, 'JPEG', x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, undefined, 'FAST');
      return true;
    } catch (_) { return false; }
  }

  async function exportPDF(options = {}) {
    if (!window.jspdf?.jsPDF) {
      toast('PDF engine is still loading. Try again.', 'warn');
      return;
    }

    const button = $('pdfBtn');
    const previous = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Preparing PDF…'; }

    try {
      const mode = options.mode || 'visible';
      let cards;
      let title = 'Multybyte Products';
      let subtitle = 'Visible purchase intelligence';

      if (mode === 'favorites') {
        cards = getVisibleProductCards($('favoritesProducts'));
        title = 'Multybyte Favorites';
        subtitle = 'Saved products on this device';
      } else if (mode === 'recent') {
        cards = getVisibleProductCards($('recentProducts'));
        title = 'Multybyte Recent Products';
        subtitle = 'Recently opened products';
      } else if (mode === 'admin') {
        cards = getVisibleProductCards($('adminProductsList'));
        title = 'Multybyte MASTER Products';
        subtitle = 'Administrator product matrix';
      } else {
        cards = getVisibleProductCards($('products'));
      }

      if (!cards.length) {
        toast('There are no visible products to export.', 'warn');
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 12;
      const cardW = pageW - margin * 2;
      const cardH = 59;
      let y = 37;

      const header = () => {
        doc.setFillColor(5, 10, 20);
        doc.rect(0, 0, pageW, 29, 'F');
        doc.setTextColor(110, 235, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('MULTYBYTE', margin, 11);
        doc.setFontSize(7);
        doc.setTextColor(175, 191, 210);
        doc.text('QUANTUM PARTNER NETWORK', margin, 17);
        doc.setTextColor(220, 230, 240);
        doc.setFontSize(9);
        doc.text(title, margin, 24);
        doc.setTextColor(130, 150, 170);
        doc.setFontSize(7);
        doc.text(`${subtitle}  •  ${cards.length} products`, pageW - margin, 24, { align: 'right' });
      };

      const footer = () => {
        doc.setDrawColor(220, 225, 232);
        doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
        doc.setTextColor(125, 135, 150);
        doc.setFontSize(6.5);
        doc.text('Generated by Multybyte Partner Portal', margin, pageH - 5);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageW - margin, pageH - 5, { align: 'right' });
      };

      header();

      for (let i = 0; i < cards.length; i++) {
        if (y + cardH > pageH - 15) {
          footer();
          doc.addPage();
          header();
          y = 37;
        }

        const card = cards[i];
        const sku = text(card, '.sku');
        const name = text(card, '.product-name');
        const quantity = text(card, '.quantity');
        const supplier = text(card, '.supplier');
        const price = text(card, '.price');
        const remarks = text(card, '.remarks');
        const link = card.querySelector('.product-link')?.href || '';

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(220, 226, 233);
        doc.roundedRect(margin, y, cardW, cardH, 3, 3, 'FD');

        const ix = margin + 4, iy = y + 4, iw = 46, ih = 51;
        const imgData = await loadImageData(imageUrl(card));
        if (imgData) {
          fitContain(doc, imgData, ix, iy, iw, ih);
        } else {
          doc.setFillColor(235, 239, 244);
          doc.roundedRect(ix, iy, iw, ih, 2, 2, 'F');
          doc.setTextColor(135, 145, 158);
          doc.setFontSize(7);
          doc.text('NO IMAGE', ix + iw / 2, iy + ih / 2, { align: 'center' });
        }

        const tx = margin + 56;
        doc.setTextColor(20, 30, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(doc.splitTextToSize(name, cardW - 61), tx, y + 9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(75, 88, 105);
        doc.text(`SKU: ${sku}`, tx, y + 17);
        doc.text(`Quantity: ${quantity}`, tx, y + 23);
        doc.text(`Supplier: ${supplier}`, tx, y + 29);
        doc.text(`Price: ${price}`, tx, y + 35);
        const remarkLines = doc.splitTextToSize(`Remarks: ${remarks}`, cardW - 61).slice(0, 2);
        doc.text(remarkLines, tx, y + 41);
        if (link) {
          doc.setTextColor(15, 115, 145);
          doc.text('Product link:', tx, y + 51);
          doc.setTextColor(80, 95, 110);
          const short = link.length > 75 ? link.slice(0, 72) + '…' : link;
          doc.text(doc.splitTextToSize(short, cardW - 80), tx + 23, y + 51);
        }
        y += cardH + 6;
      }

      footer();
      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`Multybyte_Products_${mode}_${stamp}.pdf`);
      toast(`PDF exported · ${cards.length} products`, 'success');
    } catch (e) {
      console.error(e);
      toast('PDF export failed. Check the browser console for details.', 'warn');
    } finally {
      if (button) { button.disabled = false; button.textContent = previous || '▣ Export PDF'; }
    }
  }

  function wire() {
    setupLoginEnhancements();
    $('pdfBtn')?.addEventListener('click', () => exportPDF({ mode: 'visible' }));
    $('favoritesPdfBtn')?.addEventListener('click', () => exportPDF({ mode: 'favorites' }));
    $('recentPdfBtn')?.addEventListener('click', () => exportPDF({ mode: 'recent' }));
    $('adminPdfBtn')?.addEventListener('click', () => exportPDF({ mode: 'admin' }));

    document.querySelectorAll('[data-cmd="pdf"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const close = $('commandPalette');
        close?.classList.add('hidden');
        exportPDF({ mode: 'visible' });
      });
    });
  }

  window.exportMultybytePDF = exportPDF;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
