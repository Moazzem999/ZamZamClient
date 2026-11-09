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

    // 4. Fetch Services from API
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

                    applyFiltersAndRender();
                } else if (Array.isArray(response)) {
                    allFetchedServices = response;
                    currentTotalCount = response.length;
                    currentTotalPages = Math.max(1, Math.ceil(currentTotalCount / currentPageSize));
                    hasPreviousPage = false;
                    hasNextPage = false;

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
            }
        });
    }

    function showError(message) {
        $errorMessageText.text(message);
        showState('error');
    }

    // 5. Search & Filter Processing
    function applyFiltersAndRender() {
        if (!allFetchedServices || allFetchedServices.length === 0) {
            showState('empty');
            $tableCountSummary.text('Showing 0 of 0 services');
            return;
        }

        let filtered = allFetchedServices.slice();

        // Search Filter (Title, Description, ID)
        if (currentSearchTerm.trim() !== '') {
            const term = currentSearchTerm.trim().toLowerCase();
            filtered = filtered.filter(function (item) {
                const titleMatch = (item.title || '').toLowerCase().includes(term);
                const descMatch = (item.description || '').toLowerCase().includes(term);
                const idMatch = String(item.id || '').includes(term);
                return titleMatch || descMatch || idMatch;
            });
        }

        if (filtered.length === 0) {
            showState('no-results');
            $tableCountSummary.text('Showing 0 of 0 services');
            return;
        }

        showState('normal');
        renderServicesTable(filtered);
        renderPaginationControls();
    }

    // 6. Render Services Table matching the attached image design
    function renderServicesTable(items) {
        $tableBody.empty();

        items.forEach(function (service) {
            const serviceId = service.id;
            const title = escapeHtml(service.title || 'Unnamed Service');
            const initial = (service.title || 'S').trim().charAt(0).toUpperCase();
            const description = escapeHtml(service.description || 'No description provided');
            const displayOrder = service.displayOrder != null ? service.displayOrder : '—';
            const createdDate = formatDate(service.createdOn);
            const fullImageUrl = resolveImageUrl(service.imagePath);

            // Circular Avatar Markup matching attached image design
            const avatarMarkup = fullImageUrl
                ? `<img src="${fullImageUrl}" alt="${title}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'service-avatar-fallback\\'>${initial}</div>';" />`
                : `<div class="service-avatar-fallback">${initial}</div>`;

            const rowHtml = `
                <tr data-service-id="${serviceId}">
                    <!-- SERVICE COLUMN (Avatar + Title + Meta) -->
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            <div class="service-avatar btn-preview-thumb" data-url="${escapeHtml(fullImageUrl)}" data-title="${title}" title="Click to view image">
                                ${avatarMarkup}
                            </div>
                            <div class="d-flex flex-column">
                                <span class="fw-bold text-dark fs-6 btn-view-service cursor-pointer" data-id="${serviceId}" style="cursor: pointer;">
                                    ${title}
                                </span>
                                <span class="text-muted small">Service ID: #${serviceId}</span>
                            </div>
                        </div>
                    </td>

                    <!-- DESCRIPTION COLUMN (Matching Address style in image) -->
                    <td>
                        <div class="d-flex align-items-center gap-2 text-secondary">
                            <i class="bi bi-geo-alt text-muted" style="font-size: 0.95rem; flex-shrink: 0;"></i>
                            <span class="text-truncate" style="max-width: 320px;" title="${description}">
                                ${description}
                            </span>
                        </div>
                    </td>

                    <!-- DISPLAY ORDER COLUMN (Matching Designation pill in image) -->
                    <td>
                        <div class="d-flex flex-column gap-1">
                            <div>
                                <span class="badge-designation-pill">Display Order #${displayOrder}</span>
                            </div>
                            <span class="text-muted small"><i class="bi bi-sort-numeric-down me-1"></i>Priority ${displayOrder}</span>
                        </div>
                    </td>

                    <!-- CREATED DATE COLUMN (Matching Joining & Salary style in image) -->
                    <td>
                        <div class="d-flex flex-column gap-1">
                            <span class="fw-bold" style="color: #059669 !important;">
                                <i class="bi bi-check-circle-fill me-1" style="font-size: 0.8rem;"></i>${createdDate}
                            </span>
                            <span class="text-muted small">
                                <i class="bi bi-calendar3 me-1"></i>Created Date
                            </span>
                        </div>
                    </td>

                    <!-- ACTION COLUMN (3 Buttons matching image: Blue Eye, Yellow Pencil, Red Trash) -->
                    <td class="text-end">
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

        // Summary text matching image
        const fromCount = (currentPageNumber - 1) * currentPageSize + 1;
        const toCount = Math.min(currentPageNumber * currentPageSize, currentTotalCount);
        $tableCountSummary.text(`Showing ${fromCount} to ${toCount} of ${currentTotalCount} services`);
    }

    // 7. Render Pagination Controls
    function renderPaginationControls() {
        if (currentTotalPages <= 1 && currentTotalCount <= currentPageSize) {
            $paginationNav.addClass('d-none');
            return;
        }

        $paginationNav.removeClass('d-none');
        $paginationUl.empty();

        // Prev Button
        const prevDisabled = !hasPreviousPage && currentPageNumber <= 1;
        $paginationUl.append(`
            <li class="page-item ${prevDisabled ? 'disabled' : ''}">
                <button type="button" class="page-link" id="btnPagePrev" ${prevDisabled ? 'disabled' : ''} aria-label="Previous">
                    <i class="bi bi-chevron-left"></i>
                    <span class="d-none d-sm-inline ms-1">Prev</span>
                </button>
            </li>
        `);

        // Numbered Pages
        const maxVisibleButtons = 5;
        let startPage = Math.max(1, currentPageNumber - Math.floor(maxVisibleButtons / 2));
        let endPage = Math.min(currentTotalPages, startPage + maxVisibleButtons - 1);
        if (endPage - startPage + 1 < maxVisibleButtons) {
            startPage = Math.max(1, endPage - maxVisibleButtons + 1);
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
                    <span class="d-none d-sm-inline me-1">Next</span>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `);
    }

    // 8. View Service Details Modal
    function openServiceDetails(serviceId) {
        const service = allFetchedServices.find(s => s.id == serviceId);
        if (!service) return;

        currentModalService = service;

        $('#modalServiceId').text(`#${service.id}`);
        $('#modalServiceTitle').text(service.title || 'Untitled Service');
        $('#modalDisplayOrder').text(service.displayOrder != null ? service.displayOrder : '—');
        $('#modalServiceDescription').text(service.description || 'No description provided.');
        $('#modalCreatedOn').text(formatDate(service.createdOn));

        const fullImageUrl = resolveImageUrl(service.imagePath);
        if (fullImageUrl) {
            $('#modalServiceImage').attr('src', fullImageUrl).show();
            $('#modalImageWrapper').show();
            $('#modalBtnPreviewImage').show();
        } else {
            $('#modalImageWrapper').hide();
            $('#modalBtnPreviewImage').hide();
        }

        if (detailModalInstance) {
            detailModalInstance.show();
        }
    }

    // 9. Open Lightbox Preview
    function openLightbox(imageUrl, title) {
        if (!imageUrl) return;
        $('#lightboxImage').attr('src', imageUrl);
        $('#lightboxTitle').text(title || 'Service Image Preview');
        if (imageModalInstance) {
            imageModalInstance.show();
        }
    }

    // 10. Event Listeners

    // Search input
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

    $btnSearchSubmit.on('click', function () {
        currentSearchTerm = $searchInput.val();
        applyFiltersAndRender();
    });

    $btnResetFilters.on('click', function () {
        $searchInput.val('');
        currentSearchTerm = '';
        $searchClearBtn.hide();
        applyFiltersAndRender();
        showToast('Filters reset.', 'bi bi-arrow-clockwise text-primary');
    });

    $btnRetry.on('click', function () {
        loadServices();
    });

    // Page Size Filter
    $pageSizeFilter.on('change', function () {
        currentPageSize = parseInt($(this).val(), 10) || 10;
        currentPageNumber = 1;
        loadServices();
    });

    // Pagination
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

    // View Action
    $(document).on('click', '.btn-view-service', function (e) {
        e.stopPropagation();
        const serviceId = $(this).data('id');
        openServiceDetails(serviceId);
    });

    // Edit Action (feedback placeholder)
    $(document).on('click', '.btn-edit-service', function (e) {
        e.stopPropagation();
        const serviceId = $(this).data('id');
        showToast(`Edit Service #${serviceId} selected`, 'bi bi-pencil-square text-warning');
        openServiceDetails(serviceId);
    });

    // Delete Action (feedback placeholder)
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

    $('#modalBtnPreviewImage').on('click', function () {
        if (currentModalService) {
            const url = resolveImageUrl(currentModalService.imagePath);
            openLightbox(url, currentModalService.title);
        }
    });

    // Initial Load
    loadServices();
});
