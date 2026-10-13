/**
 * ZamZam Trims (BD) Limited - Brand Images Manager (brand-images.js)
 * -------------------------------------------------------------------
 * Fetches, searches, previews, and manages brand images from:
 * {ApiBaseUrl}/api/BrandImages/GetAll
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
                <th style="width: 110px;" class="text-end">Actions</th>
            </tr>
        `);
    }

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
    const $modalUrlText = $('#modalImageUrlText');
    const $modalOpenBtn = $('#modalOpenNewTabBtn');
    const $modalCopyBtn = $('#modalCopyUrlBtn');

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

    // Helper: Copy Text to Clipboard (modal copy button)
    window.copyBrandImageUrl = function (url) {
        if (!url) return;
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url).then(function () {
                showToast('Image URL copied to clipboard!', 'bi bi-clipboard-check-fill text-success');
            }).catch(function () {
                fallbackCopyText(url);
            });
        } else {
            fallbackCopyText(url);
        }
    };

    function fallbackCopyText(text) {
        const tempInput = document.createElement('input');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            document.execCommand('copy');
            showToast('Image URL copied to clipboard!', 'bi bi-clipboard-check-fill text-success');
        } catch (e) {
            prompt('Copy image URL:', text);
        }
        document.body.removeChild(tempInput);
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

    // 5. Render Exactly 5 Balanced Columns
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

                    <!-- 5. Actions Column (Preview Modal & Open in New Tab) -->
                    <td class="dash-actions-cell text-end">
                        <div class="dash-action-btn-group">
                            <button type="button" 
                                    class="dash-action-btn btn-view" 
                                    onclick="window.openBrandImageModal(${id})" 
                                    title="View image details">
                                <i class="bi bi-eye"></i>
                            </button>

                            ${fullImgUrl ? `
                                <a href="${escapeHtml(fullImgUrl)}" 
                                   target="_blank" 
                                   rel="noopener noreferrer" 
                                   class="dash-action-btn" 
                                   title="Open image in new tab">
                                    <i class="bi bi-box-arrow-up-right"></i>
                                </a>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        $tableBody.html(rowsHtml);
    }

    // 6. Open Lightbox Preview Modal
    window.openBrandImageModal = function (imageId) {
        const item = allBrandImages.find(x => x.id === imageId);
        if (!item || !imageModal) return;

        const fullImgUrl = getFullImageUrl(item.imagePath);

        $modalTitle.text(item.name || 'Brand Image Preview');
        $modalRemarks.text(item.remarks || 'None');

        if (fullImgUrl) {
            $modalImg.attr('src', fullImgUrl).attr('alt', item.name || 'Image Preview').show();
            $modalUrlText.text(fullImgUrl);
            $modalOpenBtn.attr('href', fullImgUrl).show();
            $modalCopyBtn.show().off('click').on('click', function () {
                window.copyBrandImageUrl(fullImgUrl);
            });
        } else {
            $modalImg.hide();
            $modalUrlText.text('No URL specified');
            $modalOpenBtn.hide();
            $modalCopyBtn.hide();
        }

        imageModal.show();
    };

    // 7. Event Listeners
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
