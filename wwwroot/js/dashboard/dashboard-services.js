/**
 * ZamZam Trims (BD) Limited - Services Management (dashboard-services.js)
 * ------------------------------------------------------------------------
 * Handles fetching, searching, pagination, detail viewing, and creating services with highlights.
 * API Endpoints:
 *   GET  {ApiBaseUrl}/api/Services/GetAll
 *   POST {ApiBaseUrl}/api/Services
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
    const POST_SERVICE_URL = `${apiBaseUrl}/api/Services`;
    const PUT_SERVICE_URL = `${apiBaseUrl}/api/Services`;

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

    const $createModalEl = $('#createServiceModal');
    let createModalInstance = null;
    if ($createModalEl.length && typeof bootstrap !== 'undefined') {
        createModalInstance = new bootstrap.Modal($createModalEl[0]);
    }

    const $deleteModalEl = $('#deleteConfirmModal');
    let deleteModalInstance = null;
    if ($deleteModalEl.length && typeof bootstrap !== 'undefined') {
        deleteModalInstance = new bootstrap.Modal($deleteModalEl[0]);
    }
    let pendingDeleteServiceId = null;

    // Create Modal Form Elements
    const $btnOpenCreate = $('#btnOpenCreateServiceModal');
    const $createForm = $('#createServiceForm');
    const $createAlert = $('#createServiceAlert');
    const $createTitle = $('#createServiceTitle');
    const $createDisplayOrder = $('#createServiceDisplayOrder');
    const $createDescription = $('#createServiceDescription');
    const $createImageInput = $('#createServiceImageInput');
    const $createDropzone = $('#createServiceDropzone');
    const $dropzonePrompt = $('#serviceDropzonePrompt');
    const $dropzonePreview = $('#serviceDropzonePreview');
    const $createPreviewImg = $('#createServicePreviewImg');
    const $createFileName = $('#createServiceFileName');
    const $btnRemoveImage = $('#btnRemoveServiceImage');
    const $highlightsContainer = $('#createHighlightsContainer');
    const $btnAddHighlight = $('#btnAddHighlightRow');
    const $btnSubmitCreate = $('#btnSubmitCreateService');
    const $btnSubmitCreateText = $('#btnSubmitCreateText');

    let selectedCreateImageFile = null;

    // Edit Modal Elements
    const $editModalEl = $('#editServiceModal');
    let editModalInstance = null;
    if ($editModalEl.length && typeof bootstrap !== 'undefined') {
        editModalInstance = new bootstrap.Modal($editModalEl[0]);
    }
    const $editForm = $('#editServiceForm');
    const $editAlert = $('#editServiceAlert');
    const $editId = $('#editServiceId');
    const $editBadgeId = $('#editServiceBadgeId');
    const $editTitle = $('#editServiceTitle');
    const $editDisplayOrder = $('#editServiceDisplayOrder');
    const $editDescription = $('#editServiceDescription');
    const $editOriginalImagePath = $('#editServiceOriginalImagePath');
    const $editCurrentImgCard = $('#editCurrentImgCard');
    const $editCurrentThumb = $('#editServiceCurrentThumb');
    const $editCurrentPath = $('#editServiceCurrentPath');
    const $editDropzone = $('#editServiceDropzone');
    const $editImageInput = $('#editServiceImageInput');
    const $editDropzonePrompt = $('#editDropzonePrompt');
    const $editDropzonePreview = $('#editDropzonePreview');
    const $editPreviewImg = $('#editServicePreviewImg');
    const $editFileName = $('#editServiceFileName');
    const $btnCancelEditReplacement = $('#btnCancelEditImageReplacement');
    const $editHighlightsContainer = $('#editHighlightsContainer');
    const $btnAddEditHighlight = $('#btnAddEditHighlightRow');
    const $btnSubmitEdit = $('#btnSubmitEditService');
    const $btnSubmitEditText = $('#btnSubmitEditText');
    let selectedEditImageFile = null;

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
    let isSubmitting = false;
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
                        <span class="text-secondary text-truncate d-inline-block" style="max-width: 360px;" title="${description}">
                            ${description}
                        </span>
                    </td>

                    <!-- 3. DISPLAY ORDER COLUMN (Text only like 1, 2, 3) -->
                    <td class="text-center align-middle">
                        <span class="fw-bold text-dark fs-6">${displayOrderText}</span>
                    </td>

                    <!-- 4. ACTION COLUMN (3 Buttons: Blue Eye, Yellow Pencil, Red Trash) -->
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

    // 7. View Service Details Modal with Highlights
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

        // Highlights List in Modal
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

    // 9. Highlights Management in Create Service Modal
    function addHighlightRow(text = '', order = null) {
        const count = $highlightsContainer.find('.highlight-input-row').length;
        const currentOrder = order !== null ? order : (count + 1);

        const rowHtml = `
            <div class="highlight-input-row">
                <span class="text-muted small fw-semibold text-nowrap" style="font-size: 0.75rem;">#${count + 1}</span>
                <input type="text" 
                       class="form-control form-control-sm highlight-text-input" 
                       placeholder="e.g. High resolution color printing" 
                       maxlength="60" 
                       value="${escapeHtml(text)}" 
                       required />
                <div class="d-flex align-items-center gap-1" style="width: 110px;">
                    <span class="text-muted small" style="font-size: 0.75rem;">Order:</span>
                    <input type="number" 
                           class="form-control form-control-sm highlight-order-input px-2" 
                           min="1" 
                           value="${currentOrder}" 
                           style="width: 55px;" />
                </div>
                <button type="button" class="btn btn-outline-danger btn-sm btn-remove-highlight p-1 px-2 rounded-2" title="Remove highlight">
                    <i class="bi bi-trash3"></i>
                </button>
            </div>
        `;

        $highlightsContainer.append(rowHtml);
    }

    function resetCreateForm() {
        $createForm[0].reset();
        $createAlert.addClass('d-none').text('');
        selectedCreateImageFile = null;
        $createImageInput.val('');
        $createPreviewImg.attr('src', '');
        $dropzonePreview.addClass('d-none');
        $dropzonePrompt.removeClass('d-none');
        $createDropzone.removeClass('has-preview');

        // Reset highlights with 2 starter rows
        $highlightsContainer.empty();
        addHighlightRow('', 1);
        addHighlightRow('', 2);
    }

    // 10. Image Dropzone & File Handling
    $createImageInput.on('change', function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const maxFileSize = 300 * 1024; // 300 KB as required by backend
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

        if (!allowedTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpg|jpeg|png)$/i)) {
            $createAlert.removeClass('d-none').text('Invalid file type. Allowed formats: .jpg, .jpeg, .png');
            $createImageInput.val('');
            selectedCreateImageFile = null;
            return;
        }

        if (file.size > maxFileSize) {
            $createAlert.removeClass('d-none').text(`Image file size (${(file.size / 1024).toFixed(1)} KB) exceeds the maximum allowed limit of 300 KB.`);
            $createImageInput.val('');
            selectedCreateImageFile = null;
            return;
        }

        $createAlert.addClass('d-none').text('');
        selectedCreateImageFile = file;
        $createFileName.text(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

        const reader = new FileReader();
        reader.onload = function (evt) {
            $createPreviewImg.attr('src', evt.target.result);
            $dropzonePrompt.addClass('d-none');
            $dropzonePreview.removeClass('d-none');
            $createDropzone.addClass('has-preview');
        };
        reader.readAsDataURL(file);
    });

    $btnRemoveImage.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        selectedCreateImageFile = null;
        $createImageInput.val('');
        $createPreviewImg.attr('src', '');
        $dropzonePreview.addClass('d-none');
        $dropzonePrompt.removeClass('d-none');
        $createDropzone.removeClass('has-preview');
    });

    // Add Highlight Row button
    $btnAddHighlight.on('click', function () {
        const count = $highlightsContainer.find('.highlight-input-row').length;
        addHighlightRow('', count + 1);
    });

    // Remove Highlight Row button
    $(document).on('click', '.btn-remove-highlight', function () {
        $(this).closest('.highlight-input-row').remove();
    });

    // Open Create Modal
    $btnOpenCreate.on('click', function () {
        resetCreateForm();
        if (createModalInstance) {
            createModalInstance.show();
        }
    });

    // 11. Submit Create Service Form (Calls POST /api/Services)
    $createForm.on('submit', function (e) {
        e.preventDefault();
        if (isSubmitting) return;

        $createAlert.addClass('d-none').text('');

        const title = $createTitle.val().trim();
        const displayOrder = parseInt($createDisplayOrder.val(), 10);
        const description = $createDescription.val().trim();

        if (!title) {
            $createAlert.removeClass('d-none').text('Please enter a service title (max 50 chars).');
            $createTitle.focus();
            return;
        }

        if (title.length > 50) {
            $createAlert.removeClass('d-none').text('Service title cannot exceed 50 characters.');
            $createTitle.focus();
            return;
        }

        if (isNaN(displayOrder) || displayOrder <= 0) {
            $createAlert.removeClass('d-none').text('Please provide a valid display order greater than 0.');
            $createDisplayOrder.focus();
            return;
        }

        if (!description) {
            $createAlert.removeClass('d-none').text('Please enter a service description (max 500 chars).');
            $createDescription.focus();
            return;
        }

        if (description.length > 500) {
            $createAlert.removeClass('d-none').text('Service description cannot exceed 500 characters.');
            $createDescription.focus();
            return;
        }

        if (!selectedCreateImageFile) {
            $createAlert.removeClass('d-none').text('Please select an image file for this service (Max 300 KB, .jpg/.png).');
            return;
        }

        // Build FormData matching backend DTO
        const formData = new FormData();
        formData.append('Id', '0');
        formData.append('Title', title);
        formData.append('Description', description);
        formData.append('DisplayOrder', displayOrder);
        formData.append('Image', selectedCreateImageFile);

        // Process Highlights
        const highlightsList = [];
        $highlightsContainer.find('.highlight-input-row').each(function (idx) {
            const hText = $(this).find('.highlight-text-input').val().trim();
            const hOrder = parseInt($(this).find('.highlight-order-input').val(), 10) || (idx + 1);

            if (hText) {
                const hObj = {
                    id: 0,
                    highlightText: hText,
                    displayOrder: hOrder
                };
                highlightsList.push(hObj);
                formData.append('Highlights', JSON.stringify(hObj));
            }
        });

        formData.append('HighlightsJson', JSON.stringify(highlightsList));

        // Submit to API
        isSubmitting = true;
        $btnSubmitCreate.prop('disabled', true);
        $btnSubmitCreateText.text('Creating Service...');

        const token = getAuthToken();
        const headers = { 'Accept': '*/*' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        console.log(`[Services] Submitting Create Service to ${POST_SERVICE_URL}`, {
            Title: title,
            DisplayOrder: displayOrder,
            Description: description,
            Highlights: highlightsList
        });

        $.ajax({
            url: POST_SERVICE_URL,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: headers,
            success: function (res) {
                console.log('[Services] Create Response:', res);
                if (res && res.succeeded !== false) {
                    showToast(res.message || 'Service successfully created.', 'bi bi-check-circle-fill text-success');
                    if (createModalInstance) {
                        createModalInstance.hide();
                    }
                    resetCreateForm();
                    // Reload table from API
                    currentPageNumber = 1;
                    loadServices();
                } else {
                    const errorMsg = res?.message || 'Failed to create service.';
                    $createAlert.removeClass('d-none').text(errorMsg);
                }
            },
            error: function (xhr, status, error) {
                console.error('[Services] Create Error:', status, error, xhr);
                let msg = 'Failed to create service. Please verify your connection or input data.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                } else if (xhr.responseText) {
                    try {
                        const parsed = JSON.parse(xhr.responseText);
                        if (parsed.message) msg = parsed.message;
                    } catch (e) { }
                }
                $createAlert.removeClass('d-none').text(msg);
            },
            complete: function () {
                isSubmitting = false;
                $btnSubmitCreate.prop('disabled', false);
                $btnSubmitCreateText.text('Create Service');
            }
        });
    });

    // 11B. Edit Service & Highlights Management (Calls PUT /api/Services)
    function addEditHighlightRow(h) {
        const hId = (h && h.id != null) ? h.id : 0;
        const textVal = (h && h.highlightText) ? escapeHtml(h.highlightText) : '';
        const count = $editHighlightsContainer.find('.highlight-input-row').length;
        const orderVal = (h && h.displayOrder != null) ? h.displayOrder : (count + 1);

        const rowHtml = `
            <div class="highlight-input-row">
                <input type="hidden" class="highlight-id-input" value="${hId}" />
                <span class="text-muted small fw-semibold text-nowrap" style="font-size: 0.75rem;">#${count + 1}</span>
                <input type="text" 
                       class="form-control form-control-sm highlight-text-input" 
                       placeholder="e.g. 24/7 Precision Quality Check" 
                       maxlength="60" 
                       value="${textVal}" 
                       required />
                <div class="d-flex align-items-center gap-1" style="width: 110px;">
                    <span class="text-muted small" style="font-size: 0.75rem;">Order:</span>
                    <input type="number" 
                           class="form-control form-control-sm highlight-order-input px-2" 
                           min="1" 
                           value="${orderVal}" 
                           style="width: 55px;" />
                </div>
                <button type="button" class="btn btn-outline-danger btn-sm btn-remove-highlight p-1 px-2 rounded-2" title="Remove highlight">
                    <i class="bi bi-trash3"></i>
                </button>
            </div>
        `;

        $editHighlightsContainer.append(rowHtml);
    }

    function openEditService(serviceId) {
        const service = allFetchedServices.find(s => s.id == serviceId);
        if (!service) {
            showToast('Service record not found', 'bi bi-exclamation-triangle-fill text-warning');
            return;
        }

        $editAlert.addClass('d-none').text('');
        $editForm[0].reset();
        selectedEditImageFile = null;
        $editImageInput.val('');
        $editPreviewImg.attr('src', '');
        $editDropzonePreview.addClass('d-none');
        $editDropzonePrompt.removeClass('d-none');
        $editDropzone.removeClass('has-preview');
        $editHighlightsContainer.empty();

        $editId.val(service.id);
        $editBadgeId.text(`#${service.id}`);
        $editTitle.val(service.title || '');
        $editDisplayOrder.val(service.displayOrder != null ? service.displayOrder : 1);
        $editDescription.val(service.description || '');

        const origPath = service.imagePath || '';
        $editOriginalImagePath.val(origPath);
        const fullImgUrl = resolveImageUrl(origPath);

        if (origPath && fullImgUrl) {
            $editCurrentThumb.attr('src', fullImgUrl);
            $editCurrentPath.text(origPath);
            $editCurrentImgCard.removeClass('d-none');
        } else {
            $editCurrentThumb.attr('src', '/images/logo-icon.png');
            $editCurrentPath.text('No image currently assigned');
            $editCurrentImgCard.addClass('d-none');
        }

        const highlights = Array.isArray(service.highlights) ? service.highlights : [];
        if (highlights.length > 0) {
            const sorted = [...highlights].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
            sorted.forEach(h => addEditHighlightRow(h));
        } else {
            addEditHighlightRow(null);
        }

        if (editModalInstance) {
            editModalInstance.show();
        }
    }

    $editImageInput.on('change', function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const maxFileSize = 300 * 1024;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

        if (!allowedTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpg|jpeg|png)$/i)) {
            $editAlert.removeClass('d-none').text('Invalid file type. Allowed formats: .jpg, .jpeg, .png');
            $editImageInput.val('');
            selectedEditImageFile = null;
            return;
        }

        if (file.size > maxFileSize) {
            $editAlert.removeClass('d-none').text(`Image file size (${(file.size / 1024).toFixed(1)} KB) exceeds the maximum allowed limit of 300 KB.`);
            $editImageInput.val('');
            selectedEditImageFile = null;
            return;
        }

        $editAlert.addClass('d-none').text('');
        selectedEditImageFile = file;
        $editFileName.text(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

        const reader = new FileReader();
        reader.onload = function (evt) {
            $editPreviewImg.attr('src', evt.target.result);
            $editDropzonePrompt.addClass('d-none');
            $editDropzonePreview.removeClass('d-none');
            $editDropzone.addClass('has-preview');
        };
        reader.readAsDataURL(file);
    });

    $btnCancelEditReplacement.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        selectedEditImageFile = null;
        $editImageInput.val('');
        $editPreviewImg.attr('src', '');
        $editDropzonePreview.addClass('d-none');
        $editDropzonePrompt.removeClass('d-none');
        $editDropzone.removeClass('has-preview');
    });

    $btnAddEditHighlight.on('click', function () {
        const count = $editHighlightsContainer.find('.highlight-input-row').length;
        addEditHighlightRow({ id: 0, highlightText: '', displayOrder: count + 1 });
    });

    $editForm.on('submit', async function (e) {
        e.preventDefault();
        if (isSubmitting) return;

        $editAlert.addClass('d-none').text('');

        const id = parseInt($editId.val(), 10);
        const title = $editTitle.val().trim();
        const displayOrder = parseInt($editDisplayOrder.val(), 10);
        const description = $editDescription.val().trim();

        if (!id || id <= 0) {
            $editAlert.removeClass('d-none').text('Invalid service ID.');
            return;
        }

        if (!title) {
            $editAlert.removeClass('d-none').text('Please enter a service title (max 50 chars).');
            $editTitle.focus();
            return;
        }

        if (title.length > 50) {
            $editAlert.removeClass('d-none').text('Service title cannot exceed 50 characters.');
            $editTitle.focus();
            return;
        }

        if (isNaN(displayOrder) || displayOrder <= 0) {
            $editAlert.removeClass('d-none').text('Please provide a valid display order greater than 0.');
            $editDisplayOrder.focus();
            return;
        }

        if (!description) {
            $editAlert.removeClass('d-none').text('Please enter a service description (max 500 chars).');
            $editDescription.focus();
            return;
        }

        if (description.length > 500) {
            $editAlert.removeClass('d-none').text('Service description cannot exceed 500 characters.');
            $editDescription.focus();
            return;
        }

        const formData = new FormData();
        formData.append('Id', id);
        formData.append('Title', title);
        formData.append('Description', description);
        formData.append('DisplayOrder', displayOrder);

        // Image handling: only append Image if user selected a new replacement file.
        // If omitted, the server preserves the existing image untouched.
        if (selectedEditImageFile) {
            formData.append('Image', selectedEditImageFile);
        }

        // Process highlights
        const highlightsList = [];
        $editHighlightsContainer.find('.highlight-input-row').each(function (idx) {
            const hId = parseInt($(this).find('.highlight-id-input').val(), 10) || 0;
            const hText = $(this).find('.highlight-text-input').val().trim();
            const hOrder = parseInt($(this).find('.highlight-order-input').val(), 10) || (idx + 1);

            if (hText) {
                const hObj = {
                    id: hId,
                    highlightText: hText,
                    displayOrder: hOrder
                };
                highlightsList.push(hObj);
                formData.append('Highlights', JSON.stringify(hObj));
            }
        });

        formData.append('HighlightsJson', JSON.stringify(highlightsList));

        // Submit to API
        isSubmitting = true;
        $btnSubmitEdit.prop('disabled', true);
        $btnSubmitEditText.html('<span class="spinner-border spinner-border-sm me-1" role="status"></span> Updating...');

        const token = getAuthToken();
        const headers = { 'Accept': '*/*' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        console.log(`[Services] Submitting Edit Service to ${PUT_SERVICE_URL}`, {
            Id: id,
            Title: title,
            DisplayOrder: displayOrder,
            Description: description,
            Highlights: highlightsList
        });

        $.ajax({
            url: PUT_SERVICE_URL,
            type: 'PUT',
            data: formData,
            processData: false,
            contentType: false,
            headers: headers,
            timeout: 25000,
            success: function (res) {
                console.log('[Services] Edit Response:', res);
                if (res && res.succeeded !== false) {
                    showToast(res.message || 'Service successfully updated.', 'bi bi-check-circle-fill text-success');
                    if (editModalInstance) {
                        editModalInstance.hide();
                    }
                    // Refresh table without resetting current page
                    loadServices();
                } else {
                    const errorMsg = res?.message || 'Failed to update service.';
                    $editAlert.removeClass('d-none').text(errorMsg);
                }
            },
            error: function (xhr, status, error) {
                console.error('[Services] Edit Error:', status, error, xhr);
                let msg = 'Failed to update service. Please verify your connection or input data.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                } else if (xhr.responseText) {
                    try {
                        const parsed = JSON.parse(xhr.responseText);
                        if (parsed.message) msg = parsed.message;
                    } catch (e) { }
                }
                $editAlert.removeClass('d-none').text(msg);
            },
            complete: function () {
                isSubmitting = false;
                $btnSubmitEdit.prop('disabled', false);
                $btnSubmitEditText.text('Update Service');
            }
        });
    });

    // 12. Search & Filter Event Listeners

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
            loadServices();
        }, 400);
    });

    // Enter key press in search box triggers API endpoint immediately
    $searchInput.on('keypress', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            clearTimeout(searchDebounceTimer);
            currentSearchTerm = $(this).val().trim();
            currentPageNumber = 1;
            loadServices();
        }
    });

    // Search clear button triggers API endpoint
    $searchClearBtn.on('click', function () {
        $searchInput.val('');
        currentSearchTerm = '';
        $searchClearBtn.hide();
        currentPageNumber = 1;
        loadServices();
        $searchInput.focus();
    });

    // B. Search button triggers API endpoint
    $btnSearchSubmit.on('click', function () {
        clearTimeout(searchDebounceTimer);
        currentSearchTerm = $searchInput.val().trim();
        currentPageNumber = 1;
        loadServices();
    });

    // C. Reset button triggers API endpoint
    $btnResetFilters.on('click', function () {
        clearTimeout(searchDebounceTimer);
        $searchInput.val('');
        currentSearchTerm = '';
        $searchClearBtn.hide();
        currentPageNumber = 1;
        loadServices();
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
        loadServices();
    });

    // D. Pagination triggers API endpoint
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

    // Row Actions
    $(document).on('click', '.btn-view-service', function (e) {
        e.stopPropagation();
        const serviceId = $(this).data('id');
        openServiceDetails(serviceId);
    });

    $(document).on('click', '.btn-edit-service', function (e) {
        e.stopPropagation();
        const serviceId = $(this).data('id');
        openEditService(serviceId);
    });

    // Delete button click opens confirmation modal
    $(document).on('click', '.btn-delete-service', function (e) {
        e.stopPropagation();
        const serviceId = $(this).data('id');
        const service = allFetchedServices.find(s => s.id == serviceId);
        if (!service) return;

        pendingDeleteServiceId = serviceId;
        $('#deleteTargetId').text(`#${service.id}`);
        $('#deleteTargetName').text(service.title || `Service #${service.id}`);
        $('#deleteTargetDesc').text(service.description || 'No description provided');

        const fullImageUrl = resolveImageUrl(service.imagePath);
        $('#deleteTargetThumb').attr('src', fullImageUrl || '/images/logo-icon.png');

        if (deleteModalInstance) {
            deleteModalInstance.show();
        }
    });

    // Confirm Delete action (Calls DELETE /api/Services/{id})
    $('#btnConfirmDelete').on('click', function () {
        if (!pendingDeleteServiceId) return;

        const deleteUrl = `${apiBaseUrl}/api/Services/${pendingDeleteServiceId}`;
        const $btn = $(this);
        const $btnText = $('#btnConfirmDeleteText');

        $btn.prop('disabled', true);
        $btnText.text('Deleting...');

        const token = getAuthToken();
        const headers = { 'Accept': '*/*' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        console.log(`[Services] Sending DELETE request to: ${deleteUrl}`);

        $.ajax({
            url: deleteUrl,
            type: 'DELETE',
            headers: headers,
            success: function (res) {
                console.log('[Services] Delete response:', res);
                if (res && res.succeeded !== false) {
                    showToast(res.message || 'Service successfully deleted.', 'bi bi-check-circle-fill text-success');
                    if (deleteModalInstance) {
                        deleteModalInstance.hide();
                    }
                    pendingDeleteServiceId = null;
                    // Reload table from API
                    loadServices();
                } else {
                    const msg = res?.message || 'Failed to delete service.';
                    showToast(msg, 'bi bi-exclamation-triangle-fill text-danger');
                }
            },
            error: function (xhr, status, error) {
                console.error('[Services] Delete error:', status, error, xhr);
                let msg = 'Failed to delete service. Please verify your connection or permissions.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                } else if (xhr.responseText) {
                    try {
                        const parsed = JSON.parse(xhr.responseText);
                        if (parsed.message) msg = parsed.message;
                    } catch (e) { }
                }
                showToast(msg, 'bi bi-exclamation-triangle-fill text-danger');
            },
            complete: function () {
                $btn.prop('disabled', false);
                $btnText.text('Delete Service');
            }
        });
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
