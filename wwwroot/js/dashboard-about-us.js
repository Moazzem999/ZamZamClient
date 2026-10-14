/**
 * ZamZam Trims (BD) Limited - About Us Manager (dashboard-about-us.js)
 * -------------------------------------------------------------------
 * Fetches and displays About Us section data from:
 * {ApiBaseUrl}/api/AboutUs/GetAll
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

    const $detailModal = $('#aboutUsDetailModal');
    const detailModalInstance = $detailModal.length ? new bootstrap.Modal($detailModal[0]) : null;

    const $toast = $('#dashToast');
    const $toastMessage = $('#dashToastMessage');

    let allAboutUsRecords = [];
    let isFetching = false;
    let selectedRecordForModal = null;

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

    // Helper: Date Formatting
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-GB', {
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
                                <i class="bi bi-eye"></i>
                            </button>
                            <button type="button" 
                                    class="dash-action-btn btn-copy btn-copy-about" 
                                    data-id="${id}" 
                                    title="Copy heading text">
                                <i class="bi bi-clipboard"></i>
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
        const item = allAboutUsRecords.find(r => (r.id || r.Id) == id);
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

        if (detailModalInstance) {
            detailModalInstance.show();
        }
    }

    // 7. Event Handlers
    // Row click & View button click
    $tableBody.on('click', '.btn-view-about', function (e) {
        e.stopPropagation();
        const id = $(this).data('id');
        openDetailModal(id);
    });

    $tableBody.on('click', 'tr.about-row-clickable', function (e) {
        if ($(e.target).closest('.dash-action-btn').length) return;
        const id = $(this).data('record-id');
        if (id) openDetailModal(id);
    });

    // Copy Heading button click
    $tableBody.on('click', '.btn-copy-about', function (e) {
        e.stopPropagation();
        const id = $(this).data('id');
        const item = allAboutUsRecords.find(r => (r.id || r.Id) == id);
        if (item) {
            const textToCopy = item.mainHeading || item.MainHeading || '';
            navigator.clipboard.writeText(textToCopy).then(function () {
                showToast('Main heading copied to clipboard!');
            }).catch(function () {
                showToast('Failed to copy to clipboard', 'bi bi-x-circle-fill text-danger');
            });
        }
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
