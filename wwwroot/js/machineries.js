/**
 * ZamZam Trims (BD) Limited - Machineries Page Controller (machineries.js)
 * -----------------------------------------------------------------------
 * Machinery Category Filtering, Technical Capability Badges, and Transitions.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

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
});
