/**
 * ZamZam Trims (BD) Limited - Account Controller Script (account.js)
 * ------------------------------------------------------------------
 * Password visibility toggling, demo credential auto-fill,
 * and login button submission state.
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

    // 2. Demo credentials auto-filler chips
    const demoButtons = document.querySelectorAll('.demo-fill-btn');
    const usernameInput = document.querySelector('input[name="Username"]') || document.querySelector('input[name="Email"]');

    if (demoButtons.length > 0 && usernameInput && passwordInput) {
        demoButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                const user = this.getAttribute('data-username') || this.getAttribute('data-email');
                const pass = this.getAttribute('data-pass');

                usernameInput.value = user || '';
                passwordInput.value = pass || '';

                // Subtle animation highlight
                usernameInput.classList.add('is-valid');
                passwordInput.classList.add('is-valid');
                setTimeout(() => {
                    usernameInput.classList.remove('is-valid');
                    passwordInput.classList.remove('is-valid');
                }, 1200);
            });
        });
    }

    // 3. Form submit feedback
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
