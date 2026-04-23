
<?php
$pageTitle = 'Delete Your WERN Account | WERN by Project Liberté';
echo view('Web/includes/header', ['pageTitle' => $pageTitle]);
echo view('Web/includes/topbar');
?>
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {line-height: 1.6; }
      
        .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); padding: 32px; }
        h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; color: #d32f2f; }
        .subtitle { font-size: 14px; color: #666; margin-bottom: 24px; }
        .info-section { background: #fff3e0; border-left: 4px solid #ff9800; padding: 16px; border-radius: 4px; margin-bottom: 24px; }
        .info-section h2 { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #e65100; }
        .info-section ul { padding-left: 20px; font-size: 14px; color: #555; }
        .info-section ul li { margin-bottom: 6px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #444; }
        input[type="email"], textarea, select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; transition: border-color 0.2s; }
        input[type="email"]:focus, textarea:focus, select:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.15); }
        textarea { resize: vertical; min-height: 80px; }
        .checkbox-group { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 24px; width: 100%; }
        .checkbox-group input[type="checkbox"] { margin-top: 3px; width: 18px; height: 18px; flex: 0 0 18px; accent-color: #d32f2f; }
        .checkbox-group label { font-size: 13px; color: #555; margin-bottom: 0; font-weight: 400; flex: 1; min-width: 0; display: block; }

        /* Force native select, override any global plugin (nice-select, select2, chosen, etc.) */
        .accountDeletionCard select#reason {
            display: block !important;
            -webkit-appearance: menulist !important;
            -moz-appearance: menulist !important;
            appearance: menulist !important;
            width: 100% !important;
            height: auto !important;
            padding: 12px !important;
            border: 1px solid #ddd !important;
            border-radius: 8px !important;
            font-size: 14px !important;
            font-family: inherit !important;
            background: #fff !important;
            color: #333 !important;
            opacity: 1 !important;
            position: static !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }
        .accountDeletionCard .form-group .nice-select,
        .accountDeletionCard .form-group .select2,
        .accountDeletionCard .form-group .select2-container,
        .accountDeletionCard .form-group .chosen-container,
        .accountDeletionCard .form-group .selectric-wrapper,
        .accountDeletionCard .form-group .selectize-control { display: none !important; }
        .btn-delete { width: 100%; padding: 14px; background-color: #d32f2f; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background-color 0.2s; }
        .btn-delete:hover { background-color: #b71c1c; }
        .btn-delete:disabled { background-color: #ccc; cursor: not-allowed; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
        .data-table th { text-align: left; padding: 10px 12px; background: #fafafa; border-bottom: 2px solid #eee; font-weight: 600; color: #444; }
        .data-table td { padding: 10px 12px; border-bottom: 1px solid #eee; color: #555; }
        .badge-delete { background: #ffebee; color: #c62828; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        .badge-retain { background: #e3f2fd; color: #1565c0; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        .success-message { display: none; text-align: center; padding: 40px 20px; }
        .success-message .icon { font-size: 48px; margin-bottom: 16px; }
        .success-message h2 { font-size: 20px; margin-bottom: 8px; color: #2e7d32; }
        .success-message p { font-size: 14px; color: #666; }
        .footer { text-align: center; margin-top: 24px; font-size: 15px; color: #999; }
        .footer a { color: #fff; text-decoration: none; }
        .error { border-color: #d32f2f !important; }
        .error-text { color: #d32f2f; font-size: 12px; margin-top: 4px; display: none; }
        .wern-modal-overlay { display: none; position: fixed !important; inset: 0; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.5); z-index: 2147483000; justify-content: center; align-items: center; padding: 16px; }
        .wern-modal-overlay.active { display: flex !important; }
        .wern-modal-overlay .modal { background: #fff; border-radius: 12px; padding: 32px; max-width: 440px; width: 100%; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); text-align: center; position: relative; z-index: 2147483001; }

        .wern-modal-overlay.active .modal{
            display: block !important; 
            height: unset;
        }

        .modal .modal-icon { width: 56px; height: 56px; background: #ffebee; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px; color: #d32f2f; }
        .modal h2 { font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #333; }
        .modal p { font-size: 14px; color: #666; margin-bottom: 24px; }
        .modal-buttons { display: flex; gap: 12px; }
        .modal-buttons button { flex: 1; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background-color 0.2s; }
        .btn-cancel { background: #f5f5f5; border: 1px solid #ddd; color: #333; }
        .btn-cancel:hover { background: #eee; }
        .btn-confirm-delete { background: #d32f2f; border: none; color: #fff; }
        .btn-confirm-delete:hover { background: #b71c1c; }
        /* .mainwrapper{
            margin-top: 130px;
        } */
        .header-transparent{
            position: static !important;
            margin: 30px 0px
        }
        .accountDeletionCard{
            max-width: 600px;
            margin: auto
        }
    </style>

<div class="body-overlay"></div>

<main>

<div class="mainwrapper">
<div class="container">
        <div class="card accountDeletionCard">
            <div id="form-section">
                <h1>Delete Your WERN Account</h1>
                <p class="subtitle">
                    We're sorry to see you leave WERN. This page lets you request deletion of
                    your WERN account and associated data. WERN is developed and operated by
                    Project Liberté. Please review the information below before proceeding.
                </p>

                <div class="info-section">
                    <h2>What happens when you delete your WERN account</h2>
                    <ul>
                        <li>Your WERN account will be permanently deleted within <strong>30 days</strong> of your request.</li>
                        <li>You can cancel the deletion within 30 days by logging back into the WERN app.</li>
                        <li>After 30 days, your data cannot be recovered from WERN's servers.</li>
                    </ul>
                </div>

                <h2 style="font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #444;">WERN data affected by deletion</h2>
                <table class="data-table">
                    <thead>
                        <tr><th>Data Type</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Profile information</td><td><span class="badge-delete">Deleted</span></td></tr>
                        <tr><td>Activity and usage data</td><td><span class="badge-delete">Deleted</span></td></tr>
                        <tr><td>Uploaded content</td><td><span class="badge-delete">Deleted</span></td></tr>
                        <tr><td>Purchase history</td><td><span class="badge-retain">Retained*</span></td></tr>
                    </tbody>
                </table>
                <p style="font-size: 12px; color: #999; margin-bottom: 24px;">
                    * Retained for legal and financial compliance obligations as permitted under applicable law.
                </p>

                <form id="delete-form" novalidate>
                    <div class="form-group">
                        <label for="email">WERN account email address</label>
                        <input type="email" id="email" placeholder="you@example.com" required>
                        <p class="error-text" id="email-error">Please enter a valid email address.</p>
                    </div>

                    <div class="form-group">
                        <label for="reason">Reason for leaving (optional)</label>
                        <select id="reason">
                            <option value="">Select a reason</option>
                            <option value="no-longer-needed">I no longer need the service</option>
                            <option value="privacy">Privacy concerns</option>
                            <option value="switched">Switched to another service</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div class="form-group" id="feedback-group" style="display: none;">
                        <label for="feedback">Additional feedback (optional)</label>
                        <textarea id="feedback" placeholder="Tell us more so we can improve..."></textarea>
                    </div>

                    <div class="checkbox-group">
                        <input type="checkbox" id="confirm" required>
                        <label for="confirm">
                            I understand that my WERN account and associated data will be permanently deleted,
                            and this action cannot be undone after the 30-day grace period.
                        </label>
                    </div>

                    <button type="submit" class="btn-delete" id="submit-btn" disabled>Request WERN Account Deletion</button>
                </form>
            </div>

            <div class="success-message" id="success-section">
                <div class="icon">&#10003;</div>
                <h2>WERN Account Deletion Request Submitted</h2>
                <p>We've received your request to delete your WERN account. A confirmation email has been sent to your address. Your WERN account will be permanently deleted within <strong>30 days</strong>.</p>
                <p style="margin-top: 12px;">You can cancel this request by logging back into the WERN app within the 30-day period.</p>
            </div>
        </div>

        <div class="footer">
            <p><strong>WERN</strong> &mdash; a product by Project Liberté</p>
            <p style="margin-top: 4px;">Need help? <a href="mailto:technical@projectliberte.io">Contact WERN Support</a></p>
            <p style="margin-top: 4px;"><a href="<?= base_url('privacy-and-data-protection-policy') ?>">WERN Privacy Policy</a></p>
            <p style="margin-top: 8px; font-size: 11px; color: #aaa;">&copy; Project Liberté. WERN and the WERN logo are trademarks of Project Liberté.</p>
        </div>
    </div>

    <div class="wern-modal-overlay" id="confirm-modal">
        <div class="modal">
            <div class="modal-icon">!</div>
            <h2>Delete your WERN account?</h2>
            <p>This will permanently delete your WERN account and all associated data. This action cannot be undone after the 30-day grace period.</p>
            <div class="modal-buttons">
                <button class="btn-cancel" id="modal-cancel">Cancel</button>
                <button class="btn-confirm-delete" id="modal-confirm">Yes, Delete My WERN Account</button>
            </div>
        </div>
    </div>
</div>
    

    </main>

    <?php echo view('Web/includes/footer'); ?>

    <script>
        var API_URL = '<?= base_url('api/delete-all-data') ?>';
        const form = document.getElementById('delete-form');
        const emailInput = document.getElementById('email');
        const confirmCheckbox = document.getElementById('confirm');
        const submitBtn = document.getElementById('submit-btn');
        const reasonSelect = document.getElementById('reason');
        const feedbackGroup = document.getElementById('feedback-group');
        const emailError = document.getElementById('email-error');

        confirmCheckbox.addEventListener('change', function () { submitBtn.disabled = !this.checked; });
        reasonSelect.addEventListener('change', function () { feedbackGroup.style.display = this.value === 'other' ? 'block' : 'none'; });

        // Strip any select-plugin wrappers (nice-select/select2/chosen/etc.) that the site may auto-init.
        function stripSelectPlugins() {
            document.querySelectorAll(
                '.accountDeletionCard .form-group .nice-select, ' +
                '.accountDeletionCard .form-group .select2, ' +
                '.accountDeletionCard .form-group .select2-container, ' +
                '.accountDeletionCard .form-group .chosen-container, ' +
                '.accountDeletionCard .form-group .selectric-wrapper, ' +
                '.accountDeletionCard .form-group .selectize-control'
            ).forEach(function (el) { el.parentNode && el.parentNode.removeChild(el); });
            reasonSelect.style.display = 'block';
        }
        stripSelectPlugins();
        setTimeout(stripSelectPlugins, 0);
        window.addEventListener('load', stripSelectPlugins);

        const modal = document.getElementById('confirm-modal');
        const modalCancel = document.getElementById('modal-cancel');
        const modalConfirm = document.getElementById('modal-confirm');
        // Reparent to <body> so no ancestor transform/overflow can clip the fixed overlay.
        if (modal.parentNode !== document.body) document.body.appendChild(modal);

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = emailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                emailInput.classList.add('error');
                emailError.style.display = 'block';
                return;
            }
            emailInput.classList.remove('error');
            emailError.style.display = 'none';
            modal.classList.add('active');
        });

        modalCancel.addEventListener('click', function () { modal.classList.remove('active'); });

        modalConfirm.addEventListener('click', function () {
            modalConfirm.disabled = true;
            modalConfirm.textContent = 'Deleting...';
            const payload = { gmail: emailInput.value.trim(), reason: reasonSelect.value || '' };
            fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                .then(function (response) {
                    if (!response.ok) throw new Error('Request failed');
                    modal.classList.remove('active');
                    document.getElementById('form-section').style.display = 'none';
                    document.getElementById('success-section').style.display = 'block';
                })
                .catch(function () {
                    modal.classList.remove('active');
                    alert('Something went wrong. Please try again or contact support.');
                })
                .finally(function () {
                    modalConfirm.disabled = false;
                    modalConfirm.textContent = 'Yes, Delete My WERN Account';
                });
        });

        modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('active'); });
        emailInput.addEventListener('input', function () { this.classList.remove('error'); emailError.style.display = 'none'; });
    </script>

