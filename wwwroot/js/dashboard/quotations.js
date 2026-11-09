/**
 * ZamZam Trims (BD) Limited - Quotations Management (quotations.js)
 * -----------------------------------------------------------------
 * Handles fetching, filtering, pagination, and detail viewing for quotation requests.
 * API Endpoint: {ApiBaseUrl}/api/QuotationRequest/GetAll
 * Service Categories: {ApiBaseUrl}/api/Global/GetAllServiceCategory
 */

$(function () {
    'use strict';

    // 1. Configuration & DOM Elements
    const $container = $('#quotationsPageContainer');
    let apiBaseUrl = ($container.data('api-base-url') || 'https://localhost:7148').replace(/\/+$/, '');

    // Guard against mixed content if client is accessed via HTTPS
    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace('http://localhost:', 'https://localhost:');
    }

    const GET_QUOTATIONS_URL = `${apiBaseUrl}/api/QuotationRequest/GetAll`;
    const QUOTATION_BASE_URL = `${apiBaseUrl}/api/QuotationRequest`;
    const GET_CATEGORIES_URL = `${apiBaseUrl}/api/Global/GetAllServiceCategory`;

    // Table & State containers
    const $table = $('#quotationsTable');
    const $tableBody = $('#quotationsTableBody');
    const $emptyState = $('#quotationsEmptyState');
    const $loadingState = $('#quotationsLoadingState');
    const $noResultsState = $('#quotationsNoResultsState');
    const $errorState = $('#quotationsErrorState');
    const $errorMessageText = $('#quotationsErrorMessageText');
    const $tableCountSummary = $('#quotationsTableCountSummary');
    const $paginationNav = $('#quotationsPaginationNav');
    const $paginationUl = $('#quotationsPaginationUl');

    // Controls
    const $searchInput = $('#quotationsSearchInput');
    const $searchClearBtn = $('#quotationsSearchClear');
    const $categoryFilter = $('#quotationsCategoryFilter');
    const $fromDateInput = $('#quotationsFromDate');
    const $toDateInput = $('#quotationsToDate');
    const $pageSizeSelect = $('#quotationsPageSizeSelect');
    const $refreshBtn = $('#btnRefreshQuotations');
    const $resetFiltersBtn = $('#btnResetFilters');
    const $btnRetry = $('#btnRetryQuotations');

    // Metric Summary Counters
    const $totalRequestsCount = $('#totalRequestsCount');
    const $activeFiltersBadge = $('#activeFiltersBadge');

    // Modal elements
    const $detailModalEl = $('#quotationDetailModal');
    let detailModalInstance = null;
    if ($detailModalEl.length && typeof bootstrap !== 'undefined') {
        detailModalInstance = new bootstrap.Modal($detailModalEl[0]);
    }

    const $deleteModalEl = $('#quotationDeleteModal');
    let deleteModalInstance = null;
    if ($deleteModalEl.length && typeof bootstrap !== 'undefined') {
        deleteModalInstance = new bootstrap.Modal($deleteModalEl[0]);
    }
    let pendingDeleteQuoteId = null;

    // Toast elements
    const $toast = $('#dashToast');
    const $toastMessage = $('#dashToastMessage');
    let toastTimeout = null;

    // 2. Pagination & State Variables
    let currentPageNumber = 1;
    let currentPageSize = 10;
    let currentSearchTerm = '';
    let currentCategory = '';
    let currentFromDate = '';
    let currentToDate = '';
    let currentTotalCount = 0;
    let currentTotalPages = 1;
    let hasPreviousPage = false;
    let hasNextPage = false;
    let currentQuotationsList = [];
    let isFetching = false;
    let searchDebounceTimer = null;
    let categoryMap = {};

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

    function formatDate(dateStr, includeTime = true) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            
            const datePart = d.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });

            if (!includeTime) return datePart;

            const timePart = d.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            return `${datePart}, ${timePart}`;
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

    // Avatar color generator based on name
    function getAvatarBg(name) {
        const palettes = [
            'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            'linear-gradient(135deg, #10b981 0%, #047857 100%)',
            'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
            'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)'
        ];
        if (!name) return palettes[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % palettes.length;
        return palettes[index];
    }

    // 4. Load Categories for Filter Dropdown
    function loadCategories() {
        $.ajax({
            url: GET_CATEGORIES_URL,
            type: 'GET',
            dataType: 'json',
            cache: true,
            success: function (res) {
                if (res && res.succeeded && Array.isArray(res.data)) {
                    categoryMap = {};
                    $categoryFilter.find('option:not(:first)').remove();
                    res.data.forEach(function (cat) {
                        categoryMap[cat.id] = cat.name;
                        $categoryFilter.append(`<option value="${cat.id}">${escapeHtml(cat.name)}</option>`);
                    });
                }
            },
            error: function (xhr) {
                console.warn('[Quotations] Failed to load service categories:', xhr);
            }
        });
    }

    // 5. State Box Switcher
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

    function updateActiveFiltersBadge() {
        let count = 0;
        if (currentSearchTerm) count++;
        if (currentCategory) count++;
        if (currentFromDate) count++;
        if (currentToDate) count++;

        if (count > 0) {
            $activeFiltersBadge.text(`${count} active filter${count > 1 ? 's' : ''}`).removeClass('d-none');
            $resetFiltersBtn.removeClass('d-none');
        } else {
            $activeFiltersBadge.addClass('d-none');
            $resetFiltersBtn.addClass('d-none');
        }
    }

    // 6. Fetch Quotation Requests
    function loadQuotations() {
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
            PageNumber: currentPageNumber,
            PageSize: currentPageSize
        };

        if (currentSearchTerm) {
            queryParams.SearchTerm = currentSearchTerm;
        }
        if (currentCategory) {
            queryParams.ServiceCategory = currentCategory;
        }
        if (currentFromDate) {
            queryParams.FromDate = currentFromDate;
        }
        if (currentToDate) {
            queryParams.ToDate = currentToDate;
        }

        console.log(`[Quotations] Fetching: ${GET_QUOTATIONS_URL}`, queryParams);
        updateActiveFiltersBadge();

        $.ajax({
            url: GET_QUOTATIONS_URL,
            type: 'GET',
            data: queryParams,
            dataType: 'json',
            headers: headers,
            cache: false,
            timeout: 15000,
            success: function (response) {
                console.log('[Quotations] API Response:', response);

                if (response && response.succeeded !== false && response.data) {
                    const dataObj = response.data;
                    const items = Array.isArray(dataObj.items) ? dataObj.items : (Array.isArray(dataObj) ? dataObj : []);

                    currentQuotationsList = items;
                    currentTotalCount = dataObj.totalCount ?? items.length;
                    currentTotalPages = dataObj.totalPages ?? Math.max(1, Math.ceil(currentTotalCount / currentPageSize));
                    hasPreviousPage = Boolean(dataObj.hasPreviousPage);
                    hasNextPage = Boolean(dataObj.hasNextPage);

                    if ($totalRequestsCount.length) {
                        $totalRequestsCount.text(currentTotalCount.toLocaleString());
                    }

                    renderQuotationsTable(items);
                    renderPaginationControls();
                } else if (Array.isArray(response)) {
                    currentQuotationsList = response;
                    currentTotalCount = response.length;
                    currentTotalPages = 1;
                    hasPreviousPage = false;
                    hasNextPage = false;

                    if ($totalRequestsCount.length) {
                        $totalRequestsCount.text(currentTotalCount.toLocaleString());
                    }

                    renderQuotationsTable(response);
                    renderPaginationControls();
                } else {
                    const message = response?.message || 'Unable to retrieve quotation requests.';
                    showError(message);
                }
            },
            error: function (xhr, status, error) {
                console.error('[Quotations] Fetch error:', status, error, xhr);

                if (xhr.status === 401) {
                    showError('Authentication session expired (401). Please log in to view quotations.');
                    showToast('Session expired. Redirecting to login...', 'bi bi-shield-lock-fill text-warning');
                    setTimeout(function () {
                        window.location.href = '/Account/Login';
                    }, 2200);
                    return;
                }

                let msg = `Unable to connect to the Quotations API (${GET_QUOTATIONS_URL}). Please verify the backend service is running.`;
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                } else if (xhr.statusText && xhr.statusText !== 'error') {
                    msg = `Server Error (${xhr.status}): ${xhr.statusText}`;
                }

                showError(msg);
            },
            complete: function () {
                isFetching = false;
                $loadingState.addClass('d-none');
                $refreshBtn.prop('disabled', false);
                $refreshBtn.find('.refresh-icon').removeClass('spin-animation');
            }
        });
    }

    function showError(message) {
        $errorMessageText.text(message);
        showState('error');
        $tableCountSummary.text('0 requests');
    }

    // 7. Render Table Rows
    function renderQuotationsTable(items) {
        if (!items || items.length === 0) {
            const hasFilter = currentSearchTerm || currentCategory || currentFromDate || currentToDate;
            if (hasFilter) {
                showState('no-results');
            } else {
                showState('empty');
            }
            $tableCountSummary.text('Showing 0 of 0 requests');
            return;
        }

        showState('normal');

        const rowsHtml = items.map((quote) => {
            const id = quote.id ?? 0;
            const fullName = escapeHtml(quote.fullName || 'Anonymous');
            const initial = (quote.fullName || 'Q').trim().charAt(0).toUpperCase();
            const avatarBg = getAvatarBg(quote.fullName);
            const company = escapeHtml(quote.companyName || '—');
            const email = escapeHtml(quote.email || '—');
            const phone = escapeHtml(quote.phone || '—');
            const categoryName = escapeHtml(quote.serviceCategoryName || categoryMap[quote.serviceCategory] || `Category #${quote.serviceCategory}`);
            const quantity = escapeHtml(quote.estimatedQuantity || '—');
            const ref = escapeHtml(quote.productReference || '—');
            const dateFormatted = formatDate(quote.createdOn);

            return `
                <tr data-quotation-id="${id}">
                    <!-- ID Column -->
                    <td style="width: 80px;">
                        <span class="dash-id-badge">#${id}</span>
                    </td>

                    <!-- Customer & Company -->
                    <td>
                        <div class="min-w-0">
                            <a href="javascript:void(0)" class="fw-bold text-dark text-decoration-none quote-detail-link d-block text-truncate" data-id="${id}">
                                ${fullName}
                            </a>
                            <small class="text-muted d-flex align-items-center gap-1 text-truncate" title="${company}">
                                <i class="bi bi-building"></i>
                                <span>${company}</span>
                            </small>
                        </div>
                    </td>

                    <!-- Contact -->
                    <td>
                        <div class="d-flex flex-column gap-1">
                            ${quote.email ? `
                                <a href="mailto:${email}" class="text-decoration-none text-muted small d-inline-flex align-items-center gap-1" title="Send email">
                                    <i class="bi bi-envelope text-primary"></i>
                                    <span class="text-truncate" style="max-width: 170px;">${email}</span>
                                </a>
                            ` : '<span class="text-muted small">—</span>'}

                            ${quote.phone ? `
                                <a href="tel:${phone}" class="text-decoration-none text-dark small fw-semibold d-inline-flex align-items-center gap-1" title="Call phone">
                                    <i class="bi bi-telephone text-success"></i>
                                    <span>${phone}</span>
                                </a>
                            ` : ''}
                        </div>
                    </td>

                    <!-- Service Category -->
                    <td>
                        <span class="badge quote-category-badge text-truncate" style="max-width: 200px;" title="${categoryName}">
                            <i class="bi bi-tag-fill me-1"></i>${categoryName}
                        </span>
                    </td>

                    <!-- Submitted Date -->
                    <td class="text-nowrap">
                        <div class="d-flex align-items-center gap-1 small text-dark">
                            <i class="bi bi-calendar3 text-muted"></i>
                            <span>${dateFormatted}</span>
                        </div>
                    </td>

                    <!-- Actions -->
                    <td class="text-end">
                        <div class="dash-action-btn-group">
                            <button type="button" 
                                    class="dash-action-btn btn-view btn-view-quote" 
                                    data-id="${id}" 
                                    title="View Full Quotation Details"
                                    aria-label="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button type="button" 
                                    class="dash-action-btn btn-delete btn-delete-quote text-danger" 
                                    data-id="${id}" 
                                    title="Delete Quotation Request"
                                    aria-label="Delete Quotation">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        $tableBody.html(rowsHtml);

        // Update count summary
        const startRecord = (currentPageNumber - 1) * currentPageSize + 1;
        const endRecord = Math.min(currentPageNumber * currentPageSize, currentTotalCount);
        $tableCountSummary.text(`Showing ${startRecord}–${endRecord} of ${currentTotalCount.toLocaleString()} requests`);
    }

    // 8. Render Pagination Controls
    function renderPaginationControls() {
        if (currentTotalPages <= 1) {
            $paginationNav.addClass('d-none');
            return;
        }

        $paginationNav.removeClass('d-none');
        $paginationUl.empty();

        // Previous Button
        const prevDisabled = !hasPreviousPage && currentPageNumber <= 1 ? 'disabled' : '';
        $paginationUl.append(`
            <li class="page-item ${prevDisabled}">
                <button type="button" class="page-link" data-page="${currentPageNumber - 1}" aria-label="Previous">
                    <i class="bi bi-chevron-left"></i>
                </button>
            </li>
        `);

        // Page Number Windows
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPageNumber - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(currentTotalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        if (startPage > 1) {
            $paginationUl.append(`
                <li class="page-item">
                    <button type="button" class="page-link" data-page="1">1</button>
                </li>
            `);
            if (startPage > 2) {
                $paginationUl.append(`<li class="page-item disabled"><span class="page-link">…</span></li>`);
            }
        }

        for (let p = startPage; p <= endPage; p++) {
            const activeClass = p === currentPageNumber ? 'active' : '';
            $paginationUl.append(`
                <li class="page-item ${activeClass}">
                    <button type="button" class="page-link" data-page="${p}">${p}</button>
                </li>
            `);
        }

        if (endPage < currentTotalPages) {
            if (endPage < currentTotalPages - 1) {
                $paginationUl.append(`<li class="page-item disabled"><span class="page-link">…</span></li>`);
            }
            $paginationUl.append(`
                <li class="page-item">
                    <button type="button" class="page-link" data-page="${currentTotalPages}">${currentTotalPages}</button>
                </li>
            `);
        }

        // Next Button
        const nextDisabled = !hasNextPage && currentPageNumber >= currentTotalPages ? 'disabled' : '';
        $paginationUl.append(`
            <li class="page-item ${nextDisabled}">
                <button type="button" class="page-link" data-page="${currentPageNumber + 1}" aria-label="Next">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `);
    }

    // 9. Open Quotation Detail Modal
    function openQuotationDetails(id) {
        const quote = currentQuotationsList.find(q => q.id === id);
        if (!quote) {
            console.warn(`[Quotations] Quotation ID ${id} not found in current items.`);
            return;
        }

        // Fill modal fields
        $('#modalQuoteId').text(`#${quote.id}`);
        $('#modalCustomerName').text(quote.fullName || '—');
        $('#modalCompanyName').text(quote.companyName || '—');
        $('#modalAvatarInitial').text((quote.fullName || 'Q').trim().charAt(0).toUpperCase());
        $('#modalAvatarInitial').css('background', getAvatarBg(quote.fullName));

        $('#modalEmail').text(quote.email || '—');
        if (quote.email) {
            $('#modalEmailLink').attr('href', `mailto:${quote.email}`).removeClass('d-none');
        } else {
            $('#modalEmailLink').addClass('d-none');
        }

        $('#modalPhone').text(quote.phone || '—');
        if (quote.phone) {
            $('#modalPhoneLink').attr('href', `tel:${quote.phone}`).removeClass('d-none');
        } else {
            $('#modalPhoneLink').addClass('d-none');
        }

        const categoryName = quote.serviceCategoryName || categoryMap[quote.serviceCategory] || `Category #${quote.serviceCategory}`;
        $('#modalCategory').text(categoryName);
        $('#modalQuantity').text(quote.estimatedQuantity || '—');
        $('#modalProductRef').text(quote.productReference || '—');

        const specs = quote.detailedSpecifications ? quote.detailedSpecifications.trim() : '';
        $('#modalSpecifications').text(specs || 'No additional specifications provided.');

        $('#modalCreatedOn').text(formatDate(quote.createdOn));
        $('#modalUpdatedOn').text(formatDate(quote.updatedOn));

        if (detailModalInstance) {
            detailModalInstance.show();
        } else {
            $detailModalEl.modal('show');
        }
    }

    // 10. Event Listeners & Bindings

    // Search input with debounce
    $searchInput.on('input', function () {
        const val = $(this).val().trim();
        if (val) {
            $searchClearBtn.show();
        } else {
            $searchClearBtn.hide();
        }

        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
            currentSearchTerm = val;
            currentPageNumber = 1;
            loadQuotations();
        }, 350);
    });

    // Clear search
    $searchClearBtn.on('click', function () {
        $searchInput.val('');
        $searchClearBtn.hide();
        currentSearchTerm = '';
        currentPageNumber = 1;
        loadQuotations();
    });

    // Category filter change
    $categoryFilter.on('change', function () {
        currentCategory = $(this).val();
        currentPageNumber = 1;
        loadQuotations();
    });

    // Date range filter changes
    $fromDateInput.on('change', function () {
        currentFromDate = $(this).val();
        currentPageNumber = 1;
        loadQuotations();
    });

    $toDateInput.on('change', function () {
        currentToDate = $(this).val();
        currentPageNumber = 1;
        loadQuotations();
    });

    // Reset all filters button
    $resetFiltersBtn.on('click', function () {
        $searchInput.val('');
        $searchClearBtn.hide();
        $categoryFilter.val('');
        $fromDateInput.val('');
        $toDateInput.val('');

        currentSearchTerm = '';
        currentCategory = '';
        currentFromDate = '';
        currentToDate = '';
        currentPageNumber = 1;

        loadQuotations();
    });

    // Page size selector
    $pageSizeSelect.on('change', function () {
        currentPageSize = parseInt($(this).val(), 10) || 10;
        currentPageNumber = 1;
        loadQuotations();
    });

    // Refresh button
    $refreshBtn.on('click', function () {
        loadQuotations();
        showToast('Quotations refreshed from server.', 'bi bi-arrow-clockwise text-primary');
    });

    // Retry button on error
    $btnRetry.on('click', function () {
        loadQuotations();
    });

    // Pagination clicks (delegated)
    $paginationUl.on('click', '.page-link', function (e) {
        e.preventDefault();
        const targetPage = parseInt($(this).data('page'), 10);
        if (targetPage && targetPage >= 1 && targetPage <= currentTotalPages && targetPage !== currentPageNumber) {
            currentPageNumber = targetPage;
            loadQuotations();
            $('html, body').animate({ scrollTop: $table.offset().top - 120 }, 200);
        }
    });

    // Detail button clicks (delegated)
    $tableBody.on('click', '.btn-view-quote, .quote-detail-link', function (e) {
        e.preventDefault();
        const id = parseInt($(this).data('id'), 10);
        if (id) {
            openQuotationDetails(id);
        }
    });

    // Delete button clicks (delegated) - opens confirmation modal
    $tableBody.on('click', '.btn-delete-quote', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt($(this).data('id'), 10);
        if (id) {
            confirmDeleteQuotation(id);
        }
    });

    function confirmDeleteQuotation(id) {
        const quote = currentQuotationsList.find(q => q.id === id) || {};
        const fullName = quote.fullName || `Quotation #${id}`;
        const company = quote.companyName || '—';
        const initial = (quote.fullName || 'Q').trim().charAt(0).toUpperCase();

        pendingDeleteQuoteId = id;
        $('#deleteTargetId').text(`#${id}`);
        $('#deleteTargetName').text(fullName);
        $('#deleteTargetCompany').text(company);
        $('#deleteTargetAvatar').text(initial).css('background', getAvatarBg(quote.fullName));

        if (deleteModalInstance) {
            deleteModalInstance.show();
        } else {
            $deleteModalEl.modal('show');
        }
    }

    // Confirm Delete Action
    $(document).on('click', '#btnConfirmDeleteQuotation', function () {
        if (!pendingDeleteQuoteId) return;

        const id = pendingDeleteQuoteId;
        const deleteUrl = `${QUOTATION_BASE_URL}/${id}`;
        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const $btn = $('#btnConfirmDeleteQuotation');
        const $btnText = $('#btnConfirmDeleteQuotationText');
        $btn.prop('disabled', true);
        $btnText.text('Deleting...');

        console.log(`[Quotations] Sending DELETE to: ${deleteUrl}`);

        $.ajax({
            url: deleteUrl,
            type: 'DELETE',
            headers: headers,
            cache: false,
            timeout: 15000,
            success: function (res) {
                console.log('[Quotations] Delete response:', res);
                if (deleteModalInstance) {
                    deleteModalInstance.hide();
                } else {
                    $deleteModalEl.modal('hide');
                }

                showToast('Quotation request deleted successfully.', 'bi bi-trash3-fill text-danger');

                // If this was the only item on the current page (and not on page 1), move back one page
                if (currentQuotationsList.length === 1 && currentPageNumber > 1) {
                    currentPageNumber--;
                }
                loadQuotations();
            },
            error: function (xhr, status, error) {
                console.error('[Quotations] Delete error:', xhr, status, error);
                let msg = 'Failed to delete quotation request. Please try again.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                } else if (xhr.statusText && xhr.statusText !== 'error') {
                    msg = `Error (${xhr.status}): ${xhr.statusText}`;
                }
                showToast(msg, 'bi bi-exclamation-triangle-fill text-warning');
            },
            complete: function () {
                $btn.prop('disabled', false);
                $btnText.text('Delete Request');
                pendingDeleteQuoteId = null;
            }
        });
    });

    // Copy to clipboard helper inside modal
    $(document).on('click', '.btn-copy-quote-detail', function () {
        const textToCopy = $(this).data('copy-target');
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast('Copied to clipboard!', 'bi bi-clipboard-check-fill text-success');
            }).catch(() => {
                showToast('Failed to copy', 'bi bi-x-circle-fill text-danger');
            });
        }
    });

    // 11. Initial Load
    loadCategories();
    loadQuotations();
});
