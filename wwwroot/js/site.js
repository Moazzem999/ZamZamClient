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
});

// =============================================================
// 5. Global Quick Quote & Quick View Modal triggers
// =============================================================
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
