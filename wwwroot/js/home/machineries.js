/**
 * ZamZam Trims (BD) Limited - Machineries Page Controller (machineries.js)
 * -----------------------------------------------------------------------
 * Dynamically loads and filters categories and machineries from API endpoints:
 *   - Categories:  GET {ApiBaseUrl}/api/MachineryCategory/GetAllForDisplay
 *   - Machineries: GET {ApiBaseUrl}/api/Machinery/GetAllForDisplay/{categoryId?}
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const sectionEl = document.getElementById('machineriesSection');
    if (!sectionEl) return;

    let apiBaseUrl = (sectionEl.getAttribute('data-api-base-url') || window.apiBaseUrl || 'https://localhost:7148').replace(/\/+$/, '');
    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace('http://localhost:', 'https://localhost:');
    }

    const CATEGORIES_API_URL = `${apiBaseUrl}/api/MachineryCategory/GetAllForDisplay`;
    const MACHINERIES_API_URL = `${apiBaseUrl}/api/Machinery/GetAllForDisplay`;

    const filterBar = document.getElementById('machineryFilterBar');
    const machineryGrid = document.getElementById('machineryGrid');
    let currentCategoryId = 0;

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function resolveImageUrl(path) {
        if (!path) return '/images/machineries/gto.jpg';
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        return `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    }

    function showLoadingState() {
        if (!machineryGrid) return;
        machineryGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary mb-3" style="width: 2.5rem; height: 2.5rem;" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <h6 class="fw-semibold text-secondary">Loading machinery lineup...</h6>
            </div>
        `;
    }

    function showErrorState() {
        if (!machineryGrid) return;
        machineryGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="text-danger mb-3" style="font-size: 2.5rem;"><i class="bi bi-exclamation-triangle-fill"></i></div>
                <h5 class="fw-bold text-dark mb-1">Failed to Load Machineries</h5>
                <p class="text-secondary small mb-3">Unable to retrieve machinery data from server.</p>
                <button type="button" class="btn btn-sm btn-outline-primary px-4 rounded-pill fw-semibold" id="btnRetryLoad">
                    <i class="bi bi-arrow-repeat me-1"></i> Try Again
                </button>
            </div>
        `;
        const retryBtn = document.getElementById('btnRetryLoad');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => loadMachineries(currentCategoryId));
        }
    }

    // 1. Load Categories from API
    function loadCategories() {
        fetch(CATEGORIES_API_URL, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-cache'
        })
        .then(res => res.json())
        .then(response => {
            let categories = [];
            if (response && response.succeeded !== false && response.data) {
                categories = Array.isArray(response.data) ? response.data : (Array.isArray(response.data.items) ? response.data.items : []);
            } else if (Array.isArray(response)) {
                categories = response;
            }

            renderCategoryPills(categories);
        })
        .catch(err => {
            console.warn('[Machineries] Category API load error:', err);
        });
    }

    function renderCategoryPills(categories) {
        if (!filterBar) return;

        // Keep "All Machineries" pill
        filterBar.innerHTML = `
            <button type="button" class="filter-btn machinery-filter-btn ${currentCategoryId === 0 ? 'active' : ''}" data-category-id="0">
                All Machineries
            </button>
        `;

        if (!categories || categories.length === 0) return;

        // Sort by displayOrder
        categories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `filter-btn machinery-filter-btn ${currentCategoryId === cat.id ? 'active' : ''}`;
            btn.setAttribute('data-category-id', cat.id);
            btn.textContent = cat.name;
            filterBar.appendChild(btn);
        });
    }

    // 2. Load Machineries from API
    function loadMachineries(categoryId = 0) {
        currentCategoryId = categoryId;
        showLoadingState();

        const endpoint = categoryId > 0 
            ? `${MACHINERIES_API_URL}/${categoryId}`
            : `${MACHINERIES_API_URL}/0`;

        console.log(`[Machineries] Fetching machineries: ${endpoint}`);

        fetch(endpoint, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-cache'
        })
        .then(res => res.json())
        .then(response => {
            let items = [];
            if (response && response.succeeded !== false && response.data) {
                items = Array.isArray(response.data) ? response.data : (Array.isArray(response.data.items) ? response.data.items : []);
            } else if (Array.isArray(response)) {
                items = response;
            }

            renderMachineryGrid(items);
        })
        .catch(err => {
            console.error('[Machineries] Fetch error:', err);
            showErrorState();
        });
    }

    function renderMachineryGrid(items) {
        if (!machineryGrid) return;
        machineryGrid.innerHTML = '';

        if (!items || items.length === 0) {
            machineryGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="mb-3 text-muted" style="font-size: 2.5rem;"><i class="bi bi-cpu"></i></div>
                    <h5 class="fw-bold text-dark mb-1">No Machineries Found</h5>
                    <p class="text-secondary small mb-0">No machinery equipment recorded under this category yet.</p>
                </div>
            `;
            return;
        }

        // Sort by displayOrder
        items.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        items.forEach((m, index) => {
            const safeTitle = escapeHtml(m.title || 'Machinery Unit');
            const safeBadge = escapeHtml(m.cardBadge || 'OFFSET');
            const safeCategory = escapeHtml(m.machineryCategoryName || 'Production Unit');
            const safeDesc = escapeHtml(m.description || 'Export-grade precision industrial manufacturing infrastructure.');
            
            // Format order like #01, #02, #03
            const orderNum = (m.displayOrder != null && m.displayOrder > 0) ? m.displayOrder : (index + 1);
            const formattedOrder = String(orderNum).padStart(2, '0');
            const imgUrl = resolveImageUrl(m.imagePath);

            const col = document.createElement('div');
            col.className = 'col-lg-4 col-md-6 machinery-item-col';
            col.setAttribute('data-category-id', m.machineryCategoryId || 0);

            col.innerHTML = `
                <div class="machinery-card card-sheen">
                    <div class="machinery-img-wrapper">
                        <span class="machinery-badge">${safeBadge}</span>
                        <img src="${imgUrl}" alt="${safeTitle}" class="machinery-img" onerror="this.onerror=null; this.src='/images/machineries/gto.jpg';" />
                    </div>
                    <div class="machinery-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h3 class="machinery-title mb-0">${safeTitle}</h3>
                            <span class="badge bg-light text-dark border">#${formattedOrder}</span>
                        </div>
                        <p class="machinery-desc">${safeDesc}</p>
                        
                        <div class="pt-3 border-top mt-auto d-flex justify-content-between align-items-center">
                            <span class="small text-indigo fw-bold">
                                <i class="bi bi-check-circle-fill"></i> Precision Unit
                            </span>
                            <button type="button" class="btn btn-sm btn-modern-primary btn-inquire-capacity" data-title="${safeTitle}" data-category="${safeCategory}">
                                Inquire Capacity
                            </button>
                        </div>
                    </div>
                </div>
            `;

            machineryGrid.appendChild(col);
        });

        // Attach event listeners for Inquire Capacity buttons
        const inquireBtns = machineryGrid.querySelectorAll('.btn-inquire-capacity');
        inquireBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                const title = this.getAttribute('data-title') || '';
                const category = this.getAttribute('data-category') || '';
                if (typeof window.openQuoteModal === 'function') {
                    window.openQuoteModal(title, category);
                }
            });
        });
    }

    // 3. Filter Bar Click Event (Event delegation)
    if (filterBar) {
        filterBar.addEventListener('click', function (e) {
            const btn = e.target.closest('.machinery-filter-btn');
            if (!btn) return;
            e.preventDefault();

            // Set active pill
            filterBar.querySelectorAll('.machinery-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const catId = parseInt(btn.getAttribute('data-category-id')) || 0;
            loadMachineries(catId);
        });
    }

    // 4. Initial Fetch
    loadCategories();
    loadMachineries(0);
});
