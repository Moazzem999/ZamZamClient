/**
 * ZamZam Trims (BD) Limited - Home Page Controller (home.js)
 * ----------------------------------------------------------
 * Giant Factory Carousel, Hero Spotlight, Customer Repetition Progress,
 * Dark Process Step Counters, and Dynamic Buyer Profiles Switcher.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // =============================================================
    // 1. Giant Factory Carousel Dynamic API Loader & Interactive Controller
    // =============================================================
    const factoryCarouselEl = document.getElementById('factoryHeroCarousel');
    const heroSectionEl = document.getElementById('factoryHeroSection') || document.querySelector('.factory-hero-section');

    if (factoryCarouselEl) {
        // Read API base URL from section container data attribute or default to https://localhost:7148
        const configuredApiBaseUrl = (heroSectionEl?.getAttribute('data-api-base-url') || 'https://localhost:7148').trim();
        const apiBaseUrl = configuredApiBaseUrl.replace(/\/+$/, '');
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

        // Escape HTML to prevent XSS
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

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
    // 5. Dynamic Buyer Profiles ("Business We Help To Grow")
    // =============================================================
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
            description: 'High-margin wholesale pricing and white-label trims distribution. Access bulk factory quantities with customized branding, export packaging, and swift port clearances.',
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
});
