// ZamZam Trims (BD) Limited - Advanced Interactive & Animation Controller

document.addEventListener('DOMContentLoaded', function () {
    // -------------------------------------------------------------
    // 1. Sticky Navbar & Circular SVG Scroll Progress Back-To-Top
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // 2. Interactive Cursor Spotlight on Hero Giant Card
    // -------------------------------------------------------------
    const heroCard = document.querySelector('.hero-giant-card');
    if (heroCard) {
        heroCard.addEventListener('mousemove', function (e) {
            const rect = heroCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            heroCard.style.setProperty('--mouse-x', `${x}px`);
            heroCard.style.setProperty('--mouse-y', `${y}px`);
        });
    }

    // -------------------------------------------------------------
    // 3. Scroll Reveal Engine (Lightweight 60fps IntersectionObserver)
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // 4. Smooth Numerical Counter Animation
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // 5. Section 2 Dynamic Progress Bar (Customer Repetition)
    // -------------------------------------------------------------
    const dynProgressBar = document.querySelector('.dynamic-progress-bar');
    if (dynProgressBar) {
        const barObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const targetWidth = dynProgressBar.getAttribute('data-target') || '95%';
                    dynProgressBar.style.width = targetWidth;
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        barObserver.observe(dynProgressBar);
    }

    // -------------------------------------------------------------
    // 6. Section 4 Dark Process Neon Bar & Step Percentage Counters
    // -------------------------------------------------------------
    const darkProcessCard = document.querySelector('.dark-process-card');
    const processNeonBar = document.getElementById('processNeonBar');
    const pctCounters = document.querySelectorAll('.counter-pct');

    if (darkProcessCard) {
        const processObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Fill illuminated neon bar
                    if (processNeonBar) {
                        processNeonBar.style.width = '100%';
                    }

                    // Animate step percentage numbers
                    pctCounters.forEach(pctEl => {
                        const target = parseInt(pctEl.getAttribute('data-target') || '0', 10);
                        const duration = 1400;
                        const start = performance.now();

                        function countUp(time) {
                            const progress = Math.min((time - start) / duration, 1);
                            const ease = 1 - Math.pow(1 - progress, 3);
                            pctEl.textContent = Math.floor(target * ease);
                            if (progress < 1) {
                                requestAnimationFrame(countUp);
                            } else {
                                pctEl.textContent = target;
                            }
                        }

                        requestAnimationFrame(countUp);
                    });

                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.25 });

        processObserver.observe(darkProcessCard);
    }

    // -------------------------------------------------------------
    // 7. Dynamic Buyer Profiles ("Business We Help To Grow")
    // -------------------------------------------------------------
    const profileTabs = document.querySelectorAll('.business-profile-tab');
    const profileContent = document.getElementById('businessProfileContent');

    const profileData = {
        enterprise: {
            tag: 'Dedicated Support',
            title: 'Enterprise Garment Manufacturers',
            description: 'We provide a complete range of accessories tailored to high-volume production needs. Our commitment is to streamline operations, reduce supply chain delays, and deliver superior-quality apparel trims so large manufacturers can focus on global export schedules.',
            bullets: [
                'High-volume monthly output capacity exceeding 10M trims/month',
                'Dedicated merchandising account managers & direct ERP link',
                'Punctual delivery across industrial export clusters (Gazipur, Savar, Ashulia, Chattogram)'
            ],
            image1: '/images/slider/slide-1.jpg',
            image2: '/images/slider/slide-2.jpg'
        },
        startup: {
            tag: 'Agile & Flexible',
            title: 'Emerging Labels & Fashion Startups',
            description: 'Launch your apparel brand with low minimum order quantities (MOQ), bespoke fabric development, and rapid design sampling. We empower new clothing lines with world-class packaging and brand identification.',
            bullets: [
                'Low MOQ batches with zero compromise on premium quality',
                'Rapid swatch sampling delivered within 48 to 72 business hours',
                'Complete creative assistance on woven labels, hang-tags & care labels'
            ],
            image1: '/images/slider/slide-3.jpg',
            image2: '/images/products/Buttons.jpg'
        },
        merchandiser: {
            tag: 'Speed & Accuracy',
            title: 'Apparel Merchandisers & Sourcing Teams',
            description: 'Instant cost estimations, rapid lab dips, and technical spec-sheet approvals. We provide merchandisers with verified tech-pack costing within 2-4 hours to streamline buyer presentations.',
            bullets: [
                'Direct factory cost computations with transparent pricing breakdown',
                'Compliant OEKO-TEX Standard 100 chemical safety test certifications',
                'Real-time order progress tracking and digital swatch catalogs'
            ],
            image1: '/images/slider/slide-2.jpg',
            image2: '/images/slider/slide-1.jpg'
        },
        garments: {
            tag: 'Continuous Feed',
            title: 'Export-Oriented RMG Factories',
            description: 'Consistent high-speed trims supply preventing floor downtime. We manufacture precision twill tapes, drawstrings, elastic bands, zippers, and gum tapes for seamless finishing lines.',
            bullets: [
                'Zero-tolerance tensile strength, elasticity, and wash-test resilience',
                'Bulk packaging engineered for rapid automated garment sewing lines',
                'Dedicated buffer stock reserved for rapid turnaround re-orders'
            ],
            image1: '/images/about-s3-pic.jpg',
            image2: '/images/machineries/screenprint.jpg'
        },
        trader: {
            tag: 'Global Wholesale',
            title: 'Wholesalers, Buying Houses & Trims Traders',
            description: 'High-margin wholesale pricing and white-label trims distribution. Access bulk factory quantities with customized branding, export packing, and swift port clearances.',
            bullets: [
                'Competitive container-load wholesale pricing and flexible credit terms',
                'OEM & private-label packaging tailored to overseas buyers',
                'Complete customs documentation and smooth logistics support'
            ],
            image1: '/images/slider/slide-1.jpg',
            image2: '/images/slider/slide-3.jpg'
        }
    };

    if (profileTabs.length > 0 && profileContent) {
        profileTabs.forEach(tab => {
            tab.addEventListener('click', function (e) {
                e.preventDefault();
                const key = this.getAttribute('data-tab');
                const data = profileData[key];
                if (!data) return;

                profileTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                // Smooth crossfade animation
                profileContent.classList.add('fade-out');

                setTimeout(() => {
                    const tagEl = profileContent.querySelector('.profile-tag');
                    const titleEl = profileContent.querySelector('.profile-title');
                    const descEl = profileContent.querySelector('.profile-desc');
                    const listEl = profileContent.querySelector('.profile-bullets');
                    const img1El = profileContent.querySelector('.profile-img-1');
                    const img2El = profileContent.querySelector('.profile-img-2');

                    if (tagEl) tagEl.textContent = data.tag;
                    if (titleEl) titleEl.textContent = data.title;
                    if (descEl) descEl.textContent = data.description;
                    if (listEl) {
                        listEl.innerHTML = data.bullets.map(b => `<li class="mb-2"><i class="bi bi-check-circle-fill text-indigo me-2"></i> ${b}</li>`).join('');
                    }
                    if (img1El) img1El.src = data.image1;
                    if (img2El) img2El.src = data.image2;

                    profileContent.classList.remove('fade-out');
                    profileContent.classList.add('fade-in');
                    setTimeout(() => profileContent.classList.remove('fade-in'), 400);
                }, 200);
            });
        });
    }

    // -------------------------------------------------------------
    // 8. Client-Side Instant Product Filter & Search
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // 9. Client-side Machinery Category Filter
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // 10. Global Quick Quote & Quick View Modal triggers
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // 12. Giant Factory Carousel Interactive Controller
    // -------------------------------------------------------------
    const factoryCarouselEl = document.getElementById('factoryHeroCarousel');
    if (factoryCarouselEl) {
        const carouselInstance = bootstrap.Carousel.getOrCreateInstance(factoryCarouselEl, {
            interval: 6500,
            ride: 'carousel',
            pause: 'hover',
            wrap: true,
            touch: true
        });

        const thumbCards = document.querySelectorAll('.factory-thumb-card');
        const hudCounterCur = document.querySelector('.factory-hud-counter .cur-slide');
        const playPauseBtn = document.getElementById('factoryCarouselPlayPause');
        const prevBtn = document.getElementById('factoryCarouselPrev');
        const nextBtn = document.getElementById('factoryCarouselNext');
        const progressBarFill = document.getElementById('factoryProgressBarFill');

        let isPlaying = true;
        let progressAnimFrame = null;
        let slideStartTime = performance.now();
        const slideDuration = 6500;

        function updateProgress() {
            if (!isPlaying) return;
            const elapsed = performance.now() - slideStartTime;
            const pct = Math.min(100, (elapsed / slideDuration) * 100);
            if (progressBarFill) {
                progressBarFill.style.width = `${pct}%`;
            }
            if (elapsed < slideDuration) {
                progressAnimFrame = requestAnimationFrame(updateProgress);
            }
        }

        function resetProgress() {
            if (progressAnimFrame) cancelAnimationFrame(progressAnimFrame);
            slideStartTime = performance.now();
            if (progressBarFill) {
                progressBarFill.style.width = '0%';
            }
            if (isPlaying) {
                progressAnimFrame = requestAnimationFrame(updateProgress);
            }
        }

        // Handle slide change event
        factoryCarouselEl.addEventListener('slide.bs.carousel', function (e) {
            const nextIdx = e.to;
            // Update active thumbnail
            thumbCards.forEach((card, idx) => {
                if (idx === nextIdx) {
                    card.classList.add('active');
                    // Scroll into view on mobile if needed
                    card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                } else {
                    card.classList.remove('active');
                }
            });

            // Update HUD counter
            if (hudCounterCur) {
                hudCounterCur.textContent = String(nextIdx + 1).padStart(2, '0');
            }

            resetProgress();
        });

        // Thumbnail clicks
        thumbCards.forEach(card => {
            card.addEventListener('click', function () {
                const targetIdx = parseInt(this.getAttribute('data-bs-slide-to') || '0', 10);
                carouselInstance.to(targetIdx);
            });
        });

        // Prev & Next buttons
        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                carouselInstance.prev();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                carouselInstance.next();
            });
        }

        // Play/Pause toggle
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', function () {
                const icon = playPauseBtn.querySelector('i');
                if (isPlaying) {
                    carouselInstance.pause();
                    isPlaying = false;
                    if (icon) {
                        icon.className = 'bi bi-play-fill';
                    }
                    playPauseBtn.title = 'Play Slideshow';
                    if (progressAnimFrame) cancelAnimationFrame(progressAnimFrame);
                } else {
                    carouselInstance.cycle();
                    isPlaying = true;
                    if (icon) {
                        icon.className = 'bi bi-pause-fill';
                    }
                    playPauseBtn.title = 'Pause Slideshow';
                    slideStartTime = performance.now() - ((parseFloat(progressBarFill?.style.width || '0') / 100) * slideDuration);
                    progressAnimFrame = requestAnimationFrame(updateProgress);
                }
            });
        }

        // Keyboard arrow navigation
        document.addEventListener('keydown', function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'ArrowLeft') {
                carouselInstance.prev();
            } else if (e.key === 'ArrowRight') {
                carouselInstance.next();
            }
        });

        // Start initial progress bar
        resetProgress();
    }

    // -------------------------------------------------------------
    // 13. Dark Mode / Light Mode Theme Controller
    // -------------------------------------------------------------
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
});
