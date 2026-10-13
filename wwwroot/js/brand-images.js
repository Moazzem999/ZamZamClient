/**
 * ZamZam Trims (BD) Limited - Brand Images Manager (brand-images.js)
 * -------------------------------------------------------------------
 * Fetches, searches, previews, and deletes brand images from:
 * {ApiBaseUrl}/api/BrandImages/GetAll
 * {ApiBaseUrl}/api/BrandImages/{id} (DELETE)
 */

$(function () {
    'use strict';

    // 0. Force cleanup of any lingering cached elements & synchronize thead structure
    // Removes old stat badges container if still served by in-memory Razor cache
    $('#totalImagesBadge').closest('.d-inline-flex').remove();
    // Removes old status dropdown container if still served by in-memory Razor cache
    $('#statusFilterSelect').closest('div').remove();

    // Enforce exact 5 columns in thead so it NEVER desyncs with tbody
    const $tableHead = $('#brandImagesTable thead');
    if ($tableHead.length) {
        $tableHead.html(`
            <tr>
                <th style="width: 80px;" class="text-center"># ID</th>
                <th style="width: 90px;" class="text-center">Preview</th>
                <th style="width: 28%;">Name / Title</th>
                <th>Remarks</th>
                <th style="width: 130px;" class="text-end">Actions</th>
            </tr>
        `);
    }

    // Modern Delete Modal HTML template
    const modernDeleteModalHtml = `
        <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-labelledby="deleteModalTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" style="max-width: 440px;">
                <div class="modal-content modern-delete-modal-content border-0">
                    <button type="button" class="modal-close-bubble" data-bs-dismiss="modal" aria-label="Close" title="Cancel">
                        <i class="bi bi-x-lg"></i>
                    </button>
                    <div class="text-center">
                        <div class="delete-icon-spotlight">
                            <div class="delete-pulse-ring"></div>
                            <div class="delete-pulse-ring-inner"></div>
                            <div class="delete-icon-bubble">
                                <i class="bi bi-trash3-fill"></i>
                            </div>
                        </div>
                        <h4 class="delete-modal-heading" id="deleteModalTitle">Delete Brand Image?</h4>
                        <p class="delete-modal-subtext">
                            You are about to permanently remove this image from the gallery.
                        </p>
                        <div class="delete-target-preview-card">
                            <img id="deleteTargetThumb" src="" alt="Thumbnail" class="delete-target-thumb" onerror="this.src='/images/logo-icon.png'" />
                            <div class="delete-target-info">
                                <div class="delete-target-badge"><span id="deleteTargetId">#00</span></div>
                                <div class="delete-target-title" id="deleteTargetName">Loading...</div>
                                <div class="delete-target-desc" id="deleteTargetRemarks">—</div>
                            </div>
                        </div>
                        <div class="delete-warning-pill">
                            <i class="bi bi-exclamation-triangle-fill"></i>
                            <span>This action is permanent and cannot be undone</span>
                        </div>
                        <div class="delete-modal-actions">
                            <button type="button" class="btn-modal-cancel" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button type="button" class="btn-modal-delete" id="btnConfirmDelete">
                                <i class="bi bi-trash3-fill"></i>
                                <span id="btnConfirmDeleteText">Delete Image</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Ensure the modern delete modal is ALWAYS in the DOM
    function ensureDeleteModalInDom() {
        let modalEl = document.getElementById('deleteConfirmModal');
        if (!modalEl) {
            $('body').append(modernDeleteModalHtml);
            modalEl = document.getElementById('deleteConfirmModal');
        } else if (!$(modalEl).find('.modern-delete-modal-content').length) {
            $(modalEl).remove();
            $('body').append(modernDeleteModalHtml);
            modalEl = document.getElementById('deleteConfirmModal');
        }
        return modalEl;
    }

    // Run immediately on page load
    ensureDeleteModalInDom();

    // 1. DOM Elements & References
    const $container = $('#brandImagesPageContainer');
    const $tableBody = $('#brandImagesTableBody');
    const $loadingState = $('#tableLoadingState');
    const $emptyState = $('#tableEmptyState');
    const $errorState = $('#tableErrorState');
    const $noResultsState = $('#tableNoResultsState');
    const $errorMessageText = $('#errorMessageText');
    const $refreshBtn = $('#btnRefreshBrandImages');
    const $retryBtn = $('#btnRetryBrandImages');
    const $searchInput = $('#searchBrandImagesInput');
    const $searchClearBtn = $('#searchClearBtn');
    const $tableCountSummary = $('#tableCountSummary');
    const $toast = $('#dashToast');
    const $toastMessage = $('#dashToastMessage');

    // Lightbox Modal Elements
    const modalElement = document.getElementById('brandImageDetailModal');
    const imageModal = modalElement ? new bootstrap.Modal(modalElement) : null;
    const $modalImg = $('#modalPreviewImage');
    const $modalTitle = $('#modalImageTitle');
    const $modalRemarks = $('#modalImageRemarks');
    const $modalOpenBtn = $('#modalOpenNewTabBtn');

    let pendingDeleteId = null;

    // 2. Configuration & State
    const rawApiBaseUrl = $container.data('api-base-url') || 'https://localhost:7148';
    const apiBaseUrl = rawApiBaseUrl.toString().replace(/\/+$/, '');
    const GET_ALL_API_URL = `${apiBaseUrl}/api/BrandImages/GetAll`;

    let allBrandImages = [];
    let currentFilteredImages = [];
    let isFetching = false;

    // Helper: Escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper: Construct full absolute image URL
    function getFullImageUrl(imagePath) {
        if (!imagePath) return '';
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        const cleanedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        return `${apiBaseUrl}${cleanedPath}`;
    }

    // Helper: Retrieve JWT Token from localStorage or Cookies
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

    // Helper: Toast Notification
    let toastTimeout = null;
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

    // Helper: Image Error Fallback Handler
    window.handleBrandImgError = function (imgElement) {
        const $wrapper = $(imgElement).closest('.brand-thumb-wrapper');
        $(imgElement).remove();
        $wrapper.html('<div class="brand-thumb-fallback" title="Image unavailable"><i class="bi bi-image"></i></div>');
    };

    // 3. Fetch Data from API
    function fetchBrandImages() {
        if (isFetching) return;
        isFetching = true;

        // UI Loading States
        $loadingState.removeClass('d-none');
        $emptyState.addClass('d-none');
        $errorState.addClass('d-none');
        $noResultsState.addClass('d-none');
        $tableBody.empty();

        $refreshBtn.prop('disabled', true);
        $refreshBtn.find('.refresh-icon').addClass('spin-animation');

        const token = getAuthToken();
        const ajaxHeaders = {
            'Accept': 'application/json'
        };
        if (token) {
            ajaxHeaders['Authorization'] = `Bearer ${token}`;
        }

        console.log(`[BrandImages] Fetching from: ${GET_ALL_API_URL}`);

        $.ajax({
            url: GET_ALL_API_URL,
            type: 'GET',
            dataType: 'json',
            headers: ajaxHeaders,
            cache: false,
            timeout: 15000,
            success: function (response) {
                console.log('[BrandImages] API Response:', response);

                if (response && (response.succeeded === true || response.statusCode === 200 || Array.isArray(response.data))) {
                    allBrandImages = Array.isArray(response.data) ? response.data : [];
                    applyFilterAndRender();
                } else {
                    const msg = response?.message || 'Unexpected response format received from server.';
                    showError(msg);
                }
            },
            error: function (xhr, status, error) {
                console.error('[BrandImages] Fetch error:', status, error, xhr);

                if (xhr.status === 401) {
                    showError('Session expired or unauthorized (401). Please sign in again.');
                    setTimeout(function () {
                        window.location.href = '/Account/Login';
                    }, 2000);
                    return;
                }

                let errorMsg = `Unable to connect to the Brand Images API at: ${GET_ALL_API_URL}. Please ensure the server is online.`;
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                } else if (xhr.statusText && xhr.statusText !== 'error') {
                    errorMsg = `Server error (${xhr.status}): ${xhr.statusText}`;
                }

                showError(errorMsg);
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
        $loadingState.addClass('d-none');
        $emptyState.addClass('d-none');
        $noResultsState.addClass('d-none');
        $tableBody.empty();
        $errorMessageText.text(message);
        $errorState.removeClass('d-none');
        $tableCountSummary.text('0 items');
    }

    // 4. Filter & Search Pipeline
    function applyFilterAndRender() {
        const query = ($searchInput.val() || '').trim().toLowerCase();

        // Update clear button visibility
        if (query.length > 0) {
            $searchClearBtn.show();
        } else {
            $searchClearBtn.hide();
        }

        // Filter by name, remarks, or id
        currentFilteredImages = allBrandImages.filter(item => {
            if (query.length === 0) return true;
            const name = (item.name || '').toLowerCase();
            const remarks = (item.remarks || '').toLowerCase();
            const id = String(item.id || '');
            return name.includes(query) || remarks.includes(query) || id.includes(query);
        });

        // Update count summary
        $tableCountSummary.text(`Showing ${currentFilteredImages.length} of ${allBrandImages.length} image${allBrandImages.length === 1 ? '' : 's'}`);

        // State displays
        if (allBrandImages.length === 0) {
            $emptyState.removeClass('d-none');
            $noResultsState.addClass('d-none');
            $tableBody.empty();
            return;
        }

        if (currentFilteredImages.length === 0) {
            $emptyState.addClass('d-none');
            $noResultsState.removeClass('d-none');
            $tableBody.empty();
            return;
        }

        $emptyState.addClass('d-none');
        $noResultsState.addClass('d-none');
        renderTableRows(currentFilteredImages);
    }

    // 5. Render Exactly 5 Balanced Columns with Delete Action
    function renderTableRows(items) {
        const rowsHtml = items.map((item, index) => {
            const id = item.id ?? (index + 1);
            const formattedId = String(id).padStart(2, '0');
            const name = escapeHtml(item.name || 'Untitled');
            const remarks = escapeHtml(item.remarks || '—');
            const fullImgUrl = getFullImageUrl(item.imagePath);

            return `
                <tr data-id="${id}">
                    <!-- 1. ID Column -->
                    <td class="text-nowrap text-center">
                        <span class="dash-id-badge">#${formattedId}</span>
                    </td>

                    <!-- 2. Preview Column -->
                    <td class="brand-thumb-cell text-center">
                        <div class="brand-thumb-wrapper mx-auto" 
                             onclick="window.openBrandImageModal(${id})" 
                             title="Click to zoom / preview">
                            ${fullImgUrl ? `
                                <img src="${escapeHtml(fullImgUrl)}" 
                                     alt="${name}" 
                                     class="brand-thumb-img" 
                                     loading="lazy" 
                                     onerror="window.handleBrandImgError(this)" />
                                <div class="brand-thumb-overlay">
                                    <i class="bi bi-zoom-in"></i>
                                </div>
                            ` : `
                                <div class="brand-thumb-fallback" title="No image available">
                                    <i class="bi bi-image"></i>
                                </div>
                            `}
                        </div>
                    </td>

                    <!-- 3. Name / Title Column -->
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-building text-primary opacity-75"></i>
                            <strong class="text-dark">${name}</strong>
                        </div>
                    </td>

                    <!-- 4. Remarks Column -->
                    <td>
                        <span class="text-secondary ${remarks === '—' ? 'opacity-50' : ''}">${remarks}</span>
                    </td>

                    <!-- 5. Actions Column (Preview Modal, Open in New Tab, Delete) -->
                    <td class="dash-actions-cell text-end">
                        <div class="dash-action-btn-group">
                            <!-- Preview Modal -->
                            <button type="button" 
                                    class="dash-action-btn btn-view" 
                                    onclick="window.openBrandImageModal(${id})" 
                                    title="View image details">
                                <i class="bi bi-eye"></i>
                            </button>

                            <!-- Open in New Tab -->
                            ${fullImgUrl ? `
                                <a href="${escapeHtml(fullImgUrl)}" 
                                   target="_blank" 
                                   rel="noopener noreferrer" 
                                   class="dash-action-btn" 
                                   title="Open image in new tab">
                                    <i class="bi bi-box-arrow-up-right"></i>
                                </a>
                            ` : ''}

                            <!-- Delete Action Button -->
                            <button type="button" 
                                    class="dash-action-btn btn-delete text-danger" 
                                    onclick="window.confirmDeleteBrandImage(${id})" 
                                    title="Delete brand image">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        $tableBody.html(rowsHtml);
    }

    // 6. Open Lightbox Preview Modal (Only Image & Remarks shown)
    window.openBrandImageModal = function (imageId) {
        const item = allBrandImages.find(x => x.id === imageId);
        if (!item || !imageModal) return;

        // Force remove any legacy modal metadata fields if present from cached HTML
        $('#brandImageDetailModal .brand-meta-grid').remove();
        $('#brandImageDetailModal .brand-url-copy-box').remove();

        const fullImgUrl = getFullImageUrl(item.imagePath);

        $modalTitle.text(item.name || 'Brand Image Preview');

        const remarks = (item.remarks || '').trim();
        if (remarks) {
            $modalRemarks.text(remarks);
            $('#modalRemarksWrapper').show();
        } else {
            $modalRemarks.text('—');
            $('#modalRemarksWrapper').hide();
        }

        if (fullImgUrl) {
            $modalImg.attr('src', fullImgUrl).attr('alt', item.name || 'Image Preview').show();
            $modalOpenBtn.attr('href', fullImgUrl).show();
        } else {
            $modalImg.hide();
            $modalOpenBtn.hide();
        }

        imageModal.show();
    };

    // 7. Delete Brand Image Confirmation & API Call
    window.confirmDeleteBrandImage = function (id) {
        const modalEl = ensureDeleteModalInDom();
        const item = allBrandImages.find(x => x.id === id);
        pendingDeleteId = id;

        const name = item ? item.name : `#${id}`;
        const remarks = item && item.remarks ? item.remarks : 'No remarks provided';
        const fullImgUrl = item ? getFullImageUrl(item.imagePath) : '';

        $('#deleteTargetName').text(name);
        $('#deleteTargetId').text(`#${String(id).padStart(2, '0')}`);
        $('#deleteTargetRemarks').text(remarks);

        if (fullImgUrl) {
            $('#deleteTargetThumb').attr('src', fullImgUrl).show();
        } else {
            $('#deleteTargetThumb').attr('src', '/images/logo-icon.png');
        }

        // Always show the ultra-modern Bootstrap Modal (NEVER native confirm)
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInstance.show();
    };

    // Global event delegation for confirm delete button
    $(document).on('click', '#btnConfirmDelete', function () {
        if (!pendingDeleteId) return;
        executeDeleteBrandImage(pendingDeleteId);
    });

    function executeDeleteBrandImage(id) {
        const token = getAuthToken();
        const ajaxHeaders = {
            'Accept': 'application/json'
        };
        if (token) {
            ajaxHeaders['Authorization'] = `Bearer ${token}`;
        }

        const $btn = $('#btnConfirmDelete');
        const $btnText = $('#btnConfirmDeleteText');
        $btn.prop('disabled', true);
        $btnText.text('Deleting...');

        const deleteApiUrl = `${apiBaseUrl}/api/BrandImages/${id}`;
        console.log(`[BrandImages] Sending DELETE to: ${deleteApiUrl}`);

        $.ajax({
            url: deleteApiUrl,
            type: 'DELETE',
            headers: ajaxHeaders,
            success: function (res) {
                console.log('[BrandImages] Delete response:', res);
                const modalEl = document.getElementById('deleteConfirmModal');
                if (modalEl) {
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    if (modalInstance) modalInstance.hide();
                }

                // Remove item from local array
                allBrandImages = allBrandImages.filter(x => x.id !== id);
                applyFilterAndRender();
                showToast('Brand image deleted successfully!', 'bi bi-trash3-fill text-danger');
            },
            error: function (xhr, status, error) {
                console.error('[BrandImages] Delete error:', xhr, status, error);
                let msg = 'Failed to delete brand image. Please try again.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                } else if (xhr.statusText && xhr.statusText !== 'error') {
                    msg = `Error (${xhr.status}): ${xhr.statusText}`;
                }
                showToast(msg, 'bi bi-exclamation-triangle-fill text-warning');
            },
            complete: function () {
                $btn.prop('disabled', false);
                $btnText.text('Delete Image');
                pendingDeleteId = null;
            }
        });
    }

    // 8. Event Listeners
    // Refresh button
    $refreshBtn.on('click', function () {
        fetchBrandImages();
        showToast('Refreshing brand images...', 'bi bi-arrow-repeat text-primary');
    });

    // Retry button in error state
    $retryBtn.on('click', function () {
        fetchBrandImages();
    });

    // Live search input
    $searchInput.on('input', function () {
        applyFilterAndRender();
    });

    // Clear search
    $searchClearBtn.on('click', function () {
        $searchInput.val('');
        applyFilterAndRender();
        $searchInput.focus();
    });

    // Initial API Fetch
    fetchBrandImages();
});
