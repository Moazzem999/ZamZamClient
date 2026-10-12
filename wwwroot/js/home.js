/**
 * ZamZam Trims (BD) Limited - Home Page Controller (home.js)
 * ----------------------------------------------------------
 * Giant Factory Carousel, Hero Spotlight, Customer Repetition Progress,
 * Dark Process Step Counters, and Dynamic Buyer Profiles Switcher.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // =============================================================
    // 1. Giant Factory Carousel Interactive Controller
    // =============================================================
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
