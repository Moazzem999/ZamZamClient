/**
 * ZamZam Trims (BD) Limited - About Us Page Controller (about.js)
 * --------------------------------------------------------------
 * Company Timeline, Leadership Team Cards Dynamics, and Milestones.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // Interactive hover micro-dynamics on team member cards
    const teamCards = document.querySelectorAll('.team-member-card');
    teamCards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-6px)';
        });
        card.addEventListener('mouseleave', function () {
            this.style.transform = '';
        });
    });
});
