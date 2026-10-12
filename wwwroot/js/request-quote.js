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

    // 3. Form submit feedback
    if (quoteForm) {
        quoteForm.addEventListener('submit', function () {
            const submitBtn = quoteForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Submitting Quotation...';
            }
        });
    }
});
