/**
 * ZamZam Trims (BD) Limited - About Us Page Controller (about.js)
 * --------------------------------------------------------------
 * Dynamic About Us Story API Loader, Leadership Team Cards Dynamics, and Milestones.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // =============================================================
    // 1. Dynamic About Us Story Section Loader (/api/Global/GetActiveAboutUs)
    // =============================================================
    const aboutSection = document.getElementById('aboutStorySection');
    if (aboutSection) {
        const configuredApiBaseUrl = (aboutSection.getAttribute('data-api-base-url') || 'https://localhost:7148').trim();
        const apiBaseUrl = configuredApiBaseUrl.replace(/\/+$/, '');
        const ACTIVE_ABOUT_US_API_URL = `${apiBaseUrl}/api/Global/GetActiveAboutUs`;

        // Helper: Escape HTML to prevent injection
        function escapeHtml(text) {
            if (text === null || text === undefined) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        }

        // Helper: Format story narrative and highlight company name
        function formatStoryText(text) {
            if (!text) return '';
            const safe = escapeHtml(text);
            return safe.replace(/ZamZam Trims \(BD\) Limited/g, '<strong>ZamZam Trims (BD) Limited</strong>');
        }

        console.log(`[AboutUs Public] Fetching active About Us content from: ${ACTIVE_ABOUT_US_API_URL}`);

        fetch(ACTIVE_ABOUT_US_API_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('[AboutUs Public] Received active About Us data:', result);
            if (!result || !(result.succeeded || result.statusCode === 200) || !result.data) {
                return;
            }

            const data = result.data;
            const sectionLabel = data.sectionLabel || data.SectionLabel;
            const mainHeading = data.mainHeading || data.MainHeading;
            const introduction = data.introduction || data.Introduction;
            const experienceDescription = data.experienceDescription || data.ExperienceDescription;
            const productionDescription = data.productionDescription || data.ProductionDescription;
            const capabilityTitle = data.capabilityTitle || data.CapabilityTitle;
            const capabilityDescription = data.capabilityDescription || data.CapabilityDescription;

            // 1. Section Tagline / Label
            const labelEl = document.getElementById('aboutStoryLabelText');
            if (labelEl && sectionLabel && sectionLabel.trim()) {
                labelEl.textContent = sectionLabel.trim();
            }

            // 2. Main Heading
            const headingEl = document.getElementById('aboutStoryHeading');
            if (headingEl && mainHeading && mainHeading.trim()) {
                headingEl.textContent = mainHeading.trim();
            }

            // 3. Introduction Narrative (Optional)
            const introEl = document.getElementById('aboutStoryIntro');
            if (introEl) {
                if (introduction && introduction.trim()) {
                    introEl.innerHTML = formatStoryText(introduction.trim());
                    introEl.style.display = '';
                } else {
                    introEl.style.display = 'none';
                }
            }

            // 4. Industry Experience Description
            const expEl = document.getElementById('aboutStoryExp');
            if (expEl) {
                if (experienceDescription && experienceDescription.trim()) {
                    expEl.innerHTML = formatStoryText(experienceDescription.trim());
                    expEl.style.display = '';
                } else {
                    expEl.style.display = 'none';
                }
            }

            // 5. Production & Machinery Description
            const prodEl = document.getElementById('aboutStoryProd');
            if (prodEl) {
                if (productionDescription && productionDescription.trim()) {
                    prodEl.innerHTML = formatStoryText(productionDescription.trim());
                    prodEl.style.display = '';
                } else {
                    prodEl.style.display = 'none';
                }
            }

            // 6. Capability Section Title & Description
            const capCardEl = document.getElementById('aboutCapabilitiesCard');
            const capTitleEl = document.getElementById('aboutCapabilitiesTitle');
            const capDescEl = document.getElementById('aboutCapabilitiesDesc');

            if (capCardEl) {
                if (capabilityDescription && capabilityDescription.trim()) {
                    if (capTitleEl) {
                        capTitleEl.textContent = (capabilityTitle && capabilityTitle.trim()) 
                            ? capabilityTitle.trim() 
                            : 'Comprehensive Product Capabilities:';
                    }
                    if (capDescEl) {
                        capDescEl.textContent = capabilityDescription.trim();
                    }
                    capCardEl.style.display = '';
                } else {
                    capCardEl.style.display = 'none';
                }
            }
        })
        .catch(err => {
            console.warn('[AboutUs Public] Note: Could not fetch active About Us API data, keeping fallback content:', err);
        });
    }

    // =============================================================
    // 2. Team Member Cards Interactive Hover Dynamics
    // =============================================================
    const teamCards = document.querySelectorAll('.team-member-card, .team-card');
    teamCards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-6px)';
        });
        card.addEventListener('mouseleave', function () {
            this.style.transform = '';
        });
    });
});
