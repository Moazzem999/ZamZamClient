// ZamZam Trims (BD) Limited - Modern Interactive Scripts

document.addEventListener('DOMContentLoaded', function () {
    // 1. Sticky Navbar shadow on scroll
    const navbar = document.querySelector('.site-navbar');
    const backToTopBtn = document.getElementById('backToTopBtn');

    window.addEventListener('scroll', function () {
        if (window.scrollY > 40) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }

        if (window.scrollY > 300) {
            if (backToTopBtn) backToTopBtn.style.display = 'flex';
        } else {
            if (backToTopBtn) backToTopBtn.style.display = 'none';
        }
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 2. Animated Numerical Counters
    const counters = document.querySelectorAll('.counter-val');
    if (counters.length > 0) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.getAttribute('data-target') || '0', 10);
                    let current = 0;
                    const increment = Math.max(1, Math.ceil(target / 40));
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= target) {
                            el.textContent = target;
                            clearInterval(timer);
                        } else {
                            el.textContent = current;
                        }
                    }, 30);
                    obs.unobserve(el);
                }
            });
        }, { threshold: 0.3 });

        counters.forEach(c => observer.observe(c));
    }

    // 3. Client-Side Instant Product Filter & Search
    const productGrid = document.getElementById('productsGrid');
    const filterButtons = document.querySelectorAll('.product-filter-btn');
    const searchInput = document.getElementById('productSearchInput');
    const productCards = document.querySelectorAll('.product-item-col');

    function filterProducts() {
        const activeCategory = document.querySelector('.product-filter-btn.active')?.getAttribute('data-filter') || 'all';
        const searchTerm = (searchInput?.value || '').trim().toLowerCase();
        let visibleCount = 0;

        productCards.forEach(card => {
            const cardCat = card.getAttribute('data-category') || '';
            const cardTitle = (card.getAttribute('data-title') || '').toLowerCase();
            const cardDesc = (card.getAttribute('data-desc') || '').toLowerCase();

            const matchCat = (activeCategory === 'all' || cardCat.toLowerCase() === activeCategory.toLowerCase());
            const matchSearch = (!searchTerm || cardTitle.includes(searchTerm) || cardDesc.includes(searchTerm));

            if (matchCat && matchSearch) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        const noResults = document.getElementById('noProductsAlert');
        if (noResults) {
            noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        const countBadge = document.getElementById('visibleProductsCount');
        if (countBadge) {
            countBadge.textContent = visibleCount;
        }
    }

    if (filterButtons.length > 0) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                filterButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                filterProducts();
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }

    // 4. Client-side Machinery Category Filter
    const machFilterBtns = document.querySelectorAll('.machinery-filter-btn');
    const machCards = document.querySelectorAll('.machinery-item-col');

    if (machFilterBtns.length > 0) {
        machFilterBtns.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                machFilterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const cat = this.getAttribute('data-filter') || 'all';

                machCards.forEach(card => {
                    const cardCat = card.getAttribute('data-category') || '';
                    if (cat === 'all' || cardCat.toLowerCase() === cat.toLowerCase()) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    // 5. Work Process Interactive Tab Switching
    const processPills = document.querySelectorAll('.process-pill');
    const processPanes = document.querySelectorAll('.process-pane');

    if (processPills.length > 0) {
        processPills.forEach(pill => {
            pill.addEventListener('click', function () {
                const targetStep = this.getAttribute('data-step');
                processPills.forEach(p => p.classList.remove('active'));
                this.classList.add('active');

                processPanes.forEach(pane => {
                    if (pane.getAttribute('data-step') === targetStep) {
                        pane.classList.remove('d-none');
                        pane.classList.add('fade-in');
                    } else {
                        pane.classList.add('d-none');
                    }
                });
            });
        });
    }

    // 6. Global Quick Quote Modal trigger pre-fill
    window.openQuoteModal = function (productName, serviceType) {
        const quoteModalEl = document.getElementById('quickQuoteModal');
        if (quoteModalEl) {
            const serviceSelect = document.getElementById('modalServiceType');
            const productInput = document.getElementById('modalProductName');

            if (serviceSelect && serviceType) {
                serviceSelect.value = serviceType;
            }
            if (productInput) {
                productInput.value = productName || '';
            }

            const modal = bootstrap.Modal.getOrCreateInstance(quoteModalEl);
            modal.show();
        }
    };

    // 7. Product Quick View Modal
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
});
