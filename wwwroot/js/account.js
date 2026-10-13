/**
 * ZamZam Trims (BD) Limited - Account Controller Script (account.js)
 * ------------------------------------------------------------------
 * Handles direct Ajax login API call to:
 * {ApiBaseUrl}/api/Auth/Login
 * Caches token/user in localStorage without toast notifications.
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

    // 2. Direct Ajax Login Call
    const $loginForm = $('#loginForm');
    const $submitBtn = $('#loginSubmitBtn');
    const $usernameInput = $('#usernameInput');
    const $summaryError = $('#loginSummaryError');
    const $successBanner = $('#loginSuccessBanner');

    // Retrieve ApiBaseUrl dynamically from form data attribute (set from appsettings.json)
    const configuredBaseUrl = $loginForm.data('api-base-url') || 'https://localhost:7148';
    const apiBaseUrl = configuredBaseUrl.toString().replace(/\/+$/, '');
    const LOGIN_API_URL = `${apiBaseUrl}/api/Auth/Login`;

    function escapeHtml(str) {
        if (!str) return '';
        return $('<div>').text(str).html();
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
                $summaryError.removeClass('d-none').text('Please enter both username and password.');
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
                        const displayName = user.name || userName;

                        // Cache token & user in localStorage
                        if (token) {
                            try {
                                localStorage.setItem('token', token);
                                localStorage.setItem('user', JSON.stringify(user));
                            } catch (storageEx) {
                                console.warn('LocalStorage error:', storageEx);
                            }
                        }

                        // Subtle in-card confirmation
                        $summaryError.addClass('d-none').text('');
                        $successBanner.removeClass('d-none').html(
                            `<i class="bi bi-check-circle-fill me-2"></i> Welcome back, <strong>${escapeHtml(displayName)}</strong>! You are signed in.`
                        );
                    } else {
                        // Backend returned failed result
                        const errorMsg = response?.message || 'Invalid username or password. Please verify credentials.';
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
