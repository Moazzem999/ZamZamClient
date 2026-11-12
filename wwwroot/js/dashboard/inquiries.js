(function () {
    "use strict";

    // ---------- Helpers ----------
    function getAuthToken() {
        const lsToken = localStorage.getItem("zamzam_token") || localStorage.getItem("token");
        if (lsToken) return lsToken;

        const match = document.cookie.match(/(?:^|;\s*)(?:zamzam_token|token)=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : "";
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return "";
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function normalizeApiBaseUrl(rawUrl) {
        let base = (rawUrl || "https://localhost:7148").trim().replace(/\/+$/, "");
        if (window.location.protocol === "https:" && base.startsWith("http://localhost:")) {
            base = base.replace(/^http:\/\//i, "https://");
        }
        return base;
    }

    function formatDateTime(isoString) {
        if (!isoString) return "—";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return escapeHtml(isoString);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }) + " " + date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function getInitials(firstName, lastName) {
        const f = (firstName || "").trim();
        const l = (lastName || "").trim();
        const initials = (f ? f[0] : "") + (l ? l[0] : "");
        return initials ? initials.toUpperCase() : "?";
    }

    function showToast(message, isError = false) {
        const toastEl = document.getElementById("dashToast");
        const msgEl = document.getElementById("dashToastMessage");
        if (!toastEl || !msgEl) return;

        msgEl.textContent = message || (isError ? "Operation failed." : "Operation completed.");
        const iconEl = toastEl.querySelector(".dash-toast-icon");
        if (iconEl) {
            iconEl.className = isError
                ? "bi bi-exclamation-triangle-fill text-danger fs-5 dash-toast-icon"
                : "bi bi-check-circle-fill text-success fs-5 dash-toast-icon";
        }

        if (window.bootstrap && window.bootstrap.Toast) {
            window.bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 }).show();
        }
    }

    // ---------- Init ----------
    document.addEventListener("DOMContentLoaded", function () {
        const container = document.getElementById("inquiryPageContainer");
        if (!container) return;

        const apiBaseUrl = normalizeApiBaseUrl(container.getAttribute("data-api-base-url"));

        const state = {
            pageNumber: 1,
            pageSize: 10,
            searchTerm: "",
            fromDate: "",
            toDate: "",
            items: [],
            totalCount: 0,
            totalPages: 1,
            deleteTargetId: null
        };

        // DOM references
        const tableEl = document.getElementById("inquiryTable");
        const tbodyEl = document.getElementById("inquiryTableBody");
        const emptyStateEl = document.getElementById("tableEmptyState");
        const loadingStateEl = document.getElementById("tableLoadingState");
        const noResultsStateEl = document.getElementById("tableNoResultsState");
        const errorStateEl = document.getElementById("tableErrorState");
        const errorMsgTextEl = document.getElementById("errorMessageText");
        const countSummaryEl = document.getElementById("tableCountSummary");
        const paginationNavEl = document.getElementById("inquiryPaginationNav");
        const paginationUlEl = document.getElementById("inquiryPaginationUl");

        const searchInputEl = document.getElementById("searchInquiryInput");
        const searchClearBtn = document.getElementById("searchClearBtn");
        const fromDateEl = document.getElementById("filterFromDate");
        const toDateEl = document.getElementById("filterToDate");
        const btnSearchSubmit = document.getElementById("btnSearchSubmit");
        const btnResetFilters = document.getElementById("btnResetFilters");
        const filterPageSizeEl = document.getElementById("filterPageSize");
        const btnRetryInquiry = document.getElementById("btnRetryInquiry");

        // View Modal elements
        const viewModalEl = document.getElementById("viewInquiryModal");
        const viewAvatarEl = document.getElementById("viewInquiryAvatar");
        const viewSenderNameEl = document.getElementById("viewInquirySenderName");
        const viewSubmittedAtEl = document.getElementById("viewInquirySubmittedAt");
        const viewBadgeIdEl = document.getElementById("viewInquiryBadgeId");
        const viewEmailEl = document.getElementById("viewInquiryEmail");
        const viewPhoneEl = document.getElementById("viewInquiryPhone");
        const viewSubjectEl = document.getElementById("viewInquirySubject");
        const viewMessageEl = document.getElementById("viewInquiryMessage");

        // Delete Modal elements
        const deleteModalEl = document.getElementById("deleteInquiryModal");
        const deleteTargetNameEl = document.getElementById("deleteInquiryTargetName");
        const deleteTargetSubjectEl = document.getElementById("deleteInquiryTargetSubject");
        const deleteTargetIdEl = document.getElementById("deleteInquiryTargetId");
        const btnConfirmDelete = document.getElementById("btnConfirmDeleteInquiry");
        const btnConfirmDeleteText = document.getElementById("btnConfirmDeleteText");

        // ---------- API Helper ----------
        async function apiFetch(url, options = {}) {
            const token = getAuthToken();
            const headers = new Headers(options.headers || {});
            headers.set("Accept", "application/json");
            if (token && !headers.has("Authorization")) {
                headers.set("Authorization", `Bearer ${token}`);
            }

            const response = await fetch(url, {
                ...options,
                headers
            });

            let payload = null;
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                payload = await response.json();
            } else {
                const text = await response.text();
                try {
                    payload = text ? JSON.parse(text) : null;
                } catch {
                    payload = { succeeded: response.ok, message: text || response.statusText };
                }
            }

            if (!response.ok) {
                const msg = (payload && (payload.message || payload.title)) || `Request failed (${response.status})`;
                const err = new Error(msg);
                err.payload = payload;
                err.status = response.status;
                throw err;
            }

            if (payload && payload.succeeded === false) {
                const err = new Error(payload.message || "Operation failed.");
                err.payload = payload;
                throw err;
            }

            return payload;
        }

        // ---------- Table UI State Management ----------
        function setTableViewState(mode, errorMessage = "") {
            tableEl.classList.add("d-none");
            emptyStateEl.classList.add("d-none");
            loadingStateEl.classList.add("d-none");
            noResultsStateEl.classList.add("d-none");
            errorStateEl.classList.add("d-none");

            if (mode === "loading") {
                loadingStateEl.classList.remove("d-none");
            } else if (mode === "table") {
                tableEl.classList.remove("d-none");
            } else if (mode === "empty") {
                emptyStateEl.classList.remove("d-none");
            } else if (mode === "no-results") {
                noResultsStateEl.classList.remove("d-none");
            } else if (mode === "error") {
                if (errorMsgTextEl) errorMsgTextEl.textContent = errorMessage || "Failed to load inquiries.";
                errorStateEl.classList.remove("d-none");
            }
        }

        function hasActiveFilters() {
            return Boolean(state.searchTerm.trim() || state.fromDate || state.toDate);
        }

        // ---------- Load & Render Inquiries ----------
        async function loadInquiries() {
            setTableViewState("loading");
            if (paginationNavEl) paginationNavEl.classList.add("d-none");

            try {
                const params = new URLSearchParams();
                if (state.searchTerm.trim()) {
                    params.set("SearchTerm", state.searchTerm.trim());
                }
                if (state.fromDate) {
                    params.set("FromDate", state.fromDate);
                }
                if (state.toDate) {
                    params.set("ToDate", state.toDate);
                }
                params.set("PageNumber", String(state.pageNumber));
                params.set("PageSize", String(state.pageSize));

                const res = await apiFetch(`${apiBaseUrl}/api/ContactInquiry/GetAll?${params.toString()}`);
                const data = res && res.data ? res.data : {};
                const items = Array.isArray(data.items) ? data.items : [];

                state.items = items;
                state.totalCount = typeof data.totalCount === "number" ? data.totalCount : items.length;
                state.totalPages = typeof data.totalPages === "number" && data.totalPages > 0 ? data.totalPages : 1;
                state.pageNumber = typeof data.pageNumber === "number" && data.pageNumber > 0 ? data.pageNumber : state.pageNumber;

                if (items.length === 0) {
                    setTableViewState(hasActiveFilters() ? "no-results" : "empty");
                    if (countSummaryEl) {
                        countSummaryEl.textContent = "Showing 0 to 0 of 0 entries";
                    }
                    return;
                }

                renderTableRows(items);
                renderPagination(data);
                setTableViewState("table");
            } catch (err) {
                setTableViewState("error", err.message || "Unable to fetch inquiries.");
                if (countSummaryEl) {
                    countSummaryEl.textContent = "Error loading inquiries";
                }
            }
        }

        function renderTableRows(items) {
            tbodyEl.innerHTML = items.map(item => {
                const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Unknown Sender";
                const safeName = escapeHtml(fullName);
                const initials = escapeHtml(getInitials(item.firstName, item.lastName));
                const email = escapeHtml(item.email || "—");
                const phone = escapeHtml(item.phoneNumber || "—");
                const subject = escapeHtml(item.subject || "No Subject");
                const message = escapeHtml(item.message || "");
                const submitted = formatDateTime(item.createdOn);

                return `
                    <tr data-id="${item.id}">
                        <td>
                            <span class="inquiry-id-pill">#${item.id}</span>
                        </td>
                        <td>
                            <div class="d-flex align-items-center gap-3">
                                <div class="inquiry-avatar-circle">${initials}</div>
                                <div class="d-flex flex-column">
                                    <span class="inquiry-sender-name">${safeName}</span>
                                    <span class="small text-muted"><i class="bi bi-envelope me-1"></i>${email}</span>
                                    <span class="small text-muted"><i class="bi bi-telephone me-1"></i>${phone}</span>
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="d-flex flex-column">
                                <span class="inquiry-subject-text">${subject}</span>
                                <span class="inquiry-message-preview" title="${message}">${message || "No message content."}</span>
                            </div>
                        </td>
                        <td class="text-muted small fw-medium">
                            ${submitted}
                        </td>
                        <td class="text-end">
                            <div class="inquiry-actions-group">
                                <button type="button"
                                        class="btn-action-icon btn-action-view btn-view-inquiry"
                                        data-id="${item.id}"
                                        title="View Inquiry">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button type="button"
                                        class="btn-action-icon btn-action-delete btn-delete-inquiry"
                                        data-id="${item.id}"
                                        title="Delete Inquiry">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join("");

            const startIdx = (state.pageNumber - 1) * state.pageSize + 1;
            const endIdx = Math.min(startIdx + items.length - 1, state.totalCount);
            if (countSummaryEl) {
                countSummaryEl.textContent = `Showing ${startIdx} to ${endIdx} of ${state.totalCount} entries`;
            }
        }

        function renderPagination(data) {
            if (!paginationNavEl || !paginationUlEl) return;
            const totalPages = data.totalPages || 1;
            const currentPage = data.pageNumber || 1;

            if (totalPages <= 1) {
                paginationNavEl.classList.add("d-none");
                paginationUlEl.innerHTML = "";
                return;
            }

            paginationNavEl.classList.remove("d-none");
            let html = "";

            html += `
                <li class="page-item ${data.hasPreviousPage ? "" : "disabled"}">
                    <button type="button" class="page-link" data-page="${currentPage - 1}" ${data.hasPreviousPage ? "" : "disabled"}>
                        <i class="bi bi-chevron-left"></i>
                    </button>
                </li>
            `;

            const maxVisible = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
            if (endPage - startPage + 1 < maxVisible) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }

            for (let p = startPage; p <= endPage; p++) {
                html += `
                    <li class="page-item ${p === currentPage ? "active" : ""}">
                        <button type="button" class="page-link" data-page="${p}">${p}</button>
                    </li>
                `;
            }

            html += `
                <li class="page-item ${data.hasNextPage ? "" : "disabled"}">
                    <button type="button" class="page-link" data-page="${currentPage + 1}" ${data.hasNextPage ? "" : "disabled"}>
                        <i class="bi bi-chevron-right"></i>
                    </button>
                </li>
            `;

            paginationUlEl.innerHTML = html;
        }

        // ---------- Search & Filter Events ----------
        let searchDebounceTimer = null;

        function toggleClearButton() {
            if (!searchClearBtn || !searchInputEl) return;
            searchClearBtn.style.display = searchInputEl.value.trim() ? "block" : "none";
        }

        function executeSearch() {
            state.searchTerm = searchInputEl ? searchInputEl.value : "";
            state.fromDate = fromDateEl ? fromDateEl.value : "";
            state.toDate = toDateEl ? toDateEl.value : "";
            state.pageNumber = 1;
            toggleClearButton();
            loadInquiries();
        }

        if (searchInputEl) {
            searchInputEl.addEventListener("input", function () {
                toggleClearButton();
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    executeSearch();
                }, 350);
            });

            searchInputEl.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    clearTimeout(searchDebounceTimer);
                    executeSearch();
                }
            });
        }

        if (fromDateEl) {
            fromDateEl.addEventListener("change", executeSearch);
        }

        if (toDateEl) {
            toDateEl.addEventListener("change", executeSearch);
        }

        if (btnSearchSubmit) {
            btnSearchSubmit.addEventListener("click", function () {
                clearTimeout(searchDebounceTimer);
                executeSearch();
            });
        }

        if (searchClearBtn) {
            searchClearBtn.addEventListener("click", function () {
                if (searchInputEl) searchInputEl.value = "";
                clearTimeout(searchDebounceTimer);
                executeSearch();
            });
        }

        if (btnResetFilters) {
            btnResetFilters.addEventListener("click", function () {
                if (searchInputEl) searchInputEl.value = "";
                if (fromDateEl) fromDateEl.value = "";
                if (toDateEl) toDateEl.value = "";
                if (filterPageSizeEl) filterPageSizeEl.value = "10";
                state.searchTerm = "";
                state.fromDate = "";
                state.toDate = "";
                state.pageSize = 10;
                state.pageNumber = 1;
                toggleClearButton();
                loadInquiries();
            });
        }

        if (filterPageSizeEl) {
            filterPageSizeEl.addEventListener("change", function () {
                const parsed = parseInt(filterPageSizeEl.value, 10);
                state.pageSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
                state.pageNumber = 1;
                loadInquiries();
            });
        }

        if (btnRetryInquiry) {
            btnRetryInquiry.addEventListener("click", loadInquiries);
        }

        if (paginationUlEl) {
            paginationUlEl.addEventListener("click", function (e) {
                const link = e.target.closest("[data-page]");
                if (!link) return;
                const li = link.closest(".page-item");
                if (li && li.classList.contains("disabled")) return;

                const targetPage = parseInt(link.getAttribute("data-page"), 10);
                if (Number.isFinite(targetPage) && targetPage >= 1 && targetPage <= state.totalPages && targetPage !== state.pageNumber) {
                    state.pageNumber = targetPage;
                    loadInquiries();
                }
            });
        }

        // ---------- View Inquiry Modal ----------
        function openViewModal(item) {
            if (!item || !viewModalEl) return;
            const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Unknown Sender";

            if (viewAvatarEl) viewAvatarEl.textContent = getInitials(item.firstName, item.lastName);
            if (viewSenderNameEl) viewSenderNameEl.textContent = fullName;
            if (viewSubmittedAtEl) viewSubmittedAtEl.textContent = `Submitted on ${formatDateTime(item.createdOn)}`;
            if (viewBadgeIdEl) viewBadgeIdEl.textContent = `#${item.id}`;

            if (viewEmailEl) {
                viewEmailEl.textContent = item.email || "—";
                viewEmailEl.href = item.email ? `mailto:${item.email}` : "#";
            }
            if (viewPhoneEl) {
                viewPhoneEl.textContent = item.phoneNumber || "—";
                viewPhoneEl.href = item.phoneNumber ? `tel:${item.phoneNumber}` : "#";
            }
            if (viewSubjectEl) viewSubjectEl.textContent = item.subject || "—";
            if (viewMessageEl) viewMessageEl.textContent = item.message || "No message content provided.";

            window.bootstrap.Modal.getOrCreateInstance(viewModalEl).show();
        }

        // ---------- Delete Inquiry Modal ----------
        function openDeleteModal(item) {
            if (!item || !deleteModalEl) return;
            state.deleteTargetId = item.id;
            const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Unknown Sender";

            if (deleteTargetNameEl) deleteTargetNameEl.textContent = fullName;
            if (deleteTargetSubjectEl) deleteTargetSubjectEl.textContent = item.subject || "No Subject";
            if (deleteTargetIdEl) deleteTargetIdEl.textContent = `#${item.id}`;

            window.bootstrap.Modal.getOrCreateInstance(deleteModalEl).show();
        }

        if (btnConfirmDelete) {
            btnConfirmDelete.addEventListener("click", async function () {
                if (!state.deleteTargetId) return;

                btnConfirmDelete.disabled = true;
                if (btnConfirmDeleteText) btnConfirmDeleteText.textContent = "Deleting...";

                try {
                    const res = await apiFetch(`${apiBaseUrl}/api/ContactInquiry/${state.deleteTargetId}`, {
                        method: "DELETE"
                    });
                    window.bootstrap.Modal.getOrCreateInstance(deleteModalEl).hide();
                    showToast((res && res.message) || "Contact inquiry deleted successfully.");
                    if (state.items.length === 1 && state.pageNumber > 1) {
                        state.pageNumber -= 1;
                    }
                    loadInquiries();
                } catch (err) {
                    window.bootstrap.Modal.getOrCreateInstance(deleteModalEl).hide();
                    showToast(err.message || "Failed to delete contact inquiry.", true);
                } finally {
                    btnConfirmDelete.disabled = false;
                    if (btnConfirmDeleteText) btnConfirmDeleteText.textContent = "Delete Inquiry";
                    state.deleteTargetId = null;
                }
            });
        }

        // ---------- Table Row Action Delegation ----------
        if (tbodyEl) {
            tbodyEl.addEventListener("click", function (e) {
                const viewBtn = e.target.closest(".btn-view-inquiry");
                const deleteBtn = e.target.closest(".btn-delete-inquiry");
                const btn = viewBtn || deleteBtn;
                if (!btn) return;

                const id = parseInt(btn.getAttribute("data-id"), 10);
                const item = state.items.find(x => x.id === id);
                if (!item) return;

                if (viewBtn) openViewModal(item);
                else if (deleteBtn) openDeleteModal(item);
            });
        }

        // Initial load
        loadInquiries();
    });
})();

