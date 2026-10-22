/**
 * ZamZam Trims (BD) Limited - Global Application Controller (site.js)
 * -------------------------------------------------------------------
 * Global site-wide interactions, theme switcher, sticky navbar,
 * scroll reveal engine, counters, back-to-top, and global modal triggers.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // =============================================================
    // 1. Sticky Navbar & Circular SVG Scroll Progress Back-To-Top
    // =============================================================
    const navbar = document.querySelector('.site-navbar');
    const backToTopBtn = document.getElementById('backToTopBtn');
    const progressRingBar = document.getElementById('progressRingBar');

    let circumference = 0;
    if (progressRingBar) {
        const radius = progressRingBar.r.baseVal.value;
        circumference = 2 * Math.PI * radius;
        progressRingBar.style.strokeDasharray = `${circumference} ${circumference}`;
        progressRingBar.style.strokeDashoffset = circumference;
    }

    function handleScroll() {
        const scrollY = window.scrollY || window.pageYOffset;
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;

        // Sticky Navbar subtle frosted shadow
        if (scrollY > 30) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }

        // Circular Scroll Ring Progress
        if (totalHeight > 0 && progressRingBar) {
            const progress = Math.min(1, Math.max(0, scrollY / totalHeight));
            const offset = circumference - (progress * circumference);
            progressRingBar.style.strokeDashoffset = offset;
        }

        // Show/Hide Back-To-Top
        if (scrollY > 350) {
            backToTopBtn?.classList.add('show');
        } else {
            backToTopBtn?.classList.remove('show');
        }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // =============================================================
    // 2. Scroll Reveal Engine (60fps IntersectionObserver)
    // =============================================================
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    }

    // =============================================================
    // 3. Smooth Numerical Counter Animation
    // =============================================================
    const counterElements = document.querySelectorAll('.counter-val');
    if (counterElements.length > 0) {
        const counterObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseFloat(el.getAttribute('data-target') || '0');
                    const isDecimal = String(target).includes('.');
                    const duration = 1600;
                    const startTime = performance.now();

                    function updateCounter(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        // Easing curve: easeOutCubic
                        const easeOut = 1 - Math.pow(1 - progress, 3);
                        const currentVal = target * easeOut;

                        if (isDecimal) {
                            el.textContent = currentVal.toFixed(1);
                        } else {
                            el.textContent = Math.floor(currentVal);
                        }

                        if (progress < 1) {
                            requestAnimationFrame(updateCounter);
                        } else {
                            el.textContent = isDecimal ? target.toFixed(1) : target;
                        }
                    }

                    requestAnimationFrame(updateCounter);
                    obs.unobserve(el);
                }
            });
        }, { threshold: 0.25 });

        counterElements.forEach(c => counterObserver.observe(c));
    }

    // =============================================================
    // 4. Dark Mode / Light Mode Theme Controller & Persistence
    // =============================================================
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function () {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            try {
                localStorage.setItem('zamzam_theme', newTheme);
            } catch (e) {
                console.warn('Unable to persist theme to localStorage', e);
            }
        });
    }

    // Initialize saved theme if available
    try {
        const savedTheme = localStorage.getItem('zamzam_theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-bs-theme', savedTheme);
        }
    } catch (e) {
        // LocalStorage access restricted or unavailable
    }
    // =============================================================
    // 5. Populate Service / Category Dropdown from Backend API
    // =============================================================
    initQuickQuoteServiceCategories();

    const quoteModalEl = document.getElementById('quickQuoteModal');
    if (quoteModalEl) {
        quoteModalEl.addEventListener('show.bs.modal', function () {
            if (!cachedServiceCategories) {
                initQuickQuoteServiceCategories();
            }
        });
    }

    const modalServiceSelect = document.getElementById('modalServiceType');
    if (modalServiceSelect) {
        modalServiceSelect.addEventListener('change', function () {
            updateCategoryIdHiddenField(modalServiceSelect);
        });
    }

    const pageServiceSelect = document.getElementById('ServiceType');
    if (pageServiceSelect && pageServiceSelect !== modalServiceSelect) {
        getServiceCategories().then(categories => {
            if (categories && categories.length > 0) {
                renderServiceCategoryOptions(pageServiceSelect, categories, pageServiceSelect.value);
            }
        });
    }

    // =============================================================
    // 6. Handle Quick Quote Modal Form Submission to API
    // =============================================================
    const quickQuoteForm = document.getElementById('quickQuoteModalForm');
    const quoteAlert = document.getElementById('modalQuoteAlert');
    const btnSubmitQuickQuote = document.getElementById('btnSubmitQuickQuote');

    function showModalAlert(type, message, icon) {
        if (!quoteAlert) return;
        const iconClass = icon || (type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill');
        quoteAlert.className = `alert alert-${type} d-flex align-items-center rounded-3 mb-3 py-2 px-3 small`;
        quoteAlert.innerHTML = `
            <i class="bi ${iconClass} me-2 fs-5 flex-shrink-0"></i>
            <div>${message}</div>
        `;
        quoteAlert.classList.remove('d-none');
    }

    function hideModalAlert() {
        if (!quoteAlert) return;
        quoteAlert.className = 'alert d-none rounded-3 mb-3 py-2 px-3 small';
        quoteAlert.innerHTML = '';
    }

    if (quoteModalEl) {
        quoteModalEl.addEventListener('hidden.bs.modal', function () {
            hideModalAlert();
        });
    }

    if (quickQuoteForm) {
        quickQuoteForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideModalAlert();

            const fullName = (document.getElementById('modalFullName')?.value || '').trim();
            const email = (document.getElementById('modalEmail')?.value || '').trim();
            const phone = (document.getElementById('modalPhone')?.value || '').trim();
            const companyName = (document.getElementById('modalCompanyName')?.value || '').trim();
            const serviceSelect = document.getElementById('modalServiceType');
            const quantity = (document.getElementById('modalQuantity')?.value || '').trim();
            const productName = (document.getElementById('modalProductName')?.value || '').trim();
            const message = (document.getElementById('modalMessage')?.value || '').trim();

            if (!fullName) {
                showModalAlert('danger', 'Please enter your Full Name.');
                document.getElementById('modalFullName')?.focus();
                return;
            }
            if (!email) {
                showModalAlert('danger', 'Please enter a valid Email Address.');
                document.getElementById('modalEmail')?.focus();
                return;
            }
            if (!phone) {
                showModalAlert('danger', 'Please enter your Phone / WhatsApp number.');
                document.getElementById('modalPhone')?.focus();
                return;
            }
            if (!serviceSelect || !serviceSelect.value) {
                showModalAlert('danger', 'Please select a Service / Category.');
                serviceSelect?.focus();
                return;
            }

            // Determine integer serviceCategory (1 to 10)
            let serviceCategoryId = 0;
            const selectedOpt = serviceSelect.options[serviceSelect.selectedIndex];
            if (selectedOpt && selectedOpt.dataset && selectedOpt.dataset.id) {
                serviceCategoryId = parseInt(selectedOpt.dataset.id, 10);
            }
            if (!serviceCategoryId || isNaN(serviceCategoryId)) {
                const hiddenVal = document.getElementById('modalServiceCategoryId')?.value;
                if (hiddenVal) serviceCategoryId = parseInt(hiddenVal, 10);
            }
            if (!serviceCategoryId || isNaN(serviceCategoryId)) {
                const found = (cachedServiceCategories || []).find(c => 
                    (c.name && c.name.toLowerCase() === serviceSelect.value.toLowerCase()) ||
                    (c.id && String(c.id) === serviceSelect.value)
                );
                if (found && found.id) {
                    serviceCategoryId = parseInt(found.id, 10);
                }
            }
            if (!serviceCategoryId || isNaN(serviceCategoryId)) {
                serviceCategoryId = 1;
            }

            const payload = {
                id: 0,
                fullName: fullName,
                email: email,
                phone: phone,
                companyName: companyName,
                serviceCategory: serviceCategoryId,
                estimatedQuantity: quantity,
                productReference: productName,
                detailedSpecifications: message
            };

            const originalBtnHtml = btnSubmitQuickQuote ? btnSubmitQuickQuote.innerHTML : '';
            if (btnSubmitQuickQuote) {
                btnSubmitQuickQuote.disabled = true;
                btnSubmitQuickQuote.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Submitting...';
            }

            try {
                const modalEl = document.getElementById('quickQuoteModal');
                const baseUrl = (
                    window.apiBaseUrl ||
                    modalEl?.getAttribute('data-api-base-url') ||
                    document.body?.getAttribute('data-api-base-url') ||
                    'https://localhost:7148'
                ).toString().trim().replace(/\/+$/, '');

                const response = await fetch(`${baseUrl}/api/QuotationRequest`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    let errMsg = `Server returned status ${response.status}`;
                    try {
                        const errJson = await response.json();
                        errMsg = errJson.message || errMsg;
                    } catch {
                        const errText = await response.text();
                        if (errText) errMsg = errText;
                    }
                    throw new Error(errMsg);
                }

                const resData = await response.json();
                if (resData && resData.succeeded === false) {
                    throw new Error(resData.message || 'Quotation submission failed.');
                }

                const successMsg = resData?.message || 'Quotation request successfully created.';
                showModalAlert('success', `<strong>Thank you!</strong> ${successMsg} Our team will contact you shortly.`);

                if (btnSubmitQuickQuote) {
                    btnSubmitQuickQuote.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Submitted!';
                    btnSubmitQuickQuote.classList.remove('btn-modern-indigo');
                    btnSubmitQuickQuote.classList.add('btn-success');
                }

                quickQuoteForm.reset();
                if (document.getElementById('modalServiceCategoryId')) {
                    document.getElementById('modalServiceCategoryId').value = '';
                }

                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('quickQuoteModal'));
                    if (modal) modal.hide();
                    hideModalAlert();
                    if (btnSubmitQuickQuote) {
                        btnSubmitQuickQuote.disabled = false;
                        btnSubmitQuickQuote.innerHTML = originalBtnHtml;
                        btnSubmitQuickQuote.classList.remove('btn-success');
                        btnSubmitQuickQuote.classList.add('btn-modern-indigo');
                    }
                }, 2200);

            } catch (err) {
                console.error('Failed to submit quotation request:', err);
                showModalAlert('danger', err.message || 'Failed to submit quotation request. Please try again.');
                if (btnSubmitQuickQuote) {
                    btnSubmitQuickQuote.disabled = false;
                    btnSubmitQuickQuote.innerHTML = originalBtnHtml;
                }
            }
        });
    }
});

// =============================================================
// 6. Global Quick Quote Modal & Service Category API Controller
// =============================================================
let cachedServiceCategories = null;
let isFetchingServiceCategories = false;
let pendingModalServiceType = null;

/**
 * Fetches all service categories from backend API:
 * GET https://localhost:7148/api/Global/GetAllServiceCategory
 */
