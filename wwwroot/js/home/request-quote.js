/**
 * ZamZam Trims (BD) Limited - Request Quote Page Controller (request-quote.js)
 * ----------------------------------------------------------------------------
 * Dynamic Category Tips, URL Parameter Autofill, and Form Submission Feedback.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const serviceSelect = document.getElementById('ServiceType') || document.querySelector('select[name="ServiceType"]');
    const productInput = document.getElementById('ProductName') || document.querySelector('input[name="ProductName"]');
    const messageArea = document.getElementById('Message') || document.querySelector('textarea[name="Message"]');
    const quoteForm = document.querySelector('form[action*="SubmitQuote"]');

    // 1. Autofill from URL parameters (e.g., ?service=Woven+Labels&product=Damask)
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    const productParam = urlParams.get('product');

    if (serviceSelect && serviceParam) {
        // Try exact match or partial match
        for (let i = 0; i < serviceSelect.options.length; i++) {
            if (serviceSelect.options[i].value.toLowerCase().includes(serviceParam.toLowerCase())) {
                serviceSelect.selectedIndex = i;
                break;
            }
        }
    }

    if (productInput && productParam) {
        productInput.value = productParam;
    }

    // 2. Dynamic helpful placeholder tips based on category selection
    const categoryTips = {
        'Woven & Care Labels': 'Tip: Specify dimensions (e.g. 50x20mm), fold type (End fold, Center fold, Miter fold), and yarn quality (Damask 50D, Satin, Taffeta).',
        'Buttons': 'Tip: Specify button material (Resin, Horn, Polyester, Metal), size in Ligne (e.g. 18L, 24L, 32L), holes (2-hole, 4-hole), and laser logo details.',
        'Hang Tags & Packaging': 'Tip: Specify paper board GSM (350 GSM, 400 GSM art card, Kraft), lamination (Matte/Gloss), eyelet, string type, and foil stamping.',
        'Zippers & Pullers': 'Tip: Specify zipper type (Nylon coil, Metal, Vislon), size (#3, #5, #8), tape color (Pantone/TPX), and slider puller design.',
        'Elastics & Tapes': 'Tip: Specify width in mm/inches, elongation percentage, woven or knitted elastic, and wash endurance requirement.'
    };

    if (serviceSelect && messageArea) {
        serviceSelect.addEventListener('change', function () {
            const selectedVal = this.value;
            for (const [key, tip] of Object.entries(categoryTips)) {
                if (selectedVal.includes(key)) {
                    messageArea.placeholder = tip;
                    return;
                }
            }
            messageArea.placeholder = 'Specify dimensions (width x height mm), background yarn colors, folds, card GSM, wash tests, or any export compliance certificates required...';
        });
    }

    // 3. Form submit to API
    if (quoteForm) {
        quoteForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = quoteForm.querySelector('button[type="submit"]');
            const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Submitting Quotation...';
            }

            const fullName = (quoteForm.querySelector('[name="FullName"]')?.value || '').trim();
            const email = (quoteForm.querySelector('[name="Email"]')?.value || '').trim();
            const phone = (quoteForm.querySelector('[name="Phone"]')?.value || '').trim();
            const companyName = (quoteForm.querySelector('[name="CompanyName"]')?.value || '').trim();
            const serviceTypeSelect = quoteForm.querySelector('[name="ServiceType"]');
            const quantity = (quoteForm.querySelector('[name="Quantity"]')?.value || '').trim();
            const productName = (quoteForm.querySelector('[name="ProductName"]')?.value || '').trim();
            const message = (quoteForm.querySelector('[name="Message"]')?.value || '').trim();

            let serviceCategoryId = 0;
            const selectedOpt = serviceTypeSelect?.options[serviceTypeSelect.selectedIndex];
            if (selectedOpt && selectedOpt.dataset && selectedOpt.dataset.id) {
                serviceCategoryId = parseInt(selectedOpt.dataset.id, 10);
            }
            if (!serviceCategoryId || isNaN(serviceCategoryId)) {
                const catMap = {
                    'trim': 1, 'label': 2, 'tag': 3, 'packag': 3, 'button': 4, 'zipper': 4,
                    'print': 5, 'emboss': 6, 'heat': 7, 'laminat': 7, 'selling': 8, 'stock': 8,
                    'sourcing': 9, 'other': 10
                };
                const valLower = (serviceTypeSelect?.value || '').toLowerCase();
                for (const [kw, id] of Object.entries(catMap)) {
                    if (valLower.includes(kw)) {
                        serviceCategoryId = id;
                        break;
                    }
                }
            }
            if (!serviceCategoryId) serviceCategoryId = 1;

            const payload = {
                id: 0,
                fullName: fullName,
                email: email,
                phone: phone,
                companyName: companyName,
                serviceCategory: serviceCategoryId,
                estimatedQuantity: quantity,
                productReference: productName,
                detailedSpecifications: message
            };

            try {
                const apiBaseUrl = (window.apiBaseUrl || 'https://localhost:7148').replace(/\/+$/, '');
                const res = await fetch(`${apiBaseUrl}/api/QuotationRequest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    let errMsg = `Server returned status ${res.status}`;
                    try {
                        const errJson = await res.json();
                        errMsg = errJson.message || errMsg;
                    } catch {
                        const errText = await res.text();
                        if (errText) errMsg = errText;
                    }
                    throw new Error(errMsg);
                }

                const resData = await res.json();
                if (resData && resData.succeeded === false) {
                    throw new Error(resData?.message || 'Quotation submission failed.');
                }

                // Show success feedback above the form
                let alertEl = document.getElementById('requestQuoteAlert');
                if (!alertEl) {
                    alertEl = document.createElement('div');
                    alertEl.id = 'requestQuoteAlert';
                    quoteForm.parentNode.insertBefore(alertEl, quoteForm);
                }
                alertEl.className = 'alert alert-success d-flex align-items-center rounded-3 p-3 mb-4 shadow-sm';
                alertEl.innerHTML = `<i class="bi bi-check-circle-fill me-2 fs-4 flex-shrink-0"></i><div><strong>Quotation Request Received!</strong> ${resData.message || 'Quotation request successfully created.'} Our estimation department will contact you within 2-4 business hours.</div>`;
                alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

                quoteForm.reset();
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i> Request Submitted';
                    submitBtn.classList.remove('btn-modern-primary');
                    submitBtn.classList.add('btn-success');
                }
            } catch (err) {
                console.error('Submission error:', err);
                let alertEl = document.getElementById('requestQuoteAlert');
                if (!alertEl) {
                    alertEl = document.createElement('div');
                    alertEl.id = 'requestQuoteAlert';
                    quoteForm.parentNode.insertBefore(alertEl, quoteForm);
                }
                alertEl.className = 'alert alert-danger d-flex align-items-center rounded-3 p-3 mb-4 shadow-sm';
                alertEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2 fs-4 flex-shrink-0"></i><div><strong>Submission Failed:</strong> ${err.message || 'Unable to submit quotation request. Please check your network and try again.'}</div>`;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                }
            }
        });
    }
});
