/**
 * ZamZam Trims (BD) Limited - Contact Page Controller (contact.js)
 * ----------------------------------------------------------------
 * Contact Form validation, submitting feedback, and interactive helpers.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const contactForm = document.querySelector('form[action*="SubmitContact"]');

    if (contactForm) {
        contactForm.addEventListener('submit', function () {
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Sending Message...';
            }
        });
    }
});
