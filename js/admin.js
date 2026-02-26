const API_URL = `${API_BASE_URL}/api/menu`;
const WA_API_URL = `${API_BASE_URL}/api/whatsapp`;

// Cloudinary base for all menu item images
// NOTE: Do NOT include folder here; we handle folder/public_id from item.image
const CLOUDINARY_BASE =
  'https://res.cloudinary.com/duzxwbwyo/image/upload/f_auto,q_auto/';
const CLOUDINARY_FOLDER = 'qr-menu/';
const CLOUDINARY_PLACEHOLDER = `${CLOUDINARY_BASE}${CLOUDINARY_FOLDER}placeholder.png`;

// DOM Elements (will be initialized in DOMContentLoaded)
let menuList, menuForm, formTitle, cancelBtn, submitBtn;

// State variables
let isEditing = false;
let currentEditId = null;
let allMenuItems = [];

// ============================================================================
// WHATSAPP SETTINGS
// ============================================================================

async function loadWhatsAppSettings() {
  try {
    const response = await fetch(`${WA_API_URL}/settings`);
    const data = await response.json();
    
    const formSection = document.getElementById('waFormSection');
    const currentSection = document.getElementById('waCurrentSection');
    const currentNumber = document.getElementById('waCurrentNumber');
    const waNumberInput = document.getElementById('waNumber');
    const waCountryCodeSelect = document.getElementById('waCountryCode');
    const waStatusIndicator = document.getElementById('waStatusIndicator');
    const waQuickStatus = document.getElementById('waQuickStatus');
    const waToggleChevron = document.getElementById('waToggleChevron');

    if (data.enabled && data.number) {
      if (formSection) formSection.classList.add('hidden');
      if (waToggleChevron) waToggleChevron.style.transform = 'rotate(0deg)';
      const raw = String(data.number).replace(/\D/g, '');
      let localDigits = '';
      let countryCode = '91';
      if (raw.length > 10) {
        countryCode = raw.slice(0, raw.length - 10);
        localDigits = raw.slice(-10);
      } else {
        localDigits = raw;
      }
      if (waCountryCodeSelect) {
        waCountryCodeSelect.value = countryCode || '91';
      }
      if (waNumberInput) {
        waNumberInput.value = localDigits;
      }
      currentNumber.textContent = raw;
      waStatusIndicator.textContent = `Active: +${countryCode} ${localDigits}`;
      waStatusIndicator.classList.add('text-green-600', 'font-semibold');
      waQuickStatus.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error loading WhatsApp settings:', error);
  }
}

window.toggleWhatsApp = function() {
  const formSection = document.getElementById('waFormSection');
  const chevron = document.getElementById('waToggleChevron');

  if (formSection.classList.contains('hidden')) {
    formSection.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
    const currentSection = document.getElementById('waCurrentSection');
    const currentNumber = document.getElementById('waCurrentNumber');
    if (currentSection && currentNumber && currentNumber.textContent.trim().length > 0) {
      currentSection.classList.remove('hidden');
    }
  } else {
    formSection.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
};

window.saveWhatsApp = async function() {
  const token = localStorage.getItem('adminToken');
  const waNumberInput = document.getElementById('waNumber');
  const waCountryCodeSelect = document.getElementById('waCountryCode');
  const localDigits = (waNumberInput && waNumberInput.value.trim().replace(/\D/g, '')) || '';
  const countryCode = (waCountryCodeSelect && waCountryCodeSelect.value !== 'other')
    ? waCountryCodeSelect.value.replace(/\D/g, '')
    : '';

  if (!localDigits) {
    showPopup('Please enter a WhatsApp number', 'error');
    return;
  }

  const fullNumber = countryCode ? countryCode + localDigits : localDigits;
  if (fullNumber.length < 10 || fullNumber.length > 15) {
    showPopup('Number should be 10–15 digits (with country code).', 'error');
    return;
  }

  try {
    const response = await fetch(`${WA_API_URL}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ 
        enabled: true, 
        number: fullNumber 
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    showPopup('✅ WhatsApp settings saved successfully!', 'success');
    
    const currentSection = document.getElementById('waCurrentSection');
    const currentNumber = document.getElementById('waCurrentNumber');
    const waStatusIndicator = document.getElementById('waStatusIndicator');
    const waQuickStatus = document.getElementById('waQuickStatus');
    const formSection = document.getElementById('waFormSection');
    const chevron = document.getElementById('waToggleChevron');
    
    currentSection.classList.remove('hidden');
    currentNumber.textContent = fullNumber;
    waStatusIndicator.textContent = `Active: +${countryCode || '91'} ${localDigits}`;
    waStatusIndicator.classList.add('text-green-600', 'font-semibold');
    waQuickStatus.classList.remove('hidden');
    if (formSection && !formSection.classList.contains('hidden')) {
      if (window.anime) {
        window.anime({ targets: '#waFormSection', opacity: [1,0], translateY: [0,-8], duration: 180, easing: 'easeInQuad', complete: () => formSection.classList.add('hidden') });
      } else {
        formSection.classList.add('hidden');
      }
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
  } catch (error) {
    console.error('Error saving WhatsApp settings:', error);
    showPopup('❌ Error saving settings: ' + error.message, 'error');
  }
};

window.deleteWhatsApp = async function() {
  const token = localStorage.getItem('adminToken');

  try {
    const response = await fetch(`${WA_API_URL}/settings`, {
      method: 'DELETE',
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    showPopup('🗑️ WhatsApp settings removed', 'deleted');
    
    const waNumberInput = document.getElementById('waNumber');
    const currentSection = document.getElementById('waCurrentSection');
    const waStatusIndicator = document.getElementById('waStatusIndicator');
    const waQuickStatus = document.getElementById('waQuickStatus');
    
    if (waNumberInput) waNumberInput.value = '';
    const waCountryCodeSelect = document.getElementById('waCountryCode');
    if (waCountryCodeSelect) waCountryCodeSelect.value = '91';
    currentSection.classList.add('hidden');
    waStatusIndicator.textContent = 'Click to configure';
    waStatusIndicator.classList.remove('text-green-600', 'font-semibold');
    waQuickStatus.classList.add('hidden');
  } catch (error) {
    console.error('Error deleting WhatsApp settings:', error);
    showPopup('Error deleting settings: ' + error.message, 'error');
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// Show popup notification
function showPopup(message, type = 'success') {
  if (window.Swal && typeof window.Swal.fire === 'function') {
    const icon = type === 'error' ? 'error' : (type === 'deleted' ? 'info' : 'success');
    window.Swal.fire({
      icon,
      title: type === 'error' ? 'Error' : (type === 'deleted' ? 'Deleted' : 'Success'),
      text: message,
      timer: 2000,
      showConfirmButton: false
    });
    return;
  }
  const modal = document.getElementById('popupModal');
  const iconEl = document.getElementById('popupIcon');
  const titleEl = document.getElementById('popupTitle');
  const msgElement = document.getElementById('popupMessage');
  if (type === 'success') {
    iconEl.textContent = '✅';
    titleEl.textContent = 'Success!';
    titleEl.className = 'text-2xl font-bold text-green-700 mb-2';
  } else if (type === 'error') {
    iconEl.textContent = '❌';
    titleEl.textContent = 'Error!';
    titleEl.className = 'text-2xl font-bold text-red-700 mb-2';
  } else if (type === 'deleted') {
    iconEl.textContent = '🗑️';
    titleEl.textContent = 'Deleted!';
    titleEl.className = 'text-2xl font-bold text-red-600 mb-2';
  }
  msgElement.textContent = message;
  modal.classList.remove('hidden');
  setTimeout(closePopup, 2000);
}

function closePopup() {
  const modal = document.getElementById('popupModal');
  modal.classList.add('hidden');
}

// Check authentication before anything else
(function checkAuth() {
  const token = localStorage.getItem('adminToken');
  if (!token && window.location.href.includes('admin.html')) {
    window.location.replace('login.html');
  }
})();

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function initAdminPage() {
  console.log('Initializing admin page...');

  // Check token again
  const token = localStorage.getItem('adminToken');
  if (!token) {
    console.warn('No token found, redirecting to login');
    window.location.replace('login.html');
    return;
  }

  // Get DOM elements
  menuList = document.getElementById('menuList');
  menuForm = document.getElementById('menuForm');
  formTitle = document.getElementById('formTitle');
  cancelBtn = document.getElementById('cancelBtn');
  submitBtn = document.getElementById('submitBtn');

  // Validate all required elements exist
  if (!menuList || !menuForm || !formTitle || !submitBtn) {
    console.error('ERROR: Required DOM elements not found!');
    console.error('Elements:', { menuList, menuForm, formTitle, submitBtn, cancelBtn });
    document.body.innerHTML = '<div style="padding: 20px; color: red;"><h1>Error: Admin page failed to load</h1><p>Required HTML elements are missing.</p></div>';
    return;
  }

  console.log('✅ All DOM elements found');

  // Attach event listeners
  menuForm.addEventListener('submit', handleFormSubmit);
  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetForm);
  }
  const addBtn = document.getElementById('toggleAddFormBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      const wrap = document.getElementById('addFormWrapper');
      if (!wrap) return;
      const isHidden = wrap.classList.contains('hidden');
      if (isHidden) {
        wrap.classList.remove('hidden');
        if (window.anime) {
          window.anime({ targets: '#addFormWrapper', opacity: [0,1], translateY: [-12,0], duration: 250, easing: 'easeOutQuad' });
        }
        addBtn.textContent = 'Collapse Form';
      } else {
        if (window.anime) {
          window.anime({ targets: '#addFormWrapper', opacity: [1,0], translateY: [0,-8], duration: 200, easing: 'easeInQuad', complete: () => wrap.classList.add('hidden') });
        } else {
          wrap.classList.add('hidden');
        }
        addBtn.textContent = 'Add Item';
      }
    });
  }
  const fileInput = document.getElementById('imageFile');
  const fileNameEl = document.getElementById('fileName');
  const previewEl = document.getElementById('imagePreview');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      const file = this.files && this.files[0] ? this.files[0] : null;
      if (fileNameEl) fileNameEl.textContent = file ? file.name : 'No file chosen';
      if (previewEl) {
        if (file) {
          const url = URL.createObjectURL(file);
          previewEl.src = url;
          previewEl.classList.remove('hidden');
        } else {
          previewEl.src = '';
          previewEl.classList.add('hidden');
        }
      }
    });
  }

  // Attach logout button event listener if it exists
  const logoutBtn = document.querySelector('button[onclick="logout()"]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
    console.log('✅ Logout button event listener attached');
  } else {
    console.warn('⚠️ Logout button not found in DOM');
  }

  // Attach search and filter listeners
  const searchInput = document.getElementById('adminSearch');
  const categoryFilter = document.getElementById('adminCategoryFilter');
  
  if (searchInput) {
    searchInput.addEventListener('input', applyAdminFilters);
  }
  if (categoryFilter) {
    categoryFilter.addEventListener('change', applyAdminFilters);
  }

  // Load menu
  loadMenu();
  
  // Load WhatsApp settings
  loadWhatsAppSettings();

  const waFormSection = document.getElementById('waFormSection');
  const waChevron = document.getElementById('waToggleChevron');
  if (waFormSection) waFormSection.classList.add('hidden');
  if (waChevron) waChevron.style.transform = 'rotate(0deg)';

  // Initialize custom dropdowns
  initDropdowns();

  // Attach error clearing listeners to form fields
  attachErrorClearingListeners();
});

// ============================================================================
// MENU LOADING & RENDERING
// ============================================================================

// Default placeholder image served from Cloudinary
const PLACEHOLDER_IMAGE = CLOUDINARY_PLACEHOLDER;

// Apply search and category filters
function applyAdminFilters() {
  const searchTerm = document.getElementById('adminSearch')?.value.toLowerCase() || '';
  const categoryFilter = document.getElementById('adminCategoryFilter')?.value || '';

  const filtered = allMenuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm) || item.desc.toLowerCase().includes(searchTerm);
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  renderMenu(filtered);
}

async function loadMenu() {
  console.log('Fetching menu items...');
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const items = await response.json();
    console.log('✅ Menu fetched:', items.length, 'items');
    allMenuItems = items;
    renderMenu(items);
  } catch (error) {
    console.error('❌ Failed to load menu:', error);
    menuList.innerHTML = '<p style="color: red; grid-column: 1/-1; text-align: center;">Error loading menu items. Please check that the server is running.</p>';
    if (window.Swal) {
      window.Swal.fire({
        icon: 'error',
        title: 'Server unavailable',
        text: 'Failed to load menu. Retry?',
        showCancelButton: true,
        confirmButtonText: 'Retry'
      }).then((r) => { if (r.isConfirmed) loadMenu(); });
    }
  }
}

function renderMenu(items) {
  console.log('Rendering', items.length, 'items');
  menuList.innerHTML = '';

  if (!items || items.length === 0) {
    menuList.innerHTML = '<p style="color: #999; grid-column: 1/-1; text-align: center;">No menu items yet. Add one to get started!</p>';
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'rounded-2xl shadow-lg overflow-hidden bg-white/90 backdrop-blur hover:shadow-xl transition-shadow duration-300 flex flex-col';
    card.setAttribute('data-id', item._id);

    // Build Cloudinary image URL from value stored in MongoDB.
    // Handles:
    // - "qr-menu/vegmaggi.png"
    // - "vegmaggi.png"
    // - full Cloudinary URL
    const rawImage = item.image ? String(item.image).trim() : '';
    let imageUrl;
    if (!rawImage) {
      imageUrl = PLACEHOLDER_IMAGE;
    } else if (/^https?:\/\//.test(rawImage)) {
      imageUrl = rawImage;
    } else if (rawImage.startsWith(CLOUDINARY_FOLDER)) {
      imageUrl = `${CLOUDINARY_BASE}${rawImage}`;
    } else {
      imageUrl = `${CLOUDINARY_BASE}${CLOUDINARY_FOLDER}${rawImage}`;
    }

    /*console.log('Admin image debug:', {
      id: item._id,
      name: item.name,
      rawImage,
      imageUrl
    });*/
    
    const safeTags = Array.isArray(item.tags) ? item.tags : [];
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
    const available = item.isAvailable !== false;
    const toggleAria = available ? 'true' : 'false';
    const switchBase = available ? 'bg-green-600' : 'bg-gray-300';
    const knobShift = available ? 'translate-x-8' : 'translate-x-0';
    
    const ratingValue = Number(item.rating) || 0;
    const ratingBadge = ratingValue > 0
      ? `<div class="absolute top-3 right-3 bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">⭐ ${ratingValue}</div>`
      : '';
    card.innerHTML = `
      <div class="relative overflow-hidden h-48 flex-shrink-0">
        <img src="${imageUrl}" 
             class="w-full h-full object-cover" 
             alt="${item.name || 'Item'}"
             onerror="if (this.src !== '${PLACEHOLDER_IMAGE}') { this.onerror = null; this.src = '${PLACEHOLDER_IMAGE}'; }">
        ${ratingBadge}
        ${tagBadges ? `<div class="absolute left-3 top-3 flex gap-1 flex-wrap">${tagBadges}</div>` : ''}
      </div>
      <div class="p-4 flex flex-col gap-3 flex-grow">
        <div class="flex-grow">
          <h3 class="font-bold text-lg mb-1 line-clamp-2 text-slate-900">${item.name || 'Unnamed'}</h3>
          <p class="text-gray-600 text-sm line-clamp-2">${item.desc || ''}</p>
        </div>
        <div class="text-emerald-600 font-bold text-lg">₹${item.price || '0'}</div>
        <div class="flex gap-2 mt-2 items-center">
          <button onclick="editItem('${item._id}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition">Edit</button>
          <button onclick="deleteItem('${item._id}')" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition">Delete</button>
          <button onclick="toggleAvailability('${item._id}', this)" role="switch" aria-checked="${toggleAria}" class="w-16 h-10 rounded-full ${switchBase} relative transition">
            <span class="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow transform ${knobShift} transition"></span>
          </button>
        </div>
      </div>
    `;
    menuList.appendChild(card);
  });
}

// ============================================================================
// FORM VALIDATION
// ============================================================================

/**
 * Validate form fields and return validation result
 * @returns {object} { isValid: boolean, missingFields: array, firstErrorMessage: string }
 */
function validateForm() {
  const errors = [];
  const missingFields = [];

  // Get form field values
  const nameInput = document.getElementById('name');
  const categoryInput = document.getElementById('category');
  const priceInput = document.getElementById('price');
  const descInput = document.getElementById('desc');
  const imageFileInput = document.getElementById('imageFile');

  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const price = priceInput.value.trim();
  const desc = descInput.value.trim();
  const hasImageFile = imageFileInput && imageFileInput.files && imageFileInput.files.length > 0;

  // Validate each required field and build error messages
  if (!name) {
    errors.push('Item name is required');
    missingFields.push('name');
  }

  if (!category) {
    errors.push('Please select a category');
    missingFields.push('category');
  }

  if (!price || isNaN(price) || Number(price) <= 0) {
    errors.push('Price is required and must be greater than 0');
    missingFields.push('price');
  }

  if (!desc) {
    errors.push('Description cannot be empty');
    missingFields.push('desc');
  }

  // Image is only required for new items (not editing)
  if (!isEditing && !hasImageFile) {
    errors.push('Please upload an image');
    missingFields.push('imageFile');
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    missingFields: missingFields,
    firstErrorMessage: errors.length > 0 ? errors.join('\n') : ''
  };
}

/**
 * Highlight empty fields with red border
 * @param {array} fieldIds - list of field names to highlight
 */
function highlightErrorFields(fieldIds) {
  // Clear all previous error states first
  clearErrorHighlighting();

  // Add error state to missing fields
  fieldIds.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.classList.add('border-red-500', 'ring-2', 'ring-red-200');
    }
    
    // Special handling for category dropdown
    if (fieldId === 'category') {
      const categoryDropdownBtn = document.querySelector('#itemCategoryDropdown [data-dropdown-toggle]');
      if (categoryDropdownBtn) {
        categoryDropdownBtn.classList.add('border-red-500', 'ring-2', 'ring-red-200');
      }
    }
  });
}

/**
 * Clear all error highlighting from fields
 */
function clearErrorHighlighting() {
  const allInputs = document.querySelectorAll('#menuForm input, #menuForm select, #menuForm textarea, #itemCategoryDropdown [data-dropdown-toggle]');
  allInputs.forEach(input => {
    input.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
  });
}

/**
 * Attach real-time error clearing to form fields
 */
function attachErrorClearingListeners() {
  const formFields = document.querySelectorAll('#menuForm input[type="text"], #menuForm input[type="number"], #menuForm input[type="file"], #menuForm select, #menuForm textarea');
  
  formFields.forEach(field => {
    field.addEventListener('input', function() {
      // Remove error highlighting when user starts typing/selecting
      this.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
    });

    field.addEventListener('change', function() {
      // Also handle change events (for select dropdowns and file inputs)
      this.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
    });
  });

  // Also attach to dropdown button
  const categoryDropdownBtn = document.querySelector('#itemCategoryDropdown [data-dropdown-toggle]');
  if (categoryDropdownBtn) {
    categoryDropdownBtn.addEventListener('click', function() {
      this.classList.remove('border-red-500', 'ring-2', 'ring-red-200');
    });
  }
}

// ============================================================================
// FORM HANDLING
// ============================================================================

async function handleFormSubmit(e) {
  e.preventDefault();

  // Run validation first
  const validation = validateForm();
  
  if (!validation.isValid) {
    // Highlight empty fields
    highlightErrorFields(validation.missingFields);
    
    // Show SweetAlert with validation error message
    if (window.Swal) {
      window.Swal.fire({
        icon: 'warning',
        title: 'Missing Required Fields',
        html: validation.firstErrorMessage.replace(/\n/g, '<br>'),
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626'
      });
    } else {
      showPopup(validation.firstErrorMessage, 'error');
    }
    return;
  }

  const token = localStorage.getItem('adminToken');
  if (!token) {
    showPopup('Session expired. Please login again.', 'error');
    setTimeout(() => window.location.replace('login.html'), 1500);
    return;
  }

  if (window.Swal) {
    window.Swal.fire({ title: 'Saving item…', allowOutsideClick: false, didOpen: () => window.Swal.showLoading() });
  }
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-60', 'cursor-not-allowed');
  }

  const formData = {
    name: document.getElementById('name').value.trim(),
    category: document.getElementById('category').value.trim(),
    price: Number(document.getElementById('price').value) || 0,
    rating: Number(document.getElementById('rating').value) || null,
    desc: document.getElementById('desc').value.trim(),
    tags: document.getElementById('tag').value.trim() ? [document.getElementById('tag').value.trim()] : [],
    special: document.getElementById('special').checked
  };

  const method = isEditing ? 'PUT' : 'POST';
  const url = isEditing ? `${API_URL}/${currentEditId}` : API_URL;

  try {
    const fileInput = document.getElementById('imageFile');
    const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const wasEditing = isEditing;
    
    if (file && file.size > MAX_IMAGE_BYTES) {
      if (window.Swal) window.Swal.close();
      showPopup('Image too large. Max size is 5MB', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-60', 'cursor-not-allowed');
      }
      return;
    }

    let response;

    const fd = new FormData();
    fd.append('name', formData.name);
    fd.append('category', formData.category);
    fd.append('price', String(formData.price));
    if (formData.rating != null) fd.append('rating', String(formData.rating));
    fd.append('desc', formData.desc);
    // tags as JSON string to preserve array
    fd.append('tags', JSON.stringify(formData.tags));
    fd.append('special', String(formData.special));
    // New image only if file selected (create requires it; edit optional)
    if (file) fd.append('image', file);

    console.log(`${method} multipart request to ${url}`, { ...formData, image: file ? '[file]' : '[none]' });
    response = await fetch(url, {
      method,
      headers: {
        'Authorization': token
      },
      body: fd
    });

    if (!response.ok) {
      let reason = '';
      try {
        const data = await response.json();
        reason = data && data.msg ? ` - ${data.msg}` : '';
      } catch {}
      throw new Error(`HTTP ${response.status}: ${response.statusText}${reason}`);
    }

    const result = await response.json();
    console.log('✅ Item saved:', result);
    if (window.Swal) {
      window.Swal.fire({ icon: 'success', title: isEditing ? 'Item updated' : 'Item added', timer: 1200, showConfirmButton: false });
    } else {
      showPopup(isEditing ? 'Item updated successfully!' : 'Item added successfully!', 'success');
    }
    resetForm();
    const wrap = document.getElementById('addFormWrapper');
    const addBtn = document.getElementById('toggleAddFormBtn');
    if (wrap && !wrap.classList.contains('hidden')) {
      if (window.anime) {
        window.anime({ targets: '#addFormWrapper', opacity: [1,0], translateY: [0,-8], duration: 200, easing: 'easeInQuad', complete: () => wrap.classList.add('hidden') });
      } else {
        wrap.classList.add('hidden');
      }
    }
    if (addBtn) addBtn.textContent = 'Add Item';
    setTimeout(loadMenu, 1500);
  } catch (error) {
    console.error('❌ Error saving item:', error);
    if (window.Swal) {
      window.Swal.fire({
        icon: 'error',
        title: 'Failed to save item',
        text: error.message,
        showCancelButton: true,
        confirmButtonText: 'Retry'
      }).then((r) => { if (r.isConfirmed) { const ev = new Event('submit', { cancelable: true }); menuForm.dispatchEvent(ev); } });
    } else {
      showPopup('Error: ' + error.message, 'error');
    }
  }
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-60', 'cursor-not-allowed');
  }
}


function resetForm() {
  menuForm.reset();
  clearErrorHighlighting();
  isEditing = false;
  currentEditId = null;
  formTitle.textContent = 'Add New Item';
  submitBtn.textContent = 'Add Item';
  if (cancelBtn) {
    cancelBtn.classList.add('hidden');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// ITEM MANAGEMENT
// ============================================================================

window.editItem = function(id) {
  console.log('Editing item:', id);
  const item = allMenuItems.find(i => i._id === id);
  if (!item) {
    if (window.Swal) {
      window.Swal.fire({ icon: 'error', title: 'Not found', text: 'Item not found' });
    } else {
      alert('Item not found');
    }
    return;
  }

  document.getElementById('name').value = item.name || '';
  document.getElementById('category').value = item.category || '';
  document.getElementById('price').value = item.price || '';
  document.getElementById('rating').value = item.rating || '';
  document.getElementById('desc').value = item.desc || '';
  // Image URL input removed; image is managed by Cloudinary file upload
  document.getElementById('tag').value = item.tags && item.tags.length > 0 ? item.tags[0] : '';
  document.getElementById('special').checked = item.special || false;

  isEditing = true;
  currentEditId = id;
  formTitle.textContent = 'Edit Menu Item';
  submitBtn.textContent = 'Update Item';
  if (cancelBtn) {
    cancelBtn.classList.remove('hidden');
  }
  // Ensure form is visible when editing
  const wrap = document.getElementById('addFormWrapper');
  if (wrap && wrap.classList.contains('hidden')) {
    wrap.classList.remove('hidden');
    if (window.anime) {
      window.anime({ targets: '#addFormWrapper', opacity: [0,1], translateY: [-10,0], duration: 220, easing: 'easeOutQuad' });
    }
  }
  const addBtn = document.getElementById('toggleAddFormBtn');
  if (addBtn) addBtn.textContent = 'Collapse Form';

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteItem = async function(id) {
  if (!confirm('Delete this item?')) return;

  const token = localStorage.getItem('adminToken');
  if (!token) {
    showPopup('Session expired. Please login again.', 'error');
    setTimeout(() => window.location.replace('login.html'), 1500);
    return;
  }

  try {
    console.log('Deleting item:', id);
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': token }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('✅ Item deleted');
    showPopup('Item deleted successfully!', 'deleted');
    setTimeout(loadMenu, 1500);
  } catch (error) {
    console.error('❌ Error deleting item:', error);
    showPopup('Error deleting item: ' + error.message, 'error');
  }
};

// ============================================================================
// AVAILABILITY TOGGLE
// ============================================================================
window.toggleAvailability = async function(id, btnEl) {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      showPopup('Session expired. Please login again.', 'error');
      setTimeout(() => window.location.replace('login.html'), 1500);
      return;
    }
    if (btnEl) btnEl.disabled = true;
    const res = await fetch(`${API_URL}/${id}/toggle-availability`, {
      method: 'PUT',
      headers: { 'Authorization': token }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const updated = await res.json();
    const available = updated.isAvailable !== false;
    const idx = allMenuItems.findIndex(i => i._id === id);
    if (idx !== -1) {
      allMenuItems[idx].isAvailable = available;
    }
    if (btnEl) {
      btnEl.setAttribute('aria-checked', available ? 'true' : 'false');
      btnEl.classList.remove('bg-green-600','bg-gray-300');
      btnEl.classList.add(available ? 'bg-green-600' : 'bg-gray-300');
      const knob = btnEl.querySelector('span');
      if (knob) {
        knob.classList.remove('translate-x-8','translate-x-0');
        knob.classList.add(available ? 'translate-x-8' : 'translate-x-0');
      }
      if (window.anime) window.anime({ targets: btnEl, scale: [0.96, 1], duration: 120, easing: 'easeOutQuad' });
      btnEl.disabled = false;
    }
    showPopup('Availability updated', 'success');
  } catch (err) {
    console.error('Toggle availability failed:', err);
    showPopup('Error updating availability: ' + err.message, 'error');
    if (btnEl) btnEl.disabled = false;
  }
};

// ============================================================================
// LOGOUT
// ============================================================================

function logout() {
  console.log('Logout button clicked');
  if (confirm('Are you sure you want to logout?')) {
    console.log('User confirmed logout');
    localStorage.removeItem('adminToken');
    console.log('Token removed from localStorage');
    // Use direct redirect for safety
    window.location.href = 'login.html';
  } else {
    console.log('User cancelled logout');
  }
}

// Also expose on window for inline onclick handlers
window.logout = logout;

// ============================================================================
// CUSTOM DROPDOWNS
// ============================================================================
function initDropdowns() {
  const dropdowns = document.querySelectorAll('[data-dropdown]');
  dropdowns.forEach((dd) => {
    const btn = dd.querySelector('[data-dropdown-toggle]');
    const menu = dd.querySelector('.dropdown-menu');
    const labelEl = dd.querySelector('span[id$="Label"], span[id$="DropdownLabel"]');
    const selectSelector = dd.getAttribute('data-select');
    const selectEl = selectSelector ? document.querySelector(selectSelector) : null;
    if (!btn || !menu || !selectEl) return;

    // Open on button click
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAllDropdowns();
      menu.classList.toggle('hidden');
    });

    // Close on option click and sync with select
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item');
      if (!item) return;
      e.preventDefault();
      const value = item.getAttribute('data-value');
      if (selectEl) {
        selectEl.value = value;
        if (labelEl) {
          labelEl.textContent = item.textContent.trim();
        }
        // Trigger change for filters
        const ev = new Event('change', { bubbles: true });
        selectEl.dispatchEvent(ev);
      }
      menu.classList.add('hidden');
    });
  });

  // Click outside closes all
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-dropdown]')) {
      closeAllDropdowns();
    }
  });

  function closeAllDropdowns() {
    document.querySelectorAll('[data-dropdown] .dropdown-menu').forEach(m => m.classList.add('hidden'));
  }
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

