/**
 * ZamZam Trims (BD) Limited - Brand Images Manager (brand-images.js)
 * -------------------------------------------------------------------
 * Fetches, searches, previews, creates, and deletes brand images from:
 * {ApiBaseUrl}/api/BrandImages/GetAll
 * {ApiBaseUrl}/api/BrandImages (POST, multipart/form-data)
 * {ApiBaseUrl}/api/BrandImages/{id} (DELETE)
 */

$(function () {
    'use strict';

    // 0. Force cleanup of any lingering cached elements & synchronize thead structure
    $('#totalImagesBadge').closest('.d-inline-flex').remove();
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

    // Ensure "Add Brand Image" button exists in header toolbar
    if (!$('#btnOpenCreateModal').length && $('#btnRefreshBrandImages').length) {
        $('#btnRefreshBrandImages').before(`
            <button type="button" class="btn btn-primary btn-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-3 shadow-sm" id="btnOpenCreateModal" title="Upload new brand image">
                <i class="bi bi-plus-lg"></i>
                <span class="fw-semibold">Add Brand Image</span>
            </button>
        `);
    }

    // Modern Create Modal HTML template
    const modernCreateModalHtml = `
        <div class="modal fade" id="createBrandImageModal" tabindex="-1" aria-labelledby="createModalTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" style="max-width: 540px;">
                <div class="modal-content modern-create-modal-content border-0">
                    <div class="modal-header border-bottom px-4 py-3 align-items-center">
                        <div class="d-flex align-items-center gap-3">
                            <div class="create-modal-icon-badge">
                                <i class="bi bi-image-fill"></i>
                            </div>
                            <div>
                                <h5 class="modal-title fw-bold text-dark m-0" id="createModalTitle">Add Brand Image</h5>
                                <small class="text-muted">Upload a new facility or gallery image</small>
                            </div>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>

                    <form id="createBrandImageForm" novalidate>
                        <div class="modal-body px-4 py-3">
                            <div class="alert alert-danger py-2 px-3 small rounded-3 d-none mb-3" id="createModalAlert" role="alert"></div>

                            <!-- 1. Image File Dropzone -->
                            <div class="mb-3">
                                <label class="form-label small fw-bold text-dark d-flex justify-content-between align-items-center">
                                    <span>Image File <span class="text-danger">*</span></span>
                                    <span class="text-muted fw-normal" style="font-size: 0.75rem;">JPG, PNG, WebP (Max 1MB)</span>
                                </label>

                                <div class="image-dropzone position-relative" id="createImageDropzone">
                                    <!-- Full-coverage transparent file input for 100% reliable native click & drag-drop -->
                                    <input type="file" 
                                           id="createImageFileInput" 
                                           name="Image" 
                                           accept="image/jpeg,image/png,image/webp,image/jpg" 
                                           class="image-dropzone-input" 
                                           title="Click to browse or drag and drop image" 
                                           required />
                                    
                                    <div class="dropzone-prompt text-center py-4" id="dropzonePrompt">
                                        <div class="dropzone-icon mb-2">
                                            <i class="bi bi-cloud-arrow-up"></i>
                                        </div>
                                        <div class="fw-semibold text-dark small mb-1">Click to upload or drag &amp; drop image</div>
                                        <div class="text-muted mb-3" style="font-size: 0.75rem;">Supports JPEG, PNG, WebP (Max 1MB)</div>
                                        <span class="btn btn-outline-primary btn-sm px-3 rounded-pill fw-semibold">
                                            <i class="bi bi-folder2-open me-1"></i> Browse Image
                                        </span>
                                    </div>

                                    <div class="dropzone-preview d-none text-center p-2" id="dropzonePreview">
                                        <img src="" alt="Selected Preview" class="dropzone-preview-img" id="createPreviewImg" />
                                        <div class="dropzone-preview-overlay d-flex align-items-center justify-content-center gap-2 mt-2">
                                            <button type="button" class="btn btn-sm btn-light border shadow-sm px-2 py-1 small rounded-2" id="btnChangeImage">
                                                <i class="bi bi-arrow-repeat me-1"></i> Change
                                            </button>
                                            <button type="button" class="btn btn-sm btn-danger shadow-sm px-2 py-1 small rounded-2" id="btnRemoveImage">
                                                <i class="bi bi-trash3 me-1"></i> Remove
                                            </button>
                                        </div>
                                        <div class="mt-2 small text-white-50 text-truncate px-2" id="createImageFileName"></div>
                                    </div>
                                </div>
                                <div class="invalid-feedback d-block d-none" id="createFileFeedback">Please select an image file to upload.</div>
                            </div>

                            <!-- 2. Facility / Image Name -->
                            <div class="mb-3">
                                <label for="createImageName" class="form-label small fw-bold text-dark">
                                    Image Title / Facility Name <span class="text-danger">*</span>
                                </label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light border-end-0 text-muted">
                                        <i class="bi bi-building"></i>
                                    </span>
                                    <input type="text" 
                                           class="form-control bg-light border-start-0 rounded-end-3" 
                                           id="createImageName" 
                                           placeholder="e.g. Laboratory Floor, Printing Press" 
                                           required 
                                           autocomplete="off" />
                                </div>
                                <div class="invalid-feedback d-block d-none" id="createNameFeedback">Please enter a title or facility name.</div>
                            </div>

                            <!-- 3. Remarks -->
                            <div class="mb-2">
                                <label for="createImageRemarks" class="form-label small fw-bold text-dark">
                                    Remarks / Description
                                </label>
                                <textarea class="form-control bg-light rounded-3" 
                                          id="createImageRemarks" 
                                          rows="2" 
                                          placeholder="Enter short description or remarks (optional)..."></textarea>
                            </div>
                        </div>

                        <div class="modal-footer bg-light border-top px-4 py-3 d-flex justify-content-between">
                            <button type="button" class="btn btn-outline-secondary btn-sm rounded-3 px-3" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary btn-sm rounded-3 px-4 py-2 d-inline-flex align-items-center gap-2 shadow-sm" id="btnSubmitCreate">
                                <i class="bi bi-cloud-arrow-up-fill"></i>
                                <span id="btnSubmitCreateText">Upload &amp; Save</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

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

    // Ensure modals exist in the DOM with latest markup
    function ensureModalsInDom() {
        let createEl = document.getElementById('createBrandImageModal');
        if (!createEl) {
            $('body').append(modernCreateModalHtml);
        } else if (!$(createEl).find('.image-dropzone-input').length) {
            $(createEl).remove();
            $('body').append(modernCreateModalHtml);
        }

        let delEl = document.getElementById('deleteConfirmModal');
        if (!delEl) {
            $('body').append(modernDeleteModalHtml);
        } else if (!$(delEl).find('.modern-delete-modal-content').length) {
            $(delEl).remove();
            $('body').append(modernDeleteModalHtml);
        }
    }
    ensureModalsInDom();

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
    let selectedImageFile = null;

    // 2. Configuration & State
    const rawApiBaseUrl = $container.data('api-base-url') || 'https://localhost:7148';
    const apiBaseUrl = rawApiBaseUrl.toString().replace(/\/+$/, '');
    const GET_ALL_API_URL = `${apiBaseUrl}/api/BrandImages/GetAll`;
    const CREATE_API_URL = `${apiBaseUrl}/api/BrandImages`;

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

    // 5. Render Exactly 5 Balanced Columns with Actions
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

    // 7. Create Brand Image Modal Logic & API Call
    function resetCreateForm() {
        const form = document.getElementById('createBrandImageForm');
        if (form) form.reset();
        selectedImageFile = null;
        const fileInput = document.getElementById('createImageFileInput');
        if (fileInput) fileInput.value = '';
        $('#createPreviewImg').attr('src', '');
        $('#createImageFileName').text('');
        $('#dropzonePreview').addClass('d-none');
        $('#dropzonePrompt').removeClass('d-none');
        $('#createImageDropzone').removeClass('has-preview');
        $('#createFileFeedback').addClass('d-none');
        $('#createNameFeedback').addClass('d-none');
        $('#createModalAlert').addClass('d-none').text('');
    }

    // Open create modal
    $(document).on('click', '#btnOpenCreateModal', function () {
        ensureModalsInDom();
        resetCreateForm();
        const createModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('createBrandImageModal'));
        createModal.show();
    });

    // Change image button in preview state
    $(document).on('click', '#btnChangeImage', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const fileInput = document.getElementById('createImageFileInput');
        if (fileInput) {
            fileInput.click();
        }
    });

    // Remove image button in preview state
    $(document).on('click', '#btnRemoveImage', function (e) {
        e.preventDefault();
        e.stopPropagation();
        selectedImageFile = null;
        const fileInput = document.getElementById('createImageFileInput');
        if (fileInput) fileInput.value = '';
        $('#createPreviewImg').attr('src', '');
        $('#createImageFileName').text('');
        $('#dropzonePreview').addClass('d-none');
        $('#dropzonePrompt').removeClass('d-none');
        $('#createImageDropzone').removeClass('has-preview');
    });

    // Drag and drop handlers
    $(document).on('dragover dragenter', '#createImageDropzone', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass('dragover');
    });

    $(document).on('dragleave dragend drop', '#createImageDropzone', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('dragover');
    });

    $(document).on('drop', '#createImageDropzone', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const files = e.originalEvent.dataTransfer ? e.originalEvent.dataTransfer.files : null;
        if (files && files.length > 0) {
            const fileInput = document.getElementById('createImageFileInput');
            if (fileInput) {
                try {
                    fileInput.files = files;
                } catch (err) {}
            }
            handleSelectedImageFile(files[0]);
        }
    });

    $(document).on('change', '#createImageFileInput', function () {
        if (this.files && this.files.length > 0) {
            handleSelectedImageFile(this.files[0]);
        }
    });

    function handleSelectedImageFile(file) {
        if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/)) {
            $('#createModalAlert').removeClass('d-none').text('Please select a valid image file (JPG, PNG, WebP).');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            $('#createModalAlert').removeClass('d-none').text('Image file size must be less than 10MB.');
            return;
        }

        selectedImageFile = file;
        $('#createFileFeedback').addClass('d-none');
        $('#createModalAlert').addClass('d-none');

        const reader = new FileReader();
        reader.onload = function (e) {
            $('#createPreviewImg').attr('src', e.target.result);
            $('#createImageFileName').text(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
            $('#dropzonePrompt').addClass('d-none');
            $('#dropzonePreview').removeClass('d-none');
            $('#createImageDropzone').addClass('has-preview');
        };
        reader.readAsDataURL(file);
    }

    // Submit Create Form
    $(document).on('submit', '#createBrandImageForm', function (e) {
        e.preventDefault();

        const name = ($('#createImageName').val() || '').trim();
        const remarks = ($('#createImageRemarks').val() || '').trim();

        let isValid = true;
        if (!selectedImageFile) {
            $('#createFileFeedback').removeClass('d-none');
            isValid = false;
        } else {
            $('#createFileFeedback').addClass('d-none');
        }

        if (!name) {
            $('#createNameFeedback').removeClass('d-none');
            isValid = false;
        } else {
            $('#createNameFeedback').addClass('d-none');
        }

        if (!isValid) return;

        // Build FormData matching the sample API specification
        const formData = new FormData();
        formData.append('Id', '0');
        formData.append('Name', name);
        formData.append('Remarks', remarks);
        formData.append('Image', selectedImageFile, selectedImageFile.name);

        const token = getAuthToken();
        const ajaxHeaders = {};
        if (token) {
            ajaxHeaders['Authorization'] = `Bearer ${token}`;
        }

        const $submitBtn = $('#btnSubmitCreate');
        const $submitBtnText = $('#btnSubmitCreateText');
        $submitBtn.prop('disabled', true);
        $submitBtnText.html('<span class="spinner-border spinner-border-sm me-2" role="status"></span> Uploading...');
        $('#createModalAlert').addClass('d-none').text('');

        console.log(`[BrandImages] Submitting Create to: ${CREATE_API_URL}`);

        $.ajax({
            url: CREATE_API_URL,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: ajaxHeaders,
            success: function (res) {
                console.log('[BrandImages] Create Success Response:', res);
                const createModalEl = document.getElementById('createBrandImageModal');
                if (createModalEl) {
                    const inst = bootstrap.Modal.getInstance(createModalEl);
                    if (inst) inst.hide();
                }

                resetCreateForm();
                const successMsg = res && res.message ? res.message : 'Brand image successfully created.';
                showToast(successMsg, 'bi bi-check-circle-fill text-success');

                // Reload data from API to display newly created item
                fetchBrandImages();
            },
            error: function (xhr, status, error) {
                console.error('[BrandImages] Create error:', xhr, status, error);
                let errorMsg = 'Failed to create brand image. Please verify connection and try again.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                } else if (xhr.responseText) {
                    try {
                        const parsed = JSON.parse(xhr.responseText);
                        if (parsed.message) errorMsg = parsed.message;
                    } catch (e) {}
                }
                $('#createModalAlert').removeClass('d-none').text(errorMsg);
            },
            complete: function () {
                $submitBtn.prop('disabled', false);
                $submitBtnText.html('Upload &amp; Save');
            }
        });
    });

    // 8. Delete Brand Image Confirmation & API Call
    window.confirmDeleteBrandImage = function (id) {
        ensureModalsInDom();
        const modalEl = document.getElementById('deleteConfirmModal');
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

    // 9. Event Listeners
    $refreshBtn.on('click', function () {
        fetchBrandImages();
        showToast('Refreshing brand images...', 'bi bi-arrow-repeat text-primary');
    });

    $retryBtn.on('click', function () {
        fetchBrandImages();
    });

    $searchInput.on('input', function () {
        applyFilterAndRender();
    });

    $searchClearBtn.on('click', function () {
        $searchInput.val('');
        applyFilterAndRender();
        $searchInput.focus();
    });

    // Initial API Fetch
    fetchBrandImages();
});
