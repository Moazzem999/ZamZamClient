/**
 * ZamZam Trims (BD) Limited - Services Page Controller (services.js)
 * ------------------------------------------------------------------
 * Synchronizes and updates service cards from API endpoint:
 * https://localhost:7148/api/Services/GetAllForDisplay
 */

(function ($) {
    'use strict';

    // Built-in initial fallback services matching attached design
    const DEFAULT_SERVICES = [
        {
            title: "Manufacturing",
            description: "ZamZam Trims (BD) Limited runs fully equipped modern production floors designed for large-scale and precision manufacturing of apparel accessories and trims. Our cutting-edge infrastructure manufactures woven labels, care labels, twill tapes, drawstrings, buttons, elastics, and hang tags following strict international tolerances.",
            imagePath: "/images/services/ManufacturingService.jpg",
            displayOrder: 1,
            highlights: [
                { highlightText: "High-volume output capacity", displayOrder: 1 },
                { highlightText: "Export-standard compliance & OEKO-TEX adherence", displayOrder: 2 },
                { highlightText: "Custom mold, dye, and weave formulations", displayOrder: 3 },
                { highlightText: "Rigorous in-line quality assurance", displayOrder: 4 }
            ]
        },
        {
            title: "Digital Printing",
            description: "Our digital printing department is powered by latest-generation high-resolution digital presses capable of reproducing photo-realistic visuals, gradients, variable QR codes, and fine barcodes on diverse garment accessories, cards, and packaging substrates.",
            imagePath: "/images/services/ManufacturingService.jpg",
            displayOrder: 2,
            highlights: [
                { highlightText: "Variable data and serialized QR/Barcode printing", displayOrder: 1 },
                { highlightText: "Zero setup delay for rapid prototyping & short runs", displayOrder: 2 },
                { highlightText: "Eco-solvent, UV, and pigment ink technologies", displayOrder: 3 },
                { highlightText: "Micro-text clarity and pantone fidelity", displayOrder: 4 }
            ]
        },
        {
            title: "Apparel Labeling Solutions",
            description: "Labels are the signature of brand identity. We craft ultra-soft damask woven labels, high-density satin badges, heat transfer neck labels, and multi-lingual wash care labels engineered to survive hundreds of commercial wash cycles while keeping skin irritation at zero.",
            imagePath: "/images/services/ManufacturingService.jpg",
            displayOrder: 3,
            highlights: [
                { highlightText: "Damask, Satin, Taffeta, and Recycled Polyester yarns", displayOrder: 1 },
                { highlightText: "Ultrasonic softness for zero neck irritation", displayOrder: 2 },
                { highlightText: "Multi-lingual compliance wash care formatting", displayOrder: 3 },
                { highlightText: "Thermal cut, ultrasonic cut, and custom folding", displayOrder: 4 }
            ]
        }
    ];

    function initServicesPage() {
        const $grid = $('#servicesGridContainer');
        if (!$grid.length) return;

        let apiBaseUrl = ($grid.data('api-base-url') || window.apiBaseUrl || 'https://localhost:7148').replace(/\/+$/, '');
        if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
            apiBaseUrl = apiBaseUrl.replace('http://localhost:', 'https://localhost:');
        }

        const GET_SERVICES_URL = `${apiBaseUrl}/api/Services/GetAllForDisplay`;

        function escapeHtml(text) {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function resolveImageUrl(imagePath) {
            if (!imagePath) return '/images/services/ManufacturingService.jpg';
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                return imagePath;
            }
            if (imagePath.startsWith('/images/')) {
                return imagePath;
            }
            const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
            return `${apiBaseUrl}${cleanPath}`;
        }

        function generateSlug(title) {
            if (!title) return '';
            return title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
        }

        function renderCards(services) {
            if (!services || !services.length) return;

            // Sort by displayOrder
            const sorted = [...services].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

            $grid.empty();

            sorted.forEach((service, index) => {
                const title = escapeHtml(service.title || 'Service');
                const description = escapeHtml(service.description || service.fullDescription || '');
                const displayOrderNum = service.displayOrder != null ? service.displayOrder : (index + 1);
                const orderBadgeText = `#${String(displayOrderNum).padStart(2, '0')}`;
                const imgUrl = resolveImageUrl(service.imagePath || service.imageUrl);
                const slug = generateSlug(service.title);

                // Process Highlights
                let rawHighlights = [];
                if (Array.isArray(service.highlights)) {
                    rawHighlights = service.highlights;
                }
                const sortedHighlights = [...rawHighlights].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

                let highlightsHtml = '';
                if (sortedHighlights.length > 0) {
                    highlightsHtml = `
                        <div class="mb-4">
                            <div class="dynamic-service-highlights-label">HIGHLIGHTS:</div>
                            <ul class="dynamic-service-highlights-list">
                                ${sortedHighlights.map(h => {
                                    const text = typeof h === 'string' ? h : (h.highlightText || '');
                                    return `
                                        <li class="dynamic-service-highlight-item">
                                            <i class="bi bi-check-lg"></i>
                                            <span>${escapeHtml(text)}</span>
                                        </li>
                                    `;
                                }).join('')}
                            </ul>
                        </div>
                    `;
                }

                const rawTitleEscaped = (service.title || '').replace(/'/g, "\\'");

                const cardHtml = `
                    <div class="col-lg-4 col-md-6 dynamic-service-col" id="${slug}">
                        <div class="dynamic-service-card">
                            <!-- Top Image with Display Order Badge -->
                            <div class="dynamic-service-img-wrapper">
                                <span class="dynamic-service-order-badge">${orderBadgeText}</span>
                                <img src="${imgUrl}" 
                                     alt="${title}" 
                                     class="dynamic-service-img" 
                                     loading="lazy" 
                                     onerror="this.onerror=null; this.src='/images/services/ManufacturingService.jpg';" />
                            </div>

                            <!-- Title -->
                            <h3 class="dynamic-service-title">${title}</h3>

                            <!-- Description -->
                            <p class="dynamic-service-desc">${description}</p>

                            <!-- Highlights Section -->
                            ${highlightsHtml}

                            <!-- Footer Actions Matching Image -->
                            <div class="dynamic-service-footer">
                                <button type="button" 
                                        class="btn-service-quote" 
                                        onclick="openQuoteModal('${rawTitleEscaped}', '${rawTitleEscaped}')" 
                                        title="Request quote for ${title}">
                                    <i class="bi bi-file-earmark-text"></i>
                                    <span>Request Quote</span>
                                </button>
                                <a href="tel:+8801874633431" 
                                   class="btn-service-inquire" 
                                   title="Call directly to inquire">
                                    <i class="bi bi-telephone"></i>
                                    <span>Inquire</span>
                                </a>
                            </div>
                        </div>
                    </div>
                `;

                $grid.append(cardHtml);
            });

            // Auto-scroll and highlight if URL has hash
            if (window.location.hash) {
                const targetCard = document.querySelector(window.location.hash);
                if (targetCard) {
                    setTimeout(() => {
                        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetCard.classList.add('border', 'border-2', 'border-indigo');
                    }, 300);
                }
            }
        }

        // 1. Immediately render fallback cards so page is NEVER blank
        if ($grid.find('.service-skeleton-item').length > 0 || $grid.children().length === 0) {
            renderCards(DEFAULT_SERVICES);
        }

        // 2. Fetch live data from API in background and update cards
        console.log(`[Services Page] Fetching live services from: ${GET_SERVICES_URL}`);
        $.ajax({
            url: GET_SERVICES_URL,
            type: 'GET',
            dataType: 'json',
            cache: false,
            timeout: 10000,
            success: function (res) {
                console.log('[Services Page] Live API Response:', res);
                if (res && res.succeeded !== false && Array.isArray(res.data) && res.data.length > 0) {
                    renderCards(res.data);
                } else if (Array.isArray(res) && res.length > 0) {
                    renderCards(res);
                }
            },
            error: function (xhr, status, error) {
                console.warn('[Services Page] API fetch note (retaining cards):', status, error);
            }
        });
    }

    // Run as soon as jQuery is ready
    $(initServicesPage);

})(jQuery);
