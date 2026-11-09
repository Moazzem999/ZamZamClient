/**
 * ZamZam Trims (BD) Limited - Services Management (dashboard-services.js)
 * ------------------------------------------------------------------------
 * Handles fetching, searching, filtering, pagination, and detail viewing for company services.
 * API Endpoint: {ApiBaseUrl}/api/Services/GetAll
 */

$(function () {
    'use strict';

    // 1. Configuration & DOM Elements
    const $container = $('#servicesPageContainer');
    let apiBaseUrl = ($container.data('api-base-url') || 'https://localhost:7148').replace(/\/+$/, '');

    // Guard against mixed content if client is accessed via HTTPS
    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace('http://localhost:', 'https://localhost:');
    }

    const GET_SERVICES_URL = `${apiBaseUrl}/api/Services/GetAll`;

    // Table & State containers
    const $table = $('#servicesTable');
    const $tableBody = $('#servicesTableBody');
    const $emptyState = $('#tableEmptyState');
    const $loadingState = $('#tableLoadingState');
    const $noResultsState = $('#tableNoResultsState');
    const $errorState = $('#tableErrorState');
    const $errorMessageText = $('#errorMessageText');
    const $tableCountSummary = $('#tableCountSummary');
    const $paginationNav = $('#servicesPaginationNav');
    const $paginationUl = $('#servicesPaginationUl');

    // Controls
    const $searchInput = $('#searchServicesInput');
    const $searchClearBtn = $('#searchClearBtn');
    const $statusFilter = $('#filterServiceStatus');
    const $pageSizeFilter = $('#filterPageSize');
    const $refreshBtn = $('#btnRefreshServices');
    const $retryBtn = $('#btnRetryServices');
    const $resetFiltersBtn = $('#btnResetFilters');

    // Statistics
    const $statTotal = $('#statTotalServices');
    const $statActive = $('#statActiveServices');
    const $statHighlights = $('#statTotalHighlights');

    // Modals
    const $detailModalEl = $('#serviceDetailModal');
    let detailModalInstance = null;
    if ($detailModalEl.length && typeof bootstrap !== 'undefined') {
        detailModalInstance = new bootstrap.Modal($detailModalEl[0]);
    }

    const $imageModalEl = $('#serviceImageModal');
    let imageModalInstance = null;
    if ($imageModalEl.length && typeof bootstrap !== 'undefined') {
        imageModalInstance = new bootstrap.Modal($imageModalEl[0]);
    }

    // Toast
    const $toast = $('#dashToast');
    const $toastMessage = $('#dashToastMessage');
    let toastTimeout = null;

    // 2. Pagination & State Variables
    let currentPageNumber = 1;
    let currentPageSize = 10;
    let currentSearchTerm = '';
    let currentStatusFilter = 'all';
    let currentServicesList = [];
    let allFetchedServices = [];
    let isFetching = false;
    let searchDebounceTimer = null;
    let currentTotalCount = 0;
    let currentTotalPages = 1;
    let hasPreviousPage = false;
    let hasNextPage = false;
    let currentModalService = null;

    // 3. Helper Functions
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return dateStr;
        }
    }

    function getAuthToken() {
        let token = localStorage.getItem('token') || '';
        if (!token) {
            const cookies = document.cookie.split(';');
            for (let c of cookies) {
                const [key, val] = c.trim().split('=');
                if (key === 'zamzam_token' || key === 'token') {
                    token = decodeURIComponent(val || '');
                    break;
                }
            }
        }
        return token;
    }

    function resolveImageUrl(path) {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        return `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    }

    function showToast(message, iconClass = 'bi bi-check-circle-fill text-success') {
        if (!$toast.length) return;
        if (toastTimeout) clearTimeout(toastTimeout);

        $toastMessage.text(message);
        $toast.find('.dash-toast-icon').attr('class', `dash-toast-icon ${iconClass}`);
        $toast.addClass('show');

        toastTimeout = setTimeout(function () {
            $toast.removeClass('show');
        }, 3200);
    }

    function showState(state) {
        $loadingState.addClass('d-none');
        $emptyState.addClass('d-none');
        $noResultsState.addClass('d-none');
        $errorState.addClass('d-none');
        $table.removeClass('d-none');
        $paginationNav.removeClass('d-none');

        switch (state) {
            case 'loading':
                $table.addClass('d-none');
                $paginationNav.addClass('d-none');
                $loadingState.removeClass('d-none');
                break;
            case 'empty':
                $table.addClass('d-none');
                $paginationNav.addClass('d-none');
                $emptyState.removeClass('d-none');
                break;
            case 'no-results':
                $table.addClass('d-none');
                $paginationNav.addClass('d-none');
                $noResultsState.removeClass('d-none');
                break;
            case 'error':
                $table.addClass('d-none');
                $paginationNav.addClass('d-none');
                $errorState.removeClass('d-none');
                break;
            case 'normal':
            default:
                break;
        }
    }

    // 4. Update Quick Statistics
    function updateStatistics(items) {
        const total = allFetchedServices.length;
        let activeCount = 0;
        let highlightsCount = 0;

        allFetchedServices.forEach(function (s) {
            if (s.status === 1) activeCount++;
            if (Array.isArray(s.highlights)) {
                highlightsCount += s.highlights.length;
            }
        });

        $statTotal.text(total.toLocaleString());
        $statActive.text(activeCount.toLocaleString());
        $statHighlights.text(highlightsCount.toLocaleString());
    }

    // 5. Fetch Services from API
    function loadServices() {
        if (isFetching) return;
        isFetching = true;

        showState('loading');
        $tableBody.empty();
        $refreshBtn.prop('disabled', true);
        $refreshBtn.find('.refresh-icon').addClass('spin-animation');

        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const queryParams = {
            pageNumber: currentPageNumber,
            pageSize: currentPageSize
        };

        console.log(`[Services] Fetching from: ${GET_SERVICES_URL}`, queryParams);

        $.ajax({
            url: GET_SERVICES_URL,
            type: 'GET',
            data: queryParams,
            dataType: 'json',
            headers: headers,
            cache: false,
            timeout: 15000,
            success: function (response) {
                console.log('[Services] API Response:', response);

                if (response && response.succeeded !== false && response.data) {
                    const dataObj = response.data;
                    const items = Array.isArray(dataObj.items) ? dataObj.items : (Array.isArray(dataObj) ? dataObj : []);

                    allFetchedServices = items;
                    currentTotalCount = dataObj.totalCount ?? items.length;
                    currentTotalPages = dataObj.totalPages ?? Math.max(1, Math.ceil(currentTotalCount / currentPageSize));
                    hasPreviousPage = Boolean(dataObj.hasPreviousPage);
                    hasNextPage = Boolean(dataObj.hasNextPage);

                    updateStatistics(items);
                    applyFiltersAndRender();
                } else if (Array.isArray(response)) {
                    allFetchedServices = response;
                    currentTotalCount = response.length;
                    currentTotalPages = Math.max(1, Math.ceil(currentTotalCount / currentPageSize));
                    hasPreviousPage = false;
                    hasNextPage = false;

                    updateStatistics(response);
                    applyFiltersAndRender();
                } else {
                    const message = response?.message || 'Unable to retrieve services from server.';
                    showError(message);
                }
            },
            error: function (xhr, status, error) {
                console.error('[Services] Fetch error:', status, error, xhr);

                if (xhr.status === 401) {
                    showError('Authentication session expired (401). Please log in to view services.');
                    showToast('Session expired. Redirecting to login...', 'bi bi-shield-lock-fill text-warning');
                    setTimeout(function () {
                        window.location.href = '/Account/Login';
                    }, 2200);
                    return;
                }

                let msg = `Unable to connect to Services API (${GET_SERVICES_URL}). Please verify the backend service is running.`;
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showError(msg);
            },
            complete: function () {
                isFetching = false;
                $refreshBtn.prop('disabled', false);
                $refreshBtn.find('.refresh-icon').removeClass('spin-animation');
            }
        });
    }

    function showError(message) {
        $errorMessageText.text(message);
        showState('error');
    }

    // 6. Filtering and Client-Side Search
    function applyFiltersAndRender() {
        if (!allFetchedServices || allFetchedServices.length === 0) {
            showState('empty');
            $tableCountSummary.text('No services found in database.');
            return;
        }

        let filtered = allFetchedServices.slice();

        // Status Filter
        if (currentStatusFilter !== 'all') {
            const targetStatus = parseInt(currentStatusFilter, 10);
            filtered = filtered.filter(item => item.status === targetStatus);
        }

        // Search Filter (Title, Description, Highlights text, ID)
        if (currentSearchTerm.trim() !== '') {
            const term = currentSearchTerm.trim().toLowerCase();
            filtered = filtered.filter(function (item) {
                const titleMatch = (item.title || '').toLowerCase().includes(term);
                const descMatch = (item.description || '').toLowerCase().includes(term);
                const idMatch = String(item.id || '').includes(term);
                let highlightMatch = false;
                if (Array.isArray(item.highlights)) {
                    highlightMatch = item.highlights.some(h => (h.highlightText || '').toLowerCase().includes(term));
                }
                return titleMatch || descMatch || idMatch || highlightMatch;
            });
        }

        currentServicesList = filtered;

        if (filtered.length === 0) {
            showState('no-results');
            $tableCountSummary.text('0 records match filter.');
            return;
        }

        showState('normal');
        renderServicesTable(filtered);
        renderPaginationControls();
    }

    // 7. Render Services Table
    function renderServicesTable(items) {
        $tableBody.empty();

        items.forEach(function (service) {
            const serviceId = service.id;
            const title = escapeHtml(service.title || 'Untitled Service');
            const description = escapeHtml(service.description || '—');
            const displayOrder = service.displayOrder != null ? service.displayOrder : '—';
            const isActive = service.status === 1;
            const fullImageUrl = resolveImageUrl(service.imagePath);

            // Highlights Rendering
            let highlightsHtml = '';
            if (Array.isArray(service.highlights) && service.highlights.length > 0) {
                const totalCount = service.highlights.length;
                const visibleCount = Math.min(2, totalCount);
                const visiblePills = service.highlights.slice(0, visibleCount).map(function (h) {
                    const text = escapeHtml(h.highlightText || '');
                    return `<span class="highlight-pill-tag" title="${text}"><i class="bi bi-check2 text-primary"></i>${text}</span>`;
                }).join(' ');

                let extraPill = '';
                if (totalCount > visibleCount) {
                    const remaining = totalCount - visibleCount;
                    extraPill = `<span class="highlight-more-badge btn-view-service" data-id="${serviceId}" title="View all ${totalCount} highlights">+${remaining} more</span>`;
                }

                highlightsHtml = `<div class="d-flex align-items-center gap-1 flex-wrap">${visiblePills} ${extraPill}</div>`;
            } else {
                highlightsHtml = '<span class="text-muted small fst-italic">No highlights</span>';
            }

            // Image Thumbnail
            let imageCellHtml = '';
            if (fullImageUrl) {
                imageCellHtml = `
                    <div class="service-thumb-container btn-preview-thumb" data-url="${escapeHtml(fullImageUrl)}" data-title="${title}" title="Click to preview image">
                        <img src="${escapeHtml(fullImageUrl)}" alt="${title}" class="service-thumb-img" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'bi bi-image service-thumb-fallback\\'></i>';" />
                    </div>
                `;
            } else {
                imageCellHtml = `
                    <div class="service-thumb-container" title="No image uploaded">
                        <i class="bi bi-image service-thumb-fallback"></i>
                    </div>
                `;
            }

            // Status Badge
            const statusBadgeHtml = isActive
                ? '<span class="dash-status-badge status-active"><span class="status-dot"></span><span>Active</span></span>'
                : '<span class="dash-status-badge status-inactive"><span class="status-dot"></span><span>Inactive</span></span>';

            const rowHtml = `
                <tr data-service-id="${serviceId}">
                    <td class="text-center align-middle">
                        <span class="dash-id-badge">#${serviceId}</span>
                    </td>
                    <td class="text-center align-middle">
                        ${imageCellHtml}
                    </td>
                    <td class="align-middle">
                        <div class="service-title-text">${title}</div>
                        <span class="text-muted small">Created: ${formatDate(service.createdOn)}</span>
                    </td>
                    <td class="align-middle">
                        <div class="service-desc-preview" title="${description}">
                            ${description}
                        </div>
                    </td>
                    <td class="align-middle">
                        ${highlightsHtml}
                    </td>
                    <td class="text-center align-middle">
                        <span class="service-order-pill" title="Display Order">${displayOrder}</span>
                    </td>
                    <td class="text-center align-middle">
                        ${statusBadgeHtml}
                    </td>
                    <td class="text-end align-middle">
                        <button type="button" class="btn btn-sm btn-outline-primary rounded-3 px-2 py-1 btn-view-service" data-id="${serviceId}" title="View Service Details">
                            <i class="bi bi-eye-fill me-1"></i> Details
                        </button>
                    </td>
                </tr>
            `;

            $tableBody.append(rowHtml);
        });

        // Summary Text
        const displayed = items.length;
        const total = allFetchedServices.length;
        if (displayed === total) {
            $tableCountSummary.text(`Showing all ${displayed} service${displayed !== 1 ? 's' : ''}`);
        } else {
            $tableCountSummary.text(`Showing ${displayed} of ${total} service${total !== 1 ? 's' : ''} (filtered)`);
        }
    }

    // 8. Render Pagination Controls
    function renderPaginationControls() {
        $paginationUl.empty();
        if (currentTotalPages <= 1 && allFetchedServices.length <= currentPageSize) {
            $paginationNav.addClass('d-none');
            return;
        }

        $paginationNav.removeClass('d-none');

        // Previous Button
        const prevDisabled = !hasPreviousPage && currentPageNumber <= 1;
        $paginationUl.append(`
            <li class="page-item ${prevDisabled ? 'disabled' : ''}">
                <button type="button" class="page-link" id="btnPagePrev" ${prevDisabled ? 'disabled' : ''} aria-label="Previous">
                    <i class="bi bi-chevron-left"></i>
                </button>
            </li>
        `);

        // Page Numbers
        const maxButtons = 5;
        let startPage = Math.max(1, currentPageNumber - Math.floor(maxButtons / 2));
        let endPage = Math.min(currentTotalPages, startPage + maxButtons - 1);
        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            $paginationUl.append(`
                <li class="page-item"><button type="button" class="page-link page-num-btn" data-page="1">1</button></li>
            `);
            if (startPage > 2) {
                $paginationUl.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
            }
        }

        for (let p = startPage; p <= endPage; p++) {
            const isActive = p === currentPageNumber;
            $paginationUl.append(`
                <li class="page-item ${isActive ? 'active' : ''}">
                    <button type="button" class="page-link page-num-btn" data-page="${p}">${p}</button>
                </li>
            `);
        }

        if (endPage < currentTotalPages) {
            if (endPage < currentTotalPages - 1) {
                $paginationUl.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
            }
            $paginationUl.append(`
                <li class="page-item"><button type="button" class="page-link page-num-btn" data-page="${currentTotalPages}">${currentTotalPages}</button></li>
            `);
        }

        // Next Button
        const nextDisabled = !hasNextPage && currentPageNumber >= currentTotalPages;
        $paginationUl.append(`
            <li class="page-item ${nextDisabled ? 'disabled' : ''}">
                <button type="button" class="page-link" id="btnPageNext" ${nextDisabled ? 'disabled' : ''} aria-label="Next">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `);
    }

    // 9. View Service Details Modal
    function openServiceDetails(serviceId) {
        const service = allFetchedServices.find(s => s.id == serviceId);
        if (!service) return;

        currentModalService = service;

        $('#modalServiceId').text(`#${service.id}`);
        $('#modalServiceTitle').text(service.title || 'Untitled Service');
        $('#modalDisplayOrder').text(service.displayOrder != null ? service.displayOrder : '—');
        $('#modalServiceDescription').text(service.description || 'No description provided.');

        // Status badge
        const $status = $('#modalServiceStatus');
        const $statusText = $('#modalServiceStatusText');
        if (service.status === 1) {
            $status.attr('class', 'dash-status-badge status-active');
            $statusText.text('Active');
        } else {
            $status.attr('class', 'dash-status-badge status-inactive');
            $statusText.text('Inactive');
        }

        // Image
        const fullImageUrl = resolveImageUrl(service.imagePath);
        if (fullImageUrl) {
            $('#modalServiceImage').attr('src', fullImageUrl).show();
            $('#modalImageWrapper').show();
            $('#modalBtnPreviewImage').show();
        } else {
            $('#modalImageWrapper').hide();
            $('#modalBtnPreviewImage').hide();
        }

        // Highlights
        const $highlightsList = $('#modalHighlightsList');
        $highlightsList.empty();

        if (Array.isArray(service.highlights) && service.highlights.length > 0) {
            $('#modalHighlightsCount').text(service.highlights.length);

            // Sort highlights by displayOrder ascending
            const sortedHighlights = service.highlights.slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

            sortedHighlights.forEach(function (h) {
                const hText = escapeHtml(h.highlightText || 'Feature item');
                const hOrder = h.displayOrder != null ? h.displayOrder : '—';
                const hId = h.id ? `#${h.id}` : '';
                const hDate = formatDate(h.createdOn);

                const itemHtml = `
                    <div class="highlight-card-item">
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-primary text-white rounded-pill px-2 py-1 small">
                                <i class="bi bi-check-lg"></i>
                            </span>
                            <span class="fw-semibold text-dark">${hText}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-light text-secondary border small">Order: ${hOrder}</span>
                            ${hId ? `<span class="badge bg-light text-muted border small">${hId}</span>` : ''}
                        </div>
                    </div>
                `;
                $highlightsList.append(itemHtml);
            });
        } else {
            $('#modalHighlightsCount').text('0');
            $highlightsList.html('<p class="text-muted small fst-italic mb-0">No highlight feature points attached to this service.</p>');
        }

        // Timestamps
        $('#modalCreatedOn').text(formatDateTime(service.createdOn));
        $('#modalUpdatedOn').text(formatDateTime(service.updatedOn));

        if (detailModalInstance) {
            detailModalInstance.show();
        }
    }

    // 10. Open Lightbox Preview
    function openLightbox(imageUrl, title) {
        if (!imageUrl) return;
        $('#lightboxImage').attr('src', imageUrl);
        $('#lightboxTitle').text(title || 'Service Image Preview');
        if (imageModalInstance) {
            imageModalInstance.show();
        }
    }

    // 11. Event Listeners

    // Refresh
    $refreshBtn.on('click', function () {
        loadServices();
        showToast('Refreshing services directory...', 'bi bi-arrow-clockwise text-primary');
    });

    $retryBtn.on('click', function () {
        loadServices();
    });

    // Search input with debounce
    $searchInput.on('input', function () {
        const val = $(this).val();
        if (val.trim()) {
            $searchClearBtn.show();
        } else {
            $searchClearBtn.hide();
        }

        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
            currentSearchTerm = val;
            applyFiltersAndRender();
        }, 250);
    });

    $searchClearBtn.on('click', function () {
        $searchInput.val('');
        currentSearchTerm = '';
        $searchClearBtn.hide();
        applyFiltersAndRender();
        $searchInput.focus();
    });

    // Status filter
    $statusFilter.on('change', function () {
        currentStatusFilter = $(this).val();
        applyFiltersAndRender();
    });

    // Page size filter
    $pageSizeFilter.on('change', function () {
        currentPageSize = parseInt($(this).val(), 10) || 10;
        currentPageNumber = 1;
        loadServices();
    });

    // Reset filters
    $resetFiltersBtn.on('click', function () {
        $searchInput.val('');
        currentSearchTerm = '';
        $searchClearBtn.hide();
        $statusFilter.val('all');
        currentStatusFilter = 'all';
        applyFiltersAndRender();
    });

    // Pagination Click
    $(document).on('click', '.page-num-btn', function () {
        const page = parseInt($(this).data('page'), 10);
        if (page && page !== currentPageNumber) {
            currentPageNumber = page;
            loadServices();
            $('html, body').animate({ scrollTop: $table.offset().top - 120 }, 200);
        }
    });

    $(document).on('click', '#btnPagePrev', function () {
        if (currentPageNumber > 1) {
            currentPageNumber--;
            loadServices();
            $('html, body').animate({ scrollTop: $table.offset().top - 120 }, 200);
        }
    });

    $(document).on('click', '#btnPageNext', function () {
        if (currentPageNumber < currentTotalPages) {
            currentPageNumber++;
            loadServices();
            $('html, body').animate({ scrollTop: $table.offset().top - 120 }, 200);
        }
    });

    // Row Click - View Details
    $(document).on('click', '.btn-view-service', function (e) {
        e.stopPropagation();
        const serviceId = $(this).data('id');
        openServiceDetails(serviceId);
    });

    // Thumbnail Click - Lightbox Preview
    $(document).on('click', '.btn-preview-thumb', function (e) {
        e.stopPropagation();
        const url = $(this).data('url');
        const title = $(this).data('title');
        openLightbox(url, title);
    });

    // Modal Preview Image Button
    $('#modalBtnPreviewImage').on('click', function () {
        if (currentModalService) {
            const url = resolveImageUrl(currentModalService.imagePath);
            openLightbox(url, currentModalService.title);
        }
    });

    // Initial Load
    loadServices();
});

