// Menu API URLs (uses API_BASE_URL from config.js)
const menuUrl = `${API_BASE_URL}/api/menu`;
const waSettingsUrl = `${API_BASE_URL}/api/whatsapp/settings`;

// Cloudinary base for all menu item images
// NOTE: Do NOT include folder here; we handle folder/public_id from item.image
const CLOUDINARY_BASE =
  'https://res.cloudinary.com/duzxwbwyo/image/upload/f_auto,q_auto/';
const CLOUDINARY_FOLDER = 'qr-menu/';
const CLOUDINARY_PLACEHOLDER = `${CLOUDINARY_BASE}${CLOUDINARY_FOLDER}placeholder.png`;

let whatsappSettings = {
  enabled: false,
  number: null
};

// ============================================================================
// OFFLINE TOAST HANDLER
// ============================================================================
let offlineToastShown = false;

function showOfflineToast(message = 'You are offline') {
  if (offlineToastShown) return;
  offlineToastShown = true;

  const toast = document.createElement('div');
  toast.id = 'offlineToast';
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    padding: 14px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
    z-index: 1000;
    animation: slideUp 0.3s ease-out;
    max-width: 90%;
    text-align: center;
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  
  toast.innerHTML = `<span>📡</span> ${message}`;
  
  const style = document.createElement('style');
  if (!document.getElementById('toastAnimationStyle')) {
    style.id = 'toastAnimationStyle';
    style.innerHTML = `
      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
      @keyframes slideDown {
        from {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
        to {
          transform: translateX(-50%) translateY(100px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease-out forwards';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      offlineToastShown = false;
    }, 300);
  }, 4000);
}

// Listen for service worker messages
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.controller?.postMessage({ type: 'GET_STATUS' });
  
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, message } = event.data;
    if (type === 'OFFLINE') {
      console.warn('🔌 ' + message);
      showOfflineToast(message);
    } else if (type === 'ONLINE') {
      console.log('✅ ' + message);
      // Optionally show connection restored toast
      // showOfflineToast('Connection restored');
    }
  });
}

async function fetchWhatsAppSettings() {
  try {
    const response = await fetch(waSettingsUrl);
    if (!response.ok) {
      throw new Error(`Failed to load WhatsApp settings: ${response.statusText}`);
    }
    const data = await response.json();
    const enabled = Boolean(data && data.enabled && data.number);
    whatsappSettings = {
      enabled,
      number: enabled ? String(data.number) : null
    };
    console.log('✅ WhatsApp settings:', whatsappSettings);
  } catch (error) {
    console.error('Error loading WhatsApp settings:', error);
    whatsappSettings = {
      enabled: false,
      number: null
    };
  }
}

// Format price with rupee symbol
function formatPrice(price) {
  return `₹${price}`;
}

// Escape string for safe use in HTML attributes
function escapeHtmlAttr(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Local SVG placeholder kept as an additional offline-safe fallback
function getPlaceholderSVG() {
  return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%236b7280%22 font-family=%22system-ui%22 font-size=%2218%22 font-weight=%22600%22%3EMenu Item%3C/text%3E%3C/svg%3E';
}

// Create a menu card element from item data with tags, image placeholder, and WhatsApp CTA
function createCard(item) {
  const safeName = item.name || '';
  const safeDesc = item.desc || '';
  const safeCategory = (item.category || '').toLowerCase();
  const safeRating = item.rating || '';
  const safePrice = item.price || 0;
  const safeTags = Array.isArray(item.tags) ? item.tags : [];
  const isAvailable = item.isAvailable !== false;

  // Build Cloudinary image URL from value stored in MongoDB.
  // Handles these shapes safely:
  // - "qr-menu/vegmaggi.png"
  // - "vegmaggi.png"
  // - full Cloudinary URL (backward compatibility)
  const rawImage = item.image ? String(item.image).trim() : '';
  let imageSrc;
  if (!rawImage) {
    imageSrc = CLOUDINARY_PLACEHOLDER;
  } else if (/^https?:\/\//.test(rawImage)) {
    // Already a full URL (legacy data)
    imageSrc = rawImage;
  } else if (rawImage.startsWith(CLOUDINARY_FOLDER)) {
    // Already includes folder, just prepend base
    imageSrc = `${CLOUDINARY_BASE}${rawImage}`;
  } else {
    // Filename only -> prepend folder + base
    imageSrc = `${CLOUDINARY_BASE}${CLOUDINARY_FOLDER}${rawImage}`;
  }

  /*console.log('Menu image debug:', {
    name: safeName,
    rawImage,
    imageSrc
  });*/

  // Badge HTML for tags (New, Popular, etc)
  const tagBadges = safeTags.map(tag => {
    const t = String(tag).toLowerCase();
    let color = 'bg-emerald-100 text-emerald-700';
    let label = tag;

    if (t === 'new') {
      color = 'bg-rose-100 text-rose-700';
      label = '✨ New';
    } else if (t === 'popular') {
      color = 'bg-amber-100 text-amber-700';
      label = '⭐ Popular';
    } else if (t === 'bestseller') {
      color = 'bg-purple-100 text-purple-700';
      label = '🔥 Bestseller';
    }

    return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${color}">${label}</span>`;
  }).join(' ');

  let waButtonHtml = '';
  let waHintHtml = '';
  if (whatsappSettings.enabled && whatsappSettings.number) {
    waHintHtml = `
      <div class="mt-1">
        <span class="order-hint">Tap to order</span>
      </div>
    `;
  }

  const unavailableOverlay = !isAvailable ? `
      <div class="absolute inset-0 z-20 flex items-center justify-center" style="background: rgba(255, 250, 245, 0.85); backdrop-filter: blur(2px);">
        <span class="font-semibold" style="color: var(--c-red-1);">Sorry, Out of Stock</span>
      </div>
    ` : '';

  const ratingValue = Number(safeRating) || 0;
  const ratingBadge = ratingValue > 0
    ? `<div class="absolute top-3 right-3 bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">⭐ ${ratingValue}</div>`
    : '';

  return `
    <article class="menu-card rounded-2xl shadow-lg overflow-hidden scale-in fade-in bg-white/90 backdrop-blur hover:shadow-xl transition-shadow duration-300 flex flex-col relative ${!isAvailable ? 'opacity-60 cursor-not-allowed' : ''}" data-cat="${safeCategory}" data-name="${safeName.toLowerCase()}" data-unavailable="${!isAvailable}">
      <div class="relative overflow-hidden h-48 flex-shrink-0">
        <img src="${imageSrc}" loading="lazy" decoding="async" class="w-full h-full object-cover" alt="${safeName}" onerror="if (this.src !== '${CLOUDINARY_PLACEHOLDER}') { this.onerror = null; this.src = '${CLOUDINARY_PLACEHOLDER}'; }">
        ${ratingBadge}
        ${tagBadges ? `<div class="absolute left-3 top-3 flex gap-1 flex-wrap">${tagBadges}</div>` : ''}
      </div>
      <div class="p-4 flex flex-col gap-3 flex-grow">
        <div class="flex-grow">
          <h3 class="font-bold text-lg mb-1 card-title line-clamp-2 text-slate-900">${safeName}</h3>
          <p class="text-gray-600 text-sm card-desc line-clamp-2">${safeDesc}</p>
        </div>
        <div class="card-price-section">
          <span class="card-price-text">${formatPrice(safePrice)}</span>
        </div>
        ${waHintHtml}
      </div>
      ${unavailableOverlay}
    </article>
  `;
}

