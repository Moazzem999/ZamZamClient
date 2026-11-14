/**
 * ZamZam Trims (BD) Limited - Products Page Controller (products.js)
 * -------------------------------------------------------------------
 * Dynamically loads and filters product categories and products from API endpoints:
 *   - Categories:     GET {ApiBaseUrl}/api/ProductCategory/GetAllForDisplay
 *   - By Category:    GET {ApiBaseUrl}/api/Product/GetAllForDisplay/{categoryId}
 *   - Search:         GET {ApiBaseUrl}/api/Product/GetAllForDisplay/Search?searchTerm={term}
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const sectionEl = document.getElementById('productsSection');
    if (!sectionEl) return;

    let apiBaseUrl = (sectionEl.getAttribute('data-api-base-url') || window.apiBaseUrl || 'https://localhost:7148').replace(/\/+$/, '');
    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace('http://localhost:', 'https://localhost:');
    }

    const CATEGORIES_API_URL = `${apiBaseUrl}/api/ProductCategory/GetAllForDisplay`;
    const PRODUCTS_BY_CAT_URL = `${apiBaseUrl}/api/Product/GetAllForDisplay`;
    const PRODUCTS_SEARCH_URL = `${apiBaseUrl}/api/Product/GetAllForDisplay/Search`;

    const filterBar = document.getElementById('productFilterBar');
    const productsGrid = document.getElementById('productsGrid');
    const searchInput = document.getElementById('productSearchInput');
    const noResultsAlert = document.getElementById('noProductsAlert');
    const visibleCountEl = document.getElementById('visibleProductsCount');
    const totalCountEl = document.getElementById('totalProductsCount');

    let currentCategoryId = 0;
    let totalProductsCount = null;
    let searchDebounceTimer = null;

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function resolveImageUrl(path) {
        if (!path) return '/images/products/Buttons.jpg';
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        return `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    }

    function updateCounts(visibleCount, maybeTotal) {
        if (typeof maybeTotal === 'number' && totalProductsCount === null) {
            totalProductsCount = maybeTotal;
        }
        const total = totalProductsCount !== null ? totalProductsCount : visibleCount;
        if (visibleCountEl) visibleCountEl.textContent = String(visibleCount);
        if (totalCountEl) totalCountEl.textContent = String(total);
    }

    function showLoadingState() {
        if (noResultsAlert) noResultsAlert.style.display = 'none';
        if (!productsGrid) return;
        productsGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary mb-3" style="width: 2.5rem; height: 2.5rem;" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <h6 class="fw-semibold text-secondary">Loading products...</h6>
            </div>
        `;
    }

    function showErrorState(retryFn) {
        if (noResultsAlert) noResultsAlert.style.display = 'none';
        if (!productsGrid) return;
        productsGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="text-danger mb-3" style="font-size: 2.5rem;"><i class="bi bi-exclamation-triangle-fill"></i></div>
                <h5 class="fw-bold text-dark mb-1">Failed to Load Products</h5>
                <p class="text-secondary small mb-3">Unable to retrieve product catalog data from server.</p>
                <button type="button" class="btn btn-sm btn-outline-primary px-4 rounded-pill fw-semibold" id="btnRetryProductsLoad">
                    <i class="bi bi-arrow-repeat me-1"></i> Try Again
                </button>
            </div>
        `;
        const retryBtn = document.getElementById('btnRetryProductsLoad');
        if (retryBtn && typeof retryFn === 'function') {
            retryBtn.addEventListener('click', retryFn);
        }
    }

    function extractList(response) {
        if (response && response.succeeded !== false && response.data) {
            return Array.isArray(response.data)
                ? response.data
                : (Array.isArray(response.data.items) ? response.data.items : []);
        }
        if (Array.isArray(response)) {
            return response;
        }
        return [];
    }

    // 1. Load Categories from API
    function loadCategories() {
        return fetch(CATEGORIES_API_URL, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-cache'
        })
        .then(res => res.json())
        .then(response => {
            const categories = extractList(response);
            renderCategoryPills(categories);
            return categories;
        })
        .catch(err => {
            console.warn('[Products] Category API load error:', err);
            return [];
        });
    }

    function renderCategoryPills(categories) {
        if (!filterBar) return;

        filterBar.innerHTML = `
            <button type="button" class="filter-btn product-filter-btn ${currentCategoryId === 0 ? 'active' : ''}" data-category-id="0">
                All Products
            </button>
        `;

        if (!categories || categories.length === 0) return;

        categories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `filter-btn product-filter-btn ${currentCategoryId === cat.id ? 'active' : ''}`;
            btn.setAttribute('data-category-id', cat.id);
            btn.setAttribute('data-category-name', cat.name || '');
            btn.textContent = cat.name;
            filterBar.appendChild(btn);
        });
    }

    // 2. Load Products by Category
    function loadProductsByCategory(categoryId = 0) {
        currentCategoryId = categoryId;
        if (filterBar) {
            filterBar.querySelectorAll('.product-filter-btn').forEach(btn => {
                const btnCatId = parseInt(btn.getAttribute('data-category-id'), 10) || 0;
                btn.classList.toggle('active', btnCatId === categoryId);
            });
        }
        showLoadingState();

        const endpoint = `${PRODUCTS_BY_CAT_URL}/${categoryId > 0 ? categoryId : 0}`;

        fetch(endpoint, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-cache'
        })
        .then(res => res.json())
        .then(response => {
            const items = extractList(response);
            if (categoryId === 0) {
                totalProductsCount = items.length;
            }
            renderProductsGrid(items);
        })
        .catch(err => {
            console.error('[Products] Fetch error:', err);
            updateCounts(0);
            showErrorState(() => loadProductsByCategory(categoryId));
        });
    }

    function selectAllProductsCategory() {
        currentCategoryId = 0;
        if (!filterBar) return;
        filterBar.querySelectorAll('.product-filter-btn').forEach(btn => {
            const isAll = btn.getAttribute('data-category-id') === '0';
            btn.classList.toggle('active', isAll);
        });
    }

    // 3. Search Products via API
    function searchProducts(term) {
        const trimmed = (term || '').trim();
        if (!trimmed) {
            loadProductsByCategory(currentCategoryId);
            return;
        }

        selectAllProductsCategory();
        showLoadingState();
        const endpoint = `${PRODUCTS_SEARCH_URL}?searchTerm=${encodeURIComponent(trimmed)}`;

        fetch(endpoint, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-cache'
        })
        .then(res => res.json())
        .then(response => {
            const items = extractList(response);
            renderProductsGrid(items);
        })
        .catch(err => {
            console.error('[Products] Search error:', err);
            updateCounts(0);
            showErrorState(() => searchProducts(trimmed));
        });
    }

    // 4. Render Product Cards (preserving exact existing design and effects)
    function renderProductsGrid(items) {
        if (!productsGrid) return;
        productsGrid.innerHTML = '';

        const count = Array.isArray(items) ? items.length : 0;
        updateCounts(count);

        if (count === 0) {
            if (noResultsAlert) noResultsAlert.style.display = 'block';
            return;
        }

        if (noResultsAlert) noResultsAlert.style.display = 'none';

        items.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        items.forEach(p => {
            const safeTitle = escapeHtml(p.title || 'Product');
            const safeCategory = escapeHtml(p.productCategoryName || 'Product');
            const safeBadge = escapeHtml(p.cardBadge || p.productCategoryName || 'Product');
            const safeDesc = escapeHtml(p.description || '');
            const safeSpecs = escapeHtml(p.technicalSpecs || '');
            const imgUrl = resolveImageUrl(p.imagePath);

            const col = document.createElement('div');
            col.className = 'col-xl-3 col-lg-4 col-md-6 product-item-col';
            col.setAttribute('data-category-id', p.productCategoryId || 0);

            col.innerHTML = `
                <div class="product-card card-sheen">
                    <div class="product-img-wrapper">
                        <span class="product-category-badge">${safeBadge}</span>
                        <img src="${escapeHtml(imgUrl)}" alt="${safeTitle}" class="product-img" onerror="this.onerror=null; this.src='/images/products/Buttons.jpg';" />
                    </div>
                    <div class="product-body">
                        <h5 class="product-title">${safeTitle}</h5>
                        <p class="product-desc">${safeDesc}</p>
                        
                        <div class="product-actions">
                            <button type="button" class="btn btn-sm btn-modern-primary flex-grow-1 btn-product-quote" data-title="${safeTitle}" data-category="${safeCategory}">
                                <i class="bi bi-calculator"></i> Quote
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-dark btn-product-specs" data-title="${safeTitle}" data-category="${safeCategory}" data-img="${escapeHtml(imgUrl)}" data-desc="${safeDesc}" data-specs="${safeSpecs}" title="View details & specs">
                                <i class="bi bi-eye"></i> Specs
                            </button>
                        </div>
                    </div>
                </div>
            `;

            productsGrid.appendChild(col);
        });

        productsGrid.querySelectorAll('.btn-product-quote').forEach(btn => {
            btn.addEventListener('click', function () {
                const title = this.getAttribute('data-title') || '';
                const category = this.getAttribute('data-category') || '';
                if (typeof window.openQuoteModal === 'function') {
                    window.openQuoteModal(title, category);
                }
            });
        });

        productsGrid.querySelectorAll('.btn-product-specs').forEach(btn => {
            btn.addEventListener('click', function () {
                const title = this.getAttribute('data-title') || '';
                const category = this.getAttribute('data-category') || '';
                const img = this.getAttribute('data-img') || '';
                const desc = this.getAttribute('data-desc') || '';
                const specs = this.getAttribute('data-specs') || '';
                if (typeof window.openProductQuickView === 'function') {
                    window.openProductQuickView(title, category, img, desc, specs);
                }
            });
        });
    }

    // 5. Category Pill Click Event (Event Delegation)
    if (filterBar) {
        filterBar.addEventListener('click', function (e) {
            const btn = e.target.closest('.product-filter-btn');
            if (!btn) return;
            e.preventDefault();

            filterBar.querySelectorAll('.product-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (searchInput) {
                searchInput.value = '';
            }
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }

            const catId = parseInt(btn.getAttribute('data-category-id'), 10) || 0;
            const catName = btn.getAttribute('data-category-name') || '';
            if (catId === 0) {
                window.history.replaceState(null, '', window.location.pathname);
            } else {
                window.history.replaceState(null, '', `?category=${encodeURIComponent(catName || catId)}`);
            }
            loadProductsByCategory(catId);
        });
    }

    // 6. Live Search Input Event
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
            const val = this.value;
            searchDebounceTimer = setTimeout(() => {
                searchProducts(val);
            }, 350);
        });

        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
                searchProducts(this.value);
            }
        });
    }

    // 7. Initial Load (supporting URL ?category=... and ?search=... query params)
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = (urlParams.get('category') || sectionEl.getAttribute('data-initial-category') || '').trim();
    const searchParam = (urlParams.get('search') || sectionEl.getAttribute('data-initial-search') || '').trim();

    if (searchParam && searchInput) {
        searchInput.value = searchParam;
    }

    // Fetch total count silently first if initial load is filtered or searched
    fetch(`${PRODUCTS_BY_CAT_URL}/0`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache'
    })
    .then(res => res.json())
    .then(res => {
        const allItems = extractList(res);
        totalProductsCount = allItems.length;
        if (totalCountEl) totalCountEl.textContent = String(totalProductsCount);
    })
    .catch(() => { /* ignore */ });

    loadCategories().then(categories => {
        if (searchParam) {
            searchProducts(searchParam);
            return;
        }

        if (categoryParam && categoryParam.toLowerCase() !== 'all') {
            const cleanParam = decodeURIComponent(categoryParam).trim().toLowerCase();
            const matched = categories.find(c => {
                if (!c) return false;
                const cId = String(c.id);
                const cName = (c.name || '').trim().toLowerCase();
                return cId === categoryParam ||
                       cName === cleanParam ||
                       cName === categoryParam.toLowerCase() ||
                       cName.replace(/\s+/g, '') === cleanParam.replace(/\s+/g, '') ||
                       cName.includes(cleanParam) ||
                       cleanParam.includes(cName);
            });
            if (matched) {
                currentCategoryId = matched.id;
                renderCategoryPills(categories);
                loadProductsByCategory(matched.id);
                return;
            }
        }

        loadProductsByCategory(0);
    });
});
