/**
 * ZamZam Trims (BD) Limited - About Us Manager (dashboard-about-us.js)
 * -------------------------------------------------------------------
 * Fetches, previews, creates, and deletes About Us section data from:
 * {ApiBaseUrl}/api/AboutUs/GetAll (GET)
 * {ApiBaseUrl}/api/AboutUs (POST)
 * {ApiBaseUrl}/api/AboutUs/{id} (DELETE)
 */

$(function () {
    'use strict';

    // 1. Base URL & API Endpoints
    const $pageContainer = $('#aboutUsPageContainer');
    const apiBaseUrl = ($pageContainer.data('api-base-url') || 'https://localhost:7148').toString().replace(/\/+$/, '');
    const GET_ALL_API_URL = `${apiBaseUrl}/api/AboutUs/GetAll`;
    const CREATE_API_URL = `${apiBaseUrl}/api/AboutUs`;

    // 2. Modern Create Modal HTML Template
    const modernCreateModalHtml = `
        <div class="modal fade" id="createAboutUsModal" tabindex="-1" aria-labelledby="createAboutUsModalTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" style="max-width: 720px;">
                <div class="modal-content modern-create-modal-content border-0">
                    <div class="modal-header border-bottom px-4 py-3 align-items-center">
                        <div class="d-flex align-items-center gap-3">
                            <div class="create-modal-icon-badge">
                                <i class="bi bi-file-earmark-plus-fill"></i>
                            </div>
                            <div>
                                <h5 class="modal-title fw-bold text-dark m-0" id="createAboutUsModalTitle">Create About Us Section</h5>
                                <small class="text-muted">Add company story, heritage, production details, and capabilities</small>
                            </div>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>

                    <form id="createAboutUsForm" novalidate>
                        <div class="modal-body px-4 py-3" style="max-height: 70vh; overflow-y: auto;">
                            <div class="alert alert-danger py-2 px-3 small rounded-3 d-none mb-3" id="createModalAlert" role="alert"></div>

                            <!-- 1. Section Tagline / Label (Bigger & Full-Width) -->
                            <div class="mb-3">
                                <label for="createSectionLabel" class="form-label small fw-bold text-dark mb-1">
                                    Section Tagline / Label
                                </label>
                                <div class="input-group input-group-lg shadow-none">
                                    <span class="input-group-text bg-light border-end-0 text-muted px-3">
                                        <i class="bi bi-tag fs-5"></i>
                                    </span>
                                    <input type="text" 
                                           class="form-control bg-light border-start-0 rounded-end-3 fs-6 py-2" 
                                           id="createSectionLabel" 
                                           placeholder="e.g. Our Story &amp; Heritage" />
                                </div>
                            </div>

                            <!-- 2. Main Heading -->
                            <div class="mb-3">
                                <label for="createMainHeading" class="form-label small fw-bold text-dark mb-1">
                                    Main Heading <span class="text-danger">*</span>
                                </label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light border-end-0 text-muted">
                                        <i class="bi bi-type-h1"></i>
                                    </span>
                                    <input type="text" 
                                           class="form-control bg-light border-start-0 rounded-end-3" 
                                           id="createMainHeading" 
                                           placeholder="e.g. Built on Trust &amp; Precision Engineering" 
                                           required />
                                </div>
                                <div class="invalid-feedback d-none" id="createHeadingFeedback">Please enter a main heading.</div>
                            </div>

                            <!-- 3. Introduction Narrative -->
                            <div class="mb-3">
                                <label for="createIntroduction" class="form-label small fw-bold text-dark mb-1 d-flex justify-content-between">
                                    <span>Introduction &amp; Company Inception <span class="text-danger">*</span></span>
                                </label>
                                <textarea class="form-control bg-light rounded-3" 
                                          id="createIntroduction" 
                                          rows="3" 
                                          placeholder="Enter introduction narrative..." 
                                          required></textarea>
                                <div class="invalid-feedback d-none" id="createIntroFeedback">Please enter an introduction narrative.</div>
                            </div>

                            <!-- 4. Experience & Production Side-by-Side -->
                            <div class="row g-3 mb-3">
                                <div class="col-md-6">
                                    <label for="createExperienceDescription" class="form-label small fw-bold text-dark mb-1">
                                        Industry Experience Description
                                    </label>
                                    <textarea class="form-control bg-light rounded-3" 
                                              id="createExperienceDescription" 
                                              rows="3" 
                                              placeholder="Enter industry experience details..."></textarea>
                                </div>

                                <div class="col-md-6">
                                    <label for="createProductionDescription" class="form-label small fw-bold text-dark mb-1">
                                        Production &amp; Machinery Description
                                    </label>
                                    <textarea class="form-control bg-light rounded-3" 
                                              id="createProductionDescription" 
                                              rows="3" 
                                              placeholder="Enter production and machinery details..."></textarea>
                                </div>
                            </div>

                            <!-- 5. Capability Section Title (Bigger & Full-Width) -->
                            <div class="mb-3">
                                <label for="createCapabilityTitle" class="form-label small fw-bold text-dark mb-1">
                                    Capability Section Title
                                </label>
                                <div class="input-group input-group-lg shadow-none">
                                    <span class="input-group-text bg-light border-end-0 text-muted px-3">
                                        <i class="bi bi-layers fs-5"></i>
                                    </span>
                                    <input type="text" 
                                           class="form-control bg-light border-start-0 rounded-end-3 fs-6 py-2" 
                                           id="createCapabilityTitle" 
                                           placeholder="e.g. Comprehensive Product Capabilities" />
                                </div>
                            </div>

                            <!-- 6. Capability Lines / Products -->
                            <div class="mb-2">
                                <label for="createCapabilityDescription" class="form-label small fw-bold text-dark mb-1">
                                    Capability Lines / Products
                                </label>
                                <textarea class="form-control bg-light rounded-3" 
                                          id="createCapabilityDescription" 
                                          rows="2" 
                                          placeholder="Enter product lines or capabilities..."></textarea>
                            </div>
                        </div>

                        <!-- Modal Footer -->
                        <div class="modal-footer bg-light border-top px-4 py-3 d-flex justify-content-between">
                            <button type="button" class="btn btn-outline-secondary btn-sm rounded-3 px-3" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary btn-sm rounded-3 px-4 py-2 d-inline-flex align-items-center gap-2 shadow-sm" id="btnSubmitCreateAboutUs">
                                <i class="bi bi-check-lg"></i>
                                <span id="btnSubmitCreateAboutUsText">Save &amp; Create</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // 3. Modern Delete Modal HTML Template (styled identical to brand-images delete modal)
    const modernDeleteModalHtml = `
        <div class="modal fade" id="deleteConfirmAboutUsModal" tabindex="-1" aria-labelledby="deleteModalTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" style="max-width: 440px;">
                <div class="modal-content modern-delete-modal-content border-0">
                    <!-- Close Bubble -->
                    <button type="button" class="modal-close-bubble" data-bs-dismiss="modal" aria-label="Close" title="Cancel">
                        <i class="bi bi-x-lg"></i>
                    </button>

                    <div class="text-center">
                        <!-- Concentric Glowing Danger Icon -->
                        <div class="delete-icon-spotlight">
                            <div class="delete-pulse-ring"></div>
                            <div class="delete-pulse-ring-inner"></div>
                            <div class="delete-icon-bubble">
                                <i class="bi bi-trash3-fill"></i>
                            </div>
                        </div>

                        <!-- Title & Description -->
                        <h4 class="delete-modal-heading" id="deleteModalTitle">Delete About Us Record?</h4>
                        <p class="delete-modal-subtext">
                            You are about to permanently remove this About Us section from the database.
                        </p>

                        <!-- Target Item Preview Card -->
                        <div class="delete-target-preview-card text-start">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <div class="delete-target-badge"><span id="deleteTargetId">#01</span></div>
                                <span class="about-section-badge py-0 px-2" style="font-size: 0.72rem;" id="deleteTargetLabel">—</span>
                            </div>
                            <div class="delete-target-title" id="deleteTargetHeading" style="font-size: 0.95rem; line-height: 1.35; margin-bottom: 0.35rem;">Loading...</div>
                            <div class="delete-target-desc" id="deleteTargetIntro" style="font-size: 0.8rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">—</div>
                        </div>

                        <!-- Irreversible Warning Pill -->
                        <div class="delete-warning-pill">
                            <i class="bi bi-exclamation-triangle-fill"></i>
                            <span>This action is permanent and cannot be undone</span>
                        </div>

                        <!-- Action Buttons -->
                        <div class="delete-modal-actions">
                            <button type="button" class="btn-modal-cancel" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button type="button" class="btn-modal-delete" id="btnConfirmDeleteAboutUs">
                                <i class="bi bi-trash3-fill"></i>
                                <span id="btnConfirmDeleteText">Delete Record</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Ensure modern modals live directly under document.body (prevents container clipping or backdrop issues)
    function ensureModalsInDom() {
        let createEl = document.getElementById('createAboutUsModal');
        if (!createEl) {
            $('body').append(modernCreateModalHtml);
        } else if (!$(createEl).find('#createAboutUsForm').length) {
            $(createEl).remove();
            $('body').append(modernCreateModalHtml);
        }

        let delEl = document.getElementById('deleteConfirmAboutUsModal');
        if (!delEl) {
            $('body').append(modernDeleteModalHtml);
        } else if (!$(delEl).find('.modern-delete-modal-content').length) {
            $(delEl).remove();
            $('body').append(modernDeleteModalHtml);
        }
    }
    ensureModalsInDom();

    // 4. Elements & State Variables
    const $table = $('#aboutUsTable');
    const $tableBody = $('#aboutUsTableBody');
    const $loadingState = $('#tableLoadingState');
    const $errorState = $('#tableErrorState');
    const $errorMessage = $('#errorMessageText');
    const $emptyState = $('#tableEmptyState');
    const $noResultsState = $('#tableNoResultsState');
    const $countSummary = $('#tableCountSummary');

    const $searchInput = $('#searchAboutUsInput');
    const $searchClearBtn = $('#searchClearBtn');
    const $refreshBtn = $('#btnRefreshAboutUs');
    const $retryBtn = $('#btnRetryAboutUs');

    const $toast = $('#dashToast');
    const $toastMessage = $('#dashToastMessage');

    let allAboutUsRecords = [];
    let isFetching = false;
    let selectedRecordForModal = null;
    let pendingDeleteId = null;

    // Helper: JWT Token extraction
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

    // Helper: XSS Safe Escape
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper: Reset Create Form
    function resetCreateForm() {
        const form = document.getElementById('createAboutUsForm');
        if (form) form.reset();
        $('#createModalAlert').addClass('d-none').text('');
        $('#createHeadingFeedback').addClass('d-none');
        $('#createIntroFeedback').addClass('d-none');
        $('#btnSubmitCreateAboutUs').prop('disabled', false);
        $('#btnSubmitCreateAboutUsText').text('Save & Create');
    }

    // 5. Fetch Data from API
    function fetchAboutUsData() {
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

        console.log(`[AboutUs] Fetching data from: ${GET_ALL_API_URL}`);

        $.ajax({
            url: GET_ALL_API_URL,
            type: 'GET',
            dataType: 'json',
            headers: ajaxHeaders,
            cache: false,
            timeout: 15000,
            success: function (response) {
                console.log('[AboutUs] API Response:', response);

                if (response && (response.succeeded === true || response.statusCode === 200 || Array.isArray(response.data))) {
                    const rawData = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
                    allAboutUsRecords = rawData;
                    applyFilterAndRender();
                } else {
                    const msg = response?.message || 'Unexpected response format received from server.';
                    showErrorState(msg);
                }
            },
            error: function (xhr, status, error) {
                console.error('[AboutUs] Fetch error:', status, error, xhr);

                if (xhr.status === 401) {
                    showErrorState('Session expired or unauthorized (401). Please sign in again.');
                    setTimeout(function () {
                        window.location.href = '/Account/Login';
                    }, 2000);
                    return;
                }

                let errorMsg = `Unable to connect to the About Us API at: ${GET_ALL_API_URL}. Please ensure the server is online.`;
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                } else if (xhr.statusText && xhr.statusText !== 'error') {
                    errorMsg = `Server error: ${xhr.status} ${xhr.statusText}`;
                }
                showErrorState(errorMsg);
            },
            complete: function () {
                isFetching = false;
                $loadingState.addClass('d-none');
                $refreshBtn.prop('disabled', false);
                $refreshBtn.find('.refresh-icon').removeClass('spin-animation');
            }
        });
    }

    // 6. Error Handling State
    function showErrorState(message) {
        $loadingState.addClass('d-none');
        $emptyState.addClass('d-none');
        $noResultsState.addClass('d-none');
        $tableBody.empty();
        $tableCountSummary(0, 0);

        $errorMessage.text(message);
        $errorState.removeClass('d-none');
    }

    // 7. Filter and Render
    function applyFilterAndRender() {
        const query = ($searchInput.val() || '').trim().toLowerCase();
        $searchClearBtn.toggle(query.length > 0);

        if (!allAboutUsRecords || allAboutUsRecords.length === 0) {
            $tableBody.empty();
            $emptyState.removeClass('d-none');
            $noResultsState.addClass('d-none');
            $errorState.addClass('d-none');
            $tableCountSummary(0, 0);
            return;
        }

        $emptyState.addClass('d-none');
        $errorState.addClass('d-none');

        const filtered = allAboutUsRecords.filter(function (item) {
            if (!query) return true;
            const id = (item.id || item.Id || '').toString();
            const label = (item.sectionLabel || item.SectionLabel || '').toLowerCase();
            const heading = (item.mainHeading || item.MainHeading || '').toLowerCase();
            const intro = (item.introduction || item.Introduction || '').toLowerCase();
            const exp = (item.experienceDescription || item.ExperienceDescription || '').toLowerCase();
            const prod = (item.productionDescription || item.ProductionDescription || '').toLowerCase();
            const capTitle = (item.capabilityTitle || item.CapabilityTitle || '').toLowerCase();
            const capDesc = (item.capabilityDescription || item.CapabilityDescription || '').toLowerCase();

            return id.includes(query) ||
                   label.includes(query) ||
                   heading.includes(query) ||
                   intro.includes(query) ||
                   exp.includes(query) ||
                   prod.includes(query) ||
                   capTitle.includes(query) ||
                   capDesc.includes(query);
        });

        $tableCountSummary(filtered.length, allAboutUsRecords.length);

        if (filtered.length === 0) {
            $tableBody.empty();
            $noResultsState.removeClass('d-none');
            return;
        }

        $noResultsState.addClass('d-none');
        renderTableRows(filtered);
    }

    // 8. Render Table Rows
    function renderTableRows(records) {
        let html = '';

        records.forEach(function (item) {
            const id = item.id || item.Id || 0;
            const sectionLabel = item.sectionLabel || item.SectionLabel || '—';
            const mainHeading = item.mainHeading || item.MainHeading || '—';
            const intro = item.introduction || item.Introduction || '—';
            const status = item.status !== undefined ? item.status : (item.Status !== undefined ? item.Status : 1);
            const isActive = status === 1;

            html += `
                <tr data-record-id="${id}" class="about-row-clickable">
                    <!-- ID Column -->
                    <td class="text-center">
                        <span class="dash-id-badge">#${id}</span>
                    </td>

                    <!-- Section Label Column -->
                    <td>
                        <span class="about-section-badge" title="${escapeHtml(sectionLabel)}">
                            ${escapeHtml(sectionLabel)}
                        </span>
                    </td>

                    <!-- Main Heading Column -->
                    <td>
                        <div class="about-table-heading" title="${escapeHtml(mainHeading)}">
                            ${escapeHtml(mainHeading)}
                        </div>
                    </td>

                    <!-- Introduction Preview Column -->
                    <td>
                        <div class="about-table-intro" title="${escapeHtml(intro)}">
                            ${escapeHtml(intro)}
                        </div>
                    </td>

                    <!-- Status Column -->
                    <td class="text-center">
                        <span class="dash-status-badge ${isActive ? 'status-active' : 'status-inactive'}">
                            <span class="status-dot"></span>
                            <span>${isActive ? 'Active' : 'Inactive'}</span>
                        </span>
                    </td>

                    <!-- Actions Column (View Details, Delete) -->
                    <td class="dash-actions-cell">
                        <div class="dash-action-btn-group">
                            <button type="button" 
                                    class="dash-action-btn btn-view" 
                                    onclick="window.openAboutUsModal(${id}); event.stopPropagation();" 
                                    title="View complete details">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button type="button" 
                                    class="dash-action-btn btn-delete text-danger" 
                                    onclick="window.confirmDeleteAboutUs(${id}); event.stopPropagation();" 
                                    title="Delete this record">
                                <i class="bi bi-trash3"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        $tableBody.html(html);
    }

    // Helper: Update summary count text
    function $tableCountSummary(showing, total) {
        if (total === 0) {
            $countSummary.text('No records found');
        } else if (showing === total) {
            $countSummary.text(`Showing all ${total} ${total === 1 ? 'record' : 'records'}`);
        } else {
            $countSummary.text(`Showing ${showing} of ${total} records`);
        }
    }

    // 9. View Details Modal
    window.openAboutUsModal = function (id) {
        const item = allAboutUsRecords.find(r => String(r.id || r.Id) === String(id));
        if (!item) return;

        selectedRecordForModal = item;

        const recordId = item.id || item.Id || 0;
        const sectionLabel = item.sectionLabel || item.SectionLabel || '—';
        const mainHeading = item.mainHeading || item.MainHeading || '—';
        const intro = item.introduction || item.Introduction || '—';
        const exp = item.experienceDescription || item.ExperienceDescription || '—';
        const prod = item.productionDescription || item.ProductionDescription || '—';
        const capTitle = item.capabilityTitle || item.CapabilityTitle || 'Comprehensive Product Capabilities:';
        const capDesc = item.capabilityDescription || item.CapabilityDescription || '—';
        const status = item.status !== undefined ? item.status : (item.Status !== undefined ? item.Status : 1);
        const isActive = status === 1;

        $('#modalRecordId').text(`#${recordId}`);
        $('#modalSectionLabel').text(sectionLabel);
        $('#modalMainHeading').text(mainHeading);
        $('#modalIntroduction').text(intro);
        $('#modalExperienceDescription').text(exp);
        $('#modalProductionDescription').text(prod);
        $('#modalCapabilityTitle').text(capTitle);
        $('#modalCapabilityDescription').text(capDesc);

        // Status badge in modal
        const $statusBadge = $('#modalStatusBadge');
        $statusBadge.attr('class', `dash-status-badge ${isActive ? 'status-active' : 'status-inactive'}`);
        $statusBadge.html(`<span class="status-dot"></span><span>${isActive ? 'Active' : 'Inactive'}</span>`);

        const modalEl = document.getElementById('aboutUsDetailModal');
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
            modalInstance.show();
        }
    };

    // 10. Open Create Modal
    $(document).on('click', '#btnOpenCreateModal', function () {
        ensureModalsInDom();
        resetCreateForm();
        const createModalEl = document.getElementById('createAboutUsModal');
        if (createModalEl) {
            const createModalInstance = bootstrap.Modal.getOrCreateInstance(createModalEl);
            createModalInstance.show();
        }
    });

    // 11. Submit Create Form & API Call
    $(document).on('submit', '#createAboutUsForm', function (e) {
        e.preventDefault();

        const sectionLabel = ($('#createSectionLabel').val() || '').trim();
        const mainHeading = ($('#createMainHeading').val() || '').trim();
        const introduction = ($('#createIntroduction').val() || '').trim();
        const experienceDescription = ($('#createExperienceDescription').val() || '').trim();
        const productionDescription = ($('#createProductionDescription').val() || '').trim();
        const capabilityTitle = ($('#createCapabilityTitle').val() || '').trim() || 'Comprehensive Product Capabilities:';
        const capabilityDescription = ($('#createCapabilityDescription').val() || '').trim();

        let isValid = true;
        if (!mainHeading) {
            $('#createHeadingFeedback').removeClass('d-none');
            isValid = false;
        } else {
            $('#createHeadingFeedback').addClass('d-none');
        }

        if (!introduction) {
            $('#createIntroFeedback').removeClass('d-none');
            isValid = false;
        } else {
            $('#createIntroFeedback').addClass('d-none');
        }

        if (!isValid) return;

        // Build Payload matching the sample API specification
        const payload = {
            id: 0,
            sectionLabel: sectionLabel,
            mainHeading: mainHeading,
            introduction: introduction,
            experienceDescription: experienceDescription,
            productionDescription: productionDescription,
            capabilityTitle: capabilityTitle,
            capabilityDescription: capabilityDescription
        };

        const token = getAuthToken();
        const ajaxHeaders = {
            'Accept': 'application/json, */*',
            'Content-Type': 'application/json'
        };
        if (token) {
            ajaxHeaders['Authorization'] = `Bearer ${token}`;
        }

        const $submitBtn = $('#btnSubmitCreateAboutUs');
        const $submitBtnText = $('#btnSubmitCreateAboutUsText');
        $submitBtn.prop('disabled', true);
        $submitBtnText.html('<span class="spinner-border spinner-border-sm me-2" role="status"></span> Saving...');
        $('#createModalAlert').addClass('d-none').text('');

        console.log(`[AboutUs] Submitting Create to: ${CREATE_API_URL}`, payload);

        $.ajax({
            url: CREATE_API_URL,
            type: 'POST',
            data: JSON.stringify(payload),
            headers: ajaxHeaders,
            success: function (res) {
                console.log('[AboutUs] Create Success Response:', res);
                const createModalEl = document.getElementById('createAboutUsModal');
                if (createModalEl) {
                    const inst = bootstrap.Modal.getInstance(createModalEl);
                    if (inst) inst.hide();
                }

                resetCreateForm();
                const successMsg = res && res.message ? res.message : 'About Us section created successfully!';
                showToast(successMsg, 'bi bi-check-circle-fill text-success');

                // Reload data from API to display newly created record
                fetchAboutUsData();
            },
            error: function (xhr, status, error) {
                console.error('[AboutUs] Create Error:', xhr, status, error);

                let errorMsg = 'Failed to create About Us section. Please try again.';
                if (xhr.status === 401) {
                    errorMsg = 'Session expired or unauthorized (401). Please sign in again.';
                } else if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                } else if (xhr.statusText && xhr.statusText !== 'error') {
                    errorMsg = `Error (${xhr.status}): ${xhr.statusText}`;
                }

                $('#createModalAlert').removeClass('d-none').text(errorMsg);
                showToast(errorMsg, 'bi bi-exclamation-triangle-fill text-warning');
            },
            complete: function () {
                $submitBtn.prop('disabled', false);
                $submitBtnText.html('<i class="bi bi-check-lg"></i> Save &amp; Create');
            }
        });
    });

    // 12. Ultra-Modern Delete Confirmation Modal (matching Brand Images)
    window.confirmDeleteAboutUs = function (id) {
        ensureModalsInDom();
        pendingDeleteId = id;

        const item = allAboutUsRecords.find(x => String(x.id || x.Id) === String(id)) || {};
        const sectionLabel = item.sectionLabel || item.SectionLabel || 'OUR STORY';
        const mainHeading = item.mainHeading || item.MainHeading || `About Us Record #${id}`;
        const intro = item.introduction || item.Introduction || 'No description provided';

        $('#deleteTargetId').text(`#${String(id).padStart(2, '0')}`);
        $('#deleteTargetLabel').text(sectionLabel);
        $('#deleteTargetHeading').text(mainHeading);
        $('#deleteTargetIntro').text(intro);

        const modalEl = document.getElementById('deleteConfirmAboutUsModal');
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
            modalInstance.show();
        }
    };

    // Global event delegation for confirm delete button
    $(document).on('click', '#btnConfirmDeleteAboutUs', function () {
        if (!pendingDeleteId) return;
        executeDeleteAboutUs(pendingDeleteId);
    });

    function executeDeleteAboutUs(id) {
        const token = getAuthToken();
        const ajaxHeaders = {
            'Accept': 'application/json'
        };
        if (token) {
            ajaxHeaders['Authorization'] = `Bearer ${token}`;
        }

        const $btn = $('#btnConfirmDeleteAboutUs');
        const $btnText = $('#btnConfirmDeleteText');
        $btn.prop('disabled', true);
        $btnText.text('Deleting...');

        const deleteApiUrl = `${apiBaseUrl}/api/AboutUs/${id}`;
        console.log(`[AboutUs] Sending DELETE to: ${deleteApiUrl}`);

        $.ajax({
            url: deleteApiUrl,
            type: 'DELETE',
            headers: ajaxHeaders,
            success: function (res) {
                console.log('[AboutUs] Delete response:', res);
                const modalEl = document.getElementById('deleteConfirmAboutUsModal');
                if (modalEl) {
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    if (modalInstance) modalInstance.hide();
                }

                allAboutUsRecords = allAboutUsRecords.filter(x => String(x.id || x.Id) !== String(id));
                applyFilterAndRender();
                showToast('About Us record deleted successfully!', 'bi bi-trash3-fill text-danger');
            },
            error: function (xhr, status, error) {
                console.error('[AboutUs] Delete error:', xhr, status, error);
                let msg = 'Failed to delete About Us record. Please try again.';
                if (xhr.status === 401) {
                    msg = 'Session expired or unauthorized (401). Please sign in again.';
                } else if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                } else if (xhr.statusText && xhr.statusText !== 'error') {
                    msg = `Error (${xhr.status}): ${xhr.statusText}`;
                }
                showToast(msg, 'bi bi-exclamation-triangle-fill text-warning');
            },
            complete: function () {
                $btn.prop('disabled', false);
                $btnText.text('Delete Record');
                pendingDeleteId = null;
            }
        });
    }

    // 13. Event Handlers
    // Row click opens details
    $(document).on('click', 'tr.about-row-clickable', function (e) {
        if ($(e.target).closest('.dash-action-btn').length) return;
        const id = $(this).attr('data-record-id') || $(this).data('record-id');
        if (id) window.openAboutUsModal(id);
    });

    // Search events
    $searchInput.on('input', function () {
        applyFilterAndRender();
    });

    $searchClearBtn.on('click', function () {
        $searchInput.val('').trigger('input').focus();
    });

    // Refresh & Retry
    $refreshBtn.on('click', function () {
        fetchAboutUsData();
        showToast('Refreshing About Us records...', 'bi bi-arrow-repeat text-primary');
    });

    $retryBtn.on('click', function () {
        fetchAboutUsData();
    });

    // Keyboard shortcuts: Esc to clear search if focused
    $searchInput.on('keydown', function (e) {
        if (e.key === 'Escape') {
            $searchInput.val('').trigger('input');
        }
    });

    // Initial Load
    fetchAboutUsData();
});
