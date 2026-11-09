/**
 * ZamZam Trims (BD) Limited - Services Management (dashboard-services.js)
 * ------------------------------------------------------------------------
 * Handles fetching, searching, pagination, and detail viewing for company services.
 * API Endpoint: {ApiBaseUrl}/api/Services/GetAll
 */

$(function () {
    'use strict';

    // 1. Configuration & DOM Elements
    const $container = $('#servicesPageContainer');
    let apiBaseUrl = ($container.data('api-base-url') || 'https://localhost:7148').replace(/\/+$/, '');

    // Mixed content safeguard
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
    const $pageSizeFilter = $('#filterPageSize');
    const $btnSearchSubmit = $('#btnSearchSubmit');
    const $btnResetFilters = $('#btnResetFilters');
    const $btnRetry = $('#btnRetryServices');

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
        }, 3000);
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
                $loadingState.removeClass('d-none');
                break;
            case 'empty':
                $table.addClass('d-none');
                $emptyState.removeClass('d-none');
                break;
            case 'no-results':
                $table.addClass('d-none');
                $noResultsState.removeClass('d-none');
                break;
            case 'error':
                $table.addClass('d-none');
                $errorState.removeClass('d-none');
                break;
            case 'normal':
            default:
                break;
        }
    }

    // 4. Fetch Services from API endpoint (Triggered by Search, Reset, Pagination, PageSize)
    function loadServices() {
        if (isFetching) return;
        isFetching = true;

        showState('loading');
        $tableBody.empty();

        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const queryParams = {
            PageNumber: currentPageNumber,
            PageSize: currentPageSize,
            pageNumber: currentPageNumber,
            pageSize: currentPageSize
        };

        if (currentSearchTerm && currentSearchTerm.trim() !== '') {
            queryParams.SearchTerm = currentSearchTerm.trim();
            queryParams.searchTerm = currentSearchTerm.trim();
        }

        console.log(`[Services] Triggering API Endpoint: ${GET_SERVICES_URL}`, queryParams);

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
                    currentTotalCount = dataObj.totalCount != null ? dataObj.totalCount : items.length;
                    currentTotalPages = dataObj.totalPages != null ? dataObj.totalPages : Math.max(1, Math.ceil(currentTotalCount / currentPageSize));
                    hasPreviousPage = dataObj.hasPreviousPage != null ? Boolean(dataObj.hasPreviousPage) : (currentPageNumber > 1);
                    hasNextPage = dataObj.hasNextPage != null ? Boolean(dataObj.hasNextPage) : (currentPageNumber < currentTotalPages);

                    if (items.length === 0) {
                        if (currentSearchTerm && currentSearchTerm.trim() !== '') {
                            showState('no-results');
                        } else {
                            showState('empty');
                        }
                        $tableCountSummary.text('Showing 0 of 0 services');
                        renderPaginationControls();
                    } else {
                        showState('normal');
                        renderServicesTable(items);
                        renderPaginationControls();
                    }
                } else if (Array.isArray(response)) {
                    allFetchedServices = response;
                    currentTotalCount = response.length;
                    currentTotalPages = Math.max(1, Math.ceil(currentTotalCount / currentPageSize));
                    hasPreviousPage = currentPageNumber > 1;
                    hasNextPage = currentPageNumber < currentTotalPages;

                    if (response.length === 0) {
                        showState('empty');
                        $tableCountSummary.text('Showing 0 of 0 services');
                    } else {
                        showState('normal');
                        renderServicesTable(response);
                    }
                    renderPaginationControls();
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

                let msg = `Unable to connect to Services API (${GET_SERVICES_URL}). Please verify backend is running.`;
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showError(msg);
            },
            complete: function () {
                isFetching = false;
            }
        });
    }

    function showError(message) {
        $errorMessageText.text(message);
        showState('error');
    }

    // 5. Render Table Rows (Only 4 Columns: SERVICE, DESCRIPTION, DISPLAY ORDER text-only, ACTION)
    function renderServicesTable(items) {
        $tableBody.empty();

        items.forEach(function (service) {
            const serviceId = service.id;
            const title = escapeHtml(service.title || 'Unnamed Service');
            const initial = (service.title || 'S').trim().charAt(0).toUpperCase();
            const description = escapeHtml(service.description || 'No description provided');
            const displayOrderText = service.displayOrder != null ? service.displayOrder : '—';
            const fullImageUrl = resolveImageUrl(service.imagePath);

            // Circular Avatar
            const avatarMarkup = fullImageUrl
                ? `<img src="${fullImageUrl}" alt="${title}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'service-avatar-fallback\\'>${initial}</div>';" />`
                : `<div class="service-avatar-fallback">${initial}</div>`;

            const rowHtml = `
                <tr data-service-id="${serviceId}">
                    <!-- 1. SERVICE COLUMN (Avatar + Title + Meta) -->
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            <div class="service-avatar btn-preview-thumb" data-url="${escapeHtml(fullImageUrl)}" data-title="${title}" title="Click to view image">
                                ${avatarMarkup}
                            </div>
                            <div class="d-flex flex-column">
                                <span class="fw-bold text-dark fs-6 btn-view-service" data-id="${serviceId}" style="cursor: pointer;">
                                    ${title}
                                </span>
                                <span class="text-muted small">Service ID: #${serviceId}</span>
                            </div>
                        </div>
                    </td>

                    <!-- 2. DESCRIPTION COLUMN -->
                    <td>
                        <div class="d-flex align-items-center gap-2 text-secondary">
                            <i class="bi bi-geo-alt text-muted" style="font-size: 0.95rem; flex-shrink: 0;"></i>
                            <span class="text-truncate" style="max-width: 320px;" title="${description}">
                                ${description}
                            </span>
                        </div>
                    </td>

                    <!-- 3. DISPLAY ORDER COLUMN (Text only like 1, 2, 3) -->
                    <td class="text-center align-middle">
                        <span class="fw-bold text-dark fs-6">${displayOrderText}</span>
                    </td>

                    <!-- 4. ACTION COLUMN (3 Buttons matching image: Blue Eye, Yellow Pencil, Red Trash) -->
                    <td class="text-end align-middle">
                        <div class="service-actions-group">
                            <!-- 1. Blue View Button -->
                            <button type="button" class="btn-action-icon btn-action-view btn-view-service" data-id="${serviceId}" title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>

                            <!-- 2. Yellow Edit Button -->
                            <button type="button" class="btn-action-icon btn-action-edit btn-edit-service" data-id="${serviceId}" title="Edit Service">
                                <i class="bi bi-pencil-square"></i>
                            </button>

                            <!-- 3. Red Delete Button -->
                            <button type="button" class="btn-action-icon btn-action-delete btn-delete-service" data-id="${serviceId}" title="Delete Service">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;

            $tableBody.append(rowHtml);
        });

        // Summary text in footer
        if (currentTotalCount === 0) {
            $tableCountSummary.text('Showing 0 of 0 services');
        } else {
            const fromCount = (currentPageNumber - 1) * currentPageSize + 1;
            const toCount = Math.min(currentPageNumber * currentPageSize, currentTotalCount);
            $tableCountSummary.text(`Showing ${fromCount} to ${toCount} of ${currentTotalCount} services`);
        }
    }

    // 6. Render Prominent Pagination in Table Footer
    function renderPaginationControls() {
        $paginationUl.empty();

        if (currentTotalCount === 0) {
            $paginationNav.addClass('d-none');
            return;
        }

        $paginationNav.removeClass('d-none');

        // Prev Button
        const prevDisabled = !hasPreviousPage && currentPageNumber <= 1;
        $paginationUl.append(`
            <li class="page-item ${prevDisabled ? 'disabled' : ''}">
                <button type="button" class="page-link" id="btnPagePrev" ${prevDisabled ? 'disabled' : ''} aria-label="Previous">
                    <i class="bi bi-chevron-left me-1"></i>Prev
                </button>
            </li>
        `);

        // Numbered Pages
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
                    Next<i class="bi bi-chevron-right ms-1"></i>
                </button>
            </li>
        `);
    }

    // 7. View Service Details Modal with Highlights (Requirement #1)
    function openServiceDetails(serviceId) {
        const service = allFetchedServices.find(s => s.id == serviceId);
        if (!service) return;

        currentModalService = service;

        $('#modalServiceId').text(`#${service.id}`);
        $('#modalServiceTitle').text(service.title || 'Untitled Service');
        $('#modalDisplayOrder').text(service.displayOrder != null ? service.displayOrder : '—');
        $('#modalServiceDescription').text(service.description || 'No description provided.');

        const fullImageUrl = resolveImageUrl(service.imagePath);
        if (fullImageUrl) {
            $('#modalServiceImage').attr('src', fullImageUrl).show();
            $('#modalImageWrapper').show();
        } else {
            $('#modalImageWrapper').hide();
        }

        // Highlights List in Modal (Requirement #1)
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
            $highlightsList.html('<p class="text-muted small fst-italic mb-0">No highlight features attached to this service.</p>');
        }

        if (detailModalInstance) {
            detailModalInstance.show();
        }
    }

    // 8. Open Lightbox Preview
    function openLightbox(imageUrl, title) {
        if (!imageUrl) return;
        $('#lightboxImage').attr('src', imageUrl);
        $('#lightboxTitle').text(title || 'Service Image Preview');
        if (imageModalInstance) {
            imageModalInstance.show();
        }
    }

    // 9. Event Listeners (Requirement #5: Search box, search and reset button trigger the API endpoint)

    // A. Search box typing (debounced API trigger)
    $searchInput.on('input', function () {
        const val = $(this).val();
        if (val.trim()) {
            $searchClearBtn.show();
        } else {
            $searchClearBtn.hide();
        }

        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
            currentSearchTerm = val.trim();
            currentPageNumber = 1;
            loadServices(); // Triggers API endpoint
        }, 400);
    });

    // Enter key press in search box triggers API endpoint immediately
    $searchInput.on('keypress', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            clearTimeout(searchDebounceTimer);
            currentSearchTerm = $(this).val().trim();
            currentPageNumber = 1;
            loadServices(); // Triggers API endpoint
        }
    });

    // Search clear button triggers API endpoint
    $searchClearBtn.on('click', function () {
        $searchInput.val('');
        currentSearchTerm = '';
        $searchClearBtn.hide();
        currentPageNumber = 1;
        loadServices(); // Triggers API endpoint
        $searchInput.focus();
    });

    // B. Search button triggers API endpoint
    $btnSearchSubmit.on('click', function () {
        clearTimeout(searchDebounceTimer);
        currentSearchTerm = $searchInput.val().trim();
        currentPageNumber = 1;
        loadServices(); // Triggers API endpoint
    });

    // C. Reset button triggers API endpoint
    $btnResetFilters.on('click', function () {
        clearTimeout(searchDebounceTimer);
        $searchInput.val('');
        currentSearchTerm = '';
        $searchClearBtn.hide();
        currentPageNumber = 1;
        loadServices(); // Triggers API endpoint
        showToast('Filters reset. Reloading services...', 'bi bi-arrow-clockwise text-primary');
    });

    // Retry button on error state
    $btnRetry.on('click', function () {
        loadServices();
    });

    // Page size dropdown triggers API endpoint
    $pageSizeFilter.on('change', function () {
        currentPageSize = parseInt($(this).val(), 10) || 10;
        currentPageNumber = 1;
        loadServices(); // Triggers API endpoint
    });

    // D. Pagination triggers API endpoint
    $(document).on('click', '.page-num-btn', function () {
        const page = parseInt($(this).data('page'), 10);
        if (page && page !== currentPageNumber) {
            currentPageNumber = page;
            loadServices(); // Triggers API endpoint
            $('html, body').animate({ scrollTop: $table.offset().top - 120 }, 200);
        }
    });

    $(document).on('click', '#btnPagePrev', function () {
        if (currentPageNumber > 1) {
            currentPageNumber--;
            loadServices(); // Triggers API endpoint
            $('html, body').animate({ scrollTop: $table.offset().top - 120 }, 200);
        }
    });

    $(document).on('click', '#btnPageNext', function () {
        if (currentPageNumber < currentTotalPages) {
            currentPageNumber++;
            loadServices(); // Triggers API endpoint
            $('html, body').animate({ scrollTop: $table.offset().top - 120 }, 200);
        }
    });

    // Row Actions
    $(document).on('click', '.btn-view-service', function (e) {
        e.stopPropagation();
        const serviceId = $(this).data('id');
        openServiceDetails(serviceId);
    });

    $(document).on('click', '.btn-edit-service', function (e) {
        e.stopPropagation();
        const serviceId = $(this).data('id');
        showToast(`Edit Service #${serviceId} selected`, 'bi bi-pencil-square text-warning');
        openServiceDetails(serviceId);
    });

    $(document).on('click', '.btn-delete-service', function (e) {
        e.stopPropagation();
        const serviceId = $(this).data('id');
        showToast(`Delete Service #${serviceId} requested`, 'bi bi-trash3 text-danger');
    });

    // Thumbnail Click
    $(document).on('click', '.btn-preview-thumb', function (e) {
        e.stopPropagation();
        const url = $(this).data('url');
        const title = $(this).data('title');
        openLightbox(url, title);
    });

    // Initial Load from API
    loadServices();
});