async function getServiceCategories() {
    if (cachedServiceCategories && cachedServiceCategories.length > 0) {
        return cachedServiceCategories;
    }
    if (isFetchingServiceCategories) {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (!isFetchingServiceCategories) {
                    clearInterval(interval);
                    resolve(cachedServiceCategories || []);
                }
            }, 50);
        });
    }

    isFetchingServiceCategories = true;
    try {
        const modalEl = document.getElementById('quickQuoteModal');
        const configuredApiBaseUrl = (
            window.apiBaseUrl ||
            modalEl?.getAttribute('data-api-base-url') ||
            document.body?.getAttribute('data-api-base-url') ||
            'https://localhost:7148'
        ).toString().trim().replace(/\/+$/, '');

        const response = await fetch(`${configuredApiBaseUrl}/api/Global/GetAllServiceCategory`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load service categories: ${response.status}`);
        }

        const resData = await response.json();
        let items = [];
        if (Array.isArray(resData)) {
            items = resData;
        } else if (resData && Array.isArray(resData.data)) {
            items = resData.data;
        } else if (resData && Array.isArray(resData.result)) {
            items = resData.result;
        }

        if (items && items.length > 0) {
            cachedServiceCategories = items;
        }
    } catch (error) {
        console.warn('Could not populate service categories from API, using default options:', error);
    } finally {
        isFetchingServiceCategories = false;
    }

    return cachedServiceCategories || [];
}

/**
 * Populates a <select> element with service category options
 */
function renderServiceCategoryOptions(selectEl, categories, preselectedValue) {
    if (!selectEl || !categories || categories.length === 0) return;

    const targetVal = preselectedValue !== undefined && preselectedValue !== null
        ? preselectedValue
        : selectEl.value;

    selectEl.innerHTML = '';

    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = 'Select a Service / Category';
    placeholderOpt.disabled = true;
    if (!targetVal) {
        placeholderOpt.selected = true;
    }
    selectEl.appendChild(placeholderOpt);

    categories.forEach(cat => {
        const opt = document.createElement('option');
        const name = cat.name || cat.serviceName || cat.categoryName || '';
        opt.value = name;
        opt.textContent = name;
        if (cat.id !== undefined && cat.id !== null) {
            opt.setAttribute('data-id', cat.id);
        }
        selectEl.appendChild(opt);
    });

    if (targetVal) {
        selectCategorySmart(selectEl, targetVal);
    }

    updateCategoryIdHiddenField(selectEl);
}

/**
 * Keeps hidden input modalServiceCategoryId in sync with selected category id
 */
function updateCategoryIdHiddenField(selectEl) {
    if (!selectEl) return;
    const hiddenInput = document.getElementById('modalServiceCategoryId');
    if (!hiddenInput) return;

    const selectedOption = selectEl.options[selectEl.selectedIndex];
    if (selectedOption && selectedOption.dataset && selectedOption.dataset.id) {
        hiddenInput.value = selectedOption.dataset.id;
    } else {
        hiddenInput.value = '';
    }
}

/**
 * Smart matching for service/category name or keywords
 */
function selectCategorySmart(selectEl, rawValue) {
    if (!selectEl || !rawValue) return;
    const searchVal = rawValue.toString().trim().toLowerCase();
    if (!searchVal) return;

    // 1. Exact match by value or visible text
    for (let i = 0; i < selectEl.options.length; i++) {
        const opt = selectEl.options[i];
        if (opt.value.toLowerCase() === searchVal || opt.textContent.toLowerCase() === searchVal) {
            selectEl.selectedIndex = i;
            updateCategoryIdHiddenField(selectEl);
            return;
        }
    }

    // 2. Substring match
    for (let i = 0; i < selectEl.options.length; i++) {
        const opt = selectEl.options[i];
        if (!opt.value) continue;
        const optVal = opt.value.toLowerCase();
        if (optVal.includes(searchVal) || searchVal.includes(optVal)) {
            selectEl.selectedIndex = i;
            updateCategoryIdHiddenField(selectEl);
            return;
        }
    }

    // 3. Keyword heuristic match
    const keywords = ['label', 'button', 'zipper', 'tag', 'packag', 'print', 'emboss', 'heat', 'laminat', 'stock', 'sourc', 'trim'];
    for (const kw of keywords) {
        if (searchVal.includes(kw)) {
            for (let i = 0; i < selectEl.options.length; i++) {
                const opt = selectEl.options[i];
                if (opt.value.toLowerCase().includes(kw)) {
                    selectEl.selectedIndex = i;
                    updateCategoryIdHiddenField(selectEl);
                    return;
                }
            }
        }
    }

    // 4. Custom option if not found
    const customOpt = document.createElement('option');
    customOpt.value = rawValue;
    customOpt.textContent = rawValue;
    customOpt.selected = true;
    selectEl.appendChild(customOpt);
    updateCategoryIdHiddenField(selectEl);
}

/**
 * Initializes and populates the Quick Quote Modal dropdown from backend API
 */
async function initQuickQuoteServiceCategories(preselectVal) {
    const modalSelect = document.getElementById('modalServiceType');
    if (!modalSelect) return;

    const categories = await getServiceCategories();
    if (categories && categories.length > 0) {
        const targetValue = preselectVal || pendingModalServiceType || modalSelect.value;
        renderServiceCategoryOptions(modalSelect, categories, targetValue);
        pendingModalServiceType = null;
    }
}

// Global Quick Quote & Quick View Modal triggers
window.openQuoteModal = function (productName, serviceType) {
    const quoteModalEl = document.getElementById('quickQuoteModal');
    if (quoteModalEl) {
        const serviceSelect = document.getElementById('modalServiceType');
        const productInput = document.getElementById('modalProductName');

        if (productInput) {
            productInput.value = productName || '';
        }

        if (serviceType) {
            pendingModalServiceType = serviceType;
            if (serviceSelect) {
                selectCategorySmart(serviceSelect, serviceType);
            }
        }

        if (!cachedServiceCategories) {
            initQuickQuoteServiceCategories(serviceType);
        }

        const modal = bootstrap.Modal.getOrCreateInstance(quoteModalEl);
        modal.show();
    }
};

window.openProductQuickView = function (title, category, imgSrc, desc, specs) {
    const modalEl = document.getElementById('productQuickViewModal');
    if (modalEl) {
        document.getElementById('quickViewTitle').textContent = title;
        document.getElementById('quickViewCategory').textContent = category;
        document.getElementById('quickViewImage').src = imgSrc;
        document.getElementById('quickViewDesc').textContent = desc;
        document.getElementById('quickViewSpecs').textContent = specs;

        const btn = document.getElementById('quickViewQuoteBtn');
        if (btn) {
            btn.onclick = function () {
                const curModal = bootstrap.Modal.getInstance(modalEl);
                if (curModal) curModal.hide();
                setTimeout(() => window.openQuoteModal(title, category), 300);
            };
        }

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
};
