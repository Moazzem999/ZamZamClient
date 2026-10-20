/**
 * ZamZam Trims (BD) Limited - Employee Management (employee.js)
 * -------------------------------------------------------------
 * Populates and manages the Employee directory using:
 * {ApiBaseUrl}/api/Employees/GetAll?SearchTerm={term}&PageNumber={page}&PageSize={size}
 */

$(function () {
    'use strict';

    // 1. Configuration & DOM Elements
    const $container = $('#employeePageContainer');
    let apiBaseUrl = ($container.data('api-base-url') || 'https://localhost:7148').replace(/\/+$/, '');
    
    // Guard against mixed content if client is accessed via HTTPS
    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace('http://localhost:', 'https://localhost:');
    }

    const GET_EMPLOYEES_URL = `${apiBaseUrl}/api/Employees/GetAll`;

    // Table & State containers
    const $table = $('#employeeTable');
    const $tableBody = $('#employeeTableBody');
    const $emptyState = $('#employeeEmptyState');
    const $loadingState = $('#employeeLoadingState');
    const $noResultsState = $('#employeeNoResultsState');
    const $errorState = $('#employeeErrorState');
    const $errorMessageText = $('#employeeErrorMessageText');
    const $tableCountSummary = $('#employeeTableCountSummary');
    const $paginationNav = $('#employeePaginationNav');
    const $paginationUl = $('#employeePaginationUl');

    // Controls
    const $searchInput = $('#employeeSearchInput');
    const $searchClearBtn = $('#employeeSearchClear');
    const $pageSizeSelect = $('#employeePageSizeSelect');
    const $refreshBtn = $('#btnRefreshEmployees');
    const $createBtn = $('#btnOpenCreateEmployee');
    const $btnEmptyAdd = $('#btnEmptyAddEmployee');
    const $btnRetry = $('#btnRetryEmployees');

    // Modal elements
    const $detailModalEl = $('#employeeDetailModal');
    let detailModalInstance = null;
    if ($detailModalEl.length && typeof bootstrap !== 'undefined') {
        detailModalInstance = new bootstrap.Modal($detailModalEl[0]);
    }

    // Toast elements
    const $toast = $('#dashToast');
    const $toastMessage = $('#dashToastMessage');
    let toastTimeout = null;

    // 2. Pagination & State Variables
    let currentPageNumber = 1;
    let currentPageSize = 10;
    let currentSearchTerm = '';
    let currentTotalCount = 0;
    let currentTotalPages = 1;
    let hasPreviousPage = false;
    let hasNextPage = false;
    let currentEmployeesList = [];
    let isFetching = false;
    let searchDebounceTimer = null;

    // 3. Helper Functions
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getFullImageUrl(path) {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${apiBaseUrl}${cleanPath}`;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    function formatCurrency(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) return '—';
        return '৳ ' + Number(amount).toLocaleString('en-IN');
    }

    function formatMaritalStatus(val) {
        if (val === 1) return 'Married';
        if (val === 2) return 'Single';
        if (val === 3) return 'Divorced';
        if (val === 4) return 'Widowed';
        return val ? `Status #${val}` : '—';
    }

    function formatReligion(val) {
        const religionMap = {
            1: 'Islam',
            2: 'Hinduism',
            3: 'Buddhism',
            4: 'Christianity',
            5: 'Other'
        };
        return religionMap[val] || (val ? `Religion #${val}` : '—');
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

    // Global image fallback handler
    window.handleEmployeeAvatarError = function (imgEl, initial) {
        const $parent = $(imgEl).parent();
        $(imgEl).remove();
        $parent.html(`
            <div class="employee-avatar-fallback">
                ${escapeHtml(initial || 'E')}
            </div>
        `);
    };

    // 4. UI State Display
    function showState(state) {
        $emptyState.addClass('d-none');
        $loadingState.addClass('d-none');
        $noResultsState.addClass('d-none');
        $errorState.addClass('d-none');

        if (state === 'empty') {
            $table.addClass('d-none');
            $paginationNav.addClass('d-none');
            $emptyState.removeClass('d-none');
        } else if (state === 'loading') {
            $loadingState.removeClass('d-none');
        } else if (state === 'no-results') {
            $table.addClass('d-none');
            $paginationNav.addClass('d-none');
            $noResultsState.removeClass('d-none');
        } else if (state === 'error') {
            $table.addClass('d-none');
            $paginationNav.addClass('d-none');
            $errorState.removeClass('d-none');
        } else {
            // 'normal'
            $table.removeClass('d-none');
            $paginationNav.removeClass('d-none');
        }
    }

    // 5. Fetch Data from API
    function fetchEmployees(pageNumber = 1) {
        if (isFetching) return;
        isFetching = true;

        currentPageNumber = pageNumber;
        const searchTerm = ($searchInput.val() || '').trim();
        currentSearchTerm = searchTerm;
        currentPageSize = parseInt($pageSizeSelect.val(), 10) || 10;

        // Toggle clear search button
        if (searchTerm.length > 0) {
            $searchClearBtn.show();
        } else {
            $searchClearBtn.hide();
        }

        showState('loading');
        $tableBody.empty();
        $refreshBtn.prop('disabled', true);
        $refreshBtn.find('.refresh-icon').addClass('spin-animation');

        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const queryParams = {
            PageNumber: currentPageNumber,
            PageSize: currentPageSize
        };

        if (searchTerm) {
            queryParams.SearchTerm = searchTerm;
        }

        console.log(`[Employees] Fetching: ${GET_EMPLOYEES_URL}`, queryParams);

        $.ajax({
            url: GET_EMPLOYEES_URL,
            type: 'GET',
            data: queryParams,
            dataType: 'json',
            headers: headers,
            cache: false,
            timeout: 15000,
            success: function (response) {
                console.log('[Employees] API Response:', response);

                if (response && response.succeeded !== false && response.data) {
                    const dataObj = response.data;
                    const items = Array.isArray(dataObj.items) ? dataObj.items : (Array.isArray(dataObj) ? dataObj : []);

                    currentEmployeesList = items;
                    currentTotalCount = dataObj.totalCount ?? items.length;
                    currentTotalPages = dataObj.totalPages ?? Math.max(1, Math.ceil(currentTotalCount / currentPageSize));
                    hasPreviousPage = Boolean(dataObj.hasPreviousPage);
                    hasNextPage = Boolean(dataObj.hasNextPage);

                    renderEmployeeTable(items);
                    renderPaginationControls();
                } else if (Array.isArray(response)) {
                    currentEmployeesList = response;
                    currentTotalCount = response.length;
                    currentTotalPages = 1;
                    hasPreviousPage = false;
                    hasNextPage = false;

                    renderEmployeeTable(response);
                    renderPaginationControls();
                } else {
                    const message = response?.message || 'Unable to retrieve employee data.';
                    showError(message);
                }
            },
            error: function (xhr, status, error) {
                console.error('[Employees] Fetch error:', status, error, xhr);

                if (xhr.status === 401) {
                    showError('Authentication session expired (401). Please log in to view employees.');
                    showToast('Session expired. Redirecting to login...', 'bi bi-shield-lock-fill text-warning');
                    setTimeout(function () {
                        window.location.href = '/Account/Login';
                    }, 2200);
                    return;
                }

                let msg = `Unable to connect to the Employee API (${GET_EMPLOYEES_URL}). Please verify the backend service is running.`;
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                } else if (xhr.statusText && xhr.statusText !== 'error') {
                    msg = `Server Error (${xhr.status}): ${xhr.statusText}`;
                }

                showError(msg);
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
        $errorMessageText.text(message);
        showState('error');
        $tableCountSummary.text('0 employees');
    }

    // 6. Render Table Rows
    function renderEmployeeTable(items) {
        if (!items || items.length === 0) {
            if (currentSearchTerm.length > 0) {
                showState('no-results');
            } else {
                showState('empty');
            }
            $tableCountSummary.text('Showing 0 of 0 employees');
            return;
        }

        showState('normal');

        const rowsHtml = items.map((emp, index) => {
            const id = emp.id ?? (index + 1);
            const name = escapeHtml(emp.name || 'Unnamed Employee');
            const initial = (emp.name || 'E').trim().charAt(0).toUpperCase();
            const fatherName = emp.fatherName ? `Father: ${escapeHtml(emp.fatherName)}` : '';
            const designation = escapeHtml(emp.designation || 'Staff');
            const qualification = emp.academicQualification ? escapeHtml(emp.academicQualification) : '';
            const mobile = escapeHtml(emp.mobile || '—');
            const email = escapeHtml(emp.email || '—');
            const joiningDate = formatDate(emp.joiningDate);
            const salary = formatCurrency(emp.salary);
            const isActive = emp.status === 1 || emp.status === undefined;
            const fullPhotoUrl = getFullImageUrl(emp.imagePath);

            const avatarMarkup = fullPhotoUrl
                ? `<img src="${fullPhotoUrl}" alt="${name}" class="employee-avatar-img" onerror="handleEmployeeAvatarError(this, '${initial}')" />`
                : `<div class="employee-avatar-fallback">${initial}</div>`;

            const statusBadge = isActive
                ? `<span class="dash-status-badge status-active"><span class="status-dot"></span><span>Active</span></span>`
                : `<span class="dash-status-badge status-inactive"><span class="status-dot"></span><span>Inactive</span></span>`;

            return `
                <tr data-employee-id="${id}" class="employee-row">
                    <td>
                        <span class="dash-id-badge">#${id}</span>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            <div class="employee-avatar-wrapper" data-employee-id="${id}" title="Click to view details">
                                ${avatarMarkup}
                            </div>
                            <div class="employee-name-meta">
                                <a href="javascript:void(0);" class="employee-name-link fw-bold text-dark text-decoration-none btn-view-employee" data-employee-id="${id}">
                                    ${name}
                                </a>
                                ${fatherName ? `<span class="employee-subtext text-muted d-block small">${fatherName}</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="fw-semibold text-dark">${designation}</div>
                        ${qualification ? `<span class="badge bg-light text-muted border border-1 mt-1 small">${qualification}</span>` : ''}
                    </td>
                    <td>
                        <div class="d-flex flex-column gap-1 small">
                            ${emp.mobile ? `<a href="tel:${mobile}" class="text-decoration-none text-dark"><i class="bi bi-telephone-fill text-primary me-1"></i>${mobile}</a>` : '<span class="text-muted">—</span>'}
                            ${emp.email ? `<a href="mailto:${email}" class="text-decoration-none text-muted"><i class="bi bi-envelope-fill me-1 text-secondary"></i>${email}</a>` : ''}
                        </div>
                    </td>
                    <td>
                        <span class="text-muted small"><i class="bi bi-calendar3 me-1"></i>${joiningDate}</span>
                    </td>
                    <td>
                        <span class="fw-bold text-dark">${salary}</span>
                    </td>
                    <td>
                        ${statusBadge}
                    </td>
                    <td class="text-end">
                        <div class="dash-action-btn-group">
                            <button type="button" class="dash-action-btn btn-view btn-view-employee" data-employee-id="${id}" title="View Employee Profile">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        $tableBody.html(rowsHtml);

        // Update count summary
        const fromCount = (currentPageNumber - 1) * currentPageSize + 1;
        const toCount = Math.min(currentPageNumber * currentPageSize, currentTotalCount);
        $tableCountSummary.text(`Showing ${fromCount} to ${toCount} of ${currentTotalCount} employee${currentTotalCount === 1 ? '' : 's'}`);
    }

    // 7. Render Pagination Controls
    function renderPaginationControls() {
        if (currentTotalPages <= 1 && currentTotalCount <= currentPageSize) {
            $paginationNav.addClass('d-none');
            return;
        }

        $paginationNav.removeClass('d-none');
        let paginationHtml = '';

        // Previous Button
        paginationHtml += `
            <li class="page-item ${!hasPreviousPage && currentPageNumber <= 1 ? 'disabled' : ''}">
                <button type="button" class="page-link" data-page="${currentPageNumber - 1}" aria-label="Previous">
                    <i class="bi bi-chevron-left"></i>
                    <span class="d-none d-sm-inline ms-1">Prev</span>
                </button>
            </li>
        `;

        // Numbered Pages
        const maxVisibleButtons = 5;
        let startPage = Math.max(1, currentPageNumber - Math.floor(maxVisibleButtons / 2));
        let endPage = Math.min(currentTotalPages, startPage + maxVisibleButtons - 1);

        if (endPage - startPage + 1 < maxVisibleButtons) {
            startPage = Math.max(1, endPage - maxVisibleButtons + 1);
        }

        if (startPage > 1) {
            paginationHtml += `
                <li class="page-item">
                    <button type="button" class="page-link" data-page="1">1</button>
                </li>
            `;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link border-0">…</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === currentPageNumber ? 'active' : ''}">
                    <button type="button" class="page-link" data-page="${i}">${i}</button>
                </li>
            `;
        }

        if (endPage < currentTotalPages) {
            if (endPage < currentTotalPages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link border-0">…</span></li>`;
            }
            paginationHtml += `
                <li class="page-item">
                    <button type="button" class="page-link" data-page="${currentTotalPages}">${currentTotalPages}</button>
                </li>
            `;
        }

        // Next Button
        paginationHtml += `
            <li class="page-item ${!hasNextPage && currentPageNumber >= currentTotalPages ? 'disabled' : ''}">
                <button type="button" class="page-link" data-page="${currentPageNumber + 1}" aria-label="Next">
                    <span class="d-none d-sm-inline me-1">Next</span>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `;

        $paginationUl.html(paginationHtml);
    }

    // 8. Open Employee Details Modal
    function openEmployeeDetails(employeeId) {
        const emp = currentEmployeesList.find(e => String(e.id) === String(employeeId));
        if (!emp) {
            showToast('Employee record not found in loaded dataset.', 'bi bi-exclamation-circle text-warning');
            return;
        }

        const name = escapeHtml(emp.name || 'Unnamed Employee');
        const initial = (emp.name || 'E').trim().charAt(0).toUpperCase();
        const photoUrl = getFullImageUrl(emp.imagePath);
        const nidPhotoUrl = getFullImageUrl(emp.nidImagePath);
        const isActive = emp.status === 1 || emp.status === undefined;

        // Modal Header
        $('#modalEmployeeName').text(name);
        $('#modalEmployeeId').text(`#${emp.id}`);
        $('#modalEmployeeDesignationBadge').text(emp.designation || 'Staff');

        const statusBadgeHtml = isActive
            ? `<span class="dash-status-badge status-active"><span class="status-dot"></span><span>Active</span></span>`
            : `<span class="dash-status-badge status-inactive"><span class="status-dot"></span><span>Inactive</span></span>`;
        $('#modalEmployeeStatusBadge').html(statusBadgeHtml);

        // Profile Photo
        const $photoContainer = $('#modalEmployeePhotoContainer');
        if (photoUrl) {
            $photoContainer.html(`
                <img src="${photoUrl}" alt="${name}" class="img-fluid rounded-3 shadow-sm border employee-modal-photo" onerror="handleEmployeeAvatarError(this, '${initial}')" />
            `);
        } else {
            $photoContainer.html(`
                <div class="employee-avatar-fallback modal-avatar-fallback shadow-sm">
                    ${initial}
                </div>
            `);
        }

        // Personal Information
        $('#modalFullName').text(emp.name || '—');
        $('#modalFatherName').text(emp.fatherName || '—');
        $('#modalNidNo').text(emp.nidNo || '—');
        $('#modalDateOfBirth').text(formatDate(emp.dateOfBirth));
        $('#modalMaritalStatus').text(formatMaritalStatus(emp.maritalStatus));
        $('#modalReligion').text(formatReligion(emp.religion));
        $('#modalAcademicQualification').text(emp.academicQualification || '—');

        // Contact Information
        $('#modalMobile').html(emp.mobile ? `<a href="tel:${escapeHtml(emp.mobile)}" class="text-decoration-none">${escapeHtml(emp.mobile)}</a>` : '—');
        $('#modalEmail').html(emp.email ? `<a href="mailto:${escapeHtml(emp.email)}" class="text-decoration-none">${escapeHtml(emp.email)}</a>` : '—');

        // Employment & Salary
        $('#modalDesignation').text(emp.designation || '—');
        $('#modalJoiningDate').text(formatDate(emp.joiningDate));
        $('#modalSalary').text(formatCurrency(emp.salary));

        // Addresses
        $('#modalPresentAddress').text(emp.presentAddress || '—');
        $('#modalPermanentAddress').text(emp.permanentAddress || '—');

        // NID Document Photo Preview
        const $nidContainer = $('#modalNidContainer');
        if (nidPhotoUrl) {
            $nidContainer.html(`
                <div class="nid-preview-wrapper p-2 rounded-3 border bg-white text-center">
                    <img src="${nidPhotoUrl}" alt="NID Document" class="img-fluid rounded-2 nid-preview-img mb-2 shadow-sm" />
                    <div>
                        <a href="${nidPhotoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1">
                            <i class="bi bi-box-arrow-up-right me-1"></i> Open Original Document
                        </a>
                    </div>
                </div>
            `);
        } else {
            $nidContainer.html(`
                <div class="p-3 bg-light rounded-3 text-muted text-center border">
                    <i class="bi bi-card-image fs-4 d-block mb-1 text-secondary"></i>
                    <small>No NID document uploaded</small>
                </div>
            `);
        }

        // System Metadata
        $('#modalCreatedOn').text(formatDate(emp.createdOn));
        $('#modalUpdatedOn').text(formatDate(emp.updatedOn));

        if (detailModalInstance) {
            detailModalInstance.show();
        } else {
            $detailModalEl.modal('show');
        }
    }

    // 9. Event Listeners
    // Search with debounce
    $searchInput.on('input', function () {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
            fetchEmployees(1);
        }, 350);
    });

    // Clear search
    $searchClearBtn.on('click', function () {
        $searchInput.val('').focus();
        fetchEmployees(1);
    });

    // Page size change
    $pageSizeSelect.on('change', function () {
        fetchEmployees(1);
    });

    // Refresh button
    $refreshBtn.on('click', function () {
        fetchEmployees(currentPageNumber);
        showToast('Refreshing employee list...', 'bi bi-arrow-clockwise text-primary');
    });

    // Retry button on error
    $btnRetry.on('click', function () {
        fetchEmployees(currentPageNumber);
    });

    // Pagination button clicks (event delegation)
    $paginationUl.on('click', '.page-link', function (e) {
        e.preventDefault();
        const requestedPage = parseInt($(this).data('page'), 10);
        if (requestedPage && requestedPage !== currentPageNumber && requestedPage >= 1 && requestedPage <= currentTotalPages) {
            fetchEmployees(requestedPage);
            // Smooth scroll to top of table
            $('html, body').animate({
                scrollTop: $container.offset().top - 80
            }, 200);
        }
    });

    // Open detail modal clicks (delegation)
    $tableBody.on('click', '.btn-view-employee, .employee-avatar-wrapper', function (e) {
        e.preventDefault();
        const employeeId = $(this).data('employee-id');
        if (employeeId) {
            openEmployeeDetails(employeeId);
        }
    });

    // Add employee placeholder
    $createBtn.add($btnEmptyAdd).on('click', function () {
        showToast('Create Employee form will be integrated in the next step.', 'bi bi-info-circle-fill text-info');
    });

    // 10. Initial API Call
    fetchEmployees(1);
});
