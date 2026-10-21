/**
 * ZamZam Trims (BD) Limited - Employee Tracking & Location History Module
 * ----------------------------------------------------------------------
 * 1. Employee Search by Name:
 *    GET {ApiBaseUrl}/api/Employees/GetByName/{name}
 *
 * 2. Location History for Selected Employee:
 *    GET {ApiBaseUrl}/api/LocationHistory/GetAll?EmployeeId={id}&FromDate={FromDate}&ToDate={ToDate}&PageNumber={page}&PageSize={size}
 */

$(function () {
    'use strict';

    // 1. Elements & Configuration
    const $container = $('#employeeTrackingContainer');
    let apiBaseUrl = ($container.data('api-base-url') || 'https://localhost:7148').replace(/\/+$/, '');

    // Prevent mixed content on HTTPS
    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace('http://localhost:', 'https://localhost:');
    }

    const GET_EMPLOYEE_BY_NAME_URL = `${apiBaseUrl}/api/Employees/GetByName`;
    const GET_LOCATION_HISTORY_URL = `${apiBaseUrl}/api/LocationHistory/GetAll`;

    // Search Elements
    const $searchForm = $('#trackingSearchForm');
    const $searchInput = $('#trackingSearchInput');
    const $searchClearBtn = $('#trackingSearchClear');
    const $searchSpinner = $('#trackingSearchSpinner');
    const $searchSuggestions = $('#trackingSearchSuggestions');
    const $suggestionsList = $('#trackingSuggestionsList');
    const $suggestionsCount = $('#trackingSuggestionsCount');

    // Selected Employee Elements
    const $selectedEmployeeBanner = $('#selectedEmployeeBanner');
    const $selectedEmpAvatarWrapper = $('#selectedEmpAvatarWrapper');
    const $selectedEmpName = $('#selectedEmpName');
    const $selectedEmpDesignation = $('#selectedEmpDesignation');
    const $selectedEmpId = $('#selectedEmpId');
    const $selectedEmpMobile = $('#selectedEmpMobile');
    const $selectedEmpEmail = $('#selectedEmpEmail');
    const $btnChangeEmployee = $('#btnChangeEmployee');

    // Location History Table Elements
    const $trackingInitialState = $('#trackingInitialState');
    const $locationHistoryCard = $('#locationHistoryCard');
    const $historyTotalBadge = $('#historyTotalBadge');
    const $historySubtitle = $('#historySubtitle');
    const $historyFromDate = $('#historyFromDate');
    const $historyToDate = $('#historyToDate');
    const $btnFilterHistory = $('#btnFilterHistory');
    const $btnTodayHistory = $('#btnTodayHistory');
    const $historyPageSize = $('#historyPageSize');
    const $btnRefreshHistory = $('#btnRefreshHistory');
    const $historyTable = $('#historyTable');
    const $historyTableBody = $('#historyTableBody');
    const $historyLoadingState = $('#historyLoadingState');
    const $historyEmptyState = $('#historyEmptyState');
    const $historyEmptyText = $('#historyEmptyText');
    const $historyErrorState = $('#historyErrorState');
    const $historyErrorMessage = $('#historyErrorMessage');
    const $btnRetryHistory = $('#btnRetryHistory');
    const $historyPaginationWrap = $('#historyPaginationWrap');
    const $historyCountSummary = $('#historyCountSummary');
    const $historyPaginationUl = $('#historyPaginationUl');

    // Toast
    const $toast = $('#dashToast');
    const $toastMessage = $('#dashToastMessage');
    let toastTimeout = null;

    // State Variables
    let searchDebounceTimer = null;
    let activeSuggestionIndex = -1;
    let currentSearchResults = [];
    let currentSelectedEmployee = null;

    // Location History State
    let currentHistoryPage = 1;
    let currentHistoryPageSize = 10;
    let currentHistoryTotalCount = 0;
    let currentHistoryTotalPages = 1;
    let isFetchingHistory = false;

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

    // Converts browser input date (YYYY-MM-DD) to API expected format (DD-MM-YYYY)
    function formatApiDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.trim().split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            const [year, month, day] = parts;
            return `${day}-${month}-${year}`; // e.g. 10-10-2026
        }
        return dateStr;
    }

    // Formats ISO DateTime to readable string: "20 Oct 2026, 01:00:07 PM"
    function formatDateTime(isoString) {
        if (!isoString) return '—';
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return isoString;
            return d.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch (e) {
            return isoString;
        }
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
        }, 3000);
    }

    function copyToClipboard(text, label) {
        if (!text || text === '—') return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast(`${label || 'Coordinates'} copied to clipboard!`, 'bi bi-clipboard-check-fill text-primary');
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
            showToast(`${label || 'Coordinates'} copied to clipboard!`, 'bi bi-clipboard-check-fill text-primary');
        } catch (e) {
            showToast('Unable to copy text.', 'bi bi-exclamation-triangle-fill text-warning');
        }
        $temp.remove();
    }

    function highlightMatch(text, query) {
        if (!text) return '';
        if (!query) return escapeHtml(text);
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return escapeHtml(text).replace(regex, '<mark class="p-0 bg-warning-subtle text-dark fw-bold">$1</mark>');
    }

    window.handleTrackingAvatarError = function (imgEl, initials) {
        const $parent = $(imgEl).parent();
        $(imgEl).remove();
        $parent.html(`
            <div class="selected-emp-avatar-fallback">
                ${escapeHtml(initials || 'EMP')}
            </div>
        `);
    };

    // 3. Employee Search Execution
    function searchEmployeesByName(query, autoSelectFirst = false) {
        const term = (query || '').trim();
        if (!term) {
            hideSuggestions();
            return;
        }

        $searchSpinner.removeClass('d-none');
        $searchClearBtn.hide();

        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const requestUrl = `${GET_EMPLOYEE_BY_NAME_URL}/${encodeURIComponent(term)}`;
        console.log(`[Employee Search] Request: ${requestUrl}`);

        $.ajax({
            url: requestUrl,
            type: 'GET',
            dataType: 'json',
            headers: headers,
            cache: false,
            timeout: 12000,
            success: function (response) {
                $searchSpinner.addClass('d-none');
                if (term.length > 0) $searchClearBtn.show();

                let employees = [];
                if (response && response.succeeded !== false && Array.isArray(response.data)) {
                    employees = response.data;
                } else if (Array.isArray(response)) {
                    employees = response;
                }

                currentSearchResults = employees;

                if (employees.length === 0) {
                    renderEmptySuggestions(term);
                } else {
                    if (autoSelectFirst) {
                        hideSuggestions();
                        selectEmployee(employees[0]);
                    } else {
                        renderSuggestions(employees, term);
                    }
                }
            },
            error: function (xhr, status, error) {
                $searchSpinner.addClass('d-none');
                if (term.length > 0) $searchClearBtn.show();
                hideSuggestions();

                if (xhr.status === 401) {
                    showToast('Session expired. Please sign in again.', 'bi bi-shield-lock-fill text-warning');
                    setTimeout(function () {
                        window.location.href = '/Account/Login';
                    }, 2000);
                } else {
                    showToast('Error searching employee records.', 'bi bi-exclamation-triangle-fill text-danger');
                }
            }
        });
    }

    // 4. Suggestions Dropdown Rendering
    function renderSuggestions(employees, query) {
        $suggestionsList.empty();
        activeSuggestionIndex = -1;
        $suggestionsCount.text(`${employees.length} found`);

        employees.forEach((emp, index) => {
            const initials = getInitials(emp.name);
            const avatarUrl = getFullImageUrl(emp.imagePath);

            const avatarHtml = avatarUrl
                ? `<div class="suggestion-avatar">
                     <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(emp.name)}" onerror="handleTrackingAvatarError(this, '${escapeHtml(initials)}')" />
                   </div>`
                : `<div class="suggestion-avatar suggestion-avatar-fallback">${escapeHtml(initials)}</div>`;

            const highlightedName = highlightMatch(emp.name, query);
            const designation = emp.designation ? escapeHtml(emp.designation) : 'Staff Member';
            const mobile = emp.mobile ? escapeHtml(emp.mobile) : '';

            const $item = $(`
                <div class="tracking-suggestion-item" data-index="${index}">
                    ${avatarHtml}
                    <div class="suggestion-info">
                        <div class="d-flex align-items-center gap-2">
                            <span class="fw-bold text-dark">${highlightedName}</span>
                            <span class="badge bg-light text-secondary border">#${emp.id}</span>
                        </div>
                        <div class="text-muted small">
                            <span class="text-primary fw-semibold me-2">${designation}</span>
                            ${mobile ? `<span><i class="bi bi-telephone me-1"></i>${mobile}</span>` : ''}
                        </div>
                    </div>
                    <i class="bi bi-chevron-right text-muted"></i>
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

    function renderEmptySuggestions(term) {
        $suggestionsList.html(`
            <div class="p-3 text-center text-muted small">
                <i class="bi bi-person-x fs-4 d-block mb-1 text-danger"></i>
                No employees matching "${escapeHtml(term)}"
            </div>
        `);
        $suggestionsCount.text('0');
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

    // 5. Select Employee & Trigger Location History
    function selectEmployee(emp) {
        if (!emp) return;
        currentSelectedEmployee = emp;

        // Update search input
        $searchInput.val(emp.name || '');
        $searchClearBtn.show();

        // Populate Selected Employee Banner
        const initials = getInitials(emp.name);
        const avatarUrl = getFullImageUrl(emp.imagePath);

        if (avatarUrl) {
            $selectedEmpAvatarWrapper.html(`
                <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(emp.name)}" class="w-100 h-100 object-fit-cover" onerror="handleTrackingAvatarError(this, '${escapeHtml(initials)}')" />
            `);
        } else {
            $selectedEmpAvatarWrapper.html(`
                <div class="selected-emp-avatar-fallback">${escapeHtml(initials)}</div>
            `);
        }

        $selectedEmpName.text(emp.name || 'Unnamed Employee');
        $selectedEmpDesignation.text(emp.designation || 'Staff Member');
        $selectedEmpId.text(`#${emp.id || '—'}`);

        if (emp.mobile) {
            $selectedEmpMobile.html(`<i class="bi bi-telephone-fill me-1"></i>${escapeHtml(emp.mobile)}`).show();
        } else {
            $selectedEmpMobile.hide();
        }

        if (emp.email) {
            $selectedEmpEmail.html(`<i class="bi bi-envelope-fill me-1"></i>${escapeHtml(emp.email)}`).show();
        } else {
            $selectedEmpEmail.hide();
        }

        // Show banner and table card; hide initial empty state
        $selectedEmployeeBanner.removeClass('d-none');
        $trackingInitialState.addClass('d-none');
        $locationHistoryCard.removeClass('d-none');
        $historySubtitle.text(`Location logs for ${emp.name} (ID: #${emp.id})`);

        // Reset date filters (so it defaults to today per requirement)
        $historyFromDate.val('');
        $historyToDate.val('');

        showToast(`Selected ${emp.name}`, 'bi bi-person-check-fill text-success');

        // Fetch location logs for this employee (today by default)
        fetchLocationHistory(1);
    }

    // 6. Location History Fetching & Rendering
    function setHistoryTableState(state) {
        $historyLoadingState.addClass('d-none');
        $historyEmptyState.addClass('d-none');
        $historyErrorState.addClass('d-none');
        $historyTable.removeClass('d-none');
        $historyPaginationWrap.removeClass('d-none');

        if (state === 'loading') {
            $historyTable.addClass('d-none');
            $historyPaginationWrap.addClass('d-none');
            $historyLoadingState.removeClass('d-none');
        } else if (state === 'empty') {
            $historyTable.addClass('d-none');
            $historyPaginationWrap.addClass('d-none');
            $historyEmptyState.removeClass('d-none');
        } else if (state === 'error') {
            $historyTable.addClass('d-none');
            $historyPaginationWrap.addClass('d-none');
            $historyErrorState.removeClass('d-none');
        }
    }

    function fetchLocationHistory(pageNumber = 1) {
        if (!currentSelectedEmployee || !currentSelectedEmployee.id) {
            return;
        }

        if (isFetchingHistory) return;
        isFetchingHistory = true;

        currentHistoryPage = pageNumber;
        currentHistoryPageSize = parseInt($historyPageSize.val(), 10) || 10;

        setHistoryTableState('loading');
        $btnRefreshHistory.find('i').addClass('spin-animation');

        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Mandatory parameter: EmployeeId
        const queryParams = {
            EmployeeId: currentSelectedEmployee.id,
            PageNumber: currentHistoryPage,
            PageSize: currentHistoryPageSize
        };

        // Optional parameters: FromDate and ToDate
        // Note: If user does not pass any fromdate and to date, API returns today's data.
        const fromDateVal = ($historyFromDate.val() || '').trim();
        const toDateVal = ($historyToDate.val() || '').trim();

        if (fromDateVal) {
            queryParams.FromDate = formatApiDate(fromDateVal);
        }
        if (toDateVal) {
            queryParams.ToDate = formatApiDate(toDateVal);
        }

        console.log('[LocationHistory] Fetching:', GET_LOCATION_HISTORY_URL, queryParams);

        $.ajax({
            url: GET_LOCATION_HISTORY_URL,
            type: 'GET',
            data: queryParams,
            dataType: 'json',
            headers: headers,
            cache: false,
            timeout: 15000,
            success: function (response) {
                isFetchingHistory = false;
                $btnRefreshHistory.find('i').removeClass('spin-animation');

                console.log('[LocationHistory] Response:', response);

                let items = [];
                let totalCount = 0;
                let totalPages = 1;

                if (response && response.succeeded !== false && response.data) {
                    const dataObj = response.data;
                    items = Array.isArray(dataObj.items) ? dataObj.items : (Array.isArray(dataObj) ? dataObj : []);
                    totalCount = dataObj.totalCount ?? items.length;
                    totalPages = dataObj.totalPages ?? Math.max(1, Math.ceil(totalCount / currentHistoryPageSize));
                } else if (Array.isArray(response)) {
                    items = response;
                    totalCount = response.length;
                    totalPages = 1;
                }

                currentHistoryTotalCount = totalCount;
                currentHistoryTotalPages = totalPages;
                $historyTotalBadge.text(`${totalCount} Logs`);

                if (items.length === 0) {
                    if (fromDateVal || toDateVal) {
                        $historyEmptyText.text(`No location history records found for ${currentSelectedEmployee.name} between ${fromDateVal || 'start'} and ${toDateVal || 'end'}.`);
                    } else {
                        $historyEmptyText.text(`No location history records logged for ${currentSelectedEmployee.name} today.`);
                    }
                    setHistoryTableState('empty');
                } else {
                    renderLocationHistoryTable(items);
                    renderHistoryPagination();
                    setHistoryTableState('normal');
                }
            },
            error: function (xhr, status, error) {
                isFetchingHistory = false;
                $btnRefreshHistory.find('i').removeClass('spin-animation');
                console.error('[LocationHistory] Fetch error:', status, error, xhr);

                const msg = xhr.responseJSON?.message || error || 'Unable to load location logs from server.';
                $historyErrorMessage.text(msg);
                setHistoryTableState('error');
            }
        });
    }

    function renderLocationHistoryTable(items) {
        $historyTableBody.empty();

        items.forEach((item) => {
            const recordedAtFormatted = formatDateTime(item.recordedAt);
            const lat = item.latitude != null ? Number(item.latitude).toFixed(6) : '—';
            const lng = item.longitude != null ? Number(item.longitude).toFixed(6) : '—';
            const coordText = (lat !== '—' && lng !== '—') ? `${lat}, ${lng}` : '—';

            // Battery Badge
            let batteryHtml = '—';
            if (item.batteryPercentage != null && !isNaN(item.batteryPercentage)) {
                const bVal = Number(item.batteryPercentage);
                if (bVal >= 80) {
                    batteryHtml = `<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="bi bi-battery-full me-1"></i>${bVal}%</span>`;
                } else if (bVal >= 30) {
                    batteryHtml = `<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1"><i class="bi bi-battery-half me-1"></i>${bVal}%</span>`;
                } else {
                    batteryHtml = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1"><i class="bi bi-battery me-1"></i>${bVal}%</span>`;
                }
            }

            // Speed & Accuracy
            const speedHtml = item.speed != null ? `<span class="fw-semibold">${escapeHtml(item.speed)} km/h</span>` : '<span class="text-muted">—</span>';
            const accuracyHtml = item.accuracy != null ? `<span class="fw-semibold">&plusmn;${escapeHtml(item.accuracy)} m</span>` : '<span class="text-muted">—</span>';

            // Google Maps Link
            let mapActionHtml = '<span class="text-muted">—</span>';
            if (lat !== '—' && lng !== '—') {
                const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                mapActionHtml = `
                    <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary py-1 px-2 d-inline-flex align-items-center gap-1 rounded-2" title="Open coordinate in Google Maps">
                        <i class="bi bi-geo-alt-fill text-danger"></i>
                        <span>View Map</span>
                        <i class="bi bi-box-arrow-up-right small"></i>
                    </a>
                `;
            }

            const $row = $(`
                <tr>
                    <td class="fw-bold text-secondary">#${item.id}</td>
                    <td>
                        <div class="fw-semibold text-dark"><i class="bi bi-clock me-1 text-primary"></i>${escapeHtml(recordedAtFormatted)}</div>
                    </td>
                    <td>
                        <div class="d-flex align-items-center gap-1">
                            <span class="font-monospace small bg-light border px-2 py-1 rounded">${escapeHtml(coordText)}</span>
                            ${coordText !== '—' ? `
                                <button type="button" class="btn btn-sm btn-light p-1 text-muted border-0 btn-copy-coord" data-coord="${escapeHtml(coordText)}" title="Copy coordinates">
                                    <i class="bi bi-clipboard"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                    <td>${batteryHtml}</td>
                    <td>${speedHtml}</td>
                    <td>${accuracyHtml}</td>
                    <td class="text-end">${mapActionHtml}</td>
                </tr>
            `);

            $historyTableBody.append($row);
        });
    }

    function renderHistoryPagination() {
        $historyPaginationUl.empty();

        if (currentHistoryTotalCount === 0) {
            $historyCountSummary.text('Showing 0 to 0 of 0 logs');
            return;
        }

        const startItem = (currentHistoryPage - 1) * currentHistoryPageSize + 1;
        const endItem = Math.min(currentHistoryPage * currentHistoryPageSize, currentHistoryTotalCount);
        $historyCountSummary.text(`Showing ${startItem} to ${endItem} of ${currentHistoryTotalCount} logs`);

        if (currentHistoryTotalPages <= 1) {
            return;
        }

        // Previous button
        const $prevLi = $(`
            <li class="page-item ${currentHistoryPage <= 1 ? 'disabled' : ''}">
                <button type="button" class="page-link" aria-label="Previous">
                    <i class="bi bi-chevron-left"></i>
                </button>
            </li>
        `);
        if (currentHistoryPage > 1) {
            $prevLi.find('button').on('click', function () {
                fetchLocationHistory(currentHistoryPage - 1);
            });
        }
        $historyPaginationUl.append($prevLi);

        // Page numbers
        let startPage = Math.max(1, currentHistoryPage - 2);
        let endPage = Math.min(currentHistoryTotalPages, currentHistoryPage + 2);

        if (startPage > 1) {
            const $firstLi = $(`<li class="page-item"><button type="button" class="page-link">1</button></li>`);
            $firstLi.find('button').on('click', function () { fetchLocationHistory(1); });
            $historyPaginationUl.append($firstLi);
            if (startPage > 2) {
                $historyPaginationUl.append(`<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`);
            }
        }

        for (let p = startPage; p <= endPage; p++) {
            const isActive = p === currentHistoryPage;
            const $pageLi = $(`
                <li class="page-item ${isActive ? 'active' : ''}">
                    <button type="button" class="page-link">${p}</button>
                </li>
            `);
            if (!isActive) {
                $pageLi.find('button').on('click', (function (pageNum) {
                    return function () { fetchLocationHistory(pageNum); };
                })(p));
            }
            $historyPaginationUl.append($pageLi);
        }

        if (endPage < currentHistoryTotalPages) {
            if (endPage < currentHistoryTotalPages - 1) {
                $historyPaginationUl.append(`<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`);
            }
            const $lastLi = $(`<li class="page-item"><button type="button" class="page-link">${currentHistoryTotalPages}</button></li>`);
            $lastLi.find('button').on('click', function () { fetchLocationHistory(currentHistoryTotalPages); });
            $historyPaginationUl.append($lastLi);
        }

        // Next button
        const $nextLi = $(`
            <li class="page-item ${currentHistoryPage >= currentHistoryTotalPages ? 'disabled' : ''}">
                <button type="button" class="page-link" aria-label="Next">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `);
        if (currentHistoryPage < currentHistoryTotalPages) {
            $nextLi.find('button').on('click', function () {
                fetchLocationHistory(currentHistoryPage + 1);
            });
        }
        $historyPaginationUl.append($nextLi);
    }

    // 7. Event Listeners
    // Search input (Debounced)
    $searchInput.on('input', function () {
        const query = $(this).val();

        if (query.trim().length > 0) {
            $searchClearBtn.show();
        } else {
            $searchClearBtn.hide();
            hideSuggestions();
            return;
        }

        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
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
    });

    // Keyboard navigation in suggestions dropdown
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

    // Reopen suggestions if input focused with existing query
    $searchInput.on('focus', function () {
        const query = $(this).val().trim();
        if (query && currentSearchResults.length > 0) {
            renderSuggestions(currentSearchResults, query);
        }
    });

    // Change Employee button
    $btnChangeEmployee.on('click', function () {
        $searchInput.val('').focus();
        $searchClearBtn.hide();
        hideSuggestions();
    });

    // Filter History by Date Range
    $btnFilterHistory.on('click', function () {
        fetchLocationHistory(1);
    });

    // "Today" Button: Clears Date Filters and Fetches Today's logs
    $btnTodayHistory.on('click', function () {
        $historyFromDate.val('');
        $historyToDate.val('');
        fetchLocationHistory(1);
        showToast('Viewing today\'s location logs', 'bi bi-calendar-event text-primary');
    });

    // Page Size Change
    $historyPageSize.on('change', function () {
        fetchLocationHistory(1);
    });

    // Refresh History
    $btnRefreshHistory.on('click', function () {
        fetchLocationHistory(currentHistoryPage);
    });

    // Retry History
    $btnRetryHistory.on('click', function () {
        fetchLocationHistory(currentHistoryPage);
    });

    // Copy Coordinates button
    $(document).on('click', '.btn-copy-coord', function () {
        const coord = $(this).data('coord');
        copyToClipboard(coord, 'Coordinates');
    });

    console.log('[Employee Tracking & Location History] Initialized with API Base:', apiBaseUrl);
});
