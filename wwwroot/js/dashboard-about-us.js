/**
 * ZamZam Trims (BD) Limited - About Us Manager (dashboard-about-us.js)
 * -------------------------------------------------------------------
 * Fetches, previews, and deletes About Us section data from:
 * {ApiBaseUrl}/api/AboutUs/GetAll
 * {ApiBaseUrl}/api/AboutUs/{id} (DELETE)
 */

$(function () {
    'use strict';

    // Modern Delete Modal HTML template (styled identical to brand-images delete modal)
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

    // Ensure the modern modal is at body root level (prevents any container stacking/overflow issues)
    function ensureModalsInDom() {
        let delEl = document.getElementById('deleteConfirmAboutUsModal');
        if (!delEl) {
            $('body').append(modernDeleteModalHtml);
        } else if (!$(delEl).find('.modern-delete-modal-content').length) {
            $(delEl).remove();
            $('body').append(modernDeleteModalHtml);
        }
    }
    ensureModalsInDom();

    // 1. Elements & Variables
    const $pageContainer = $('#aboutUsPageContainer');
    const apiBaseUrl = ($pageContainer.data('api-base-url') || 'https://localhost:7148').toString().replace(/\/+$/, '');
    const GET_ALL_API_URL = `${apiBaseUrl}/api/AboutUs/GetAll`;

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

    // 2. Fetch Data from API
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

    // 3. Error Handling State
    function showErrorState(message) {
        $loadingState.addClass('d-none');
        $emptyState.addClass('d-none');
        $noResultsState.addClass('d-none');
        $tableBody.empty();
        $tableCountSummary(0, 0);

        $errorMessage.text(message);
        $errorState.removeClass('d-none');
    }

    // 4. Filter and Render
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

    // 5. Render Table Rows
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

    // 6. View Details Modal
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

    // 7. Ultra-Modern Delete Confirmation Modal (matching Brand Images)
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

    // 8. Event Handlers
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
