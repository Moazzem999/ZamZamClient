/**
 * ZamZam Trims (BD) Limited - Products Page Controller (products.js)
 * ------------------------------------------------------------------
 * Client-Side Instant Product Filter, Live Search, Category Matching,
 * Result Counting, and URL Query Parameter Synchronization.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const filterButtons = document.querySelectorAll('.product-filter-btn');
    const searchInput = document.getElementById('productSearchInput');
    const productCards = document.querySelectorAll('.product-item-col');
    const noResults = document.getElementById('noProductsAlert');
    const countBadge = document.getElementById('visibleProductsCount');

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

        if (noResults) {
            noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }

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

    // Support URL category query param (e.g. /Home/Products?category=Labels)
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        const targetBtn = Array.from(filterButtons).find(btn =>
            (btn.getAttribute('data-filter') || '').toLowerCase() === categoryParam.toLowerCase()
        );
        if (targetBtn) {
            targetBtn.click();
        }
    }
});
