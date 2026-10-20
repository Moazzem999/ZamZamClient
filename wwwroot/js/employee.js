/**
 * ZamZam Trims (BD) Limited - Employee Management (employee.js)
 * -------------------------------------------------------------
 * Handles search, filter, refresh, and state management for the Employee List page.
 */

$(function () {
    'use strict';

    // 1. DOM Elements & State
    const $container = $('#employeePageContainer');
    const apiBaseUrl = ($container.data('api-base-url') || 'https://localhost:7148').replace(/\/+$/, '');
    const GET_EMPLOYEES_API_URL = `${apiBaseUrl}/api/Employees`;

    const $tableBody = $('#employeeTableBody');
    const $emptyState = $('#employeeEmptyState');
    const $loadingState = $('#employeeLoadingState');
    const $noResultsState = $('#employeeNoResultsState');
    const $errorState = $('#employeeErrorState');
    const $errorMessageText = $('#employeeErrorMessageText');
    const $tableCountSummary = $('#employeeTableCountSummary');

    const $searchInput = $('#employeeSearchInput');
    const $searchClearBtn = $('#employeeSearchClear');
    const $refreshBtn = $('#btnRefreshEmployees');
    const $createBtn = $('#btnOpenCreateEmployee');
    const $btnEmptyAdd = $('#btnEmptyAddEmployee');

    const $toast = $('#dashToast');
    const $toastMessage = $('#dashToastMessage');

    let allEmployees = [];
    let currentFilteredEmployees = [];
    let isFetching = false;
    let toastTimeout = null;

    // 2. Helper Utilities
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

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

    function showToast(message, iconClass = 'bi bi-check-circle-fill text-success') {
        if (!$toast.length) return;
        if (toastTimeout) clearTimeout(toastTimeout);

        $toastMessage.text(message);
        $toast.find('.dash-toast-icon').attr('class', `dash-toast-icon ${iconClass}`);
        $toast.addClass('show');

        toastTimeout = setTimeout(function () {
            $toast.removeClass('show');
        }, 3200);
    }

    // 3. UI State Display
    function showState(state) {
        $emptyState.addClass('d-none');
        $loadingState.addClass('d-none');
        $noResultsState.addClass('d-none');
        $errorState.addClass('d-none');

        if (state === 'empty') {
            $emptyState.removeClass('d-none');
        } else if (state === 'loading') {
            $loadingState.removeClass('d-none');
        } else if (state === 'no-results') {
            $noResultsState.removeClass('d-none');
        } else if (state === 'error') {
            $errorState.removeClass('d-none');
        }
    }

    // 4. Filter & Render
    function applyFilterAndRender() {
        const query = ($searchInput.val() || '').trim().toLowerCase();

        if (query.length > 0) {
            $searchClearBtn.show();
        } else {
            $searchClearBtn.hide();
        }

        currentFilteredEmployees = allEmployees.filter(emp => {
            if (!query) return true;
            const name = (emp.name || emp.fullName || '').toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const phone = (emp.phone || emp.phoneNumber || '').toLowerCase();
            const designation = (emp.designation || '').toLowerCase();
            const department = (emp.department || '').toLowerCase();
            const id = String(emp.id || '');
            return name.includes(query) || email.includes(query) || phone.includes(query) ||
                designation.includes(query) || department.includes(query) || id.includes(query);
        });

        const total = allEmployees.length;
        const filtered = currentFilteredEmployees.length;

        if (total === 0) {
            $tableBody.empty();
            showState('empty');
            $tableCountSummary.text('Showing 0 of 0 employees');
            return;
        }

        if (filtered === 0) {
            $tableBody.empty();
            showState('no-results');
            $tableCountSummary.text(`Showing 0 of ${total} employees`);
            return;
        }

        showState('normal');
        $tableCountSummary.text(`Showing ${filtered} of ${total} employee${total === 1 ? '' : 's'}`);
        renderRows(currentFilteredEmployees);
    }

    function renderRows(items) {
        const rowsHtml = items.map((emp, index) => {
            const id = emp.id || (index + 1);
            const name = escapeHtml(emp.name || emp.fullName || 'Unnamed');
            const designation = escapeHtml(emp.designation || 'Staff');
            const department = escapeHtml(emp.department || '-');
            const email = escapeHtml(emp.email || '-');
            const phone = escapeHtml(emp.phone || emp.phoneNumber || '-');
            const status = emp.isActive !== false ? 'Active' : 'Inactive';
            const statusBadge = emp.isActive !== false
                ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill">Active</span>'
                : '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1 rounded-pill">Inactive</span>';

            return `
                <tr>
                    <td class="text-muted fw-semibold">#${id}</td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="dash-avatar-circle bg-primary-subtle text-primary fw-bold">
                                ${name.charAt(0).toUpperCase()}
                            </div>
                            <span class="fw-semibold text-dark">${name}</span>
                        </div>
                    </td>
                    <td>${designation}</td>
                    <td><span class="badge bg-light text-dark border">${department}</span></td>
                    <td>${email}</td>
                    <td>${phone}</td>
                    <td>${statusBadge}</td>
                    <td class="text-end">
                        <button type="button" class="btn btn-sm btn-outline-secondary rounded-2 px-2 py-1 me-1" title="View details">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        $tableBody.html(rowsHtml);
    }

    // 5. Fetch Data from API
    function fetchEmployees() {
        if (isFetching) return;
        isFetching = true;

        showState('loading');
        $tableBody.empty();
        $refreshBtn.prop('disabled', true);
        $refreshBtn.find('.refresh-icon').addClass('spin-animation');

        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        $.ajax({
            url: GET_EMPLOYEES_API_URL,
            type: 'GET',
            dataType: 'json',
            headers: headers,
            cache: false,
            timeout: 10000,
            success: function (response) {
                if (response && (response.succeeded === true || response.statusCode === 200 || Array.isArray(response.data))) {
                    allEmployees = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                } else if (Array.isArray(response)) {
                    allEmployees = response;
                } else {
                    allEmployees = [];
                }
                applyFilterAndRender();
            },
            error: function (xhr, status, error) {
                // If API endpoint is not yet implemented or returns 404, gracefully display empty state
                if (xhr.status === 404) {
                    allEmployees = [];
                    applyFilterAndRender();
                } else if (xhr.status === 401) {
                    showToast('Session expired. Please log in again.', 'bi bi-shield-lock-fill text-warning');
                    setTimeout(function () {
                        window.location.href = '/Account/Login';
                    }, 1800);
                } else {
                    // Graceful fallback for empty page state
                    allEmployees = [];
                    applyFilterAndRender();
                }
            },
            complete: function () {
                isFetching = false;
                $refreshBtn.prop('disabled', false);
                $refreshBtn.find('.refresh-icon').removeClass('spin-animation');
            }
        });
    }

    // 6. Event Listeners
    $refreshBtn.on('click', function () {
        fetchEmployees();
        showToast('Refreshing employee list...', 'bi bi-arrow-clockwise text-primary');
    });

    $searchInput.on('input', function () {
        applyFilterAndRender();
    });

    $searchClearBtn.on('click', function () {
        $searchInput.val('').focus();
        applyFilterAndRender();
    });

    $createBtn.add($btnEmptyAdd).on('click', function () {
        showToast('Add Employee form modal will be connected here.', 'bi bi-info-circle-fill text-info');
    });

    // 7. Initial Load
    fetchEmployees();
});
