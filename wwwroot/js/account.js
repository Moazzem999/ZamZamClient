/**
 * ZamZam Trims (BD) Limited - Account Controller Script (account.js)
 * ------------------------------------------------------------------
 * Password visibility toggling and login button submission state.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // 1. Password visibility toggle
    const toggleBtn = document.getElementById('togglePasswordBtn');
    const passwordInput = document.getElementById('passwordInput');
    const toggleIcon = document.getElementById('togglePasswordIcon');

    if (toggleBtn && passwordInput && toggleIcon) {
        toggleBtn.addEventListener('click', function () {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            toggleIcon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
            toggleBtn.title = isPassword ? 'Hide password' : 'Show password';
        });
    }

    // 2. Form submit feedback
    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('loginSubmitBtn');

    if (loginForm && submitBtn) {
        loginForm.addEventListener('submit', function () {
            // Check form validity if HTML5 validation is used
            if (loginForm.checkValidity()) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Signing In...';
            }
        });
    }
});
