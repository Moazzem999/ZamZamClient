/**
 * ZamZam Trims (BD) Limited - Account Controller Script (account.js)
 * ------------------------------------------------------------------
 * Handles direct Ajax login API call to:
 * https://localhost:7148/api/Auth/Login
 * Displays rich Toast info notification upon successful login.
 */

$(function () {
    'use strict';

    // 1. Password Visibility Toggle
    const $toggleBtn = $('#togglePasswordBtn');
    const $passwordInput = $('#passwordInput');
    const $toggleIcon = $('#togglePasswordIcon');

    if ($toggleBtn.length && $passwordInput.length && $toggleIcon.length) {
        $toggleBtn.on('click', function () {
            const isPassword = $passwordInput.attr('type') === 'password';
            $passwordInput.attr('type', isPassword ? 'text' : 'password');
            $toggleIcon.attr('class', isPassword ? 'bi bi-eye-slash' : 'bi bi-eye');
            $toggleBtn.attr('title', isPassword ? 'Hide password' : 'Show password');
        });
    }

    // 2. Direct Ajax Login Call & Toast Info Notification
    const LOGIN_API_URL = 'https://localhost:7148/api/Auth/Login';

    const $loginForm = $('#loginForm');
    const $submitBtn = $('#loginSubmitBtn');
    const $usernameInput = $('#usernameInput');
    const $summaryError = $('#loginSummaryError');
    const $successBanner = $('#loginSuccessBanner');

    function escapeHtml(str) {
        if (!str) return '';
        return $('<div>').text(str).html();
    }

    // Function to render and trigger Bootstrap Toast Info
    function showToastInfo(options) {
        const toastEl = document.getElementById('authToast');
        if (!toastEl) return;

        const $toastHeader = $('#authToastHeader');
        const $toastIcon = $('#authToastIcon');
        const $toastTitle = $('#authToastTitle');
        const $toastTime = $('#authToastTime');
        const $toastBody = $('#authToastBody');

        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        $toastTime.text(currentTime);

        if (options.status === 'success') {
            $toastHeader.attr('class', 'toast-header border-0 py-2 px-3 text-white bg-success');
            $toastIcon.attr('class', 'bi bi-check-circle-fill me-2 fs-5');
            $toastTitle.text(options.title || 'Login Successful');

            const contentHtml = `
                <div class="auth-toast-success-content">
                    <div class="d-flex align-items-center mb-3">
                        <div class="auth-toast-avatar me-3">
                            <i class="bi bi-person-check-fill fs-3 text-success"></i>
                        </div>
                        <div>
                            <h6 class="mb-0 fw-bold font-heading text-dark auth-toast-user-name">${escapeHtml(options.userName)}</h6>
                            <div class="small text-muted auth-toast-user-email">
                                <i class="bi bi-envelope me-1"></i>${escapeHtml(options.userEmail)}
                            </div>
                        </div>
                    </div>

                    <div class="p-2 rounded-3 bg-light border small mb-2 auth-toast-meta">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="text-muted">User ID:</span>
                            <strong class="badge bg-secondary-subtle text-secondary">#${escapeHtml(String(options.userId))}</strong>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-muted">Token Validity:</span>
                            <span class="badge bg-success-subtle text-success border border-success-subtle">
                                <i class="bi bi-clock-history me-1"></i>Expires in ${escapeHtml(String(options.expiresIn))} min
                            </span>
                        </div>
                    </div>

                    ${options.token ? `
                    <div class="mt-2 pt-2 border-top">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="small text-muted fw-semibold" style="font-size: 0.75rem;">JWT Access Token:</span>
                            <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none copy-token-btn" style="font-size: 0.75rem;">
                                <i class="bi bi-clipboard me-1"></i>Copy Token
                            </button>
                        </div>
                        <div class="token-preview-box font-monospace small text-muted p-2 rounded bg-light border" style="font-size: 0.72rem; word-break: break-all; max-height: 70px; overflow-y: auto;">
                            ${escapeHtml(options.token)}
                        </div>
                    </div>` : ''}
                </div>
            `;

            $toastBody.html(contentHtml);

            // Copy Token to Clipboard Handler
            $toastBody.find('.copy-token-btn').on('click', function () {
                const $btn = $(this);
                if (navigator.clipboard && options.token) {
                    navigator.clipboard.writeText(options.token).then(function () {
                        $btn.html('<i class="bi bi-check2 me-1 text-success"></i>Copied!');
                        setTimeout(() => {
                            $btn.html('<i class="bi bi-clipboard me-1"></i>Copy Token');
                        }, 2500);
                    }).catch(function () {
                        $btn.text('Failed to copy');
                    });
                }
            });
        } else {
            // Error Toast
            $toastHeader.attr('class', 'toast-header border-0 py-2 px-3 text-white bg-danger');
            $toastIcon.attr('class', 'bi bi-exclamation-triangle-fill me-2 fs-5');
            $toastTitle.text(options.title || 'Login Failed');

            const errorHtml = `
                <div class="d-flex align-items-start gap-2 py-1">
                    <i class="bi bi-x-circle-fill text-danger fs-4 mt-1"></i>
                    <div>
                        <div class="fw-semibold text-danger mb-1">${escapeHtml(options.title || 'Login Failed')}</div>
                        <div class="small text-secondary">${escapeHtml(options.message || 'Invalid username or password. Please try again.')}</div>
                    </div>
                </div>
            `;
            $toastBody.html(errorHtml);
        }

        const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
        toast.show();
    }

    // Ajax Form Submission Handler
    if ($loginForm.length && $submitBtn.length) {
        $loginForm.on('submit', function (e) {
            e.preventDefault();

            // Clear previous alerts
            $summaryError.addClass('d-none').text('');
            $successBanner.addClass('d-none').html('');

            const userName = ($usernameInput.val() || '').trim();
            const password = $passwordInput.val() || '';

            if (!userName || !password) {
                showToastInfo({
                    status: 'error',
                    title: 'Validation Error',
                    message: 'Please enter both username and password.'
                });
                return;
            }

            // Set button loading state
            $submitBtn.prop('disabled', true);
            const originalButtonHtml = $submitBtn.html();
            $submitBtn.html('<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Authenticating...');

            // Direct Ajax Call to Login API
            $.ajax({
                url: LOGIN_API_URL,
                type: 'POST',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({
                    userName: userName,
                    password: password
                }),
                success: function (response) {
                    console.log('Login API Response:', response);

                    // If API returned succeeded: true or HTTP 200
                    if (response && (response.succeeded === true || response.statusCode === 200)) {
                        const data = response.data || {};
                        const user = data.user || {};
                        const token = data.token || '';
                        const expiresIn = data.expiresIn !== undefined ? data.expiresIn : 30;
                        const displayName = user.name || userName;
                        const userEmail = user.email || '';
                        const userId = user.id !== undefined ? user.id : '';

                        // Cache token & user in localStorage
                        if (token) {
                            try {
                                localStorage.setItem('token', token);
                                localStorage.setItem('user', JSON.stringify(user));
                            } catch (storageEx) {
                                console.warn('LocalStorage error:', storageEx);
                            }
                        }

                        // Just give a toast info that's it!
                        showToastInfo({
                            status: 'success',
                            title: 'Login Successful',
                            userName: displayName,
                            userEmail: userEmail,
                            userId: userId,
                            expiresIn: expiresIn,
                            token: token,
                            message: response.message
                        });

                        // Subtle in-card confirmation
                        $successBanner.removeClass('d-none').html(
                            `<i class="bi bi-check-circle-fill me-2"></i> Welcome back, <strong>${escapeHtml(displayName)}</strong>! You are signed in.`
                        );
                    } else {
                        // Backend returned failed result
                        const errorMsg = response?.message || 'Invalid username or password. Please verify credentials.';
                        showToastInfo({
                            status: 'error',
                            title: 'Login Failed',
                            message: errorMsg
                        });

                        $summaryError.removeClass('d-none').text(errorMsg);
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Login API Error:', status, error, xhr);

                    let errorMsg = 'Unable to connect to the authentication server at ' + LOGIN_API_URL + '. Please ensure the API is running.';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    } else if (xhr.responseText) {
                        try {
                            const parsed = JSON.parse(xhr.responseText);
                            if (parsed.message) errorMsg = parsed.message;
                        } catch (e) {
                            // Non-json response
                        }
                    }

                    showToastInfo({
                        status: 'error',
                        title: 'Authentication Error',
                        message: errorMsg
                    });

                    $summaryError.removeClass('d-none').text(errorMsg);
                },
                complete: function () {
                    // Restore button state
                    $submitBtn.prop('disabled', false);
                    $submitBtn.html(originalButtonHtml);
                }
            });
        });
    }
});
