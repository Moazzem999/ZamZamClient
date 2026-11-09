/**
 * ZamZam Trims (BD) Limited - Employee Creation (employee-create.js)
 * ------------------------------------------------------------------
 * Handles employee creation form validation, file previews, and multipart/form-data POST to:
 * {ApiBaseUrl}/api/Employees
 */

$(function () {
    'use strict';

    // 1. Elements & Configuration
    const $container = $('#employeeCreateContainer');
    let apiBaseUrl = ($container.data('api-base-url') || 'https://localhost:7148').replace(/\/+$/, '');

    if (window.location.protocol === 'https:' && apiBaseUrl.startsWith('http://localhost:')) {
        apiBaseUrl = apiBaseUrl.replace('http://localhost:', 'https://localhost:');
    }

    const CREATE_EMPLOYEE_URL = `${apiBaseUrl}/api/Employees`;
    const GET_MARITAL_STATUS_URL = `${apiBaseUrl}/api/Dropdown/GetAllMaritalStatus`;
    const GET_RELIGION_URL = `${apiBaseUrl}/api/Dropdown/GetAllReligion`;

    const $form = $('#createEmployeeForm');
    const $submitBtn = $('#btnSubmitEmployee');
    const $submitBtnText = $('#btnSubmitText');
    const $alertBox = $('#createAlertBox');

    // Input fields
    const $name = $('#empName');
    const $fatherName = $('#empFatherName');
    const $nidNo = $('#empNidNo');
    const $dateOfBirth = $('#empDateOfBirth');
    const $maritalStatus = $('#empMaritalStatus');
    const $religion = $('#empReligion');
    const $academicQualification = $('#empAcademicQualification');
    const $designation = $('#empDesignation');
    const $joiningDate = $('#empJoiningDate');
    const $salary = $('#empSalary');
    const $mobile = $('#empMobile');
    const $email = $('#empEmail');
    const $presentAddress = $('#empPresentAddress');
    const $permanentAddress = $('#empPermanentAddress');
    const $sameAsPresentCheck = $('#sameAsPresentCheck');

    // File inputs & preview elements
    const $imageInput = $('#empImageFile');
    const $imageDropzone = $('#imageDropzone');
    const $imagePreviewWrapper = $('#imagePreviewWrapper');
    const $imagePreviewImg = $('#imagePreviewImg');
    const $btnRemoveImage = $('#btnRemoveImage');

    const $nidImageInput = $('#empNidImageFile');
    const $nidDropzone = $('#nidDropzone');
    const $nidPreviewWrapper = $('#nidPreviewWrapper');
    const $nidPreviewImg = $('#nidPreviewImg');
    const $btnRemoveNidImage = $('#btnRemoveNidImage');

    // Toast elements
    const $toast = $('#dashToast');
    const $toastMessage = $('#dashToastMessage');
    let toastTimeout = null;

    let selectedImageFile = null;
    let selectedNidImageFile = null;

    // Set default dates if empty
    if (!$joiningDate.val()) {
        const today = new Date().toISOString().split('T')[0];
        $joiningDate.val(today);
    }

    // 2. Helper Functions
    function getAuthToken() {
        let token = localStorage.getItem('token') || '';
        if (!token) {
            const cookies = document.cookie.split(';');
            for (let c of cookies) {
                const [key, val] = c.trim().split('=');
                if (key === 'zamzam_token' || key === 'token') {
                    token = decodeURIComponent(val || '');
                    break;
                }
            }
        }
        return token;
    }

    function showToast(message, iconClass = 'bi bi-check-circle-fill text-success') {
        if (!$toast.length) return;
        if (toastTimeout) clearTimeout(toastTimeout);

        $toastMessage.text(message);
        $toast.find('.dash-toast-icon').attr('class', `dash-toast-icon ${iconClass}`);
        $toast.addClass('show');

        toastTimeout = setTimeout(function () {
            $toast.removeClass('show');
        }, 3500);
    }

    function showAlert(type, title, message) {
        $alertBox.removeClass('d-none alert-success alert-danger alert-warning');
        $alertBox.addClass(`alert-${type}`);
        $alertBox.html(`
            <div class="d-flex align-items-center gap-2">
                <i class="bi bi-${type === 'success' ? 'check-circle-fill text-success' : 'exclamation-triangle-fill text-danger'} fs-5"></i>
                <div>
                    <strong>${title}</strong>
                    <div class="small">${message}</div>
                </div>
            </div>
        `);
        $('html, body').animate({
            scrollTop: $alertBox.offset().top - 100
        }, 200);
    }

    function hideAlert() {
        $alertBox.addClass('d-none').empty();
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 3. Dropdown Population via API
    function loadDropdowns() {
        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // 3a. Marital Status Dropdown
        $.ajax({
            url: GET_MARITAL_STATUS_URL,
            type: 'GET',
            dataType: 'json',
            headers: headers,
            cache: true,
            success: function (res) {
                const list = res && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
                if (list.length > 0) {
                    let html = '<option value="">-- Select Marital Status --</option>';
                    list.forEach(item => {
                        html += `<option value="${item.id}">${escapeHtml(item.name)}</option>`;
                    });
                    $maritalStatus.html(html);
                } else {
                    fallbackMaritalStatus();
                }
            },
            error: function (xhr, status, error) {
                console.warn('[EmployeeCreate] Could not load marital status from API, applying fallback:', error);
                fallbackMaritalStatus();
            }
        });

        // 3b. Religion Dropdown
        $.ajax({
            url: GET_RELIGION_URL,
            type: 'GET',
            dataType: 'json',
            headers: headers,
            cache: true,
            success: function (res) {
                const list = res && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
                if (list.length > 0) {
                    let html = '<option value="">-- Select Religion --</option>';
                    list.forEach(item => {
                        html += `<option value="${item.id}">${escapeHtml(item.name)}</option>`;
                    });
                    $religion.html(html);
                } else {
                    fallbackReligion();
                }
            },
            error: function (xhr, status, error) {
                console.warn('[EmployeeCreate] Could not load religion from API, applying fallback:', error);
                fallbackReligion();
            }
        });
    }

    function fallbackMaritalStatus() {
        $maritalStatus.html(`
            <option value="">-- Select Marital Status --</option>
            <option value="1">Single</option>
            <option value="2">Married</option>
            <option value="3">Divorced</option>
        `);
    }

    function fallbackReligion() {
        $religion.html(`
            <option value="">-- Select Religion --</option>
            <option value="1">Islam</option>
            <option value="2">Hinduism</option>
            <option value="3">Christianity</option>
            <option value="4">Buddhism</option>
            <option value="5">Others</option>
        `);
    }

    // Load dropdown options immediately
    loadDropdowns();

    // 3. Address Sync Logic
    $sameAsPresentCheck.on('change', function () {
        if ($(this).is(':checked')) {
            $permanentAddress.val($presentAddress.val()).prop('readonly', true).addClass('bg-light');
        } else {
            $permanentAddress.prop('readonly', false).removeClass('bg-light');
        }
    });

    $presentAddress.on('input', function () {
        if ($sameAsPresentCheck.is(':checked')) {
            $permanentAddress.val($(this).val());
        }
    });

    // 4. Profile Photo Upload & Preview
    $imageInput.on('change', function () {
        const file = this.files && this.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Please select a valid image file (PNG, JPG, WEBP).', 'bi bi-exclamation-triangle-fill text-warning');
                return;
            }
            selectedImageFile = file;
            const reader = new FileReader();
            reader.onload = function (e) {
                $imagePreviewImg.attr('src', e.target.result);
                $imagePreviewWrapper.removeClass('d-none');
                $imageDropzone.addClass('d-none');
            };
            reader.readAsDataURL(file);
        }
    });

    $btnRemoveImage.on('click', function () {
        selectedImageFile = null;
        $imageInput.val('');
        $imagePreviewImg.attr('src', '');
        $imagePreviewWrapper.addClass('d-none');
        $imageDropzone.removeClass('d-none');
    });

    // 5. NID Image Upload & Preview
    $nidImageInput.on('change', function () {
        const file = this.files && this.files[0];
        if (file) {
            if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                showToast('Please select an image or PDF document.', 'bi bi-exclamation-triangle-fill text-warning');
                return;
            }
            selectedNidImageFile = file;
            const reader = new FileReader();
            reader.onload = function (e) {
                $nidPreviewImg.attr('src', e.target.result);
                $nidPreviewWrapper.removeClass('d-none');
                $nidDropzone.addClass('d-none');
            };
            reader.readAsDataURL(file);
        }
    });

    $btnRemoveNidImage.on('click', function () {
        selectedNidImageFile = null;
        $nidImageInput.val('');
        $nidPreviewImg.attr('src', '');
        $nidPreviewWrapper.addClass('d-none');
        $nidDropzone.removeClass('d-none');
    });

    // 6. Form Submission & API Integration
    $form.on('submit', function (e) {
        e.preventDefault();
        hideAlert();

        // Basic Client-side Validation
        const nameVal = $name.val().trim();
        const fatherNameVal = $fatherName.val().trim();
        const nidNoVal = $nidNo.val().trim();
        const designationVal = $designation.val().trim();
        const mobileVal = $mobile.val().trim();
        const emailVal = $email.val().trim();
        const salaryVal = parseFloat($salary.val()) || 0;
        const joiningDateVal = $joiningDate.val();
        const dateOfBirthVal = $dateOfBirth.val();
        const maritalStatusVal = parseInt($maritalStatus.val(), 10);
        const religionVal = parseInt($religion.val(), 10);
        const academicQualVal = $academicQualification.val().trim();
        const presentAddrVal = $presentAddress.val().trim();
        const permanentAddrVal = $permanentAddress.val().trim();

        if (!nameVal) {
            showAlert('danger', 'Validation Error', 'Employee Full Name is required.');
            $name.focus();
            return;
        }

        if (!fatherNameVal) {
            showAlert('danger', 'Validation Error', 'Father\'s Name is required.');
            $fatherName.focus();
            return;
        }

        if (!nidNoVal) {
            showAlert('danger', 'Validation Error', 'National ID (NID) number is required.');
            $nidNo.focus();
            return;
        }

        if (!maritalStatusVal) {
            showAlert('danger', 'Validation Error', 'Please select a Marital Status.');
            $maritalStatus.focus();
            return;
        }

        if (!religionVal) {
            showAlert('danger', 'Validation Error', 'Please select a Religion.');
            $religion.focus();
            return;
        }

        if (!designationVal) {
            showAlert('danger', 'Validation Error', 'Designation / Job Title is required.');
            $designation.focus();
            return;
        }

        if (!mobileVal) {
            showAlert('danger', 'Validation Error', 'Mobile number is required.');
            $mobile.focus();
            return;
        }

        if (!emailVal) {
            showAlert('danger', 'Validation Error', 'Email address is required.');
            $email.focus();
            return;
        }

        // Format dates into ISO 8601 strings
        let joiningDateIso;
        if (joiningDateVal) {
            try {
                joiningDateIso = new Date(joiningDateVal).toISOString();
            } catch (err) {
                joiningDateIso = new Date().toISOString();
            }
        } else {
            joiningDateIso = new Date().toISOString();
        }

        let dateOfBirthIso;
        if (dateOfBirthVal) {
            try {
                dateOfBirthIso = new Date(dateOfBirthVal).toISOString();
            } catch (err) {
                dateOfBirthIso = new Date('1995-01-01').toISOString();
            }
        } else {
            dateOfBirthIso = new Date('1995-01-01').toISOString();
        }

        // Build FormData matching the API schema
        const formData = new FormData();
        formData.append('Id', '0');
        formData.append('Name', nameVal);
        formData.append('FatherName', fatherNameVal);
        formData.append('NidNo', nidNoVal);
        formData.append('DateOfBirth', dateOfBirthIso);
        formData.append('MaritalStatus', String(maritalStatusVal));
        formData.append('Religion', String(religionVal));
        formData.append('AcademicQualification', academicQualVal);
        formData.append('Designation', designationVal);
        formData.append('JoiningDate', joiningDateIso);
        formData.append('Salary', String(salaryVal));
        formData.append('Mobile', mobileVal);
        formData.append('Email', emailVal);
        formData.append('PresentAddress', presentAddrVal);
        formData.append('PermanentAddress', permanentAddrVal);

        if (selectedImageFile) {
            formData.append('Image', selectedImageFile, selectedImageFile.name);
        }

        if (selectedNidImageFile) {
            formData.append('NidImage', selectedNidImageFile, selectedNidImageFile.name);
        }

        // Submit to API
        const token = getAuthToken();
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        $submitBtn.prop('disabled', true);
        $submitBtnText.html('<span class="spinner-border spinner-border-sm me-2" role="status"></span> Saving Employee...');

        console.log(`[EmployeeCreate] Sending POST to: ${CREATE_EMPLOYEE_URL}`);

        $.ajax({
            url: CREATE_EMPLOYEE_URL,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: headers,
            timeout: 25000,
            success: function (response) {
                console.log('[EmployeeCreate] Success response:', response);

                if (response && response.succeeded !== false) {
                    const successMsg = response.message || 'Employee created and registered successfully!';
                    showAlert('success', 'Employee Created', successMsg);
                    showToast('Employee created successfully! Redirecting to list...', 'bi bi-check-circle-fill text-success');

                    // Disable inputs and redirect to employee list
                    $form.find('input, textarea, select, button').prop('disabled', true);
                    setTimeout(function () {
                        window.location.href = '/Employee/List';
                    }, 1400);
                } else {
                    const errorMsg = response?.message || 'Server encountered an issue creating the employee.';
                    showAlert('danger', 'Creation Failed', errorMsg);
                    showToast(errorMsg, 'bi bi-exclamation-triangle-fill text-danger');
                    $submitBtn.prop('disabled', false);
                    $submitBtnText.html('<i class="bi bi-check2-circle me-1"></i> Save Employee');
                }
            },
            error: function (xhr, status, error) {
                console.error('[EmployeeCreate] Error response:', status, error, xhr);

                let errorMsg = 'Failed to connect to the Employee API. Please verify server availability.';

                if (xhr.status === 401) {
                    errorMsg = 'Session expired (401). Please log in again to continue.';
                    showToast(errorMsg, 'bi bi-shield-lock-fill text-warning');
                    setTimeout(function () {
                        window.location.href = '/Account/Login';
                    }, 2000);
                    return;
                }

                if (xhr.responseJSON) {
                    if (xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    } else if (xhr.responseJSON.errors) {
                        // ASP.NET validation error dictionary
                        const errs = Object.values(xhr.responseJSON.errors).flat().join('<br>');
                        errorMsg = errs || 'Validation errors occurred.';
                    }
                } else if (xhr.statusText && xhr.statusText !== 'error') {
                    errorMsg = `Server error (${xhr.status}): ${xhr.statusText}`;
                }

                showAlert('danger', 'Unable to Create Employee', errorMsg);
                showToast('Failed to save employee. Check form details.', 'bi bi-x-circle-fill text-danger');

                $submitBtn.prop('disabled', false);
                $submitBtnText.html('<i class="bi bi-check2-circle me-1"></i> Save Employee');
            }
        });
    });

    // Reset button handler
    $('#btnResetForm').on('click', function () {
        $btnRemoveImage.trigger('click');
        $btnRemoveNidImage.trigger('click');
        hideAlert();
        $sameAsPresentCheck.prop('checked', false);
        $permanentAddress.prop('readonly', false).removeClass('bg-light');
    });
});
