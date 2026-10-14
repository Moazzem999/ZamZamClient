/**
 * ZamZam Trims (BD) Limited - About Us Manager (dashboard-about-us.js)
 * -------------------------------------------------------------------
 * Fetches, previews, and deletes About Us section data from:
 * {ApiBaseUrl}/api/AboutUs/GetAll
 * {ApiBaseUrl}/api/AboutUs/{id} (DELETE)
 */

$(function () {
    'use strict';

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

                    <!-- Actions Column -->
                    <td class="dash-actions-cell">
                        <div class="dash-action-btn-group">
                            <button type="button" 
                                    class="dash-action-btn btn-view btn-view-about" 
                                    data-id="${id}" 
                                    title="View complete details">
                                <i class="bi bi-eye" style="pointer-events: none;"></i>
                            </button>
                            <button type="button" 
                                    class="dash-action-btn btn-delete btn-delete-about" 
                                    data-id="${id}" 
                                    title="Delete this record">
                                <i class="bi bi-trash3" style="pointer-events: none;"></i>
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
    function openDetailModal(id) {
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
        if (modalEl && window.bootstrap && window.bootstrap.Modal) {
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
            modalInstance.show();
        }
    }

    // 7. Delete Prompt & Execution
    function promptDeleteAboutUs(id) {
        pendingDeleteId = id;
        const item = allAboutUsRecords.find(r => String(r.id || r.Id) === String(id)) || {};

        const sectionLabel = item.sectionLabel || item.SectionLabel || '—';
        const mainHeading = item.mainHeading || item.MainHeading || `Record #${id}`;
        const intro = item.introduction || item.Introduction || '—';

        $('#deleteTargetId').text(`#${id}`);
        $('#deleteTargetLabel').text(sectionLabel);
        $('#deleteTargetHeading').text(mainHeading);
        $('#deleteTargetIntro').text(intro);

        const modalEl = document.getElementById('deleteAboutUsModal');
        if (modalEl && window.bootstrap && window.bootstrap.Modal) {
            try {
                const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
                modalInstance.show();
                return;
            } catch (err) {
                console.warn('[AboutUs] Error opening modal with Bootstrap, falling back to confirm dialog:', err);
            }
        }

        // Direct fallback if Bootstrap modal instance is not available
        if (window.confirm(`Are you sure you want to permanently delete About Us record #${id}?`)) {
            executeDeleteAboutUs(id);
        }
    }

    function executeDeleteAboutUs(id) {
        if (!id) return;

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
        console.log(`[AboutUs] Executing DELETE to: ${deleteApiUrl}`);

        $.ajax({
            url: deleteApiUrl,
            type: 'DELETE',
            headers: ajaxHeaders,
            success: function (res) {
                console.log('[AboutUs] Delete API response:', res);

                // Hide modal if open
                const modalEl = document.getElementById('deleteAboutUsModal');
                if (modalEl && window.bootstrap && window.bootstrap.Modal) {
                    try {
                        const modalInstance = bootstrap.Modal.getInstance(modalEl);
                        if (modalInstance) modalInstance.hide();
                    } catch (e) {}
                }

                // Check for failure message in response
                if (res && res.succeeded === false) {
                    const msg = res.message || 'Server rejected delete operation.';
                    showToast(msg, 'bi bi-exclamation-triangle-fill text-warning');
                    return;
                }

                // Update state & re-render
                allAboutUsRecords = allAboutUsRecords.filter(r => String(r.id || r.Id) !== String(id));
                applyFilterAndRender();
                showToast('About Us record deleted successfully!', 'bi bi-trash3-fill text-danger');
            },
            error: function (xhr, status, error) {
                console.error('[AboutUs] Delete failed:', xhr, status, error);

                let msg = 'Failed to delete About Us record. Please check server status.';
                if (xhr.status === 401) {
                    msg = 'Unauthorized. Please sign in again.';
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

    // 8. Event Handlers (using document delegation to guarantee all dynamically rendered elements work)
    // View details button click
    $(document).on('click', '.btn-view-about', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const $btn = $(this).closest('.btn-view-about');
        const id = $btn.attr('data-id') || $btn.data('id');
        if (id) openDetailModal(id);
    });

    // Row click
    $(document).on('click', 'tr.about-row-clickable', function (e) {
        if ($(e.target).closest('.dash-action-btn').length) return;
        const id = $(this).attr('data-record-id') || $(this).data('record-id');
        if (id) openDetailModal(id);
    });

    // Row Delete button click
    $(document).on('click', '.btn-delete-about', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const $btn = $(this).closest('.btn-delete-about');
        const id = $btn.attr('data-id') || $btn.data('id');
        console.log('[AboutUs] Delete clicked for ID:', id);
        if (id) promptDeleteAboutUs(id);
    });

    // Confirm Delete button click in modal
    $(document).on('click', '#btnConfirmDeleteAboutUs', function (e) {
        e.preventDefault();
        if (!pendingDeleteId) return;
        executeDeleteAboutUs(pendingDeleteId);
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
