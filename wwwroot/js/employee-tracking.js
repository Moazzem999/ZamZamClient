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
    let currentHistoryItems = [];

    // Route Map Elements
    const $btnViewRouteMap = $('#btnViewRouteMap');
    const $routeMapModal = $('#routeMapModal');
    const $routeMapModalTitle = $('#routeMapModalTitle');
    const $routeModalSubtitle = $('#routeModalSubtitle');
    const $routeModalPointCount = $('#routeModalPointCount');
    const $routeModalDistance = $('#routeModalDistance');
    const $routeModalStartTime = $('#routeModalStartTime');
    const $routeModalEndTime = $('#routeModalEndTime');
    const $btnRouteModalExternalMap = $('#btnRouteModalExternalMap');
    const $routeMapEmptyOverlay = $('#routeMapEmptyOverlay');
    const $btnFitRoute = $('#btnFitRoute');

    // Route Map State
    let currentRouteCoords = [];
    let routeMap = null;
    let routeLayers = null;
    let currentRouteBounds = null;
    let mapBaseLayers = {};
    let activeMapLayerKey = 'street';

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

    // Normalizes input date to ISO format (YYYY-MM-DD) expected by ASP.NET Core DateTime
    function normalizeToIsoDate(dateStr) {
        if (!dateStr) return '';
        const trimmed = dateStr.trim();

        // If user input is DD-MM-YYYY or DD/MM/YYYY, convert to YYYY-MM-DD
        const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const month = dmyMatch[2].padStart(2, '0');
            const year = dmyMatch[3];
            return `${year}-${month}-${day}`;
        }

        // If already YYYY-MM-DD
        const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (ymdMatch) {
            const year = ymdMatch[1];
            const month = ymdMatch[2].padStart(2, '0');
            const day = ymdMatch[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return trimmed;
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
            queryParams.FromDate = normalizeToIsoDate(fromDateVal);
        }
        if (toDateVal) {
            queryParams.ToDate = normalizeToIsoDate(toDateVal);
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

                let msg = xhr.responseJSON?.message;
                if (!msg && xhr.responseJSON?.errors) {
                    const errList = [];
                    for (const key in xhr.responseJSON.errors) {
                        errList.push(...xhr.responseJSON.errors[key]);
                    }
                    msg = errList.join(' ');
                }
                if (!msg) {
                    msg = error || 'Unable to load location logs from server.';
                }

                $historyErrorMessage.text(msg);
                setHistoryTableState('error');
            }
        });
    }

    function renderLocationHistoryTable(items) {
        currentHistoryItems = items || [];
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
                <tr data-id="${item.id}" data-lat="${item.latitude != null ? item.latitude : ''}" data-lng="${item.longitude != null ? item.longitude : ''}" data-time="${escapeHtml(recordedAtFormatted)}" data-rawtime="${escapeHtml(item.recordedAt || '')}" data-battery="${escapeHtml(item.batteryPercentage != null ? item.batteryPercentage : '')}">
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

    // 8. View Route Map Functionality
    function getCoordinatesFromTable() {
        const coords = [];

        // Primary source: read directly from rendered history table rows
        $historyTableBody.find('tr').each(function () {
            const $tr = $(this);
            const latStr = $tr.attr('data-lat');
            const lngStr = $tr.attr('data-lng');
            const id = $tr.attr('data-id');
            const formattedTime = $tr.attr('data-time') || '';
            const rawTime = $tr.attr('data-rawtime') || '';
            const battery = $tr.attr('data-battery') || '';

            if (latStr && lngStr) {
                const lat = parseFloat(latStr);
                const lng = parseFloat(lngStr);
                if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
                    coords.push({
                        id: id,
                        lat: lat,
                        lng: lng,
                        time: formattedTime,
                        rawTime: rawTime,
                        battery: battery
                    });
                }
            }
        });

        // Fallback: if table rows yielded 0 items, inspect currentHistoryItems state
        if (coords.length === 0 && Array.isArray(currentHistoryItems) && currentHistoryItems.length > 0) {
            currentHistoryItems.forEach((item) => {
                if (item.latitude != null && item.longitude != null) {
                    const lat = parseFloat(item.latitude);
                    const lng = parseFloat(item.longitude);
                    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
                        coords.push({
                            id: item.id,
                            lat: lat,
                            lng: lng,
                            time: formatDateTime(item.recordedAt),
                            rawTime: item.recordedAt || '',
                            battery: item.batteryPercentage
                        });
                    }
                }
            });
        }

        return coords;
    }

    function sortChronologically(coords) {
        return [...coords].sort((a, b) => {
            const timeA = a.rawTime ? new Date(a.rawTime).getTime() : 0;
            const timeB = b.rawTime ? new Date(b.rawTime).getTime() : 0;
            if (timeA && timeB) return timeA - timeB;
            return (Number(a.id) || 0) - (Number(b.id) || 0);
        });
    }

    function haversineDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function calculateTotalDistance(coords) {
        let dist = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            dist += haversineDistanceKm(coords[i].lat, coords[i].lng, coords[i + 1].lat, coords[i + 1].lng);
        }
        return dist;
    }

    function buildGoogleMapsRouteUrl(coords) {
        if (!coords || coords.length === 0) return 'https://www.google.com/maps';
        if (coords.length === 1) return `https://www.google.com/maps?q=${coords[0].lat},${coords[0].lng}`;

        const origin = `${coords[0].lat},${coords[0].lng}`;
        const destination = `${coords[coords.length - 1].lat},${coords[coords.length - 1].lng}`;

        let waypointsParam = '';
        if (coords.length > 2) {
            const intermediate = coords.slice(1, -1);
            let selectedWaypoints = intermediate;
            if (intermediate.length > 8) {
                selectedWaypoints = [];
                const step = (intermediate.length - 1) / 7;
                for (let i = 0; i < 8; i++) {
                    selectedWaypoints.push(intermediate[Math.round(i * step)]);
                }
            }
            const wpStr = selectedWaypoints.map(p => `${p.lat},${p.lng}`).join('|');
            waypointsParam = `&waypoints=${encodeURIComponent(wpStr)}`;
        }

        return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=driving`;
    }

    function createRoutePinIcon(type, label) {
        let className = 'route-pin route-pin-mid';
        let size = [24, 24];
        let anchor = [12, 12];

        if (type === 'start') {
            className = 'route-pin route-pin-start';
            size = [32, 32];
            anchor = [16, 16];
        } else if (type === 'end') {
            className = 'route-pin route-pin-end';
            size = [34, 34];
            anchor = [17, 17];
        }

        return L.divIcon({
            className: 'route-marker-container',
            html: `<div class="${className}">${label}</div>`,
            iconSize: size,
            iconAnchor: anchor,
            popupAnchor: [0, -anchor[1] - 4]
        });
    }

    function createPointPopupHtml(point, title, index, total) {
        const latStr = Number(point.lat).toFixed(6);
        const lngStr = Number(point.lng).toFixed(6);
        const timeStr = point.time || '—';
        const batteryStr = point.battery ? `${point.battery}%` : '—';
        const singleMapsUrl = `https://www.google.com/maps?q=${latStr},${lngStr}`;

        return `
            <div class="route-popup-card">
                <div class="route-popup-title text-primary">
                    <i class="bi bi-geo-alt-fill"></i>
                    <span>${escapeHtml(title)}</span>
                    ${total > 1 ? `<span class="badge bg-light text-secondary border ms-auto">#${index + 1}/${total}</span>` : ''}
                </div>
                <div class="route-popup-line"><i class="bi bi-clock me-1 text-muted"></i><strong>Time:</strong> ${escapeHtml(timeStr)}</div>
                <div class="route-popup-line"><i class="bi bi-compass me-1 text-muted"></i><strong>Coords:</strong> <span class="font-monospace">${latStr}, ${lngStr}</span></div>
                ${point.battery ? `<div class="route-popup-line"><i class="bi bi-battery me-1 text-muted"></i><strong>Battery:</strong> ${escapeHtml(batteryStr)}</div>` : ''}
                <div class="mt-2 pt-1 border-top">
                    <a href="${singleMapsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-xs btn-outline-primary py-0 px-1.5 rounded text-decoration-none small" style="font-size: 0.72rem;">
                        <i class="bi bi-box-arrow-up-right me-1"></i>View in Google Maps
                    </a>
                </div>
            </div>
        `;
    }

    function initRouteMapIfNeeded() {
        if (routeMap) return;

        if (typeof L === 'undefined') {
            console.error('[RouteMap] Leaflet library is not available');
            return;
        }

        // Google Maps Street Layer
        mapBaseLayers.street = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            subdomains: ['0', '1', '2', '3'],
            maxZoom: 20,
            attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener">Google Maps</a>'
        });

        // Google Maps Satellite / Hybrid Layer
        mapBaseLayers.satellite = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            subdomains: ['0', '1', '2', '3'],
            maxZoom: 20,
            attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener">Google Maps</a>'
        });

        // OpenStreetMap Layer
        mapBaseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        });

        routeMap = L.map('routeMapCanvas', {
            center: [23.8103, 90.4125],
            zoom: 13,
            layers: [mapBaseLayers.street],
            zoomControl: true
        });

        routeLayers = L.layerGroup().addTo(routeMap);

        // Layer Switcher Buttons
        $('.btn-map-layer').on('click', function () {
            const layerKey = $(this).data('layer');
            if (!mapBaseLayers[layerKey] || layerKey === activeMapLayerKey) return;

            routeMap.removeLayer(mapBaseLayers[activeMapLayerKey]);
            routeMap.addLayer(mapBaseLayers[layerKey]);
            activeMapLayerKey = layerKey;

            $('.btn-map-layer').removeClass('active');
            $(this).addClass('active');
        });

        // Fit Route Button
        $btnFitRoute.on('click', function () {
            if (currentRouteBounds && routeMap) {
                routeMap.fitBounds(currentRouteBounds, { padding: [50, 50], maxZoom: 17 });
            }
        });
    }

    function renderRouteOnMap(coords) {
        initRouteMapIfNeeded();
        if (!routeMap || !routeLayers) return;

        routeLayers.clearLayers();
        currentRouteBounds = null;

        if (!coords || coords.length === 0) {
            $routeMapEmptyOverlay.removeClass('d-none');
            return;
        }
        $routeMapEmptyOverlay.addClass('d-none');

        const latLngs = coords.map(p => [p.lat, p.lng]);

        if (coords.length === 1) {
            const pt = coords[0];
            const icon = createRoutePinIcon('end', '<i class="bi bi-geo-alt-fill"></i>');
            const marker = L.marker([pt.lat, pt.lng], { icon: icon })
                .bindPopup(createPointPopupHtml(pt, 'Recorded Location', 0, 1))
                .addTo(routeLayers);

            routeMap.setView([pt.lat, pt.lng], 16);
            currentRouteBounds = L.latLngBounds([[pt.lat, pt.lng]]);
            marker.openPopup();
            return;
        }

        // Draw Polyline Line: Glow shadow layer + Core blue route line
        L.polyline(latLngs, {
            color: '#60a5fa',
            weight: 8,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(routeLayers);

        const mainPolyline = L.polyline(latLngs, {
            color: '#2563eb',
            weight: 4.5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(routeLayers);

        // Start Pin (A / Flag)
        const startPt = coords[0];
        const startIcon = createRoutePinIcon('start', '<i class="bi bi-flag-fill"></i>');
        L.marker([startPt.lat, startPt.lng], { icon: startIcon, zIndexOffset: 1000 })
            .bindPopup(createPointPopupHtml(startPt, 'Start Location', 0, coords.length))
            .addTo(routeLayers);

        // Latest / End Pin (B / Pin)
        const endPt = coords[coords.length - 1];
        const endIcon = createRoutePinIcon('end', '<i class="bi bi-geo-alt-fill"></i>');
        L.marker([endPt.lat, endPt.lng], { icon: endIcon, zIndexOffset: 1001 })
            .bindPopup(createPointPopupHtml(endPt, 'Latest Location', coords.length - 1, coords.length))
            .addTo(routeLayers);

        // Intermediate Waypoints
        const intermediatePoints = coords.slice(1, -1);
        if (intermediatePoints.length > 0) {
            const step = intermediatePoints.length <= 40 ? 1 : Math.ceil(intermediatePoints.length / 30);
            for (let i = 0; i < intermediatePoints.length; i += step) {
                const pt = intermediatePoints[i];
                const realIdx = i + 1;
                const midIcon = createRoutePinIcon('mid', realIdx);
                L.marker([pt.lat, pt.lng], { icon: midIcon, zIndexOffset: 500 })
                    .bindPopup(createPointPopupHtml(pt, `Waypoint #${realIdx}`, realIdx, coords.length))
                    .addTo(routeLayers);
            }
        }

        currentRouteBounds = mainPolyline.getBounds();
        routeMap.fitBounds(currentRouteBounds, { padding: [50, 50], maxZoom: 17 });
    }

    function openRouteMap() {
        if (!currentSelectedEmployee) {
            showToast('Please select an employee first.', 'bi bi-info-circle-fill text-primary');
            return;
        }

        const rawCoords = getCoordinatesFromTable();
        if (!rawCoords || rawCoords.length === 0) {
            showToast('No location coordinates found in the table to display on route map.', 'bi bi-exclamation-triangle-fill text-warning');
            return;
        }

        currentRouteCoords = sortChronologically(rawCoords);

        // Populate modal headers and badges
        const empName = currentSelectedEmployee.name || 'Employee';
        $routeMapModalTitle.text(`${empName}'s Route Map`);
        $routeModalPointCount.text(`${currentRouteCoords.length} Waypoints`);

        const totalDistKm = calculateTotalDistance(currentRouteCoords);
        const distText = totalDistKm < 1 ? `${Math.round(totalDistKm * 1000)} m` : `${totalDistKm.toFixed(2)} km`;
        $routeModalDistance.text(distText);

        $routeModalStartTime.text(currentRouteCoords[0].time || 'First record');
        $routeModalEndTime.text(currentRouteCoords[currentRouteCoords.length - 1].time || 'Latest record');

        // External Google Maps directions URL
        const extUrl = buildGoogleMapsRouteUrl(currentRouteCoords);
        $btnRouteModalExternalMap.attr('href', extUrl);

        // Launch Bootstrap Modal
        const modalEl = document.getElementById('routeMapModal');
        if (modalEl) {
            const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
            bsModal.show();
        }
    }

    // Modal shown handler: ensures Leaflet recalculates dimensions & plots route
    $('#routeMapModal').on('shown.bs.modal', function () {
        if (!routeMap) {
            initRouteMapIfNeeded();
        }
        setTimeout(function () {
            if (routeMap) {
                routeMap.invalidateSize();
                renderRouteOnMap(currentRouteCoords);
            }
        }, 150);
    });

    // Wire up View Route Map button
    $btnViewRouteMap.on('click', openRouteMap);

    console.log('[Employee Tracking & Location History] Initialized with API Base:', apiBaseUrl);
});
