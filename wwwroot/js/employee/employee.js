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
    const PUT_EMPLOYEE_URL = `${apiBaseUrl}/api/Employees`;
    const GET_MARITAL_STATUS_URL = `${apiBaseUrl}/api/Dropdown/GetAllMaritalStatus`;
    const GET_RELIGION_URL = `${apiBaseUrl}/api/Dropdown/GetAllReligion`;

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

    // Ultra-Modern Edit Modal HTML template (guaranteed in DOM)
    const employeeEditModalHtml = `
        <div class="modal fade" id="employeeEditModal" tabindex="-1" aria-labelledby="employeeEditModalTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable" style="max-width: 900px;">
                <form id="editEmployeeForm" class="modal-content modern-create-modal-content border-0" novalidate autocomplete="off">
                    <input type="hidden" id="editEmpId" value="0" />

                    <!-- Modal Header (Pinned at top) -->
                    <div class="modal-header border-bottom px-4 py-3 align-items-center d-flex justify-content-between">
                        <div class="d-flex align-items-center gap-3">
                            <div class="create-modal-icon-badge" style="background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); color: #4f46e5;">
                                <i class="bi bi-person-gear"></i>
                            </div>
                            <div>
                                <h5 class="modal-title fw-bold text-dark m-0 d-flex align-items-center gap-2">
                                    <span id="employeeEditModalTitle">Update Employee</span>
                                    <span class="dash-id-badge" id="editEmpBadgeId">#0</span>
                                </h5>
                                <small class="text-muted">Modify employee personal credentials, contact, salary, and documents</small>
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <button type="submit" class="btn btn-primary btn-sm rounded-3 px-3 py-1 d-inline-flex align-items-center gap-1 shadow-sm d-none d-sm-inline-flex" id="btnHeaderUpdateEmployee" title="Save changes">
                                <i class="bi bi-check2"></i>
                                <span>Update</span>
                            </button>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                    </div>

                    <!-- Modal Body (Scrolls between fixed header and footer) -->
                    <div class="modal-body px-4 py-3" id="editEmployeeModalBody">
                        <div class="alert alert-danger py-2 px-3 small rounded-3 d-none mb-3" id="editEmpModalAlert" role="alert"></div>

                            <!-- 1. Personal Information Section -->
                            <div class="emp-info-card mb-3">
                                <div class="emp-info-card-header">
                                    <i class="bi bi-person-fill"></i>
                                    <span>Personal Information</span>
                                </div>
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label for="editEmpName" class="form-label small fw-bold text-dark mb-1">
                                            Full Name <span class="text-danger">*</span>
                                        </label>
                                        <input type="text" class="form-control form-control-sm rounded-3" id="editEmpName" placeholder="e.g. Jubayer Hossain" required />
                                    </div>
                                    <div class="col-md-6">
                                        <label for="editEmpFatherName" class="form-label small fw-bold text-dark mb-1">
                                            Father's Name <span class="text-danger">*</span>
                                        </label>
                                        <input type="text" class="form-control form-control-sm rounded-3" id="editEmpFatherName" placeholder="e.g. Md Kamal Uddin" required />
                                    </div>
                                    <div class="col-md-4">
                                        <label for="editEmpNidNo" class="form-label small fw-bold text-dark mb-1">
                                            National ID (NID) <span class="text-danger">*</span>
                                        </label>
                                        <input type="text" class="form-control form-control-sm rounded-3" id="editEmpNidNo" placeholder="e.g. 4783673396" required />
                                    </div>
                                    <div class="col-md-4">
                                        <label for="editEmpDateOfBirth" class="form-label small fw-bold text-dark mb-1">
                                            Date of Birth
                                        </label>
                                        <input type="date" class="form-control form-control-sm rounded-3" id="editEmpDateOfBirth" />
                                    </div>
                                    <div class="col-md-4">
                                        <label for="editEmpMaritalStatus" class="form-label small fw-bold text-dark mb-1">
                                            Marital Status
                                        </label>
                                        <select class="form-select form-select-sm rounded-3" id="editEmpMaritalStatus">
                                            <option value="1">Single</option>
                                            <option value="2">Married</option>
                                            <option value="3">Divorced</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="editEmpReligion" class="form-label small fw-bold text-dark mb-1">
                                            Religion
                                        </label>
                                        <select class="form-select form-select-sm rounded-3" id="editEmpReligion">
                                            <option value="1">Islam</option>
                                            <option value="2">Hinduism</option>
                                            <option value="3">Christianity</option>
                                            <option value="4">Buddhism</option>
                                            <option value="5">Others</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="editEmpAcademicQualification" class="form-label small fw-bold text-dark mb-1">
                                            Academic Qualification
                                        </label>
                                        <input type="text" class="form-control form-control-sm rounded-3" id="editEmpAcademicQualification" placeholder="e.g. HSC, Bachelor's, Diploma" />
                                    </div>
                                </div>
                            </div>

                            <!-- 2. Employment & Payroll Section -->
                            <div class="emp-info-card mb-3">
                                <div class="emp-info-card-header">
                                    <i class="bi bi-briefcase-fill"></i>
                                    <span>Employment &amp; Payroll</span>
                                </div>
                                <div class="row g-3">
                                    <div class="col-md-5">
                                        <label for="editEmpDesignation" class="form-label small fw-bold text-dark mb-1">
                                            Designation <span class="text-danger">*</span>
                                        </label>
                                        <input type="text" class="form-control form-control-sm rounded-3" id="editEmpDesignation" placeholder="e.g. Senior Executive" required />
                                    </div>
                                    <div class="col-md-4">
                                        <label for="editEmpJoiningDate" class="form-label small fw-bold text-dark mb-1">
                                            Joining Date <span class="text-danger">*</span>
                                        </label>
                                        <input type="date" class="form-control form-control-sm rounded-3" id="editEmpJoiningDate" required />
                                    </div>
                                    <div class="col-md-3">
                                        <label for="editEmpSalary" class="form-label small fw-bold text-dark mb-1">
                                            Salary (BDT) <span class="text-danger">*</span>
                                        </label>
                                        <div class="input-group input-group-sm">
                                            <span class="input-group-text bg-light text-muted fw-bold">৳</span>
                                            <input type="number" class="form-control form-control-sm rounded-end-3" id="editEmpSalary" min="0" step="100" placeholder="0" required />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 3. Contact & Address Section -->
                            <div class="emp-info-card mb-3">
                                <div class="emp-info-card-header">
                                    <i class="bi bi-telephone-fill"></i>
                                    <span>Contact &amp; Address</span>
                                </div>
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label for="editEmpMobile" class="form-label small fw-bold text-dark mb-1">
                                            Mobile Number <span class="text-danger">*</span>
                                        </label>
                                        <input type="tel" class="form-control form-control-sm rounded-3" id="editEmpMobile" placeholder="e.g. 01913176712" required />
                                    </div>
                                    <div class="col-md-6">
                                        <label for="editEmpEmail" class="form-label small fw-bold text-dark mb-1">
                                            Email Address <span class="text-danger">*</span>
                                        </label>
                                        <input type="email" class="form-control form-control-sm rounded-3" id="editEmpEmail" placeholder="e.g. employee@zamzamtrims.com" required />
                                    </div>
                                    <div class="col-md-6">
                                        <label for="editEmpPresentAddress" class="form-label small fw-bold text-dark mb-1">
                                            Present Address
                                        </label>
                                        <textarea class="form-control form-control-sm rounded-3" id="editEmpPresentAddress" rows="2" placeholder="Current residential address"></textarea>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <label for="editEmpPermanentAddress" class="form-label small fw-bold text-dark m-0">
                                                Permanent Address
                                            </label>
                                            <div class="form-check form-check-inline m-0">
                                                <input class="form-check-input" type="checkbox" id="editSameAsPresentCheck" />
                                                <label class="form-check-label small text-muted" for="editSameAsPresentCheck" style="font-size: 0.75rem;">
                                                    Same as present
                                                </label>
                                            </div>
                                        </div>
                                        <textarea class="form-control form-control-sm rounded-3" id="editEmpPermanentAddress" rows="2" placeholder="Permanent home address"></textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- 4. Photo & NID Document Section -->
                            <div class="emp-info-card mb-1">
                                <div class="emp-info-card-header">
                                    <i class="bi bi-card-image"></i>
                                    <span>Profile Photo &amp; NID Document</span>
                                </div>
                                <div class="row g-3">
                                    <!-- Profile Photo -->
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold text-dark mb-1">
                                            Profile Photo
                                        </label>
                                        <div class="p-2 border rounded-3 bg-light d-flex align-items-center gap-3">
                                            <div id="editCurrentPhotoWrapper" style="width: 54px; height: 54px; flex-shrink: 0;"></div>
                                            <div class="flex-grow-1 min-w-0">
                                                <input type="file" class="form-control form-control-sm" id="editEmpImageFile" accept=".jpg,.jpeg,.png,.webp" />
                                                <small class="text-muted d-block mt-1" style="font-size: 0.72rem;">Leave empty to keep existing photo (Max 2MB)</small>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- NID Document -->
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold text-dark mb-1">
                                            NID Document Photo
                                        </label>
                                        <div class="p-2 border rounded-3 bg-light d-flex align-items-center gap-3">
                                            <div id="editCurrentNidWrapper" style="width: 54px; height: 54px; flex-shrink: 0;"></div>
                                            <div class="flex-grow-1 min-w-0">
                                                <input type="file" class="form-control form-control-sm" id="editEmpNidImageFile" accept=".jpg,.jpeg,.png,.pdf,.webp" />
                                                <small class="text-muted d-block mt-1" style="font-size: 0.72rem;">Leave empty to keep existing NID (Max 5MB)</small>
                                            </div>
                                        </div>
                                    </div>
                        </div>
                    </div>

                    <!-- Modal Footer (Always visible & pinned at the bottom) -->
                    <div class="modal-footer bg-light border-top px-4 py-3 d-flex justify-content-between align-items-center" style="position: sticky; bottom: 0; z-index: 1050; box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05); background-color: #f8fafc !important;">
                        <button type="button" class="btn btn-outline-secondary btn-sm rounded-3 px-3 py-2" data-bs-dismiss="modal">
                            Cancel
                        </button>
                        <div class="d-flex align-items-center gap-2">
                            <button type="submit" class="btn btn-primary btn-sm rounded-3 px-4 py-2 d-inline-flex align-items-center gap-2 shadow-sm" id="btnSubmitUpdateEmployee">
                                <i class="bi bi-check2-circle"></i>
                                <span id="btnSubmitUpdateEmployeeText">Update Employee</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Ultra-Modern Delete Modal HTML template (guaranteed in DOM even without view recompile)
    const employeeDeleteModalHtml = `
        <div class="modal fade" id="employeeDeleteModal" tabindex="-1" aria-labelledby="employeeDeleteModalTitle" aria-hidden="true">
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
                        <h4 class="delete-modal-heading" id="employeeDeleteModalTitle">Delete Employee?</h4>
                        <p class="delete-modal-subtext">
                            You are about to permanently remove this employee record from the directory.
                        </p>
                        <div class="delete-target-preview-card">
                            <div id="deleteTargetAvatarContainer" class="d-flex align-items-center justify-content-center">
                                <img id="deleteTargetThumb" src="" alt="Thumbnail" class="delete-target-thumb" onerror="this.src='/images/logo-icon.png'" />
                            </div>
                            <div class="delete-target-info">
                                <div class="delete-target-badge"><span id="deleteTargetId">#00</span></div>
                                <div class="delete-target-title" id="deleteTargetName">Loading...</div>
                                <div class="delete-target-desc" id="deleteTargetDesignation">—</div>
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
                            <button type="button" class="btn-modal-delete" id="btnConfirmDeleteEmployee">
                                <i class="bi bi-trash3-fill"></i>
                                <span id="btnConfirmDeleteEmployeeText">Delete Employee</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    function ensureModalsInDom() {
        let delEl = document.getElementById('employeeDeleteModal');
        if (!delEl) {
            $('body').append(employeeDeleteModalHtml);
        } else if (!$(delEl).find('.modern-delete-modal-content').length) {
            $(delEl).remove();
            $('body').append(employeeDeleteModalHtml);
        }

        let editEl = document.getElementById('employeeEditModal');
        if (!editEl) {
            $('body').append(employeeEditModalHtml);
        } else if (!$(editEl).find('#btnHeaderUpdateEmployee').length) {
            $(editEl).remove();
            $('body').append(employeeEditModalHtml);
        }
    }
    ensureModalsInDom();

    let pendingDeleteEmployeeId = null;

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
        const maritalStatusMap = {
            1: 'Single',
            2: 'Married',
            3: 'Divorced'
        };
        return maritalStatusMap[val] || (val ? `Status #${val}` : '—');
    }

    function formatReligion(val) {
        const religionMap = {
            1: 'Islam',
            2: 'Hinduism',
            3: 'Christianity',
            4: 'Buddhism',
            5: 'Others'
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
                    <td class="text-end">
                        <div class="dash-action-btn-group">
                            <button type="button" class="dash-action-btn btn-view btn-view-employee" data-employee-id="${id}" title="View Employee Profile">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button type="button" class="dash-action-btn btn-edit btn-edit-employee" data-employee-id="${id}" onclick="window.openEditEmployee('${id}'); if(window.event) window.event.stopPropagation();" title="Update Employee">
                                <i class="bi bi-pencil-square" style="pointer-events: none;"></i>
                            </button>
                            <button type="button" class="dash-action-btn btn-delete btn-delete-employee text-danger" data-employee-id="${id}" onclick="window.confirmDeleteEmployee('${id}'); if(window.event) window.event.stopPropagation();" title="Delete Employee">
                                <i class="bi bi-trash3" style="pointer-events: none;"></i>
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

    // 9. Delete Confirmation & API Call
    window.confirmDeleteEmployee = function (employeeId) {
        ensureModalsInDom();
        pendingDeleteEmployeeId = employeeId;

        // Search in items with flexible key casing
        const emp = currentEmployeesList.find(e => String(e.id ?? e.Id ?? '') === String(employeeId)) || {};
        const idDisplay = emp.id || emp.Id || employeeId;
        const name = escapeHtml(emp.name || emp.Name || `Employee #${idDisplay}`);
        const designation = escapeHtml(emp.designation || emp.Designation || 'Staff');
        const initial = (emp.name || emp.Name || 'E').trim().charAt(0).toUpperCase();
        const photoUrl = getFullImageUrl(emp.imagePath || emp.ImagePath);

        $('#deleteTargetId').text(`#${idDisplay}`);
        $('#deleteTargetName').text(name);
        $('#deleteTargetDesignation').text(designation);

        const $avatarContainer = $('#deleteTargetAvatarContainer');
        if (photoUrl) {
            $avatarContainer.html(`
                <img id="deleteTargetThumb" src="${photoUrl}" alt="${name}" class="delete-target-thumb" onerror="this.onerror=null; $(this).replaceWith('<div class=\\'employee-avatar-fallback delete-target-thumb rounded-3\\'>${initial}</div>');" />
            `);
        } else {
            $avatarContainer.html(`
                <div class="employee-avatar-fallback delete-target-thumb rounded-3" style="width: 50px; height: 50px; font-weight: 700; font-size: 1.1rem; border-radius: 12px;">
                    ${initial}
                </div>
            `);
        }

        const modalEl = document.getElementById('employeeDeleteModal');
        if (modalEl) {
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
                modalInstance.show();
            } else if (typeof $ !== 'undefined' && $.fn.modal) {
                $(modalEl).modal('show');
            }
        } else {
            console.error('[Employees] employeeDeleteModal element missing');
        }
    };

    function executeDeleteEmployee(id) {
        const token = getAuthToken();
        const headers = {
            'Accept': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const $btn = $('#btnConfirmDeleteEmployee');
        const $btnText = $('#btnConfirmDeleteEmployeeText');
        $btn.prop('disabled', true);
        $btnText.text('Deleting...');

        const deleteApiUrl = `${apiBaseUrl}/api/Employees/${id}`;
        console.log(`[Employees] Sending DELETE to: ${deleteApiUrl}`);

        $.ajax({
            url: deleteApiUrl,
            type: 'DELETE',
            headers: headers,
            cache: false,
            timeout: 15000,
            success: function (res) {
                console.log('[Employees] Delete response:', res);
                const modalEl = document.getElementById('employeeDeleteModal');
                if (modalEl) {
                    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                        const modalInstance = bootstrap.Modal.getInstance(modalEl);
                        if (modalInstance) modalInstance.hide();
                    } else if (typeof $ !== 'undefined' && $.fn.modal) {
                        $(modalEl).modal('hide');
                    }
                }

                showToast('Employee deleted successfully!', 'bi bi-trash3-fill text-danger');

                // If current page now has no items (e.g. was only 1 item on last page and page > 1), adjust page if needed
                if (currentEmployeesList.length === 1 && currentPageNumber > 1) {
                    fetchEmployees(currentPageNumber - 1);
                } else {
                    fetchEmployees(currentPageNumber);
                }
            },
            error: function (xhr, status, error) {
                console.error('[Employees] Delete error:', xhr, status, error);
                let msg = 'Failed to delete employee. Please try again.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                } else if (xhr.statusText && xhr.statusText !== 'error') {
                    msg = `Error (${xhr.status}): ${xhr.statusText}`;
                }
                showToast(msg, 'bi bi-exclamation-triangle-fill text-warning');
            },
            complete: function () {
                $btn.prop('disabled', false);
                $btnText.text('Delete Employee');
                pendingDeleteEmployeeId = null;
            }
        });
    }

    // 10. Event Listeners
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

    // Helper to format ISO date to YYYY-MM-DD for input[type="date"]
    function toDateInputValue(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            return '';
        }
    }

    // Dropdown loader for Edit Employee modal
    let editDropdownsLoaded = false;
    function loadEditDropdowns(selectedMaritalStatus, selectedReligion) {
        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        if (!editDropdownsLoaded) {
            $.ajax({
                url: GET_MARITAL_STATUS_URL,
                type: 'GET',
                dataType: 'json',
                headers: headers,
                cache: true,
                success: function (res) {
                    const list = res && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
                    if (list.length > 0) {
                        let html = '<option value="">-- Select Marital Status --</option>';
                        list.forEach(item => {
                            html += `<option value="${item.id}">${escapeHtml(item.name)}</option>`;
                        });
                        $('#editEmpMaritalStatus').html(html);
                        if (selectedMaritalStatus) $('#editEmpMaritalStatus').val(String(selectedMaritalStatus));
                    }
                }
            });

            $.ajax({
                url: GET_RELIGION_URL,
                type: 'GET',
                dataType: 'json',
                headers: headers,
                cache: true,
                success: function (res) {
                    const list = res && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
                    if (list.length > 0) {
                        let html = '<option value="">-- Select Religion --</option>';
                        list.forEach(item => {
                            html += `<option value="${item.id}">${escapeHtml(item.name)}</option>`;
                        });
                        $('#editEmpReligion').html(html);
                        if (selectedReligion) $('#editEmpReligion').val(String(selectedReligion));
                    }
                }
            });
            editDropdownsLoaded = true;
        } else {
            if (selectedMaritalStatus) $('#editEmpMaritalStatus').val(String(selectedMaritalStatus));
            if (selectedReligion) $('#editEmpReligion').val(String(selectedReligion));
        }
    }

    // 10. Open Edit Employee Modal
    window.openEditEmployee = function (employeeId) {
        ensureModalsInDom();

        const emp = currentEmployeesList.find(e => String(e.id ?? e.Id ?? '') === String(employeeId)) || {};
        const idDisplay = emp.id || emp.Id || employeeId;
        const name = emp.name || emp.Name || '';
        const initial = (name || 'E').trim().charAt(0).toUpperCase();
        const photoUrl = getFullImageUrl(emp.imagePath || emp.ImagePath);
        const nidPhotoUrl = getFullImageUrl(emp.nidImagePath || emp.NidImagePath);

        $('#editEmpId').val(idDisplay);
        $('#editEmpBadgeId').text(`#${idDisplay}`);
        $('#editEmpName').val(name);
        $('#editEmpFatherName').val(emp.fatherName || emp.FatherName || '');
        $('#editEmpNidNo').val(emp.nidNo || emp.NidNo || '');
        $('#editEmpDateOfBirth').val(toDateInputValue(emp.dateOfBirth || emp.DateOfBirth));
        $('#editEmpAcademicQualification').val(emp.academicQualification || emp.AcademicQualification || '');
        $('#editEmpDesignation').val(emp.designation || emp.Designation || '');
        $('#editEmpJoiningDate').val(toDateInputValue(emp.joiningDate || emp.JoiningDate));
        $('#editEmpSalary').val(emp.salary ?? emp.Salary ?? 0);
        $('#editEmpMobile').val(emp.mobile || emp.Mobile || '');
        $('#editEmpEmail').val(emp.email || emp.Email || '');
        $('#editEmpPresentAddress').val(emp.presentAddress || emp.PresentAddress || '');
        $('#editEmpPermanentAddress').val(emp.permanentAddress || emp.PermanentAddress || '');
        $('#editSameAsPresentCheck').prop('checked', false);
        $('#editEmpPermanentAddress').prop('readonly', false).removeClass('bg-light');

        // Reset file inputs
        $('#editEmpImageFile').val('');
        $('#editEmpNidImageFile').val('');

        // Pre-populate dropdown selections
        const maritalVal = emp.maritalStatus ?? emp.MaritalStatus ?? 1;
        const religionVal = emp.religion ?? emp.Religion ?? 1;
        loadEditDropdowns(maritalVal, religionVal);

        // Profile Photo Thumbnail
        const $photoWrapper = $('#editCurrentPhotoWrapper');
        if (photoUrl) {
            $photoWrapper.html(`
                <img src="${photoUrl}" alt="${escapeHtml(name)}" class="rounded-2 border" style="width: 54px; height: 54px; object-fit: cover;" onerror="this.onerror=null; $(this).replaceWith('<div class=\\'employee-avatar-fallback rounded-2\\' style=\\'width: 54px; height: 54px; font-size: 1.1rem; font-weight: 700;\\'>${initial}</div>');" />
            `);
        } else {
            $photoWrapper.html(`
                <div class="employee-avatar-fallback rounded-2" style="width: 54px; height: 54px; font-size: 1.1rem; font-weight: 700;">
                    ${initial}
                </div>
            `);
        }

        // NID Document Thumbnail
        const $nidWrapper = $('#editCurrentNidWrapper');
        if (nidPhotoUrl) {
            $nidWrapper.html(`
                <img src="${nidPhotoUrl}" alt="NID Document" class="rounded-2 border" style="width: 54px; height: 54px; object-fit: cover;" />
            `);
        } else {
            $nidWrapper.html(`
                <div class="d-flex align-items-center justify-content-center bg-white rounded-2 border text-muted" style="width: 54px; height: 54px;">
                    <i class="bi bi-card-image fs-4"></i>
                </div>
            `);
        }

        $('#editEmpModalAlert').addClass('d-none').html('');
        $('#editEmployeeModalBody').scrollTop(0);

        const modalEl = document.getElementById('employeeEditModal');
        if (modalEl) {
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
                modalInstance.show();
            } else if (typeof $ !== 'undefined' && $.fn.modal) {
                $(modalEl).modal('show');
            }
        }
    };

    // Execute Update Employee (PUT multipart/form-data)
    function executeUpdateEmployee() {
        const id = $('#editEmpId').val();
        const name = ($('#editEmpName').val() || '').trim();
        const fatherName = ($('#editEmpFatherName').val() || '').trim();
        const nidNo = ($('#editEmpNidNo').val() || '').trim();
        const dateOfBirth = $('#editEmpDateOfBirth').val();
        const maritalStatus = $('#editEmpMaritalStatus').val() || '1';
        const religion = $('#editEmpReligion').val() || '1';
        const academicQualification = ($('#editEmpAcademicQualification').val() || '').trim();
        const designation = ($('#editEmpDesignation').val() || '').trim();
        const joiningDate = $('#editEmpJoiningDate').val();
        const salary = $('#editEmpSalary').val() || '0';
        const mobile = ($('#editEmpMobile').val() || '').trim();
        const email = ($('#editEmpEmail').val() || '').trim();
        const presentAddress = ($('#editEmpPresentAddress').val() || '').trim();
        const permanentAddress = ($('#editEmpPermanentAddress').val() || '').trim();

        // Validation
        if (!name || !fatherName || !nidNo || !designation || !joiningDate || !mobile || !email) {
            $('#editEmpModalAlert').removeClass('d-none').html('Please fill in all required fields (marked with *).');
            $('#editEmployeeModalBody').animate({ scrollTop: 0 }, 200);
            return;
        }

        let dateOfBirthIso;
        try {
            dateOfBirthIso = dateOfBirth ? new Date(dateOfBirth).toISOString() : new Date('1995-01-01').toISOString();
        } catch (e) {
            dateOfBirthIso = new Date('1995-01-01').toISOString();
        }

        let joiningDateIso;
        try {
            joiningDateIso = joiningDate ? new Date(joiningDate).toISOString() : new Date().toISOString();
        } catch (e) {
            joiningDateIso = new Date().toISOString();
        }

        const formData = new FormData();
        formData.append('Id', String(id));
        formData.append('Name', name);
        formData.append('FatherName', fatherName);
        formData.append('NidNo', nidNo);
        formData.append('DateOfBirth', dateOfBirthIso);
        formData.append('MaritalStatus', String(maritalStatus));
        formData.append('Religion', String(religion));
        formData.append('AcademicQualification', academicQualification);
        formData.append('Designation', designation);
        formData.append('JoiningDate', joiningDateIso);
        formData.append('Salary', String(salary));
        formData.append('Mobile', mobile);
        formData.append('Email', email);
        formData.append('PresentAddress', presentAddress);
        formData.append('PermanentAddress', permanentAddress);

        const imageInput = document.getElementById('editEmpImageFile');
        if (imageInput && imageInput.files && imageInput.files[0]) {
            formData.append('Image', imageInput.files[0], imageInput.files[0].name);
        }

        const nidInput = document.getElementById('editEmpNidImageFile');
        if (nidInput && nidInput.files && nidInput.files[0]) {
            formData.append('NidImage', nidInput.files[0], nidInput.files[0].name);
        }

        const token = getAuthToken();
        const headers = { 'Accept': '*/*' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const $btn = $('#btnSubmitUpdateEmployee');
        const $btnText = $('#btnSubmitUpdateEmployeeText');
        $btn.prop('disabled', true);
        $btnText.text('Updating...');
        $('#editEmpModalAlert').addClass('d-none').html('');

        console.log(`[Employees] Sending PUT to: ${PUT_EMPLOYEE_URL}`);

        $.ajax({
            url: PUT_EMPLOYEE_URL,
            type: 'PUT',
            data: formData,
            processData: false,
            contentType: false,
            headers: headers,
            timeout: 25000,
            success: function (res) {
                console.log('[Employees] Update response:', res);
                const modalEl = document.getElementById('employeeEditModal');
                if (modalEl) {
                    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                        const inst = bootstrap.Modal.getInstance(modalEl);
                        if (inst) inst.hide();
                    } else if (typeof $ !== 'undefined' && $.fn.modal) {
                        $(modalEl).modal('hide');
                    }
                }

                showToast('Employee updated successfully!', 'bi bi-check-circle-fill text-success');
                fetchEmployees(currentPageNumber);
            },
            error: function (xhr, status, error) {
                console.error('[Employees] Update error:', xhr, status, error);
                let msg = 'Failed to update employee. Please check inputs.';
                if (xhr.responseJSON) {
                    if (xhr.responseJSON.message) {
                        msg = xhr.responseJSON.message;
                    } else if (xhr.responseJSON.errors) {
                        msg = Object.values(xhr.responseJSON.errors).flat().join('<br>');
                    }
                } else if (xhr.statusText && xhr.statusText !== 'error') {
                    msg = `Error (${xhr.status}): ${xhr.statusText}`;
                }
                $('#editEmpModalAlert').removeClass('d-none').html(msg);
                showToast('Unable to update employee.', 'bi bi-exclamation-triangle-fill text-warning');
            },
            complete: function () {
                $btn.prop('disabled', false);
                $btnText.text('Update Employee');
            }
        });
    }

    // 11. Event Listeners
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

    // Open edit modal clicks (delegation)
    $tableBody.on('click', '.btn-edit-employee', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const employeeId = $(this).data('employee-id');
        if (employeeId) {
            window.openEditEmployee(employeeId);
        }
    });

    // Open delete confirmation modal clicks (delegation)
    $tableBody.on('click', '.btn-delete-employee', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const employeeId = $(this).data('employee-id');
        if (employeeId) {
            window.confirmDeleteEmployee(employeeId);
        }
    });

    // Confirm delete button click
    $(document).on('click', '#btnConfirmDeleteEmployee', function () {
        if (!pendingDeleteEmployeeId) return;
        executeDeleteEmployee(pendingDeleteEmployeeId);
    });

    // Update employee form submit / button click
    $(document).on('submit', '#editEmployeeForm', function (e) {
        e.preventDefault();
        executeUpdateEmployee();
    });

    $(document).on('click', '#btnSubmitUpdateEmployee, #btnHeaderUpdateEmployee', function (e) {
        e.preventDefault();
        executeUpdateEmployee();
    });

    // Edit modal "same as present" address toggle
    $(document).on('change', '#editSameAsPresentCheck', function () {
        if ($(this).is(':checked')) {
            $('#editEmpPermanentAddress').val($('#editEmpPresentAddress').val()).prop('readonly', true).addClass('bg-light');
        } else {
            $('#editEmpPermanentAddress').prop('readonly', false).removeClass('bg-light');
        }
    });

    // 12. Initial API Call
    fetchEmployees(1);
});