// Load menu from JSON and render cards
async function loadMenu() {
  try {
    const response = await fetch(menuUrl, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`Failed to load menu: ${response.statusText}`);
    }
    const items = await response.json();
    
    const grid = document.querySelector('#menuGrid');
    if (!grid) {
      console.error('Menu grid container not found');
      return;
    }

    // Clear existing content
    grid.innerHTML = '';

    // Create and render all cards
    items.forEach(item => {
      grid.innerHTML += createCard(item);
    });

    console.log(`✅ Loaded ${items.length} menu items`);

    // Display daily specials (items with special: true) - allow up to 10
    const specials = items.filter(i => i.special === true).slice(0, 10);
    const specialsBar = document.getElementById('specialsBar');
    const specialsList = document.getElementById('specialsList');

    if (specialsBar && specialsList && specials.length > 0) {
      specialsBar.classList.remove('hidden');
      specialsList.innerHTML = specials.map(sp => `
        <span class="inline-flex items-center rounded-full bg-white/80 px-3 py-1 shadow-sm text-[12px] font-bold text-amber-900">
          ${sp.name} - ${formatPrice(sp.price)}
        </span>
      `).join('');
    }

    // Attach filter click handlers after cards are created
    attachFilterHandlers();

  } catch (error) {
    console.error('Error loading menu:', error);
    const grid = document.querySelector('#menuGrid');
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; min-height: 400px; background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%); border-radius: 16px; border: 2px dashed #fca5a5;">
          <div style="margin-bottom: 20px; font-size: 48px;">🔌</div>
          <p style="font-size: 22px; font-weight: 600; color: #7f1d1d; margin-bottom: 8px;">Menu is temporarily offline</p>
          <p style="font-size: 15px; color: #991b1b; margin-bottom: 24px; max-width: 400px; line-height: 1.5;">Please call the restaurant directly to place your order. We'll be back online shortly!</p>
          <button id="retryMenuBtn" style="padding: 12px 32px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.2);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(220, 38, 38, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(220, 38, 38, 0.2)'">↻ Try Again</button>
        </div>
      `;
      
      // Add retry button handler
      const retryBtn = document.getElementById('retryMenuBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          console.log('🔄 Retrying menu load...');
          loadMenu();
        });
      }
    }
  }
}

// Show/hide menu items by category
function showCategory(category) {
  const cards = document.querySelectorAll('[data-cat]');
  let visibleCount = 0;

  cards.forEach(card => {
    const cardCategory = card.getAttribute('data-cat');
    const isMatch = (category === 'all') || (cardCategory === category);
    
    if (isMatch) {
      card.style.display = 'block';
      card.classList.add('fade-in');
      visibleCount++;
    } else {
      card.style.display = 'none';
      card.classList.remove('fade-in');
    }
  });

  // Update active button state for ALL filter buttons
  const filterButtons = document.querySelectorAll('[data-filter]');
  filterButtons.forEach(btn => {
    const btnCategory = btn.getAttribute('data-filter');
    if (btnCategory === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Clear search when changing category
  const searchInput = document.getElementById('menuSearch');
  if (searchInput) {
    searchInput.value = '';
  }

  console.log(`🔍 Filtered: ${category} | Showing ${visibleCount} items`);
}

// Attach click handlers to filter buttons
function attachFilterHandlers() {
  const filterButtons = document.querySelectorAll('[data-filter]');
  
  filterButtons.forEach(btn => {
    btn.removeEventListener('click', handleFilterClick);
    btn.addEventListener('click', handleFilterClick);
  });
}

// Filter button click handler
function handleFilterClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const category = this.getAttribute('data-filter');
  console.log(`📌 Filter clicked: ${category}`);
  showCategory(category);
}

// Simple name-based search filter
function applySearchFilter() {
  const searchInput = document.getElementById('menuSearch');
  const clearBtn = document.getElementById('clearSearch');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const cards = document.querySelectorAll('[data-name]');

  // Show/hide clear button
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !query);
  }

  let visibleCount = 0;

  cards.forEach(card => {
    const name = card.getAttribute('data-name') || '';
    const matches = !query || name.includes(query);
    
    if (matches) {
      card.style.display = 'block';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  console.log(`🔎 Search: "${query}" | Found ${visibleCount} items`);
}

// Clear search input
function clearSearch() {
  const searchInput = document.getElementById('menuSearch');
  if (searchInput) {
    searchInput.value = '';
    applySearchFilter();
    searchInput.focus();
  }
}

// ============================================================================
// WhatsApp Order Modal (modular: single delegated listener, no global conflict)
// ============================================================================
(function initOrderModal() {
  var currentUnitPrice = 0;
  var lastOrderTrigger = null;
  var backdrop, modal, productNameEl, productPriceEl, qtyInput, qtyMinus, qtyPlus;
  var specialInput, tableInput, tableErrorEl, totalEl, cancelBtn, submitBtn;

  function getElements() {
    backdrop = document.getElementById('orderModalBackdrop');
    modal = document.getElementById('orderModal');
    productNameEl = document.getElementById('orderModalProductName');
    productPriceEl = document.getElementById('orderModalProductPrice');
    qtyInput = document.getElementById('orderModalQuantity');
    qtyMinus = document.getElementById('orderModalQtyMinus');
    qtyPlus = document.getElementById('orderModalQtyPlus');
    specialInput = document.getElementById('orderModalSpecialInstructions');
    tableInput = document.getElementById('orderModalTableNumber');
    tableErrorEl = document.getElementById('orderModalTableError');
    totalEl = document.getElementById('orderModalTotal');
    cancelBtn = document.getElementById('orderModalCancel');
    submitBtn = document.getElementById('orderModalSubmit');
    return backdrop && modal && productNameEl && productPriceEl && qtyInput && totalEl && tableInput;
  }

  var waNotConfiguredEl = null;
  function getWaNotConfiguredEl() {
    if (!waNotConfiguredEl) waNotConfiguredEl = document.getElementById('orderModalWaNotConfigured');
    return waNotConfiguredEl;
  }

  function updateTotal() {
    if (!qtyInput || !totalEl) return;
    var qty = parseInt(qtyInput.value, 10);
    if (isNaN(qty) || qty < 1) {
      qty = 1;
      qtyInput.value = 1;
    }
    qtyInput.value = qty;
    totalEl.textContent = formatPrice(currentUnitPrice * qty);
  }

  function openOrderModal(productName, unitPrice, triggerElement) {
    if (!getElements()) return;
    currentUnitPrice = Number(unitPrice) || 0;
    lastOrderTrigger = triggerElement && triggerElement.nodeType === 1 ? triggerElement : null;
    if (lastOrderTrigger) {
      lastOrderTrigger.setAttribute('tabindex', '-1');
    }
    productNameEl.textContent = productName ? ('Order: ' + productName) : 'Order';
    productPriceEl.textContent = formatPrice(currentUnitPrice);
    qtyInput.value = 1;
    if (specialInput) specialInput.value = '';
    if (tableInput) tableInput.value = '';
    if (tableErrorEl) {
      tableErrorEl.classList.add('hidden');
      tableErrorEl.textContent = '';
    }
    updateTotal();
    var waOk = whatsappSettings.enabled && whatsappSettings.number;
    var notConfiguredEl = getWaNotConfiguredEl();
    if (notConfiguredEl) {
      notConfiguredEl.classList.toggle('hidden', waOk);
    }
    if (submitBtn) {
      submitBtn.disabled = !waOk;
      submitBtn.setAttribute('aria-disabled', waOk ? 'false' : 'true');
    }
    backdrop.classList.remove('pointer-events-none');
    backdrop.style.opacity = '1';
    backdrop.removeAttribute('aria-hidden');
    modal.classList.remove('pointer-events-none');
    modal.classList.remove('order-modal-hidden');
    var box = modal.querySelector('.order-modal-box');
    if (box) {
      box.classList.remove('scale-95');
      box.classList.add('scale-100');
    }
    modal.removeAttribute('aria-hidden');
    modal.removeAttribute('inert');
    document.body.classList.add('overflow-hidden');
    if (tableInput) tableInput.focus();
  }

  function closeOrderModal() {
    if (!backdrop || !modal) return;
    if (lastOrderTrigger && typeof lastOrderTrigger.focus === 'function') {
      try {
        lastOrderTrigger.focus();
      } catch (err) {}
    }
    lastOrderTrigger = null;
    modal.setAttribute('inert', '');
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.add('order-modal-hidden');
    backdrop.classList.add('pointer-events-none');
    backdrop.style.opacity = '0';
    backdrop.setAttribute('aria-hidden', 'true');
    modal.classList.add('pointer-events-none');
    var box = modal.querySelector('.order-modal-box');
    if (box) {
      box.classList.add('scale-95');
      box.classList.remove('scale-100');
    }
    document.body.classList.remove('overflow-hidden');
  }

  function buildWhatsAppMessage() {
    var name = (productNameEl && productNameEl.textContent) || 'Item';
    var qty = parseInt(qtyInput.value, 10) || 1;
    if (qty < 1) qty = 1;
    var total = currentUnitPrice * qty;
    var instructions = (specialInput && specialInput.value.trim()) || 'None';
    var table = (tableInput && tableInput.value.trim()) || '';
    return (
      ' Order from MenuNova – Smart QR Menu \n\n' +
      'Product: ' + name + '\n' +
      'Price: ' + formatPrice(currentUnitPrice) + '\n' +
      'Quantity: ' + qty + '\n' +
      'Total: ' + formatPrice(total) + '\n' +
      'Special instructions: ' + instructions + '\n' +
      'Table number: ' + table
    );
  }

  function handleSubmit() {
    var table = tableInput ? tableInput.value.trim() : '';
    if (!table) {
      if (tableErrorEl) {
        tableErrorEl.textContent = 'Please enter your table number.';
        tableErrorEl.classList.remove('hidden');
      }
      if (tableInput) tableInput.focus();
      return;
    }
    if (tableErrorEl) tableErrorEl.classList.add('hidden');
    if (!whatsappSettings.enabled || !whatsappSettings.number) {
      closeOrderModal();
      return;
    }
    var message = buildWhatsAppMessage();
    var url = 'https://wa.me/' + whatsappSettings.number + '?text=' + encodeURIComponent(message);
    window.open(url, '_blank', 'noopener');
    closeOrderModal();
  }

  function bindModalListeners() {
    if (!getElements()) return;
    if (qtyMinus) {
      qtyMinus.addEventListener('click', function() {
        var v = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = Math.max(1, v - 1);
        updateTotal();
      });
    }
    if (qtyPlus) {
      qtyPlus.addEventListener('click', function() {
        var v = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = v + 1;
        updateTotal();
      });
    }
    if (qtyInput) {
      qtyInput.addEventListener('input', updateTotal);
      qtyInput.addEventListener('change', function() {
        var v = parseInt(qtyInput.value, 10);
        if (isNaN(v) || v < 1) qtyInput.value = 1;
        updateTotal();
      });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', closeOrderModal);
    if (backdrop) backdrop.addEventListener('click', closeOrderModal);
    if (submitBtn) submitBtn.addEventListener('click', handleSubmit);
    if (tableInput) {
      tableInput.addEventListener('input', function() {
        if (tableErrorEl && tableInput.value.trim()) tableErrorEl.classList.add('hidden');
      });
      tableInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        }
      });
    }
  }

  function getCardData(card) {
    var name = (card.getAttribute('data-product-name') || '').trim();
    if (!name) {
      var titleEl = card.querySelector('.card-title');
      if (titleEl) name = (titleEl.textContent || '').trim();
    }
    var price = parseFloat(card.getAttribute('data-price'), 10);
    if (isNaN(price)) {
      var priceEl = card.querySelector('.card-price-text');
      if (priceEl) price = parseFloat((priceEl.textContent || '').replace(/[^\d.]/g, ''), 10) || 0;
    }
    return { name: name || '', price: isNaN(price) ? 0 : price };
  }

  function handleCardClick(e) {
    var card = e.target.closest('.menu-card');
    if (!card) return;
    var grid = document.getElementById('menuGrid');
    if (!grid || !grid.contains(card)) return;
  if (card.getAttribute('data-unavailable') === 'true') return;
    if (!whatsappSettings.enabled || !whatsappSettings.number) return;
    e.preventDefault();
    e.stopPropagation();
    var data = getCardData(card);
    if (!data.name && !data.price) return;
    openOrderModal(data.name, data.price, card);
  }

  function handleCardKeydown(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest('.menu-card');
    if (!card) return;
    var grid = document.getElementById('menuGrid');
    if (!grid || !grid.contains(card)) return;
  if (card.getAttribute('data-unavailable') === 'true') return;
    if (!whatsappSettings.enabled || !whatsappSettings.number) return;
    e.preventDefault();
    var data = getCardData(card);
    if (!data.name && !data.price) return;
    openOrderModal(data.name, data.price, card);
  }

  window.attachOrderModalCardClick = function() {
    if (document._orderModalCardClickAttached) return;
    document._orderModalCardClickAttached = true;
    document.addEventListener('click', handleCardClick, false);
    document.addEventListener('keydown', handleCardKeydown, false);
  };

  document.addEventListener('DOMContentLoaded', function() {
    bindModalListeners();
    window.openOrderModal = openOrderModal;
  });
})();

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
  // Attach order modal to card clicks FIRST (runs before any await so listener is always on)
  if (typeof window.attachOrderModalCardClick === 'function') {
    window.attachOrderModalCardClick();
  }
  // Hero animations with anime.js, if available
  try {
    if (window.anime) {
      const badge = document.querySelector('.offer-badge');
      const logo = document.querySelector('.offer-box img');
      const subtitle = document.querySelector('.theme-subtext');
      if (badge) {
        window.anime({ targets: badge, opacity: [0, 1], translateY: [-10, 0], duration: 700, easing: 'easeOutQuad' });
      }
      if (logo) {
        window.anime({ targets: logo, opacity: [0, 1], scale: [0.9, 1], duration: 700, delay: 150, easing: 'easeOutBack' });
      }
      if (subtitle) {
        window.anime({ targets: subtitle, opacity: [0, 1], translateY: [10, 0], duration: 700, delay: 250, easing: 'easeOutQuad' });
      }
    }
  } catch (e) {}

  console.log('🚀 Initializing menu application...');
  await fetchWhatsAppSettings();
  await loadMenu();

  // Attach card click to open order modal (after grid has cards; direct on #menuGrid)
  var menuGrid = document.getElementById('menuGrid');
  if (menuGrid && typeof window.openOrderModal === 'function') {
    menuGrid.addEventListener('click', function orderModalCardClick(e) {
      var card = e.target.closest('.menu-card');
      if (!card || !menuGrid.contains(card)) return;
      if (card.getAttribute('data-unavailable') === 'true') return;
      if (!whatsappSettings.enabled || !whatsappSettings.number) return;
      e.preventDefault();
      e.stopPropagation();
      var name = (card.getAttribute('data-product-name') || '').trim();
      if (!name) {
        var titleEl = card.querySelector('.card-title');
        if (titleEl) name = (titleEl.textContent || '').trim();
      }
      var price = parseFloat(card.getAttribute('data-price'), 10);
      if (isNaN(price)) {
        var priceEl = card.querySelector('.card-price-text');
        if (priceEl) price = parseFloat((priceEl.textContent || '').replace(/[^\d.]/g, ''), 10) || 0;
      }
      if (isNaN(price)) price = 0;
      if (!name && !price) return;
      window.openOrderModal(name, price, card);
    });
    menuGrid.addEventListener('keydown', function orderModalCardKeydown(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest('.menu-card');
      if (!card || !menuGrid.contains(card)) return;
      if (card.getAttribute('data-unavailable') === 'true') return;
      if (!whatsappSettings.enabled || !whatsappSettings.number) return;
      e.preventDefault();
      var name = (card.getAttribute('data-product-name') || '').trim();
      if (!name) {
        var titleEl = card.querySelector('.card-title');
        if (titleEl) name = (titleEl.textContent || '').trim();
      }
      var price = parseFloat(card.getAttribute('data-price'), 10);
      if (isNaN(price)) {
        var priceEl = card.querySelector('.card-price-text');
        if (priceEl) price = parseFloat((priceEl.textContent || '').replace(/[^\d.]/g, ''), 10) || 0;
      }
      if (isNaN(price)) price = 0;
      if (!name && !price) return;
      window.openOrderModal(name, price, card);
    });
    console.log('✅ Order modal: tap on any card to open');
  }

  // Attach handlers to filter buttons
  const filterButtons = document.querySelectorAll('[data-filter]');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', handleFilterClick);
  });

  // Attach search handler
  const searchInput = document.getElementById('menuSearch');
  if (searchInput) {
    searchInput.addEventListener('input', applySearchFilter);
  }

  // Attach clear button handler
  const clearBtn = document.getElementById('clearSearch');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearSearch);
  }

  // Show all items by default
  showCategory('all');
});

// Hero video scroll effect
window.addEventListener('scroll', function() {
  const heroHeader = document.getElementById('heroHeader');
  if (!heroHeader) return;

  const scrollTop = window.scrollY;
  const heroHeight = heroHeader.offsetHeight;

  if (scrollTop > heroHeight * 0.3) {
    heroHeader.classList.add('scrolled');
  } else {
    heroHeader.classList.remove('scrolled');
  }

  // Menu card animation on scroll
  const cards = document.querySelectorAll('.menu-card');
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    if (rect.top < windowHeight * 0.75 && !card.classList.contains('slide-up')) {
      card.classList.add('slide-up');
    }
  });
}, false);

// Footer toggle (show/hide panel) and overlay handling
document.addEventListener('DOMContentLoaded', function() {
  const scrollBtn = document.getElementById('scrollToFooterBtn');
  const footer = document.getElementById('footerSection');
  const overlay = document.getElementById('footerOverlay');
  const icon = document.getElementById('scrollBtnIcon');
  const label = document.getElementById('scrollBtnLabel');

  if (!scrollBtn || !footer || !overlay) return;

  // Toggle footer panel visibility with smooth animation
  scrollBtn.addEventListener('click', function() {
    const isOpen = footer.classList.toggle('footer-visible');
    overlay.classList.toggle('visible', isOpen);
    document.body.classList.toggle('overflow-hidden', isOpen);
    scrollBtn.setAttribute('aria-expanded', String(isOpen));
    
    // Smooth icon and label transition
    if (icon) {
      icon.style.transition = 'transform 0.3s ease';
      icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
      icon.textContent = isOpen ? '↑' : '↓';
    }
    if (label) label.textContent = isOpen ? 'Close' : 'Open';
  });

  // Clicking overlay closes the footer smoothly
  overlay.addEventListener('click', function() {
    footer.classList.remove('footer-visible');
    overlay.classList.remove('visible');
    document.body.classList.remove('overflow-hidden');
    scrollBtn.setAttribute('aria-expanded', 'false');
    if (icon) {
      icon.style.transform = 'rotate(0deg)';
      icon.textContent = '↓';
    }
    if (label) label.textContent = 'Open';
  });
});

// Service Worker Registration (production only)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '';

    if (isLocalhost || window.location.protocol === 'file:') {
      console.log('⚙️ Service Worker registration skipped in development.');
      return;
    }

    navigator.serviceWorker
      .register('./sw.js')
      .then(function (registration) {
        console.log('✅ Service Worker registered:', registration);
      })
      .catch(function (error) {
        console.log('⚠️ Service Worker registration failed:', error);
      });
  });
}

// ============================================================================
// SCROLL TO TOP BUTTON
// ============================================================================

(function initScrollToTopButton() {
  const scrollBtn = document.getElementById('scrollToTopBtn');
  if (!scrollBtn) return;

  let scrollTimeout;
  let isAnimating = false;

  function handleScroll() {
    clearTimeout(scrollTimeout);
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollPosition > 300) {
      if (!scrollBtn.classList.contains('active')) {
        scrollBtn.classList.remove('hidden');
        scrollBtn.classList.add('active');
        
        // Smooth fade in with anime.js if available
        if (window.anime) {
          window.anime.set(scrollBtn, { opacity: 0 });
          window.anime({
            targets: scrollBtn,
            opacity: [0, 1],
            duration: 300,
            easing: 'easeOutQuad'
          });
        }
      }
    } else {
      if (scrollBtn.classList.contains('active')) {
        // Fade out animation
        if (window.anime) {
          window.anime({
            targets: scrollBtn,
            opacity: [1, 0],
            duration: 250,
            easing: 'easeInQuad',
            complete: () => {
              scrollBtn.classList.remove('active');
              scrollBtn.classList.add('hidden');
            }
          });
        } else {
          scrollBtn.classList.remove('active');
          scrollBtn.classList.add('hidden');
        }
      }
    }
  }

  function smoothScrollToTop() {
    if (isAnimating) return;
    isAnimating = true;

    if (window.anime) {
      window.anime({
        targets: window,
        scrollY: 0,
        duration: 800,
        easing: 'easeInOutQuad',
        round: 1,
        update: () => window.scrollTo(0, window.anime.get(window, 'scrollY')),
        complete: () => {
          isAnimating = false;
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      isAnimating = false;
    }
  }

  // Attach scroll event listener
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Attach click event listener
  scrollBtn.addEventListener('click', (e) => {
    e.preventDefault();
    smoothScrollToTop();
  });

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    window.removeEventListener('scroll', handleScroll);
  });
})();

