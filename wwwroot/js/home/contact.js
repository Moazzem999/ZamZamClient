/**
 * ZamZam Trims (BD) Limited - Contact Page Controller (contact.js)
 * ----------------------------------------------------------------
 * Submits Contact Inquiry form directly to POST {ApiBaseUrl}/api/ContactInquiry.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const contactForm = document.getElementById('contactInquiryForm');
    if (!contactForm) return;

    let apiBaseUrl = (contactForm.getAttribute('data-api-base-url') || window.apiBaseUrl || 'https://localhost:7148').trim().replace(/\/+$/, '');
    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace(/^http:\/\//i, 'https://');
    }

    const ENDPOINT = `${apiBaseUrl}/api/ContactInquiry`;
    const feedbackEl = document.getElementById('contactFormFeedback');
    const submitBtn = document.getElementById('btnSendContactInquiry') || contactForm.querySelector('button[type="submit"]');
    const defaultBtnHtml = submitBtn ? submitBtn.innerHTML : '<i class="bi bi-send-fill me-2"></i> Send Message';

    const firstNameEl = document.getElementById('FirstName');
    const lastNameEl = document.getElementById('LastName');
    const emailEl = document.getElementById('Email');
    const phoneEl = document.getElementById('Phone');
    const subjectEl = document.getElementById('Subject');
    const messageEl = document.getElementById('Message');

    function showFeedback(message, isSuccess) {
        if (!feedbackEl) return;
        feedbackEl.className = `alert rounded-3 mb-4 d-flex align-items-center gap-2 ${isSuccess ? 'alert-success' : 'alert-danger'}`;
        feedbackEl.innerHTML = `
            <i class="bi ${isSuccess ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5 flex-shrink-0"></i>
            <span></span>
        `;
        const span = feedbackEl.querySelector('span');
        if (span) span.textContent = message;
        feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideFeedback() {
        if (!feedbackEl) return;
        feedbackEl.className = 'alert d-none rounded-3 mb-4';
        feedbackEl.innerHTML = '';
    }

    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideFeedback();

        // Trigger jQuery unobtrusive validation if loaded
        if (window.jQuery && typeof window.jQuery(contactForm).valid === 'function') {
            if (!window.jQuery(contactForm).valid()) {
                return;
            }
        }

        const firstName = (firstNameEl ? firstNameEl.value : '').trim();
        const lastName = (lastNameEl ? lastNameEl.value : '').trim();
        const email = (emailEl ? emailEl.value : '').trim();
        const phoneNumber = (phoneEl ? phoneEl.value : '').trim();
        const subject = (subjectEl ? subjectEl.value : '').trim();
        const message = (messageEl ? messageEl.value : '').trim();

        if (!firstName || !lastName || !email || !phoneNumber || !message) {
            showFeedback('Please fill in all required fields marked with *.', false);
            return;
        }

        if (!contactForm.checkValidity()) {
            contactForm.reportValidity();
            return;
        }

        const payload = {
            id: 0,
            firstName: firstName,
            lastName: lastName,
            email: email,
            phoneNumber: phoneNumber,
            subject: subject,
            message: message
        };

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Sending Message...';
        }

        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    'Accept': '*/*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            let result = null;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                try {
                    result = text ? JSON.parse(text) : null;
                } catch {
                    result = { succeeded: response.ok, message: text || response.statusText };
                }
            }

            if (!response.ok || (result && result.succeeded === false)) {
                let errMsg = (result && (result.message || result.title)) || `Failed to send inquiry (${response.status}).`;
                if (result && result.errors && typeof result.errors === 'object') {
                    const firstErrors = Object.values(result.errors).flat();
                    if (firstErrors.length > 0) errMsg = firstErrors[0];
                }
                showFeedback(errMsg, false);
                return;
            }

            showFeedback((result && result.message) || 'Thank you! Your inquiry has been submitted successfully.', true);
            contactForm.reset();
        } catch (err) {
            console.error('[Contact] Submit error:', err);
            showFeedback('Unable to connect to the server. Please try again later.', false);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = defaultBtnHtml;
            }
        }
    });
});
