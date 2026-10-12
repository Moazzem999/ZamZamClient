/**
 * ZamZam Trims (BD) Limited - Services Page Controller (services.js)
 * ------------------------------------------------------------------
 * Service Cards Interactive Highlighting and Anchor Auto-scroll.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // Auto-scroll and highlight if URL has hash (e.g. #digital-printing)
    if (window.location.hash) {
        const targetCard = document.querySelector(window.location.hash);
        if (targetCard) {
            setTimeout(() => {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetCard.classList.add('border', 'border-2', 'border-indigo');
            }, 300);
        }
    }
});
