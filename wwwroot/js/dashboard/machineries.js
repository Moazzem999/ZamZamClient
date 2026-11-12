/**
 * ZamZam Trims (BD) Limited - Machineries Management (machineries.js)
 * ------------------------------------------------------------------------
 * Handles listing, searching, pagination, image preview, viewing, creating,
 * editing, and deleting machinery records. Includes Category Search Box autocomplete.
 * API Endpoints:
 *   GET    {ApiBaseUrl}/api/Machinery/GetAll?SearchTerm={term}&PageNumber={page}&PageSize={size}
 *   GET    {ApiBaseUrl}/api/Machinery/GetById/{id}
 *   POST   {ApiBaseUrl}/api/Machinery (multipart/form-data)
 *   PUT    {ApiBaseUrl}/api/Machinery (multipart/form-data)
 *   DELETE {ApiBaseUrl}/api/Machinery/{id}
 *   GET    {ApiBaseUrl}/api/MachineryCategory/GetByName/{name}
 *   GET    {ApiBaseUrl}/api/MachineryCategory/GetAllForDisplay
 */

$(function () {
    'use strict';

    // 1. Configuration & DOM Elements
    const $container = $('#machineryPageContainer');
    let apiBaseUrl = ($container.data('api-base-url') || 'https://localhost:7148').replace(/\/+$/, '');

    // Mixed content safeguard
    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace('http://localhost:', 'https://localhost:');
    }

    const GET_ALL_URL = `${apiBaseUrl}/api/Machinery/GetAll`;
    const BASE_MACHINERY_URL = `${apiBaseUrl}/api/Machinery`;
    const CATEGORY_BY_NAME_URL = `${apiBaseUrl}/api/MachineryCategory/GetByName`;
    const CATEGORY_DISPLAY_URL = `${apiBaseUrl}/api/MachineryCategory/GetAllForDisplay`;

    // Table & States
    const $table = $('#machineryTable');
    const $tableBody = $('#machineryTableBody');
    const $emptyState = $('#tableEmptyState');
    const $loadingState = $('#tableLoadingState');
    const $noResultsState = $('#tableNoResultsState');
    const $errorState = $('#tableErrorState');
    const $errorMessageText = $('#errorMessageText');
    const $tableCountSummary = $('#tableCountSummary');
    const $paginationNav = $('#machineryPaginationNav');
    const $paginationUl = $('#machineryPaginationUl');

    // Filter Controls
    const $searchInput = $('#searchMachineryInput');
    const $searchClearBtn = $('#searchClearBtn');
    const $btnSearchSubmit = $('#btnSearchSubmit');
    const $btnResetFilters = $('#btnResetFilters');
    const $pageSizeFilter = $('#filterPageSize');
    const $btnRetry = $('#btnRetryMachinery');

    // Modals
    const $createModalEl = $('#createMachineryModal');
    let createModalInstance = null;
    if ($createModalEl.length && typeof bootstrap !== 'undefined') {
        createModalInstance = new bootstrap.Modal($createModalEl[0]);
    }

    const $editModalEl = $('#editMachineryModal');
    let editModalInstance = null;
    if ($editModalEl.length && typeof bootstrap !== 'undefined') {
        editModalInstance = new bootstrap.Modal($editModalEl[0]);
    }

    const $viewModalEl = $('#viewMachineryModal');
    let viewModalInstance = null;
    if ($viewModalEl.length && typeof bootstrap !== 'undefined') {
        viewModalInstance = new bootstrap.Modal($viewModalEl[0]);
    }

    const $deleteModalEl = $('#deleteMachineryModal');
    let deleteModalInstance = null;
    if ($deleteModalEl.length && typeof bootstrap !== 'undefined') {
        deleteModalInstance = new bootstrap.Modal($deleteModalEl[0]);
    }

    // Create Modal Elements
    const $btnOpenCreate = $('#btnOpenCreateMachineryModal');
    const $createForm = $('#createMachineryForm');
    const $createAlert = $('#createMachineryAlert');
    const $createTitle = $('#createMachineryTitle');
    const $createCardBadge = $('#createMachineryCardBadge');
    const $createDisplayOrder = $('#createMachineryDisplayOrder');
    const $createDescription = $('#createMachineryDescription');
    const $createCategorySearchInput = $('#createCategorySearchInput');
    const $createMachineryCategoryId = $('#createMachineryCategoryId');
    const $createCategoryDropdown = $('#createCategoryDropdown');
    const $createFileInput = $('#createMachineryFileInput');
    const $createDropzone = $('#createMachineryDropzone');
    const $createDropzonePrompt = $('#createDropzonePrompt');
    const $createDropzonePreview = $('#createDropzonePreview');
    const $createPreviewImg = $('#createPreviewImg');
    const $btnChangeCreateImage = $('#btnChangeCreateImage');
    const $btnRemoveCreateImage = $('#btnRemoveCreateImage');
    const $btnSubmitCreate = $('#btnSubmitCreateMachinery');
    const $btnSubmitCreateText = $('#btnSubmitCreateText');

    let selectedCreateFile = null;

    // Edit Modal Elements
    const $editForm = $('#editMachineryForm');
    const $editAlert = $('#editMachineryAlert');
    const $editId = $('#editMachineryId');
    const $editTitle = $('#editMachineryTitle');
    const $editCardBadge = $('#editMachineryCardBadge');
    const $editDisplayOrder = $('#editMachineryDisplayOrder');
    const $editDescription = $('#editMachineryDescription');
    const $editCategorySearchInput = $('#editCategorySearchInput');
    const $editMachineryCategoryId = $('#editMachineryCategoryId');
    const $editCategoryDropdown = $('#editCategoryDropdown');
    const $editFileInput = $('#editMachineryFileInput');
    const $editPreviewImg = $('#editPreviewImg');
    const $btnChangeEditImage = $('#btnChangeEditImage');
    const $btnSubmitEdit = $('#btnSubmitEditMachinery');
    const $btnSubmitEditText = $('#btnSubmitEditText');

    let selectedEditFile = null;

    // View Modal Elements
    const $btnEditFromView = $('#btnEditFromView');
    let currentViewingMachinery = null;

    // Delete Modal Elements
    const $btnConfirmDelete = $('#btnConfirmDeleteMachinery');
    const $btnConfirmDeleteText = $('#btnConfirmDeleteText');
    let pendingDeleteMachineryId = null;

    // Toast
    const $toastEl = $('#dashToast');
    let toastInstance = null;
    if ($toastEl.length && typeof bootstrap !== 'undefined') {
        toastInstance = new bootstrap.Toast($toastEl[0], { delay: 3500 });
    }
    const $toastMessage = $('#dashToastMessage');

    // State Variables
    let currentPageNumber = 1;
    let currentPageSize = 10;
    let currentSearchTerm = '';
    let searchDebounceTimer = null;
    let allFetchedMachineries = [];
    let currentTotalCount = 0;
    let currentTotalPages = 1;
    let hasPreviousPage = false;
    let hasNextPage = false;
    let isFetching = false;

    // 2. Helper Utilities
    function getAuthToken() {
        let token = localStorage.getItem('token') || localStorage.getItem('zamzam_token');
        if (!token) {
            const cookies = document.cookie ? document.cookie.split(';') : [];
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
        if (!path) return '/images/logo-icon.png';
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        return `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    }

    function showToast(message, isSuccess = true) {
        if (!toastInstance) return;
        $toastMessage.text(message);
        const $icon = $toastEl.find('.dash-toast-icon');
        if (isSuccess) {
            $icon.attr('class', 'bi bi-check-circle-fill text-success fs-5 dash-toast-icon');
        } else {
            $icon.attr('class', 'bi bi-exclamation-triangle-fill text-danger fs-5 dash-toast-icon');
        }
        toastInstance.show();
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
                $paginationNav.addClass('d-none');
                break;
            case 'no-results':
                $table.addClass('d-none');
                $noResultsState.removeClass('d-none');
                $paginationNav.addClass('d-none');
                break;
            case 'error':
                $table.addClass('d-none');
                $errorState.removeClass('d-none');
                $paginationNav.addClass('d-none');
                break;
            case 'normal':
            default:
                break;
        }
    }

    // 3. Load Machineries from API
    function loadMachineries() {
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
            PageSize: currentPageSize
        };

        if (currentSearchTerm && currentSearchTerm.trim() !== '') {
            queryParams.SearchTerm = currentSearchTerm.trim();
        }

        console.log(`[Machineries] Fetching: ${GET_ALL_URL}`, queryParams);

        $.ajax({
            url: GET_ALL_URL,
            type: 'GET',
            data: queryParams,
            dataType: 'json',
            headers: headers,
            cache: false,
            timeout: 15000,
            success: function (response) {
                console.log('[Machineries] Response:', response);

                if (response && response.succeeded !== false && response.data) {
                    const dataObj = response.data;
                    const items = Array.isArray(dataObj.items) ? dataObj.items : (Array.isArray(dataObj) ? dataObj : []);

                    allFetchedMachineries = items;
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
                        $tableCountSummary.text('Showing 0 to 0 of 0 entries');
                        renderPaginationControls();
                    } else {
                        showState('normal');
                        renderMachineryTable(items);
                        renderPaginationControls();
                    }
                } else if (Array.isArray(response)) {
                    allFetchedMachineries = response;
                    currentTotalCount = response.length;
                    currentTotalPages = Math.max(1, Math.ceil(currentTotalCount / currentPageSize));
                    hasPreviousPage = currentPageNumber > 1;
                    hasNextPage = currentPageNumber < currentTotalPages;

                    if (response.length === 0) {
                        showState(currentSearchTerm ? 'no-results' : 'empty');
                        $tableCountSummary.text('Showing 0 to 0 of 0 entries');
                    } else {
                        showState('normal');
                        renderMachineryTable(response);
                        renderPaginationControls();
                    }
                } else {
                    showState('empty');
                    $tableCountSummary.text('Showing 0 to 0 of 0 entries');
                }
            },
            error: function (xhr, status, error) {
                console.error('[Machineries] Load error:', status, error, xhr);
                let msg = 'Failed to fetch machineries from the server. Please verify your connection or API status.';
                if (xhr.status === 401) {
                    msg = 'Session expired or unauthorized. Please re-login to access machineries.';
                } else if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                $errorMessageText.text(msg);
                showState('error');
            },
            complete: function () {
                isFetching = false;
            }
        });
    }

    // 4. Render Table Rows
    function renderMachineryTable(items) {
        $tableBody.empty();

        items.forEach(function (m) {
            const safeTitle = escapeHtml(m.title || 'Untitled Machine');
            const safeBadge = m.cardBadge ? `<span class="card-badge-pill ms-2">${escapeHtml(m.cardBadge)}</span>` : '';
            const safeCategory = escapeHtml(m.machineryCategoryName || 'Uncategorized');
            const safeDesc = escapeHtml(m.description || 'No description provided.');
            const displayOrder = m.displayOrder != null ? m.displayOrder : 0;
            const fullImgUrl = resolveImageUrl(m.imagePath);

            const rowHtml = `
                <tr data-id="${m.id}">
                    <td>
                        <span class="machinery-id-pill">#${m.id}</span>
                    </td>
                    <td class="text-center">
                        <div class="machinery-thumb-wrapper mx-auto btn-view-machinery" data-id="${m.id}" title="Click to view details">
                            <img src="${fullImgUrl}" alt="${safeTitle}" onerror="this.onerror=null; this.src='/images/logo-icon.png';" />
                        </div>
                    </td>
                    <td>
                        <div class="d-flex flex-column">
                            <div class="d-flex align-items-center flex-wrap">
                                <span class="machinery-title-text">${safeTitle}</span>
                                ${safeBadge}
                            </div>
                            <span class="machinery-desc-text mt-1" title="${safeDesc}">${safeDesc}</span>
                        </div>
                    </td>
                    <td>
                        <span class="category-badge-pill">
                            <i class="bi bi-tag-fill text-primary"></i>
                            <span>${safeCategory}</span>
                        </span>
                    </td>
                    <td class="text-center fw-medium text-dark">
                        ${displayOrder}
                    </td>
                    <td class="text-end">
                        <div class="machinery-actions-group">
                            <button type="button" 
                                    class="btn-action-icon btn-action-view btn-view-machinery" 
                                    data-id="${m.id}" 
                                    title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button type="button" 
                                    class="btn-action-icon btn-action-edit btn-edit-machinery" 
                                    data-id="${m.id}" 
                                    title="Edit Machinery">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button type="button" 
                                    class="btn-action-icon btn-action-delete btn-delete-machinery" 
                                    data-id="${m.id}" 
                                    title="Delete Machinery">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;

            $tableBody.append(rowHtml);
        });

        // Summary text in footer
        if (currentTotalCount === 0) {
            $tableCountSummary.text('Showing 0 to 0 of 0 entries');
        } else {
            const fromCount = (currentPageNumber - 1) * currentPageSize + 1;
            const toCount = Math.min(currentPageNumber * currentPageSize, currentTotalCount);
            $tableCountSummary.text(`Showing ${fromCount} to ${toCount} of ${currentTotalCount} entries`);
        }
    }

    // 5. Render Pagination Controls
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
                    <i class="bi bi-chevron-left"></i>
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
                $paginationUl.append(`<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`);
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
                $paginationUl.append(`<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`);
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

    // 6. Pagination Clicks
    $(document).on('click', '.page-num-btn', function () {
        const page = parseInt($(this).data('page'));
        if (page && page !== currentPageNumber) {
            currentPageNumber = page;
            loadMachineries();
        }
    });

    $(document).on('click', '#btnPagePrev', function () {
        if (currentPageNumber > 1) {
            currentPageNumber--;
            loadMachineries();
        }
    });

    $(document).on('click', '#btnPageNext', function () {
        if (currentPageNumber < currentTotalPages) {
            currentPageNumber++;
            loadMachineries();
        }
    });

    // 7. Search & Filter Handlers
    function executeSearch() {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        currentSearchTerm = $searchInput.val().trim();
        currentPageNumber = 1;
        loadMachineries();
    }

    $btnSearchSubmit.on('click', function () {
        executeSearch();
    });

    $searchInput.on('input', function () {
        const val = $(this).val().trim();
        if (val.length > 0) {
            $searchClearBtn.show();
        } else {
            $searchClearBtn.hide();
        }

        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
            currentSearchTerm = val;
            currentPageNumber = 1;
            loadMachineries();
        }, 350);
    });

    $searchInput.on('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            executeSearch();
        }
    });

    $searchClearBtn.on('click', function () {
        $searchInput.val('');
        $(this).hide();
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        if (currentSearchTerm !== '') {
            currentSearchTerm = '';
            currentPageNumber = 1;
            loadMachineries();
        }
    });

    $btnResetFilters.on('click', function () {
        $searchInput.val('');
        $searchClearBtn.hide();
        $pageSizeFilter.val('10');
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        currentSearchTerm = '';
        currentPageSize = 10;
        currentPageNumber = 1;
        loadMachineries();
    });

    $pageSizeFilter.on('change', function () {
        currentPageSize = parseInt($(this).val()) || 10;
        currentPageNumber = 1;
        loadMachineries();
    });

    $btnRetry.on('click', function () {
        loadMachineries();
    });

    // 8. Category Autocomplete Search Box (Uses API: /api/MachineryCategory/GetByName/{name})
    let categorySearchTimer = null;

    function setupCategorySearch($input, $hiddenId, $dropdown) {
        function searchCategories(term) {
            const token = getAuthToken();
            const headers = { 'Accept': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const url = (term && term.trim() !== '') 
                ? `${CATEGORY_BY_NAME_URL}/${encodeURIComponent(term.trim())}`
                : CATEGORY_DISPLAY_URL;

            $dropdown.html('<div class="category-autocomplete-empty"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Searching categories...</div>').show();

            $.ajax({
                url: url,
                type: 'GET',
                headers: headers,
                dataType: 'json',
                success: function (res) {
                    let items = [];
                    if (res && res.succeeded !== false && res.data) {
                        items = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.items) ? res.data.items : []);
                    } else if (Array.isArray(res)) {
                        items = res;
                    }

                    if (items.length === 0) {
                        $dropdown.html('<div class="category-autocomplete-empty">No matching categories found</div>').show();
                        return;
                    }

                    let html = '';
                    items.forEach(function (cat) {
                        const isCurrent = ($hiddenId.val() == cat.id);
                        html += `
                            <div class="category-autocomplete-item ${isCurrent ? 'selected' : ''}" 
                                 data-id="${cat.id}" 
                                 data-name="${escapeHtml(cat.name)}">
                                <span><i class="bi bi-tag me-2 text-primary"></i>${escapeHtml(cat.name)}</span>
                                <span class="badge bg-light text-muted border">#${cat.id}</span>
                            </div>
                        `;
                    });

                    activeIndex = -1;
                    $dropdown.html(html).show();
                },
                error: function () {
                    activeIndex = -1;
                    $dropdown.html('<div class="category-autocomplete-empty text-danger">Failed to load categories</div>').show();
                }
            });
        }

        let activeIndex = -1;

        function getDropdownItems() {
            return $dropdown.find('.category-autocomplete-item');
        }

        function highlightItem($items, newIndex) {
            $items.removeClass('keyboard-active');
            if (newIndex >= 0 && newIndex < $items.length) {
                activeIndex = newIndex;
                const el = $items.eq(activeIndex).addClass('keyboard-active')[0];
                if (el && el.scrollIntoView) {
                    el.scrollIntoView({ block: 'nearest' });
                }
            } else {
                activeIndex = -1;
            }
        }

        function selectItem($item) {
            if (!$item || !$item.length) return;
            const id = $item.data('id');
            const name = $item.data('name');
            $hiddenId.val(id);
            $input.val(name);
            activeIndex = -1;
            $dropdown.hide();
        }

        $input.on('focus', function () {
            const val = $(this).val().trim();
            searchCategories(val);
        });

        $input.on('input', function () {
            const val = $(this).val().trim();
            $hiddenId.val(''); // Clear ID until user picks an option
            activeIndex = -1;
            if (categorySearchTimer) clearTimeout(categorySearchTimer);
            categorySearchTimer = setTimeout(function () {
                searchCategories(val);
            }, 300);
        });

        $input.on('keydown', function (e) {
            const isVisible = $dropdown.is(':visible');
            const $items = getDropdownItems();

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!isVisible) {
                    searchCategories($(this).val().trim());
                    return;
                }
                if (!$items.length) return;
                const next = activeIndex < $items.length - 1 ? activeIndex + 1 : 0;
                highlightItem($items, next);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!isVisible || !$items.length) return;
                const prev = activeIndex > 0 ? activeIndex - 1 : $items.length - 1;
                highlightItem($items, prev);
            } else if (e.key === 'Enter') {
                if (isVisible && activeIndex >= 0 && $items.eq(activeIndex).length) {
                    e.preventDefault();
                    selectItem($items.eq(activeIndex));
                }
            } else if (e.key === 'Escape') {
                activeIndex = -1;
                $dropdown.hide();
            }
        });

        $dropdown.on('click', '.category-autocomplete-item', function () {
            selectItem($(this));
        });

        // Hide dropdown on outside click
        $(document).on('click', function (e) {
            if (!$(e.target).closest($input.parent().parent()).length) {
                activeIndex = -1;
                $dropdown.hide();
            }
        });
    }

    setupCategorySearch($createCategorySearchInput, $createMachineryCategoryId, $createCategoryDropdown);
    setupCategorySearch($editCategorySearchInput, $editMachineryCategoryId, $editCategoryDropdown);

    // 9. Create Machinery Handlers
    $btnOpenCreate.on('click', function () {
        $createAlert.addClass('d-none').text('');
        $createForm[0].reset();
        $createMachineryCategoryId.val('0');
        $createDisplayOrder.val('1');
        selectedCreateFile = null;
        $createFileInput.val('');
        $createDropzonePrompt.removeClass('d-none');
        $createDropzonePreview.addClass('d-none');
        $createDropzone.removeClass('has-preview');
        $createPreviewImg.attr('src', '');

        if (createModalInstance) {
            createModalInstance.show();
        }
    });

    // File Drag & Drop for Create
    $createFileInput.on('change', function () {
        if (this.files && this.files[0]) {
            handleCreateFileSelect(this.files[0]);
        }
    });

    function handleCreateFileSelect(file) {
        if (!file) return;

        // Validation (Max 1MB, allowed extensions)
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(file.type.toLowerCase())) {
            $createAlert.removeClass('d-none').text('Please upload a valid image file (JPG, PNG, WebP).');
            return;
        }

        if (file.size > 1024 * 1024) {
            $createAlert.removeClass('d-none').text('Image file size must not exceed 1 MB.');
            return;
        }

        $createAlert.addClass('d-none').text('');
        selectedCreateFile = file;

        const reader = new FileReader();
        reader.onload = function (e) {
            $createPreviewImg.attr('src', e.target.result);
            $createDropzonePrompt.addClass('d-none');
            $createDropzonePreview.removeClass('d-none');
            $createDropzone.addClass('has-preview');
        };
        reader.readAsDataURL(file);
    }

    $btnChangeCreateImage.on('click', function () {
        $createFileInput.click();
    });

    $btnRemoveCreateImage.on('click', function () {
        selectedCreateFile = null;
        $createFileInput.val('');
        $createPreviewImg.attr('src', '');
        $createDropzonePrompt.removeClass('d-none');
        $createDropzonePreview.addClass('d-none');
        $createDropzone.removeClass('has-preview');
    });

    $createForm.on('submit', function (e) {
        e.preventDefault();
        $createAlert.addClass('d-none').text('');

        const title = $createTitle.val().trim();
        const categoryId = parseInt($createMachineryCategoryId.val()) || 0;
        const displayOrder = parseInt($createDisplayOrder.val()) || 0;
        const cardBadge = $createCardBadge.val().trim();
        const description = $createDescription.val().trim();

        if (!title) {
            $createAlert.removeClass('d-none').text('Machinery title is required.');
            $createTitle.focus();
            return;
        }

        if (categoryId <= 0) {
            $createAlert.removeClass('d-none').text('Please search and select a valid machinery category.');
            $createCategorySearchInput.focus();
            return;
        }

        if (!selectedCreateFile) {
            $createAlert.removeClass('d-none').text('Please upload a machinery photo.');
            return;
        }

        $btnSubmitCreate.prop('disabled', true);
        $btnSubmitCreateText.text('Saving...');

        const formData = new FormData();
        formData.append('Title', title);
        formData.append('MachineryCategoryId', categoryId);
        formData.append('CardBadge', cardBadge);
        formData.append('DisplayOrder', displayOrder);
        formData.append('Description', description);
        formData.append('Image', selectedCreateFile);

        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        $.ajax({
            url: BASE_MACHINERY_URL,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: headers,
            dataType: 'json',
            success: function (res) {
                if (createModalInstance) {
                    createModalInstance.hide();
                }
                const successMsg = (res && res.message) ? res.message : 'Machinery created successfully.';
                showToast(successMsg, true);
                loadMachineries();
            },
            error: function (xhr) {
                let errorMsg = 'Failed to create machinery.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                } else if (xhr.responseJSON && xhr.responseJSON.errors) {
                    const firstKey = Object.keys(xhr.responseJSON.errors)[0];
                    errorMsg = xhr.responseJSON.errors[firstKey][0] || errorMsg;
                }
                $createAlert.removeClass('d-none').text(errorMsg);
            },
            complete: function () {
                $btnSubmitCreate.prop('disabled', false);
                $btnSubmitCreateText.text('Save Machinery');
            }
        });
    });

    // 10. Edit Machinery Handlers
    function openEditModal(id) {
        const m = allFetchedMachineries.find(item => item.id == id);
        if (!m) return;

        $editAlert.addClass('d-none').text('');
        $editId.val(m.id);
        $editTitle.val(m.title || '');
        $editCardBadge.val(m.cardBadge || '');
        $editDisplayOrder.val(m.displayOrder != null ? m.displayOrder : 0);
        $editDescription.val(m.description || '');
        $editCategorySearchInput.val(m.machineryCategoryName || '');
        $editMachineryCategoryId.val(m.machineryCategoryId || 0);

        selectedEditFile = null;
        $editFileInput.val('');
        $editPreviewImg.attr('src', resolveImageUrl(m.imagePath));

        if (editModalInstance) {
            editModalInstance.show();
        }
    }

    $(document).on('click', '.btn-edit-machinery', function () {
        const id = $(this).data('id');
        openEditModal(id);
    });

    $editFileInput.on('change', function () {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
            if (!validTypes.includes(file.type.toLowerCase())) {
                $editAlert.removeClass('d-none').text('Please upload a valid image file (JPG, PNG, WebP).');
                return;
            }

            if (file.size > 1024 * 1024) {
                $editAlert.removeClass('d-none').text('Image file size must not exceed 1 MB.');
                return;
            }

            $editAlert.addClass('d-none').text('');
            selectedEditFile = file;

            const reader = new FileReader();
            reader.onload = function (e) {
                $editPreviewImg.attr('src', e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    $btnChangeEditImage.on('click', function () {
        $editFileInput.click();
    });

    $editForm.on('submit', function (e) {
        e.preventDefault();
        $editAlert.addClass('d-none').text('');

        const id = parseInt($editId.val());
        const title = $editTitle.val().trim();
        const categoryId = parseInt($editMachineryCategoryId.val()) || 0;
        const displayOrder = parseInt($editDisplayOrder.val()) || 0;
        const cardBadge = $editCardBadge.val().trim();
        const description = $editDescription.val().trim();

        if (!title) {
            $editAlert.removeClass('d-none').text('Machinery title is required.');
            $editTitle.focus();
            return;
        }

        if (categoryId <= 0) {
            $editAlert.removeClass('d-none').text('Please search and select a valid machinery category.');
            $editCategorySearchInput.focus();
            return;
        }

        $btnSubmitEdit.prop('disabled', true);
        $btnSubmitEditText.text('Updating...');

        const formData = new FormData();
        formData.append('Id', id);
        formData.append('Title', title);
        formData.append('MachineryCategoryId', categoryId);
        formData.append('CardBadge', cardBadge);
        formData.append('DisplayOrder', displayOrder);
        formData.append('Description', description);
        if (selectedEditFile) {
            formData.append('Image', selectedEditFile);
        }

        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        $.ajax({
            url: BASE_MACHINERY_URL,
            type: 'PUT',
            data: formData,
            processData: false,
            contentType: false,
            headers: headers,
            dataType: 'json',
            success: function (res) {
                if (editModalInstance) {
                    editModalInstance.hide();
                }
                const successMsg = (res && res.message) ? res.message : 'Machinery updated successfully.';
                showToast(successMsg, true);
                loadMachineries();
            },
            error: function (xhr) {
                let errorMsg = 'Failed to update machinery.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                } else if (xhr.responseJSON && xhr.responseJSON.errors) {
                    const firstKey = Object.keys(xhr.responseJSON.errors)[0];
                    errorMsg = xhr.responseJSON.errors[firstKey][0] || errorMsg;
                }
                $editAlert.removeClass('d-none').text(errorMsg);
            },
            complete: function () {
                $btnSubmitEdit.prop('disabled', false);
                $btnSubmitEditText.text('Update Machinery');
            }
        });
    });

    // 11. View Details
    $(document).on('click', '.btn-view-machinery', function () {
        const id = $(this).data('id');
        const m = allFetchedMachineries.find(item => item.id == id);
        if (!m) return;

        currentViewingMachinery = m;

        $('#viewMachineryBadgeId').text(`#${m.id}`);
        $('#viewMachineryTitle').text(m.title || '—');
        $('#viewMachineryCategoryText').text(m.machineryCategoryName || 'Uncategorized');
        $('#viewMachineryDescription').text(m.description || 'No description provided.');
        $('#viewMachineryDisplayOrder').text(m.displayOrder != null ? m.displayOrder : 0);
        $('#viewMachineryImg').attr('src', resolveImageUrl(m.imagePath));

        if (m.cardBadge) {
            $('#viewMachineryCardBadge').text(m.cardBadge).show();
        } else {
            $('#viewMachineryCardBadge').hide();
        }

        if (viewModalInstance) {
            viewModalInstance.show();
        }
    });

    $btnEditFromView.on('click', function () {
        if (!currentViewingMachinery) return;
        if (viewModalInstance) {
            viewModalInstance.hide();
        }
        openEditModal(currentViewingMachinery.id);
    });

    // 12. Delete Machinery Handlers
    $(document).on('click', '.btn-delete-machinery', function () {
        const id = $(this).data('id');
        const m = allFetchedMachineries.find(item => item.id == id);
        if (!m) return;

        pendingDeleteMachineryId = id;
        $('#deleteMachineryTargetName').text(m.title || 'Unnamed Machinery');
        $('#deleteMachineryTargetId').text(`#${m.id}`);
        $('#deleteMachineryTargetImg').attr('src', resolveImageUrl(m.imagePath));

        if (deleteModalInstance) {
            deleteModalInstance.show();
        }
    });

    $btnConfirmDelete.on('click', function () {
        if (!pendingDeleteMachineryId) return;

        $btnConfirmDelete.prop('disabled', true);
        $btnConfirmDeleteText.text('Deleting...');

        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        $.ajax({
            url: `${BASE_MACHINERY_URL}/${pendingDeleteMachineryId}`,
            type: 'DELETE',
            headers: headers,
            dataType: 'json',
            success: function (res) {
                if (deleteModalInstance) {
                    deleteModalInstance.hide();
                }

                // If API returned failure flag in payload
                if (res && res.succeeded === false) {
                    const errorMsg = res.message || 'Failed to delete machinery.';
                    showToast(errorMsg, false);
                    return;
                }

                // Message directly from API response
                const successMsg = (res && res.message) ? res.message : 'Machinery deleted successfully.';
                showToast(successMsg, true);
                loadMachineries();
            },
            error: function (xhr) {
                let errorMsg = 'Failed to delete machinery.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                } else if (xhr.responseText) {
                    try {
                        const parsed = JSON.parse(xhr.responseText);
                        if (parsed.message) errorMsg = parsed.message;
                    } catch (e) {}
                }
                showToast(errorMsg, false);
            },
            complete: function () {
                $btnConfirmDelete.prop('disabled', false);
                $btnConfirmDeleteText.text('Delete Machinery');
                pendingDeleteMachineryId = null;
            }
        });
    });

    // 13. Initialize on Page Load
    loadMachineries();
});

