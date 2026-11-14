/**
 * ZamZam Trims (BD) Limited - Home Page Controller (home.js)
 * ----------------------------------------------------------
 * Giant Factory Carousel, Hero Spotlight, Customer Repetition Progress,
 * Dark Process Step Counters, and Dynamic Buyer Profiles Switcher.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // Shared Helper: Escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Shared Base API URL configuration with mixed-content safeguard
    const heroSectionEl = document.getElementById('factoryHeroSection') || document.querySelector('.factory-hero-section');
    const rawApiBaseUrl = (heroSectionEl?.getAttribute('data-api-base-url') || window.apiBaseUrl || 'https://localhost:7148').trim();
    let apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');
    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace(/^http:\/\//i, 'https://');
    }

    // =============================================================
    // 1. Giant Factory Carousel Dynamic API Loader & Interactive Controller
    // =============================================================
    const factoryCarouselEl = document.getElementById('factoryHeroCarousel');

    if (factoryCarouselEl) {
        const BRAND_IMAGES_API_URL = `${apiBaseUrl}/api/Global/GetAllBrandImages`;

        const hudCounterCur = document.querySelector('.factory-hud-counter .cur-slide');
        const hudCounterTotal = document.querySelector('.factory-hud-counter .total-slide');
        const playPauseBtn = document.getElementById('factoryCarouselPlayPause');
        const prevBtn = document.getElementById('factoryCarouselPrev');
        const nextBtn = document.getElementById('factoryCarouselNext');
        const progressBarFill = document.getElementById('factoryProgressBarFill');

        let carouselInstance = null;
        let isPlaying = true;
        let progressAnimFrame = null;
        let slideStartTime = performance.now();
        const slideDuration = 6500;

        // Construct absolute URL for images returned from the API
        function getFullImageUrl(imagePath) {
            if (!imagePath) return '/images/slider/slide-1.jpg';
            if (/^https?:\/\//i.test(imagePath)) {
                return imagePath;
            }
            const normalized = imagePath.replace(/\\/g, '/');
            const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
            return `${apiBaseUrl}${cleanPath}`;
        }

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

        // Initialize or reinitialize Bootstrap Carousel instance
        function initCarouselInstance() {
            if (carouselInstance) {
                try {
                    carouselInstance.dispose();
                } catch (e) {
                    console.warn('[HomeCarousel] Error disposing old carousel instance:', e);
                }
                carouselInstance = null;
            }

            carouselInstance = new bootstrap.Carousel(factoryCarouselEl, {
                interval: slideDuration,
                ride: 'carousel',
                pause: 'hover',
                wrap: true,
                touch: true
            });

            if (isPlaying) {
                carouselInstance.cycle();
            } else {
                carouselInstance.pause();
            }

            resetProgress();
        }

        // Handle slide change event
        factoryCarouselEl.addEventListener('slide.bs.carousel', function (e) {
            const nextIdx = e.to;
            if (hudCounterCur) {
                hudCounterCur.textContent = String(nextIdx + 1).padStart(2, '0');
            }
            resetProgress();
        });

        // Prev & Next navigation buttons
        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                if (carouselInstance) carouselInstance.prev();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                if (carouselInstance) carouselInstance.next();
            });
        }

        // Play/Pause toggle
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', function () {
                const icon = playPauseBtn.querySelector('i');
                if (isPlaying) {
                    if (carouselInstance) carouselInstance.pause();
                    isPlaying = false;
                    if (icon) {
                        icon.className = 'bi bi-play-fill';
                    }
                    playPauseBtn.title = 'Play Slideshow';
                    if (progressAnimFrame) cancelAnimationFrame(progressAnimFrame);
                } else {
                    if (carouselInstance) carouselInstance.cycle();
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
                if (carouselInstance) carouselInstance.prev();
            } else if (e.key === 'ArrowRight') {
                if (carouselInstance) carouselInstance.next();
            }
        });

        // Render dynamic slides from API data
        function populateCarouselSlides(brandImages) {
            const carouselInner = document.getElementById('factoryCarouselInner') || factoryCarouselEl.querySelector('.carousel-inner');
            if (!carouselInner || !Array.isArray(brandImages) || brandImages.length === 0) return;

            // Filter active items with valid imagePath
            const validImages = brandImages.filter(item => item && item.imagePath && (item.status === undefined || item.status === 1 || item.status === true));
            if (validImages.length === 0) return;

            // Update HUD counter
            if (hudCounterTotal) {
                hudCounterTotal.textContent = String(validImages.length).padStart(2, '0');
            }
            if (hudCounterCur) {
                hudCounterCur.textContent = '01';
            }

            // Build slide items HTML
            const slidesHtml = validImages.map((item, idx) => {
                const fullUrl = getFullImageUrl(item.imagePath);
                const name = escapeHtml(item.name || `Facility Image ${idx + 1}`);
                const remarks = escapeHtml(item.remarks || '');
                const activeClass = idx === 0 ? 'active' : '';

                return `
                    <div class="carousel-item ${activeClass} factory-slide-item" data-id="${item.id ?? idx}">
                        <div class="factory-slide-bg">
                            <img src="${fullUrl}" 
                                 alt="${name}" 
                                 title="${name}${remarks ? ' - ' + remarks : ''}"
                                 class="factory-slide-img" 
                                 loading="${idx === 0 ? 'eager' : 'lazy'}" 
                                 onerror="this.onerror=null; this.src='/images/slider/slide-1.jpg';" />
                        </div>
                        <div class="factory-slide-overlay"></div>
                        <div class="container h-100 position-relative">
                            <div class="factory-slide-content-wrap">
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            carouselInner.innerHTML = slidesHtml;
            initCarouselInstance();
            console.log(`[HomeCarousel] Successfully loaded ${validImages.length} brand images into carousel.`);
        }

        // Fetch brand images from API
        function loadBrandImagesFromApi() {
            console.log(`[HomeCarousel] Requesting brand images from: ${BRAND_IMAGES_API_URL}`);

            fetch(BRAND_IMAGES_API_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                cache: 'no-cache'
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`API request failed with status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                console.log('[HomeCarousel] API response received:', data);
                if (data && (data.succeeded === true || data.statusCode === 200 || Array.isArray(data.data))) {
                    const images = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
                    if (images.length > 0) {
                        populateCarouselSlides(images);
                    } else {
                        console.warn('[HomeCarousel] No brand images found in API response.');
                    }
                } else {
                    console.warn('[HomeCarousel] Unexpected API response payload:', data);
                }
            })
            .catch(err => {
                console.warn('[HomeCarousel] Primary fetch error, attempting jQuery fallback:', err);
                if (window.jQuery) {
                    window.jQuery.ajax({
                        url: BRAND_IMAGES_API_URL,
                        type: 'GET',
                        dataType: 'json',
                        cache: false,
                        timeout: 10000,
                        success: function (res) {
                            if (res && (res.succeeded === true || Array.isArray(res.data))) {
                                const images = Array.isArray(res.data) ? res.data : [];
                                if (images.length > 0) {
                                    populateCarouselSlides(images);
                                }
                            }
                        },
                        error: function (xhr, status, error) {
                            console.error('[HomeCarousel] Failed to retrieve brand images from API:', status, error);
                        }
                    });
                }
            });
        }

        // Initial carousel boot with fallback slide
        initCarouselInstance();

        // Fetch dynamic brand images to populate carousel
        loadBrandImagesFromApi();
    }

    // =============================================================
    // 2. Interactive Cursor Spotlight on Hero Giant Card
    // =============================================================
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

    // =============================================================
    // 2b. Dynamic Trusted Garments Product Categories Loader
    // =============================================================
    const trustedCategoriesContainer = document.getElementById('trustedGarmentsCategories');
    if (trustedCategoriesContainer) {
        const PRODUCT_CATEGORIES_API_URL = `${apiBaseUrl}/api/ProductCategory/GetAllForDisplay`;

        fetch(PRODUCT_CATEGORIES_API_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-cache'
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(response => {
            let categories = [];
            if (response && response.succeeded !== false && response.data) {
                categories = Array.isArray(response.data) ? response.data : (Array.isArray(response.data.items) ? response.data.items : []);
            } else if (Array.isArray(response)) {
                categories = response;
            }

            if (categories && categories.length > 0) {
                // Sort by displayOrder ascending
                categories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

                trustedCategoriesContainer.innerHTML = categories.map(cat => {
                    const safeName = escapeHtml(cat.name || '');
                    const encodedName = encodeURIComponent(cat.name || '');
                    return `<a href="/Home/Products?category=${encodedName}" class="badge bg-light text-dark border px-3 py-2 text-decoration-none trusted-category-badge" title="Browse ${safeName} products">${safeName}</a>`;
                }).join(' ');
            }
        })
        .catch(err => {
            console.warn('[Home] Failed to load trusted garments categories:', err);
        });
    }

    // =============================================================
    // 3. Section 2 Dynamic Progress Bar (Customer Repetition)
    // =============================================================
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

    // =============================================================
    // 4. Section 4 Dark Process Neon Bar & Step Percentage Counters
    // =============================================================
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

    // =============================================================
    // 5. Dynamic Capabilities Switcher (Services & Machineries)
    // =============================================================
    const capabilityTabs = document.querySelectorAll('.capabilities-tab, .business-profile-tab');
    const capabilitiesContent = document.getElementById('capabilitiesContent') || document.getElementById('businessProfileContent');

    const capabilitiesData = {
        services: {
            tag: '<i class="bi bi-gear-wide-connected me-1"></i> Specialized Manufacturing Solutions',
            title: 'Export-Grade Manufacturing Services',
            description: 'From high-speed multi-color offset and automated screen printing to computerized ultrasonic cutting, hot-foil stamping, and custom packaging. We offer full-cycle manufacturing services tailored to global apparel brands and RMG exporters.',
            bullets: [
                'High-volume offset printing, ultrasonic cutting & computerized sampling',
                'OEKO-TEX Standard 100 chemical wash-test & fastness certified',
                'Fast lab dip turnarounds with direct technical merchandiser coordination'
            ],
            primaryBtnText: 'Explore All Services',
            primaryBtnHref: '/Home/Services',
            primaryBtnIcon: 'bi bi-gear-wide-connected',
            secondaryBtnText: 'View Machineries',
            secondaryBtnHref: '/Home/Machineries',
            secondaryBtnIcon: 'bi bi-cpu',
            image1: '/images/services/ManufacturingService.jpg',
            image2: '/images/services/PackagingService.jpg',
            img1Alt: 'Manufacturing Services',
            img2Alt: 'Packaging Services',
            imgHref: '/Home/Services'
        },
        machineries: {
            tag: '<i class="bi bi-cpu me-1"></i> Industrial Machinery Infrastructure',
            title: 'Advanced European & Japanese Machineries',
            description: 'Our production facility is equipped with top-tier industrial machinery including Heidelberg GTO presses, automated screen printers, and hydraulic 3D embossers, delivering unmatched precision and zero-downtime reliability.',
            bullets: [
                'Heidelberg GTO & multi-color offset presses for micro-dot color fidelity',
                'Hydraulic 3D embossing & automated heat-seal laminating units',
                'High-speed electronic jacquard & needle loom weaving capacity'
            ],
            primaryBtnText: 'Explore All Machineries',
            primaryBtnHref: '/Home/Machineries',
            primaryBtnIcon: 'bi bi-cpu',
            secondaryBtnText: 'View Services',
            secondaryBtnHref: '/Home/Services',
            secondaryBtnIcon: 'bi bi-gear-wide-connected',
            image1: '/images/machineries/gto.jpg',
            image2: '/images/machineries/autoscreen.jpg',
            img1Alt: 'Heidelberg GTO Press',
            img2Alt: 'Automated Screen Printing Machine',
            imgHref: '/Home/Machineries'
        }
    };

    if (capabilityTabs.length > 0 && capabilitiesContent) {
        capabilityTabs.forEach(tab => {
            tab.addEventListener('click', function (e) {
                e.preventDefault();
                const key = this.getAttribute('data-tab');
                const data = capabilitiesData[key];
                if (!data) return;

                capabilityTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                // Smooth crossfade animation
                capabilitiesContent.classList.add('fade-out');

                setTimeout(() => {
                    const tagEl = capabilitiesContent.querySelector('.profile-tag');
                    const titleEl = capabilitiesContent.querySelector('.profile-title');
                    const descEl = capabilitiesContent.querySelector('.profile-desc');
                    const listEl = capabilitiesContent.querySelector('.profile-bullets');
                    const btnPrimary = capabilitiesContent.querySelector('#btnCapabilitiesPrimary, .profile-btn-primary');
                    const btnSecondary = capabilitiesContent.querySelector('#btnCapabilitiesSecondary, .profile-btn-secondary');
                    const img1El = capabilitiesContent.querySelector('.profile-img-1');
                    const img2El = capabilitiesContent.querySelector('.profile-img-2');
                    const imgLink1 = capabilitiesContent.querySelector('.profile-img-link-1');
                    const imgLink2 = capabilitiesContent.querySelector('.profile-img-link-2');

                    if (tagEl) tagEl.innerHTML = data.tag;
                    if (titleEl) titleEl.textContent = data.title;
                    if (descEl) descEl.textContent = data.description;
                    if (listEl) {
                        listEl.innerHTML = data.bullets.map(b => `<li class="mb-2"><i class="bi bi-check-circle-fill text-indigo me-2"></i> ${b}</li>`).join('');
                    }

                    if (btnPrimary) {
                        btnPrimary.href = data.primaryBtnHref;
                        btnPrimary.innerHTML = `<i class="${data.primaryBtnIcon} me-2"></i> <span>${data.primaryBtnText}</span>`;
                    }
                    if (btnSecondary) {
                        btnSecondary.href = data.secondaryBtnHref;
                        btnSecondary.innerHTML = `<i class="${data.secondaryBtnIcon} me-2"></i> <span>${data.secondaryBtnText}</span>`;
                    }

                    if (img1El) {
                        img1El.src = data.image1;
                        img1El.alt = data.img1Alt;
                    }
                    if (img2El) {
                        img2El.src = data.image2;
                        img2El.alt = data.img2Alt;
                    }
                    if (imgLink1) imgLink1.href = data.imgHref;
                    if (imgLink2) imgLink2.href = data.imgHref;

                    capabilitiesContent.classList.remove('fade-out');
                    capabilitiesContent.classList.add('fade-in');
                    setTimeout(() => capabilitiesContent.classList.remove('fade-in'), 400);
                }, 200);
            });
        });
    }
});
