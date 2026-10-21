/**
 * ZamZam Trims (BD) Limited - Employee Tracking & Search Module
 * -------------------------------------------------------------
 * Provides real-time employee search by name using:
 * {ApiBaseUrl}/api/Employees/GetByName/{name}
 *
 * Features:
 *  - Debounced live search with dropdown auto-suggestions
 *  - Keyboard navigation (Up/Down/Enter/Escape)
 *  - Highlighting matched keywords in suggestions
 *  - Full profile display with personal details, payroll info, addresses, and documents
 *  - Multiple search results switcher chips
 *  - Document/Photo lightbox preview modal
 *  - Clipboard copy triggers with toast notification
 *  - Ready-to-use tracking timeline & geo-location mock feed
 */

$(function () {
    'use strict';

    // 1. Elements & Configuration
    const $container = $('#employeeTrackingContainer');
    let apiBaseUrl = ($container.data('api-base-url') || 'https://localhost:7148').replace(/\/+$/, '');

    // Protect against mixed content if client is accessed via HTTPS
    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace('http://localhost:', 'https://localhost:');
    }

    const GET_BY_NAME_URL = `${apiBaseUrl}/api/Employees/GetByName`;

    // DOM Elements
    const $searchForm = $('#trackingSearchForm');
    const $searchInput = $('#trackingSearchInput');
    const $searchClearBtn = $('#trackingSearchClear');
    const $searchSpinner = $('#trackingSearchSpinner');
    const $searchSubmitBtn = $('#trackingSearchSubmitBtn');
    const $searchSuggestions = $('#trackingSearchSuggestions');
    const $suggestionsList = $('#trackingSuggestionsList');
    const $suggestionsCount = $('#trackingSuggestionsCount');

    // States & Views
    const $initialState = $('#trackingInitialState');
    const $loadingState = $('#trackingLoadingState');
    const $noResultsState = $('#trackingNoResultsState');
    const $noResultsTerm = $('#trackingNoResultsTerm');
    const $errorState = $('#trackingErrorState');
    const $errorMessage = $('#trackingErrorMessage');
    const $detailCard = $('#trackingEmployeeDetailCard');
    const $multiResultsBar = $('#trackingMultiResultsBar');
    const $multiResultsChips = $('#trackingMultiResultsChips');
    const $multiResultsCount = $('#trackingMultiResultsCount');

    // Toast & Lightbox Modal
    const $toast = $('#dashToast');
    const $toastMessage = $('#dashToastMessage');
    const $imageModal = $('#trackingImagePreviewModal');
    let imageModalInstance = null;
    if ($imageModal.length && typeof bootstrap !== 'undefined') {
        imageModalInstance = new bootstrap.Modal($imageModal[0]);
    }

    // State Variables
    let debounceTimer = null;
    let activeSuggestionIndex = -1;
    let currentSearchResults = [];
    let currentSelectedEmployee = null;
    let currentSearchQuery = '';
    let isRequestInProgress = false;
    let toastTimeout = null;

    // 2. Helper Functions
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

    function getInitials(name) {
        if (!name) return 'EMP';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
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

    function calculateAge(dateStr) {
        if (!dateStr) return '';
        try {
            const birthDate = new Date(dateStr);
            if (isNaN(birthDate.getTime())) return '';
            const diffMs = Date.now() - birthDate.getTime();
            const ageDate = new Date(diffMs);
            const age = Math.abs(ageDate.getUTCFullYear() - 1970);
            return age > 0 ? ` (${age} yrs)` : '';
        } catch (e) {
            return '';
        }
    }

    function formatCurrency(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) return '—';
        return '৳ ' + Number(amount).toLocaleString('en-IN');
    }

    function formatMaritalStatus(val) {
        const map = { 1: 'Single', 2: 'Married', 3: 'Divorced' };
        return map[val] || (val ? `Status #${val}` : '—');
    }

    function formatReligion(val) {
        const map = {
            1: 'Islam',
            2: 'Hinduism',
            3: 'Christianity',
            4: 'Buddhism',
            5: 'Others'
        };
        return map[val] || (val ? `Religion #${val}` : '—');
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

    function copyToClipboard(text, label) {
        if (!text || text === '—') return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast(`${label || 'Text'} copied to clipboard!`, 'bi bi-clipboard-check-fill text-primary');
            }).catch(function () {
                fallbackCopy(text, label);
            });
        } else {
            fallbackCopy(text, label);
        }
    }

    function fallbackCopy(text, label) {
        const $temp = $('<textarea>');
        $('body').append($temp);
        $temp.val(text).select();
        try {
            document.execCommand('copy');
            showToast(`${label || 'Text'} copied to clipboard!`, 'bi bi-clipboard-check-fill text-primary');
        } catch (e) {
            showToast('Unable to copy text.', 'bi bi-exclamation-triangle-fill text-warning');
        }
        $temp.remove();
    }

    // Highlight search match in text
    function highlightMatch(text, query) {
        if (!text) return '';
        if (!query) return escapeHtml(text);
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return escapeHtml(text).replace(regex, '<span class="search-highlight">$1</span>');
    }

    // Image fallback handler
    window.handleTrackingImgError = function (imgEl, initials) {
        const $parent = $(imgEl).parent();
        $(imgEl).remove();
        $parent.html(`
            <div class="tracking-avatar-fallback">
                ${escapeHtml(initials || 'EMP')}
            </div>
        `);
    };

    // 3. UI State Management
    function setViewState(state) {
        $initialState.addClass('d-none');
        $loadingState.addClass('d-none');
        $noResultsState.addClass('d-none');
        $errorState.addClass('d-none');
        $detailCard.addClass('d-none');
        $multiResultsBar.addClass('d-none');

        if (state === 'initial') {
            $initialState.removeClass('d-none');
        } else if (state === 'loading') {
            $loadingState.removeClass('d-none');
        } else if (state === 'no-results') {
            $noResultsState.removeClass('d-none');
        } else if (state === 'error') {
            $errorState.removeClass('d-none');
        } else if (state === 'detail') {
            $detailCard.removeClass('d-none');
            if (currentSearchResults.length > 1) {
                $multiResultsBar.removeClass('d-none');
            }
        }
    }

    // 4. API Search Execution
    function searchEmployeesByName(query, autoSelectFirst = false) {
        const term = (query || '').trim();
        if (!term) {
            hideSuggestions();
            setViewState('initial');
            return;
        }

        currentSearchQuery = term;
        isRequestInProgress = true;
        $searchSpinner.removeClass('d-none');
        $searchClearBtn.hide();

        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const requestUrl = `${GET_BY_NAME_URL}/${encodeURIComponent(term)}`;
        console.log(`[Employee Tracking] Searching: ${requestUrl}`);

        $.ajax({
            url: requestUrl,
            type: 'GET',
            dataType: 'json',
            headers: headers,
            cache: false,
            timeout: 12000,
            success: function (response) {
                isRequestInProgress = false;
                $searchSpinner.addClass('d-none');
                if (term.length > 0) $searchClearBtn.show();

                console.log('[Employee Tracking] Search Response:', response);

                let employees = [];
                if (response && response.succeeded !== false && Array.isArray(response.data)) {
                    employees = response.data;
                } else if (Array.isArray(response)) {
                    employees = response;
                }

                currentSearchResults = employees;

                if (employees.length === 0) {
                    hideSuggestions();
                    $noResultsTerm.text(`"${term}"`);
                    setViewState('no-results');
                } else {
                    if (autoSelectFirst) {
                        hideSuggestions();
                        selectEmployee(employees[0]);
                    } else {
                        renderSuggestions(employees, term);
                        // If user explicitly pressed search/submit, also load the first employee in detail
                        if ($detailCard.hasClass('d-none')) {
                            selectEmployee(employees[0], false);
                        }
                    }
                }
            },
            error: function (xhr, status, error) {
                isRequestInProgress = false;
                $searchSpinner.addClass('d-none');
                if (term.length > 0) $searchClearBtn.show();
                hideSuggestions();

                console.error('[Employee Tracking] Error:', status, error, xhr);

                if (xhr.status === 401) {
                    $errorMessage.text('Authentication session expired (401). Please sign in again.');
                    showToast('Session expired. Please sign in.', 'bi bi-shield-lock-fill text-warning');
                    setViewState('error');
                    setTimeout(function () {
                        window.location.href = '/Account/Login';
                    }, 2000);
                } else if (xhr.status === 404) {
                    $noResultsTerm.text(`"${term}"`);
                    setViewState('no-results');
                } else {
                    const msg = xhr.responseJSON?.message || error || 'Unable to connect to employee search service.';
                    $errorMessage.text(msg);
                    setViewState('error');
                }
            }
        });
    }

    // 5. Autocomplete Suggestions Rendering
    function renderSuggestions(employees, query) {
        $suggestionsList.empty();
        activeSuggestionIndex = -1;

        $suggestionsCount.text(`${employees.length} found`);

        employees.forEach((emp, index) => {
            const initials = getInitials(emp.name);
            const avatarUrl = getFullImageUrl(emp.imagePath);

            const avatarHtml = avatarUrl
                ? `<div class="suggestion-avatar">
                     <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(emp.name)}" onerror="handleTrackingImgError(this, '${escapeHtml(initials)}')" />
                   </div>`
                : `<div class="suggestion-avatar suggestion-avatar-fallback">${escapeHtml(initials)}</div>`;

            const highlightedName = highlightMatch(emp.name, query);
            const designation = emp.designation ? escapeHtml(emp.designation) : 'Employee';
            const mobile = emp.mobile ? escapeHtml(emp.mobile) : '';
            const email = emp.email ? escapeHtml(emp.email) : '';

            const $item = $(`
                <div class="tracking-suggestion-item" data-index="${index}">
                    ${avatarHtml}
                    <div class="suggestion-info">
                        <div class="suggestion-name-row">
                            <span class="suggestion-name">${highlightedName}</span>
                            <span class="suggestion-badge">ID: #${emp.id}</span>
                        </div>
                        <div class="suggestion-meta">
                            <span class="suggestion-desig"><i class="bi bi-briefcase me-1"></i>${designation}</span>
                            ${mobile ? `<span class="suggestion-contact"><i class="bi bi-telephone me-1"></i>${mobile}</span>` : ''}
                            ${email ? `<span class="suggestion-contact d-none d-md-inline"><i class="bi bi-envelope me-1"></i>${email}</span>` : ''}
                        </div>
                    </div>
                    <div class="suggestion-arrow">
                        <i class="bi bi-arrow-right-short"></i>
                    </div>
                </div>
            `);

            $item.on('click', function () {
                selectEmployee(emp);
                hideSuggestions();
            });

            $suggestionsList.append($item);
        });

        $searchSuggestions.removeClass('d-none').addClass('show');
    }

    function hideSuggestions() {
        $searchSuggestions.removeClass('show').addClass('d-none');
        activeSuggestionIndex = -1;
    }

    function updateActiveSuggestion(items) {
        items.removeClass('active');
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < items.length) {
            const $active = items.eq(activeSuggestionIndex);
            $active.addClass('active');
            // Ensure visible in scroll view
            const containerTop = $suggestionsList.scrollTop();
            const containerBottom = containerTop + $suggestionsList.innerHeight();
            const elemTop = $active.position().top + containerTop;
            const elemBottom = elemTop + $active.outerHeight();

            if (elemBottom > containerBottom) {
                $suggestionsList.scrollTop(elemBottom - $suggestionsList.innerHeight());
            } else if (elemTop < containerTop) {
                $suggestionsList.scrollTop(elemTop);
            }
        }
    }

    // 6. Select Employee & Populate Detailed Tracking Card
    function selectEmployee(emp, updateInput = true) {
        if (!emp) return;
        currentSelectedEmployee = emp;

        if (updateInput) {
            $searchInput.val(emp.name || '');
            $searchClearBtn.show();
        }

        const initials = getInitials(emp.name);
        const avatarUrl = getFullImageUrl(emp.imagePath);
        const nidUrl = getFullImageUrl(emp.nidImagePath);

        // Header
        $('#detailEmpName').text(emp.name || 'Unnamed Employee');
        $('#detailEmpDesignation').text(emp.designation || 'Not Specified');
        $('#detailEmpId').text(`#${emp.id || '—'}`);
        $('#detailEmpStatus').html(`
            <span class="status-indicator-dot"></span> Active
        `);

        // Hero Avatar
        const $heroAvatar = $('#detailEmpAvatarWrapper');
        if (avatarUrl) {
            $heroAvatar.html(`
                <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(emp.name)}" class="tracking-hero-avatar-img" onerror="handleTrackingImgError(this, '${escapeHtml(initials)}')" />
            `);
        } else {
            $heroAvatar.html(`
                <div class="tracking-hero-avatar-fallback">${escapeHtml(initials)}</div>
            `);
        }

        // Hero Stats
        $('#detailEmpSalary').text(formatCurrency(emp.salary));
        $('#detailEmpJoiningDate').text(formatDate(emp.joiningDate));

        const $mobileEl = $('#detailEmpMobile');
        if (emp.mobile) {
            $mobileEl.html(`
                <a href="tel:${escapeHtml(emp.mobile)}" class="text-decoration-none text-dark fw-semibold">${escapeHtml(emp.mobile)}</a>
                <button type="button" class="btn-copy-small ms-1" data-copy="${escapeHtml(emp.mobile)}" data-label="Mobile number" title="Copy mobile number">
                    <i class="bi bi-copy"></i>
                </button>
            `);
        } else {
            $mobileEl.text('—');
        }

        const $emailEl = $('#detailEmpEmail');
        if (emp.email) {
            $emailEl.html(`
                <a href="mailto:${escapeHtml(emp.email)}" class="text-decoration-none text-dark fw-semibold text-truncate d-inline-block" style="max-width: 220px;" title="${escapeHtml(emp.email)}">${escapeHtml(emp.email)}</a>
                <button type="button" class="btn-copy-small ms-1" data-copy="${escapeHtml(emp.email)}" data-label="Email address" title="Copy email address">
                    <i class="bi bi-copy"></i>
                </button>
            `);
        } else {
            $emailEl.text('—');
        }

        // Personal Information
        $('#detailEmpFatherName').text(emp.fatherName || '—');
        const dobStr = formatDate(emp.dateOfBirth);
        const ageStr = calculateAge(emp.dateOfBirth);
        $('#detailEmpDob').text(dobStr !== '—' ? `${dobStr}${ageStr}` : '—');

        const $nidEl = $('#detailEmpNid');
        if (emp.nidNo) {
            $nidEl.html(`
                <span>${escapeHtml(emp.nidNo)}</span>
                <button type="button" class="btn-copy-small ms-1" data-copy="${escapeHtml(emp.nidNo)}" data-label="NID Number" title="Copy NID">
                    <i class="bi bi-copy"></i>
                </button>
            `);
        } else {
            $nidEl.text('—');
        }

        $('#detailEmpEducation').text(emp.academicQualification || '—');
        $('#detailEmpReligion').text(formatReligion(emp.religion));
        $('#detailEmpMarital').text(formatMaritalStatus(emp.maritalStatus));

        // Addresses
        $('#detailEmpPresentAddress').text(emp.presentAddress || 'No present address recorded.');
        $('#detailEmpPermanentAddress').text(emp.permanentAddress || 'No permanent address recorded.');

        // Photos & Documents
        const $photoBox = $('#detailPhotoThumbnailBox');
        if (avatarUrl) {
            $photoBox.html(`
                <div class="tracking-doc-card">
                    <img src="${escapeHtml(avatarUrl)}" alt="Employee Photo" class="tracking-doc-thumb" onerror="handleTrackingImgError(this, '${escapeHtml(initials)}')" />
                    <div class="tracking-doc-overlay">
                        <button type="button" class="btn btn-sm btn-light shadow-sm btn-zoom-image" data-img-url="${escapeHtml(avatarUrl)}" data-img-title="${escapeHtml(emp.name)} - Profile Photo">
                            <i class="bi bi-zoom-in me-1"></i> Preview
                        </button>
                    </div>
                </div>
            `);
        } else {
            $photoBox.html(`
                <div class="tracking-doc-empty">
                    <i class="bi bi-person-bounding-box text-muted fs-3 mb-1"></i>
                    <span class="small text-muted">No photo uploaded</span>
                </div>
            `);
        }

        const $nidBox = $('#detailNidThumbnailBox');
        if (nidUrl) {
            $nidBox.html(`
                <div class="tracking-doc-card">
                    <img src="${escapeHtml(nidUrl)}" alt="NID Card" class="tracking-doc-thumb" />
                    <div class="tracking-doc-overlay">
                        <button type="button" class="btn btn-sm btn-light shadow-sm btn-zoom-image" data-img-url="${escapeHtml(nidUrl)}" data-img-title="${escapeHtml(emp.name)} - NID Document">
                            <i class="bi bi-zoom-in me-1"></i> Preview NID
                        </button>
                    </div>
                </div>
            `);
        } else {
            $nidBox.html(`
                <div class="tracking-doc-empty">
                    <i class="bi bi-card-image text-muted fs-3 mb-1"></i>
                    <span class="small text-muted">No NID copy uploaded</span>
                </div>
            `);
        }

        // Live Tracking & Activity Mock Data
        $('#trackingTargetName').text(emp.name);
        const randomLat = (23.8041 + (emp.id * 0.003)).toFixed(4);
        const randomLng = (90.3667 + (emp.id * 0.002)).toFixed(4);
        $('#trackingCoordinates').text(`${randomLat}° N, ${randomLng}° E`);

        // Multi-result switcher chips
        renderMultiResultsChips();

        setViewState('detail');
        showToast(`Loaded details for ${emp.name}`, 'bi bi-person-check-fill text-success');
    }

    // Render chips if multiple employees matched the search
    function renderMultiResultsChips() {
        if (!currentSearchResults || currentSearchResults.length <= 1) {
            $multiResultsBar.addClass('d-none');
            return;
        }

        $multiResultsCount.text(currentSearchResults.length);
        $multiResultsChips.empty();

        currentSearchResults.forEach((emp) => {
            const isSelected = currentSelectedEmployee && currentSelectedEmployee.id === emp.id;
            const $chip = $(`
                <button type="button" class="tracking-result-chip ${isSelected ? 'active' : ''}">
                    <i class="bi bi-person-fill"></i>
                    <span class="chip-name">${escapeHtml(emp.name)}</span>
                    <span class="chip-id">#${emp.id}</span>
                </button>
            `);

            $chip.on('click', function () {
                selectEmployee(emp, true);
            });

            $multiResultsChips.append($chip);
        });

        $multiResultsBar.removeClass('d-none');
    }

    // 7. Event Listeners
    // Live Search Input (Debounced)
    $searchInput.on('input', function () {
        const query = $(this).val();

        if (query.trim().length > 0) {
            $searchClearBtn.show();
        } else {
            $searchClearBtn.hide();
            hideSuggestions();
            if (!currentSelectedEmployee) {
                setViewState('initial');
            }
            return;
        }

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            if (query.trim().length >= 1) {
                searchEmployeesByName(query, false);
            }
        }, 280);
    });

    // Clear Search Input
    $searchClearBtn.on('click', function () {
        $searchInput.val('').focus();
        $searchClearBtn.hide();
        hideSuggestions();
        if (currentSelectedEmployee) {
            // keep current detail or reset
        } else {
            setViewState('initial');
        }
    });

    // Keyboard Navigation in Suggestions Dropdown
    $searchInput.on('keydown', function (e) {
        const $items = $suggestionsList.find('.tracking-suggestion-item');
        if (!$items.length || $searchSuggestions.hasClass('d-none')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = $searchInput.val().trim();
                if (query) {
                    searchEmployeesByName(query, true);
                }
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % $items.length;
            updateActiveSuggestion($items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex - 1 + $items.length) % $items.length;
            updateActiveSuggestion($items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSuggestionIndex >= 0 && activeSuggestionIndex < $items.length) {
                $items.eq(activeSuggestionIndex).trigger('click');
            } else {
                searchEmployeesByName($searchInput.val().trim(), true);
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });

    // Submit Search Form
    $searchForm.on('submit', function (e) {
        e.preventDefault();
        const query = $searchInput.val().trim();
        if (query) {
            searchEmployeesByName(query, true);
        } else {
            $searchInput.focus();
        }
    });

    // Close suggestions on outside click
    $(document).on('click', function (e) {
        if (!$(e.target).closest('.tracking-search-box-wrapper').length) {
            hideSuggestions();
        }
    });

    // Reopen suggestions if input clicked with text
    $searchInput.on('focus', function () {
        const query = $(this).val().trim();
        if (query && currentSearchResults.length > 0) {
            renderSuggestions(currentSearchResults, query);
        }
    });

    // Copy to clipboard buttons
    $(document).on('click', '.btn-copy-small', function () {
        const text = $(this).data('copy');
        const label = $(this).data('label');
        copyToClipboard(text, label);
    });

    // Image Zoom / Lightbox triggers
    $(document).on('click', '.btn-zoom-image', function () {
        const url = $(this).data('img-url');
        const title = $(this).data('img-title') || 'Image Preview';
        if (!url) return;

        $('#trackingModalImage').attr('src', url);
        $('#trackingModalImageTitle').text(title);

        if (imageModalInstance) {
            imageModalInstance.show();
        }
    });

    // Reset / Search Another Employee button
    $('#btnResetTrackingSearch, #btnSearchAnotherEmployee').on('click', function () {
        $searchInput.val('').focus();
        $searchClearBtn.hide();
        hideSuggestions();
        currentSelectedEmployee = null;
        currentSearchResults = [];
        setViewState('initial');
    });

    // Refresh Current Employee
    $('#btnRefreshTrackingEmployee').on('click', function () {
        if (currentSelectedEmployee && currentSelectedEmployee.name) {
            const $btn = $(this);
            $btn.find('i').addClass('spin-animation');
            searchEmployeesByName(currentSelectedEmployee.name, true);
            setTimeout(function () {
                $btn.find('i').removeClass('spin-animation');
            }, 800);
        }
    });

    // Retry on Error button
    $('#btnRetryTrackingSearch').on('click', function () {
        const query = $searchInput.val().trim();
        if (query) {
            searchEmployeesByName(query, true);
        } else {
            setViewState('initial');
        }
    });

    // Quick suggestion pills click in initial state
    $(document).on('click', '.tracking-example-pill', function () {
        const term = $(this).data('term') || $(this).text().trim();
        $searchInput.val(term);
        $searchClearBtn.show();
        searchEmployeesByName(term, true);
    });

    // 8. Initialization
    setViewState('initial');
    console.log('[Employee Tracking] Initialized with API Base:', apiBaseUrl);
});
