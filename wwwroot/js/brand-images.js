/**
 * ZamZam Trims (BD) Limited - Brand Images Manager (brand-images.js)
 * -------------------------------------------------------------------
 * Fetches, filters, searches, previews, and manages brand images from:
 * {ApiBaseUrl}/api/BrandImages/GetAll
 */

$(function () {
    'use strict';

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
    const $statusFilter = $('#statusFilterSelect');
    const $totalCountBadge = $('#totalImagesBadge');
    const $activeCountBadge = $('#activeImagesBadge');
    const $tableCountSummary = $('#tableCountSummary');
    const $toast = $('#dashToast');
    const $toastMessage = $('#dashToastMessage');

    // Lightbox Modal Elements
    const modalElement = document.getElementById('brandImageDetailModal');
    const imageModal = modalElement ? new bootstrap.Modal(modalElement) : null;
    const $modalImg = $('#modalPreviewImage');
    const $modalTitle = $('#modalImageTitle');
    const $modalRemarks = $('#modalImageRemarks');
    const $modalStatus = $('#modalImageStatus');
    const $modalCreatedOn = $('#modalImageCreatedOn');
    const $modalUpdatedOn = $('#modalImageUpdatedOn');
    const $modalCreatedBy = $('#modalImageCreatedBy');
    const $modalUpdatedBy = $('#modalImageUpdatedBy');
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

    // Helper: Format ISO Date into human-readable string
    function formatDate(isoString) {
        if (!isoString) return '—';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return isoString;
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }) + ', ' + date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return isoString;
        }
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

    // Helper: Copy Text to Clipboard
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
                    
                    // Update header badges
                    const totalCount = allBrandImages.length;
                    const activeCount = allBrandImages.filter(item => item.status === 1).length;
                    $totalCountBadge.text(totalCount);
                    $activeCountBadge.text(activeCount);

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
        $totalCountBadge.text('0');
        $activeCountBadge.text('0');
        $tableCountSummary.text('0 items');
    }

    // 4. Filter, Search & Render Pipeline
    function applyFilterAndRender() {
        const query = ($searchInput.val() || '').trim().toLowerCase();
        const selectedStatus = $statusFilter.val();

        // Update clear button visibility
        if (query.length > 0) {
            $searchClearBtn.show();
        } else {
            $searchClearBtn.hide();
        }

        // Apply filters
        currentFilteredImages = allBrandImages.filter(item => {
            // Search query match (name, remarks, id)
            let matchesQuery = true;
            if (query.length > 0) {
                const name = (item.name || '').toLowerCase();
                const remarks = (item.remarks || '').toLowerCase();
                const id = String(item.id || '');
                matchesQuery = name.includes(query) || remarks.includes(query) || id.includes(query);
            }

            // Status match
            let matchesStatus = true;
            if (selectedStatus === 'active') {
                matchesStatus = (item.status === 1);
            } else if (selectedStatus === 'inactive') {
                matchesStatus = (item.status !== 1);
            }

            return matchesQuery && matchesStatus;
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

    // 5. Render Table Rows
    function renderTableRows(items) {
        const rowsHtml = items.map((item, index) => {
            const id = item.id ?? (index + 1);
            const formattedId = String(id).padStart(2, '0');
            const name = escapeHtml(item.name || 'Untitled');
            const remarks = escapeHtml(item.remarks || '—');
            const fullImgUrl = getFullImageUrl(item.imagePath);
            const isActive = item.status === 1;
            const createdOnFormatted = formatDate(item.createdOn);
            const updatedOnFormatted = formatDate(item.updatedOn);

            return `
                <tr data-id="${id}">
                    <!-- ID Column -->
                    <td class="text-nowrap">
                        <span class="dash-id-badge">#${formattedId}</span>
                    </td>

                    <!-- Image Preview Thumbnail Column -->
                    <td class="brand-thumb-cell">
                        <div class="brand-thumb-wrapper" 
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

                    <!-- Name / Title Column -->
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-building text-primary opacity-75"></i>
                            <strong class="text-dark">${name}</strong>
                        </div>
                    </td>

                    <!-- Remarks Column -->
                    <td>
                        <span class="text-secondary ${remarks === '—' ? 'opacity-50' : ''}">${remarks}</span>
                    </td>

                    <!-- Status Column -->
                    <td>
                        <span class="dash-status-badge ${isActive ? 'status-active' : 'status-inactive'}">
                            <span class="status-dot"></span>
                            <span>${isActive ? 'Active' : 'Inactive'}</span>
                        </span>
                    </td>

                    <!-- Created On Column -->
                    <td class="text-nowrap">
                        <div class="d-flex align-items-center gap-1 text-muted small">
                            <i class="bi bi-calendar3 opacity-75"></i>
                            <span>${createdOnFormatted}</span>
                        </div>
                    </td>

                    <!-- Updated On Column -->
                    <td class="text-nowrap">
                        <div class="d-flex align-items-center gap-1 text-muted small">
                            <i class="bi bi-clock-history opacity-75"></i>
                            <span>${updatedOnFormatted}</span>
                        </div>
                    </td>

                    <!-- Action Controls Column -->
                    <td class="dash-actions-cell">
                        <div class="dash-action-btn-group">
                            <!-- Preview in Modal -->
                            <button type="button" 
                                    class="dash-action-btn btn-view" 
                                    onclick="window.openBrandImageModal(${id})" 
                                    title="View image details">
                                <i class="bi bi-eye"></i>
                            </button>

                            <!-- Copy Direct URL -->
                            ${fullImgUrl ? `
                                <button type="button" 
                                        class="dash-action-btn btn-copy" 
                                        onclick="window.copyBrandImageUrl('${escapeHtml(fullImgUrl)}')" 
                                        title="Copy image link">
                                    <i class="bi bi-link-45deg"></i>
                                </button>
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
        const isActive = item.status === 1;

        $modalTitle.text(item.name || 'Brand Image Preview');
        $modalRemarks.text(item.remarks || 'None');
        
        $modalStatus.html(`
            <span class="dash-status-badge ${isActive ? 'status-active' : 'status-inactive'}">
                <span class="status-dot"></span>
                <span>${isActive ? 'Active' : 'Inactive'}</span>
            </span>
        `);

        $modalCreatedOn.text(formatDate(item.createdOn));
        $modalUpdatedOn.text(formatDate(item.updatedOn));
        $modalCreatedBy.text(item.createdBy ? `User #${item.createdBy}` : '—');
        $modalUpdatedBy.text(item.updatedBy ? `User #${item.updatedBy}` : '—');

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

    // Status filter dropdown
    $statusFilter.on('change', function () {
        applyFilterAndRender();
    });

    // Initial API Fetch
    fetchBrandImages();
});
