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

    function resolveImageUrl(apiBaseUrl, imagePath) {
        if (!imagePath) return "";
        if (/^https?:\/\//i.test(imagePath)) return imagePath;
        const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
        return `${apiBaseUrl}${cleanPath}`;
    }

    function showToast(message, isError = false) {
        const toastEl = document.getElementById("dashToast");
        const msgEl = document.getElementById("dashToastMessage");
        if (!toastEl || !msgEl) return;

        msgEl.textContent = message || (isError ? "Operation failed." : "Operation completed.");
        toastEl.classList.remove("text-bg-success", "text-bg-danger", "bg-success", "bg-danger");
        toastEl.classList.add(isError ? "text-bg-danger" : "text-bg-success");

        if (window.bootstrap && window.bootstrap.Toast) {
            window.bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 }).show();
        }
    }

    function showFormAlert(alertEl, message) {
        if (!alertEl) return;
        alertEl.textContent = message || "Something went wrong.";
        alertEl.classList.remove("d-none");
    }

    function hideFormAlert(alertEl) {
        if (!alertEl) return;
        alertEl.textContent = "";
        alertEl.classList.add("d-none");
    }

    function validateImageFile(file) {
        if (!file) return "Please select an image file.";
        const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
        const fileName = (file.name || "").toLowerCase();
        const hasValidExt = allowedExtensions.some(ext => fileName.endsWith(ext));
        if (!hasValidExt) {
            return "Invalid image format. Allowed formats: .jpg, .jpeg, .png, .webp.";
        }
        if (file.size > 1024 * 1024) {
            return "Image size must not exceed 1 MB.";
        }
        return "";
    }

    // ---------- Init ----------
    document.addEventListener("DOMContentLoaded", function () {
        const container = document.getElementById("productPageContainer");
        if (!container) return;

        const apiBaseUrl = normalizeApiBaseUrl(container.getAttribute("data-api-base-url"));

        // State
        const state = {
            pageNumber: 1,
            pageSize: 10,
            searchTerm: "",
            items: [],
            totalCount: 0,
            totalPages: 1,
            currentViewItem: null,
            deleteTargetId: null,
            createFile: null,
            editFile: null
        };

        // DOM references
        const tableEl = document.getElementById("productTable");
        const tbodyEl = document.getElementById("productTableBody");
        const emptyStateEl = document.getElementById("tableEmptyState");
        const loadingStateEl = document.getElementById("tableLoadingState");
        const noResultsStateEl = document.getElementById("tableNoResultsState");
        const errorStateEl = document.getElementById("tableErrorState");
        const errorMsgTextEl = document.getElementById("errorMessageText");
        const countSummaryEl = document.getElementById("tableCountSummary");
        const paginationNavEl = document.getElementById("productPaginationNav");
        const paginationUlEl = document.getElementById("productPaginationUl");

        const searchInputEl = document.getElementById("searchProductInput");
        const searchClearBtn = document.getElementById("searchClearBtn");
        const btnSearchSubmit = document.getElementById("btnSearchSubmit");
        const btnResetFilters = document.getElementById("btnResetFilters");
        const filterPageSizeEl = document.getElementById("filterPageSize");
        const btnRetryProduct = document.getElementById("btnRetryProduct");

        // Create Modal elements
        const createModalEl = document.getElementById("createProductModal");
        const btnOpenCreateModal = document.getElementById("btnOpenCreateProductModal");
        const createFormEl = document.getElementById("createProductForm");
        const createAlertEl = document.getElementById("createProductAlert");
        const createTitleEl = document.getElementById("createProductTitle");
        const createCardBadgeEl = document.getElementById("createProductCardBadge");
        const createDisplayOrderEl = document.getElementById("createProductDisplayOrder");
        const createDescriptionEl = document.getElementById("createProductDescription");
        const createTechnicalSpecsEl = document.getElementById("createProductTechnicalSpecs");
        const createCatSearchEl = document.getElementById("createCategorySearchInput");
        const createCatIdEl = document.getElementById("createProductCategoryId");
        const createCatDropdownEl = document.getElementById("createCategoryDropdown");
        const createFileInputEl = document.getElementById("createProductFileInput");
        const createDropzoneEl = document.getElementById("createProductDropzone");
        const createDropzonePromptEl = document.getElementById("createDropzonePrompt");
        const createDropzonePreviewEl = document.getElementById("createDropzonePreview");
        const createPreviewImgEl = document.getElementById("createPreviewImg");
        const btnChangeCreateImage = document.getElementById("btnChangeCreateImage");
        const btnRemoveCreateImage = document.getElementById("btnRemoveCreateImage");
        const btnSubmitCreate = document.getElementById("btnSubmitCreateProduct");
        const btnSubmitCreateText = document.getElementById("btnSubmitCreateText");

        // Edit Modal elements
        const editModalEl = document.getElementById("editProductModal");
        const editFormEl = document.getElementById("editProductForm");
        const editAlertEl = document.getElementById("editProductAlert");
        const editIdEl = document.getElementById("editProductId");
        const editTitleEl = document.getElementById("editProductTitle");
        const editCardBadgeEl = document.getElementById("editProductCardBadge");
        const editDisplayOrderEl = document.getElementById("editProductDisplayOrder");
        const editDescriptionEl = document.getElementById("editProductDescription");
        const editTechnicalSpecsEl = document.getElementById("editProductTechnicalSpecs");
        const editCatSearchEl = document.getElementById("editCategorySearchInput");
        const editCatIdEl = document.getElementById("editProductCategoryId");
        const editCatDropdownEl = document.getElementById("editCategoryDropdown");
        const editFileInputEl = document.getElementById("editProductFileInput");
        const editPreviewImgEl = document.getElementById("editPreviewImg");
        const btnChangeEditImage = document.getElementById("btnChangeEditImage");
        const btnSubmitEdit = document.getElementById("btnSubmitEditProduct");
        const btnSubmitEditText = document.getElementById("btnSubmitEditText");

        // View Modal elements
        const viewModalEl = document.getElementById("viewProductModal");
        const viewBadgeIdEl = document.getElementById("viewProductBadgeId");
        const viewTitleEl = document.getElementById("viewProductTitle");
        const viewCategoryTextEl = document.getElementById("viewProductCategoryText");
        const viewDescriptionEl = document.getElementById("viewProductDescription");
        const viewTechnicalSpecsEl = document.getElementById("viewProductTechnicalSpecs");
        const viewDisplayOrderEl = document.getElementById("viewProductDisplayOrder");
        const viewImgEl = document.getElementById("viewProductImg");
        const viewCardBadgeEl = document.getElementById("viewProductCardBadge");
        const btnEditFromView = document.getElementById("btnEditFromView");

        // Delete Modal elements
        const deleteModalEl = document.getElementById("deleteProductModal");
        const deleteTargetNameEl = document.getElementById("deleteProductTargetName");
        const deleteTargetIdEl = document.getElementById("deleteProductTargetId");
        const deleteTargetImgEl = document.getElementById("deleteProductTargetImg");
        const btnConfirmDelete = document.getElementById("btnConfirmDeleteProduct");
        const btnConfirmDeleteText = document.getElementById("btnConfirmDeleteText");

        // ---------- API Helper ----------
        async function apiFetch(url, options = {}) {
            const token = getAuthToken();
            const headers = new Headers(options.headers || {});
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
                if (errorMsgTextEl) errorMsgTextEl.textContent = errorMessage || "Failed to load products.";
                errorStateEl.classList.remove("d-none");
            }
        }

        // ---------- Load & Render Products ----------
        async function loadProducts() {
            setTableViewState("loading");
            if (paginationNavEl) paginationNavEl.classList.add("d-none");

            try {
                const params = new URLSearchParams();
                if (state.searchTerm.trim()) {
                    params.set("SearchTerm", state.searchTerm.trim());
                }
                params.set("PageNumber", String(state.pageNumber));
                params.set("PageSize", String(state.pageSize));

                const res = await apiFetch(`${apiBaseUrl}/api/Product/GetAll?${params.toString()}`);
                const data = res && res.data ? res.data : {};
                const items = Array.isArray(data.items) ? data.items : [];

                state.items = items;
                state.totalCount = typeof data.totalCount === "number" ? data.totalCount : items.length;
                state.totalPages = typeof data.totalPages === "number" && data.totalPages > 0 ? data.totalPages : 1;
                state.pageNumber = typeof data.pageNumber === "number" && data.pageNumber > 0 ? data.pageNumber : state.pageNumber;

                if (items.length === 0) {
                    if (state.searchTerm.trim()) {
                        setTableViewState("no-results");
                    } else {
                        setTableViewState("empty");
                    }
                    if (countSummaryEl) {
                        countSummaryEl.textContent = "Showing 0 products";
                    }
                    return;
                }

                renderTableRows(items);
                renderPagination(data);
                setTableViewState("table");
            } catch (err) {
                setTableViewState("error", err.message || "Unable to fetch products.");
                if (countSummaryEl) {
                    countSummaryEl.textContent = "Error loading products";
                }
            }
        }

        function renderTableRows(items) {
            tbodyEl.innerHTML = items.map(item => {
                const imgUrl = resolveImageUrl(apiBaseUrl, item.imagePath);
                const title = escapeHtml(item.title || "Untitled Product");
                const categoryName = escapeHtml(item.productCategoryName || "Uncategorized");
                const cardBadgeHtml = item.cardBadge
                    ? `<span class="card-badge-pill ms-2">${escapeHtml(item.cardBadge)}</span>`
                    : "";
                const description = escapeHtml(item.description || "No description provided.");
                const displayOrder = item.displayOrder !== undefined && item.displayOrder !== null
                    ? escapeHtml(item.displayOrder)
                    : 0;

                const fullImgUrl = imgUrl || "/images/logo-icon.png";
                const thumbHtml = `<img src="${escapeHtml(fullImgUrl)}" alt="${title}" onerror="this.onerror=null; this.src='/images/logo-icon.png';" />`;

                return `
                    <tr data-id="${item.id}">
                        <td>
                            <span class="product-id-pill">#${item.id}</span>
                        </td>
                        <td class="text-center">
                            <div class="product-thumb-wrapper mx-auto btn-view-product" data-id="${item.id}" title="Click to view details">
                                ${thumbHtml}
                            </div>
                        </td>
                        <td>
                            <div class="d-flex flex-column">
                                <div class="d-flex align-items-center flex-wrap">
                                    <span class="product-title-text">${title}</span>
                                    ${cardBadgeHtml}
                                </div>
                                <span class="product-desc-text mt-1" title="${description}">${description}</span>
                            </div>
                        </td>
                        <td>
                            <span class="category-badge-pill">
                                <i class="bi bi-tag-fill text-primary"></i>
                                <span>${categoryName}</span>
                            </span>
                        </td>
                        <td class="text-center fw-medium text-dark">${displayOrder}</td>
                        <td class="text-end">
                            <div class="product-actions-group">
                                <button type="button"
                                        class="btn-action-icon btn-action-view btn-view-product"
                                        data-id="${item.id}"
                                        title="View Details">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button type="button"
                                        class="btn-action-icon btn-action-edit btn-edit-product"
                                        data-id="${item.id}"
                                        title="Edit Product">
                                    <i class="bi bi-pencil-square"></i>
                                </button>
                                <button type="button"
                                        class="btn-action-icon btn-action-delete btn-delete-product"
                                        data-id="${item.id}"
                                        title="Delete Product">
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

        // ---------- Category Search Box Autocomplete ----------
        function showCategoryDropdown(dropdownEl) {
            if (!dropdownEl) return;
            dropdownEl.classList.remove("d-none");
            dropdownEl.style.display = "block";
        }

        function hideCategoryDropdown(dropdownEl) {
            if (!dropdownEl) return;
            dropdownEl.classList.add("d-none");
            dropdownEl.style.display = "none";
        }

        function setupCategoryAutocomplete(searchInput, hiddenIdInput, dropdownEl) {
            if (!searchInput || !hiddenIdInput || !dropdownEl) return;

            let catDebounce = null;

            async function fetchCategories(query) {
                const trimmed = (query || "").trim();
                const endpoint = trimmed
                    ? `${apiBaseUrl}/api/ProductCategory/GetByName/${encodeURIComponent(trimmed)}`
                    : `${apiBaseUrl}/api/ProductCategory/GetAllForDisplay`;

                dropdownEl.innerHTML = `<div class="category-autocomplete-empty"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Searching categories...</div>`;
                showCategoryDropdown(dropdownEl);

                try {
                    const res = await apiFetch(endpoint);
                    const list = Array.isArray(res && res.data)
                        ? res.data
                        : (res && res.data && Array.isArray(res.data.items) ? res.data.items : []);
                    renderCategoryDropdown(list);
                } catch {
                    dropdownEl.innerHTML = `<div class="category-autocomplete-empty text-danger">Failed to load categories</div>`;
                    showCategoryDropdown(dropdownEl);
                }
            }

            function renderCategoryDropdown(categories) {
                if (!categories.length) {
                    dropdownEl.innerHTML = `<div class="category-autocomplete-empty">No matching categories found</div>`;
                    showCategoryDropdown(dropdownEl);
                    return;
                }

                const currentId = hiddenIdInput.value;
                activeIndex = -1;
                dropdownEl.innerHTML = categories.map(cat => {
                    const isCurrent = currentId && String(currentId) === String(cat.id);
                    return `
                        <div class="category-autocomplete-item ${isCurrent ? "selected" : ""}"
                             data-cat-id="${cat.id}"
                             data-cat-name="${escapeHtml(cat.name)}">
                            <span><i class="bi bi-tag me-2 text-primary"></i>${escapeHtml(cat.name)}</span>
                            <span class="badge bg-light text-muted border">#${escapeHtml(cat.id)}</span>
                        </div>
                    `;
                }).join("");
                showCategoryDropdown(dropdownEl);
            }

            let activeIndex = -1;

            function getDropdownItems() {
                return Array.from(dropdownEl.querySelectorAll(".category-autocomplete-item"));
            }

            function highlightItem(items, newIndex) {
                items.forEach(el => el.classList.remove("keyboard-active"));
                if (newIndex >= 0 && newIndex < items.length) {
                    activeIndex = newIndex;
                    const target = items[activeIndex];
                    target.classList.add("keyboard-active");
                    target.scrollIntoView({ block: "nearest" });
                } else {
                    activeIndex = -1;
                }
            }

            function selectItem(itemEl) {
                if (!itemEl) return;
                hiddenIdInput.value = itemEl.getAttribute("data-cat-id") || "";
                searchInput.value = itemEl.getAttribute("data-cat-name") || "";
                activeIndex = -1;
                hideCategoryDropdown(dropdownEl);
            }

            searchInput.addEventListener("focus", function () {
                fetchCategories(searchInput.value);
            });

            searchInput.addEventListener("input", function () {
                hiddenIdInput.value = "";
                activeIndex = -1;
                clearTimeout(catDebounce);
                catDebounce = setTimeout(() => {
                    fetchCategories(searchInput.value);
                }, 250);
            });

            searchInput.addEventListener("keydown", function (e) {
                const isVisible = dropdownEl.style.display === "block" && !dropdownEl.classList.contains("d-none");
                const items = getDropdownItems();

                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (!isVisible) {
                        fetchCategories(searchInput.value);
                        return;
                    }
                    if (!items.length) return;
                    const next = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
                    highlightItem(items, next);
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (!isVisible || !items.length) return;
                    const prev = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
                    highlightItem(items, prev);
                } else if (e.key === "Enter") {
                    if (isVisible && activeIndex >= 0 && items[activeIndex]) {
                        e.preventDefault();
                        selectItem(items[activeIndex]);
                    }
                } else if (e.key === "Escape") {
                    activeIndex = -1;
                    hideCategoryDropdown(dropdownEl);
                }
            });

            dropdownEl.addEventListener("click", function (e) {
                const itemEl = e.target.closest(".category-autocomplete-item");
                if (!itemEl) return;
                selectItem(itemEl);
            });

            document.addEventListener("click", function (e) {
                if (!searchInput.contains(e.target) && !dropdownEl.contains(e.target)) {
                    activeIndex = -1;
                    hideCategoryDropdown(dropdownEl);
                }
            });
        }

        setupCategoryAutocomplete(createCatSearchEl, createCatIdEl, createCatDropdownEl);
        setupCategoryAutocomplete(editCatSearchEl, editCatIdEl, editCatDropdownEl);

        // ---------- Search & Filter Events ----------
        let searchDebounceTimer = null;

        function triggerSearch() {
            state.searchTerm = searchInputEl ? searchInputEl.value : "";
            state.pageNumber = 1;
            toggleClearButton();
            loadProducts();
        }

        function toggleClearButton() {
            if (!searchClearBtn || !searchInputEl) return;
            if (searchInputEl.value.trim()) {
                searchClearBtn.classList.remove("d-none");
            } else {
                searchClearBtn.classList.add("d-none");
            }
        }

        if (searchInputEl) {
            searchInputEl.addEventListener("input", function () {
                toggleClearButton();
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    triggerSearch();
                }, 350);
            });

            searchInputEl.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    clearTimeout(searchDebounceTimer);
                    triggerSearch();
                }
            });
        }

        if (btnSearchSubmit) {
            btnSearchSubmit.addEventListener("click", function () {
                clearTimeout(searchDebounceTimer);
                triggerSearch();
            });
        }

        if (searchClearBtn) {
            searchClearBtn.addEventListener("click", function () {
                if (searchInputEl) searchInputEl.value = "";
                clearTimeout(searchDebounceTimer);
                triggerSearch();
            });
        }

        if (btnResetFilters) {
            btnResetFilters.addEventListener("click", function () {
                if (searchInputEl) searchInputEl.value = "";
                if (filterPageSizeEl) filterPageSizeEl.value = "10";
                state.searchTerm = "";
                state.pageSize = 10;
                state.pageNumber = 1;
                toggleClearButton();
                loadProducts();
            });
        }

        if (filterPageSizeEl) {
            filterPageSizeEl.addEventListener("change", function () {
                const parsed = parseInt(filterPageSizeEl.value, 10);
                state.pageSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
                state.pageNumber = 1;
                loadProducts();
            });
        }

        if (btnRetryProduct) {
            btnRetryProduct.addEventListener("click", loadProducts);
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
                    loadProducts();
                }
            });
        }

        // ---------- Create Product Modal & Image Dropzone ----------
        function resetCreateForm() {
            if (createFormEl) createFormEl.reset();
            hideFormAlert(createAlertEl);
            if (createCatIdEl) createCatIdEl.value = "";
            if (createCatSearchEl) createCatSearchEl.value = "";
            hideCategoryDropdown(createCatDropdownEl);
            clearCreateImage();
        }

        function clearCreateImage() {
            state.createFile = null;
            if (createFileInputEl) createFileInputEl.value = "";
            if (createPreviewImgEl) createPreviewImgEl.src = "";
            if (createDropzonePreviewEl) createDropzonePreviewEl.classList.add("d-none");
            if (createDropzonePromptEl) createDropzonePromptEl.classList.remove("d-none");
        }

        function setCreateImageFile(file) {
            const error = validateImageFile(file);
            if (error) {
                showFormAlert(createAlertEl, error);
                clearCreateImage();
                return;
            }
            hideFormAlert(createAlertEl);
            state.createFile = file;

            const reader = new FileReader();
            reader.onload = function (ev) {
                if (createPreviewImgEl) createPreviewImgEl.src = ev.target.result;
                if (createDropzonePromptEl) createDropzonePromptEl.classList.add("d-none");
                if (createDropzonePreviewEl) createDropzonePreviewEl.classList.remove("d-none");
            };
            reader.readAsDataURL(file);
        }

        if (btnOpenCreateModal && createModalEl) {
            btnOpenCreateModal.addEventListener("click", function () {
                resetCreateForm();
                window.bootstrap.Modal.getOrCreateInstance(createModalEl).show();
            });
        }

        if (createDropzoneEl && createFileInputEl) {
            createDropzoneEl.addEventListener("click", function (e) {
                if (e.target.closest("#btnChangeCreateImage") || e.target.closest("#btnRemoveCreateImage")) return;
                createFileInputEl.click();
            });

            createDropzoneEl.addEventListener("dragover", function (e) {
                e.preventDefault();
                createDropzoneEl.classList.add("border-primary");
            });

            createDropzoneEl.addEventListener("dragleave", function () {
                createDropzoneEl.classList.remove("border-primary");
            });

            createDropzoneEl.addEventListener("drop", function (e) {
                e.preventDefault();
                createDropzoneEl.classList.remove("border-primary");
                const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                if (file) setCreateImageFile(file);
            });
        }

        if (createFileInputEl) {
            createFileInputEl.addEventListener("change", function () {
                const file = createFileInputEl.files && createFileInputEl.files[0];
                if (file) setCreateImageFile(file);
            });
        }

        if (btnChangeCreateImage && createFileInputEl) {
            btnChangeCreateImage.addEventListener("click", function (e) {
                e.stopPropagation();
                createFileInputEl.click();
            });
        }

        if (btnRemoveCreateImage) {
            btnRemoveCreateImage.addEventListener("click", function (e) {
                e.stopPropagation();
                clearCreateImage();
            });
        }

        if (createFormEl) {
            createFormEl.addEventListener("submit", async function (e) {
                e.preventDefault();
                hideFormAlert(createAlertEl);

                const title = (createTitleEl.value || "").trim();
                const categoryId = parseInt(createCatIdEl.value, 10);
                const cardBadge = (createCardBadgeEl.value || "").trim();
                const displayOrder = parseInt(createDisplayOrderEl.value, 10);
                const description = (createDescriptionEl.value || "").trim();
                const technicalSpecs = (createTechnicalSpecsEl.value || "").trim();

                if (!title) {
                    showFormAlert(createAlertEl, "Title is required.");
                    return;
                }
                if (!Number.isFinite(categoryId) || categoryId <= 0) {
                    showFormAlert(createAlertEl, "Please select a valid Product Category from the dropdown.");
                    return;
                }
                if (!cardBadge) {
                    showFormAlert(createAlertEl, "Card Badge is required.");
                    return;
                }
                if (!Number.isFinite(displayOrder) || displayOrder < 1) {
                    showFormAlert(createAlertEl, "Display Order must be at least 1.");
                    return;
                }
                if (description.length > 250) {
                    showFormAlert(createAlertEl, "Description must not exceed 250 characters.");
                    return;
                }
                if (technicalSpecs.length > 250) {
                    showFormAlert(createAlertEl, "Technical Specs must not exceed 250 characters.");
                    return;
                }
                if (!state.createFile) {
                    showFormAlert(createAlertEl, "Product image is required.");
                    return;
                }

                const formData = new FormData();
                formData.append("Title", title);
                formData.append("ProductCategoryId", String(categoryId));
                formData.append("CardBadge", cardBadge);
                formData.append("DisplayOrder", String(displayOrder));
                formData.append("Description", description);
                formData.append("TechnicalSpecs", technicalSpecs);
                formData.append("Image", state.createFile);

                btnSubmitCreate.disabled = true;
                if (btnSubmitCreateText) btnSubmitCreateText.textContent = "Saving...";

                try {
                    const res = await apiFetch(`${apiBaseUrl}/api/Product`, {
                        method: "POST",
                        body: formData
                    });
                    window.bootstrap.Modal.getOrCreateInstance(createModalEl).hide();
                    showToast((res && res.message) || "Product created successfully.");
                    state.pageNumber = 1;
                    loadProducts();
                } catch (err) {
                    showFormAlert(createAlertEl, err.message || "Failed to create product.");
                } finally {
                    btnSubmitCreate.disabled = false;
                    if (btnSubmitCreateText) btnSubmitCreateText.textContent = "Save Product";
                }
            });
        }

        // ---------- Edit Product Modal ----------
        function openEditModal(item) {
            if (!item || !editModalEl) return;
            hideFormAlert(editAlertEl);
            state.editFile = null;
            if (editFileInputEl) editFileInputEl.value = "";

            editIdEl.value = item.id;
            editTitleEl.value = item.title || "";
            editCardBadgeEl.value = item.cardBadge || "";
            editDisplayOrderEl.value = item.displayOrder !== undefined && item.displayOrder !== null ? item.displayOrder : 1;
            editDescriptionEl.value = item.description || "";
            editTechnicalSpecsEl.value = item.technicalSpecs || "";
            editCatIdEl.value = item.productCategoryId || "";
            editCatSearchEl.value = item.productCategoryName || "";
            hideCategoryDropdown(editCatDropdownEl);

            const imgUrl = resolveImageUrl(apiBaseUrl, item.imagePath) || "/images/logo-icon.png";
            if (editPreviewImgEl) {
                editPreviewImgEl.onerror = function () {
                    this.onerror = null;
                    this.src = "/images/logo-icon.png";
                };
                editPreviewImgEl.src = imgUrl;
            }

            window.bootstrap.Modal.getOrCreateInstance(editModalEl).show();
        }

        if (btnChangeEditImage && editFileInputEl) {
            btnChangeEditImage.addEventListener("click", function () {
                editFileInputEl.click();
            });
        }

        if (editFileInputEl) {
            editFileInputEl.addEventListener("change", function () {
                const file = editFileInputEl.files && editFileInputEl.files[0];
                if (!file) return;
                const error = validateImageFile(file);
                if (error) {
                    showFormAlert(editAlertEl, error);
                    editFileInputEl.value = "";
                    state.editFile = null;
                    return;
                }
                hideFormAlert(editAlertEl);
                state.editFile = file;

                const reader = new FileReader();
                reader.onload = function (ev) {
                    if (editPreviewImgEl) editPreviewImgEl.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            });
        }

        if (editFormEl) {
            editFormEl.addEventListener("submit", async function (e) {
                e.preventDefault();
                hideFormAlert(editAlertEl);

                const id = parseInt(editIdEl.value, 10);
                const title = (editTitleEl.value || "").trim();
                const categoryId = parseInt(editCatIdEl.value, 10);
                const cardBadge = (editCardBadgeEl.value || "").trim();
                const displayOrder = parseInt(editDisplayOrderEl.value, 10);
                const description = (editDescriptionEl.value || "").trim();
                const technicalSpecs = (editTechnicalSpecsEl.value || "").trim();

                if (!Number.isFinite(id) || id <= 0) {
                    showFormAlert(editAlertEl, "Invalid product ID.");
                    return;
                }
                if (!title) {
                    showFormAlert(editAlertEl, "Title is required.");
                    return;
                }
                if (!Number.isFinite(categoryId) || categoryId <= 0) {
                    showFormAlert(editAlertEl, "Please select a valid Product Category from the dropdown.");
                    return;
                }
                if (!cardBadge) {
                    showFormAlert(editAlertEl, "Card Badge is required.");
                    return;
                }
                if (!Number.isFinite(displayOrder) || displayOrder < 1) {
                    showFormAlert(editAlertEl, "Display Order must be at least 1.");
                    return;
                }
                if (description.length > 250) {
                    showFormAlert(editAlertEl, "Description must not exceed 250 characters.");
                    return;
                }
                if (technicalSpecs.length > 250) {
                    showFormAlert(editAlertEl, "Technical Specs must not exceed 250 characters.");
                    return;
                }

                const formData = new FormData();
                formData.append("Id", String(id));
                formData.append("Title", title);
                formData.append("ProductCategoryId", String(categoryId));
                formData.append("CardBadge", cardBadge);
                formData.append("DisplayOrder", String(displayOrder));
                formData.append("Description", description);
                formData.append("TechnicalSpecs", technicalSpecs);
                if (state.editFile) {
                    formData.append("Image", state.editFile);
                }

                btnSubmitEdit.disabled = true;
                if (btnSubmitEditText) btnSubmitEditText.textContent = "Updating...";

                try {
                    const res = await apiFetch(`${apiBaseUrl}/api/Product`, {
                        method: "PUT",
                        body: formData
                    });
                    window.bootstrap.Modal.getOrCreateInstance(editModalEl).hide();
                    showToast((res && res.message) || "Product updated successfully.");
                    loadProducts();
                } catch (err) {
                    showFormAlert(editAlertEl, err.message || "Failed to update product.");
                } finally {
                    btnSubmitEdit.disabled = false;
                    if (btnSubmitEditText) btnSubmitEditText.textContent = "Update Product";
                }
            });
        }

        // ---------- View Product Modal ----------
        function openViewModal(item) {
            if (!item || !viewModalEl) return;
            state.currentViewItem = item;

            if (viewBadgeIdEl) viewBadgeIdEl.textContent = `#${item.id}`;
            if (viewTitleEl) viewTitleEl.textContent = item.title || "—";
            if (viewCategoryTextEl) viewCategoryTextEl.textContent = item.productCategoryName || "—";
            if (viewCardBadgeEl) viewCardBadgeEl.textContent = item.cardBadge || "—";
            if (viewDisplayOrderEl) viewDisplayOrderEl.textContent = item.displayOrder !== undefined && item.displayOrder !== null ? item.displayOrder : "—";
            if (viewDescriptionEl) viewDescriptionEl.textContent = item.description || "No description provided.";
            if (viewTechnicalSpecsEl) viewTechnicalSpecsEl.textContent = item.technicalSpecs || "No technical specs provided.";

            const imgUrl = resolveImageUrl(apiBaseUrl, item.imagePath) || "/images/logo-icon.png";
            if (viewImgEl) {
                viewImgEl.onerror = function () {
                    this.onerror = null;
                    this.src = "/images/logo-icon.png";
                };
                viewImgEl.src = imgUrl;
                viewImgEl.alt = item.title || "Product Image";
            }

            window.bootstrap.Modal.getOrCreateInstance(viewModalEl).show();
        }

        if (btnEditFromView) {
            btnEditFromView.addEventListener("click", function () {
                if (!state.currentViewItem) return;
                window.bootstrap.Modal.getOrCreateInstance(viewModalEl).hide();
                openEditModal(state.currentViewItem);
            });
        }

        // ---------- Delete Product Modal ----------
        function openDeleteModal(item) {
            if (!item || !deleteModalEl) return;
            state.deleteTargetId = item.id;

            if (deleteTargetNameEl) deleteTargetNameEl.textContent = item.title || "this product";
            if (deleteTargetIdEl) deleteTargetIdEl.textContent = `#${item.id}`;
            if (deleteTargetImgEl) {
                const imgUrl = resolveImageUrl(apiBaseUrl, item.imagePath);
                deleteTargetImgEl.src = imgUrl || "";
                deleteTargetImgEl.classList.toggle("d-none", !imgUrl);
            }

            window.bootstrap.Modal.getOrCreateInstance(deleteModalEl).show();
        }

        if (btnConfirmDelete) {
            btnConfirmDelete.addEventListener("click", async function () {
                if (!state.deleteTargetId) return;

                btnConfirmDelete.disabled = true;
                if (btnConfirmDeleteText) btnConfirmDeleteText.textContent = "Deleting...";

                try {
                    const res = await apiFetch(`${apiBaseUrl}/api/Product/${state.deleteTargetId}`, {
                        method: "DELETE"
                    });
                    window.bootstrap.Modal.getOrCreateInstance(deleteModalEl).hide();
                    showToast((res && res.message) || "Product deleted successfully.");
                    if (state.items.length === 1 && state.pageNumber > 1) {
                        state.pageNumber -= 1;
                    }
                    loadProducts();
                } catch (err) {
                    window.bootstrap.Modal.getOrCreateInstance(deleteModalEl).hide();
                    showToast(err.message || "Failed to delete product.", true);
                } finally {
                    btnConfirmDelete.disabled = false;
                    if (btnConfirmDeleteText) btnConfirmDeleteText.textContent = "Delete";
                    state.deleteTargetId = null;
                }
            });
        }

        // ---------- Table Row Action Delegation ----------
        if (tbodyEl) {
            tbodyEl.addEventListener("click", function (e) {
                const viewBtn = e.target.closest(".btn-view-product");
                const editBtn = e.target.closest(".btn-edit-product");
                const deleteBtn = e.target.closest(".btn-delete-product");
                const btn = viewBtn || editBtn || deleteBtn;
                if (!btn) return;

                const id = parseInt(btn.getAttribute("data-id"), 10);
                const item = state.items.find(x => x.id === id);
                if (!item) return;

                if (viewBtn) openViewModal(item);
                else if (editBtn) openEditModal(item);
                else if (deleteBtn) openDeleteModal(item);
            });
        }

        // Initial load
        loadProducts();
    });
})();

