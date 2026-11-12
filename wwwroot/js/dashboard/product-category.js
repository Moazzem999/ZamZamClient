/**
 * ZamZam Trims (BD) Limited - Product Category Management (product-category.js)
 * ------------------------------------------------------------------------
 * Handles fetching, searching, pagination, viewing, creating, editing, and deleting product categories.
 * API Endpoints:
 *   GET    {ApiBaseUrl}/api/ProductCategory/GetAll?SearchTerm={term}&PageNumber={page}&PageSize={size}
 *   GET    {ApiBaseUrl}/api/ProductCategory/GetById/{id}
 *   POST   {ApiBaseUrl}/api/ProductCategory
 *   PUT    {ApiBaseUrl}/api/ProductCategory
 *   DELETE {ApiBaseUrl}/api/ProductCategory/{id}
 */

$(function () {
    'use strict';

    // 1. Configuration & DOM Elements
    const $container = $('#productCategoryPageContainer');
    let apiBaseUrl = ($container.data('api-base-url') || 'https://localhost:7148').replace(/\/+$/, '');

    // Mixed content safeguard
    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace('http://localhost:', 'https://localhost:');
    }

    const GET_ALL_URL = `${apiBaseUrl}/api/ProductCategory/GetAll`;
    const BASE_CATEGORY_URL = `${apiBaseUrl}/api/ProductCategory`;

    // Table & States
    const $table = $('#categoriesTable');
    const $tableBody = $('#categoriesTableBody');
    const $emptyState = $('#tableEmptyState');
    const $loadingState = $('#tableLoadingState');
    const $noResultsState = $('#tableNoResultsState');
    const $errorState = $('#tableErrorState');
    const $errorMessageText = $('#errorMessageText');
    const $tableCountSummary = $('#tableCountSummary');
    const $paginationNav = $('#categoriesPaginationNav');
    const $paginationUl = $('#categoriesPaginationUl');

    // Controls
    const $searchInput = $('#searchCategoryInput');
    const $searchClearBtn = $('#searchClearBtn');
    const $btnSearchSubmit = $('#btnSearchSubmit');
    const $pageSizeFilter = $('#filterPageSize');
    const $btnResetFilters = $('#btnResetFilters');
    const $btnRetry = $('#btnRetryCategories');

    // Modals
    const $createModalEl = $('#createCategoryModal');
    let createModalInstance = null;
    if ($createModalEl.length && typeof bootstrap !== 'undefined') {
        createModalInstance = new bootstrap.Modal($createModalEl[0]);
    }

    const $editModalEl = $('#editCategoryModal');
    let editModalInstance = null;
    if ($editModalEl.length && typeof bootstrap !== 'undefined') {
        editModalInstance = new bootstrap.Modal($editModalEl[0]);
    }

    const $viewModalEl = $('#viewCategoryModal');
    let viewModalInstance = null;
    if ($viewModalEl.length && typeof bootstrap !== 'undefined') {
        viewModalInstance = new bootstrap.Modal($viewModalEl[0]);
    }

    const $deleteModalEl = $('#deleteCategoryModal');
    let deleteModalInstance = null;
    if ($deleteModalEl.length && typeof bootstrap !== 'undefined') {
        deleteModalInstance = new bootstrap.Modal($deleteModalEl[0]);
    }

    // Forms & Action Elements
    const $btnOpenCreate = $('#btnOpenCreateCategoryModal');
    const $createForm = $('#createCategoryForm');
    const $createAlert = $('#createCategoryAlert');
    const $createName = $('#createCategoryName');
    const $createDisplayOrder = $('#createCategoryDisplayOrder');
    const $btnSubmitCreate = $('#btnSubmitCreateCategory');
    const $btnSubmitCreateText = $('#btnSubmitCreateText');

    const $editForm = $('#editCategoryForm');
    const $editAlert = $('#editCategoryAlert');
    const $editId = $('#editCategoryId');
    const $editName = $('#editCategoryName');
    const $editDisplayOrder = $('#editCategoryDisplayOrder');
    const $btnSubmitEdit = $('#btnSubmitEditCategory');
    const $btnSubmitEditText = $('#btnSubmitEditText');

    const $btnConfirmDelete = $('#btnConfirmDeleteCategory');
    const $btnConfirmDeleteText = $('#btnConfirmDeleteText');
    const $btnEditFromView = $('#btnEditFromView');

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
    let allFetchedCategories = [];
    let currentTotalCount = 0;
    let currentTotalPages = 1;
    let hasPreviousPage = false;
    let hasNextPage = false;
    let isFetching = false;
    let pendingDeleteCategoryId = null;
    let currentViewingCategory = null;

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

    // 3. Load Categories from API
    function loadCategories() {
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

        console.log(`[ProductCategory] Fetching: ${GET_ALL_URL}`, queryParams);

        $.ajax({
            url: GET_ALL_URL,
            type: 'GET',
            data: queryParams,
            dataType: 'json',
            headers: headers,
            cache: false,
            timeout: 15000,
            success: function (response) {
                console.log('[ProductCategory] Response:', response);

                if (response && response.succeeded !== false && response.data) {
                    const dataObj = response.data;
                    const items = Array.isArray(dataObj.items) ? dataObj.items : (Array.isArray(dataObj) ? dataObj : []);

                    allFetchedCategories = items;
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
                        renderCategoriesTable(items);
                        renderPaginationControls();
                    }
                } else if (Array.isArray(response)) {
                    allFetchedCategories = response;
                    currentTotalCount = response.length;
                    currentTotalPages = Math.max(1, Math.ceil(currentTotalCount / currentPageSize));
                    hasPreviousPage = currentPageNumber > 1;
                    hasNextPage = currentPageNumber < currentTotalPages;

                    if (response.length === 0) {
                        showState(currentSearchTerm ? 'no-results' : 'empty');
                        $tableCountSummary.text('Showing 0 to 0 of 0 entries');
                    } else {
                        showState('normal');
                        renderCategoriesTable(response);
                        renderPaginationControls();
                    }
                } else {
                    showState('empty');
                    $tableCountSummary.text('Showing 0 to 0 of 0 entries');
                }
            },
            error: function (xhr, status, error) {
                console.error('[ProductCategory] Load error:', status, error, xhr);
                let msg = 'Failed to fetch categories from the server. Please verify your connection or API status.';
                if (xhr.status === 401) {
                    msg = 'Session expired or unauthorized. Please re-login to access product categories.';
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
    function renderCategoriesTable(items) {
        $tableBody.empty();

        items.forEach(function (cat) {
            const safeName = escapeHtml(cat.name || 'Unnamed Category');
            const displayOrder = cat.displayOrder != null ? cat.displayOrder : 0;

            const rowHtml = `
                <tr data-id="${cat.id}">
                    <td>
                        <span class="category-id-pill">#${cat.id}</span>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="category-icon-avatar">
                                <i class="bi bi-box-seam-fill"></i>
                            </div>
                            <div>
                                <h6 class="category-name-text mb-0">${safeName}</h6>
                            </div>
                        </div>
                    </td>
                    <td class="text-center fw-medium text-dark">
                        ${displayOrder}
                    </td>
                    <td class="text-end">
                        <div class="category-actions-group">
                            <button type="button" 
                                    class="btn-action-icon btn-action-view btn-view-category" 
                                    data-id="${cat.id}" 
                                    title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button type="button" 
                                    class="btn-action-icon btn-action-edit btn-edit-category" 
                                    data-id="${cat.id}" 
                                    title="Edit Category">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button type="button" 
                                    class="btn-action-icon btn-action-delete btn-delete-category" 
                                    data-id="${cat.id}" 
                                    title="Delete Category">
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
            loadCategories();
        }
    });

    $(document).on('click', '#btnPagePrev', function () {
        if (currentPageNumber > 1) {
            currentPageNumber--;
            loadCategories();
        }
    });

    $(document).on('click', '#btnPageNext', function () {
        if (currentPageNumber < currentTotalPages) {
            currentPageNumber++;
            loadCategories();
        }
    });

    // 7. Search & Filter Handlers
    function executeSearch() {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        currentSearchTerm = $searchInput.val().trim();
        currentPageNumber = 1;
        loadCategories();
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
            loadCategories();
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
            loadCategories();
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
        loadCategories();
    });

    $pageSizeFilter.on('change', function () {
        currentPageSize = parseInt($(this).val()) || 10;
        currentPageNumber = 1;
        loadCategories();
    });

    $btnRetry.on('click', function () {
        loadCategories();
    });

    // 8. Create Category
    $btnOpenCreate.on('click', function () {
        $createAlert.addClass('d-none').text('');
        $createForm[0].reset();
        $createDisplayOrder.val('1');
        if (createModalInstance) {
            createModalInstance.show();
        }
    });

    $createForm.on('submit', function (e) {
        e.preventDefault();
        $createAlert.addClass('d-none').text('');

        const name = $createName.val().trim();
        const displayOrder = parseInt($createDisplayOrder.val()) || 0;

        if (!name) {
            $createAlert.removeClass('d-none').text('Please enter a category name.');
            $createName.focus();
            return;
        }

        if (name.length > 50) {
            $createAlert.removeClass('d-none').text('Category name cannot exceed 50 characters.');
            $createName.focus();
            return;
        }

        $btnSubmitCreate.prop('disabled', true);
        $btnSubmitCreateText.text('Saving...');

        const token = getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const payload = {
            name: name,
            displayOrder: displayOrder
        };

        $.ajax({
            url: BASE_CATEGORY_URL,
            type: 'POST',
            data: JSON.stringify(payload),
            headers: headers,
            dataType: 'json',
            success: function (res) {
                if (createModalInstance) {
                    createModalInstance.hide();
                }
                const successMsg = (res && res.message) ? res.message : 'Product category created successfully.';
                showToast(successMsg, true);
                loadCategories();
            },
            error: function (xhr) {
                let errorMsg = 'Failed to create product category.';
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
                $btnSubmitCreateText.text('Save Category');
            }
        });
    });

    // 9. View Details
    $(document).on('click', '.btn-view-category', function () {
        const id = $(this).data('id');
        const cat = allFetchedCategories.find(c => c.id == id);
        if (!cat) return;

        currentViewingCategory = cat;

        $('#viewCategoryBadgeId').text(`#${cat.id}`);
        $('#viewCategoryName').text(cat.name || '—');
        $('#viewCategoryDisplayOrder').text(cat.displayOrder != null ? cat.displayOrder : 0);

        if (viewModalInstance) {
            viewModalInstance.show();
        }
    });

    $btnEditFromView.on('click', function () {
        if (!currentViewingCategory) return;
        if (viewModalInstance) {
            viewModalInstance.hide();
        }
        openEditModal(currentViewingCategory.id);
    });

    // 10. Edit Category
    function openEditModal(id) {
        const cat = allFetchedCategories.find(c => c.id == id);
        if (!cat) return;

        $editAlert.addClass('d-none').text('');
        $editId.val(cat.id);
        $editName.val(cat.name || '');
        $editDisplayOrder.val(cat.displayOrder != null ? cat.displayOrder : 0);

        if (editModalInstance) {
            editModalInstance.show();
        }
    }

    $(document).on('click', '.btn-edit-category', function () {
        const id = $(this).data('id');
        openEditModal(id);
    });

    $editForm.on('submit', function (e) {
        e.preventDefault();
        $editAlert.addClass('d-none').text('');

        const id = parseInt($editId.val());
        const name = $editName.val().trim();
        const displayOrder = parseInt($editDisplayOrder.val()) || 0;

        if (!name) {
            $editAlert.removeClass('d-none').text('Please enter a category name.');
            $editName.focus();
            return;
        }

        if (name.length > 50) {
            $editAlert.removeClass('d-none').text('Category name cannot exceed 50 characters.');
            $editName.focus();
            return;
        }

        $btnSubmitEdit.prop('disabled', true);
        $btnSubmitEditText.text('Updating...');

        const token = getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const payload = {
            id: id,
            name: name,
            displayOrder: displayOrder
        };

        $.ajax({
            url: BASE_CATEGORY_URL,
            type: 'PUT',
            data: JSON.stringify(payload),
            headers: headers,
            dataType: 'json',
            success: function (res) {
                if (editModalInstance) {
                    editModalInstance.hide();
                }
                const successMsg = (res && res.message) ? res.message : 'Product category updated successfully.';
                showToast(successMsg, true);
                loadCategories();
            },
            error: function (xhr) {
                let errorMsg = 'Failed to update product category.';
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
                $btnSubmitEditText.text('Update Category');
            }
        });
    });

    // 11. Delete Category
    $(document).on('click', '.btn-delete-category', function () {
        const id = $(this).data('id');
        const cat = allFetchedCategories.find(c => c.id == id);
        if (!cat) return;

        pendingDeleteCategoryId = id;
        $('#deleteCategoryTargetName').text(cat.name || 'Unnamed Category');
        $('#deleteCategoryTargetId').text(`#${cat.id}`);

        if (deleteModalInstance) {
            deleteModalInstance.show();
        }
    });

    $btnConfirmDelete.on('click', function () {
        if (!pendingDeleteCategoryId) return;

        $btnConfirmDelete.prop('disabled', true);
        $btnConfirmDeleteText.text('Deleting...');

        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        $.ajax({
            url: `${BASE_CATEGORY_URL}/${pendingDeleteCategoryId}`,
            type: 'DELETE',
            headers: headers,
            dataType: 'json',
            success: function (res) {
                if (deleteModalInstance) {
                    deleteModalInstance.hide();
                }

                // If API returned failure flag in payload
                if (res && res.succeeded === false) {
                    const errorMsg = res.message || 'Failed to delete product category.';
                    showToast(errorMsg, false);
                    return;
                }

                // Message directly from API response
                const successMsg = (res && res.message) ? res.message : 'Product category deleted successfully.';
                showToast(successMsg, true);
                loadCategories();
            },
            error: function (xhr) {
                let errorMsg = 'Failed to delete product category.';
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
                $btnConfirmDeleteText.text('Delete Category');
                pendingDeleteCategoryId = null;
            }
        });
    });

    // 12. Initialize on Page Load
    loadCategories();
});

