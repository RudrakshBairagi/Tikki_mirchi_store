/**
 * TEEKHI BELLA — ATELIER WAITLIST JS
 * Multi-dress selection, Indian sizing standard, Indian contact & address fields,
 * Google Sheets Webhook integration, and instant luxury reservation receipt.
 */

(function () {
  'use strict';

  // Live Google Apps Script Webhook deployed for Teekhi Bella Waitlist
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyf6lJGVyB4a2kx5AY51r-IpoFmwOH5I-TN53rVPCQAk_KaJ-m34qfdKlRb9thgf5UdEg/exec';

  document.addEventListener('DOMContentLoaded', initWaitlist);
  document.addEventListener('shopify:section:load', initWaitlist);
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initWaitlist();
  }

  function initWaitlist() {
    const form = document.getElementById('atelierWaitlistForm');
    const successView = document.getElementById('waitlistSuccessView');
    const dressCards = document.querySelectorAll('.dress-tile-card');
    const sizePills = document.querySelectorAll('.size-select-pill');
    const customMeasureRow = document.getElementById('customMeasurementsRow');
    const customMeasureInput = document.getElementById('customMeasurementsInput');
    const submitBtn = document.getElementById('waitlistSubmitBtn');
    const reserveAnotherBtn = document.getElementById('reserveAnotherBtn');

    // Dresses state: map of index -> { selected: boolean, title: string, price: string, img: string }
    const selectedDresses = {};

    dressCards.forEach((card) => {
      const index = card.dataset.index;
      const title = card.dataset.title;
      const price = card.dataset.price;
      const img = card.dataset.img;

      // Initialize
      selectedDresses[index] = {
        selected: card.classList.contains('is-selected'),
        title: title,
        price: price,
        img: img
      };

      // Click on dress card toggles selection
      card.addEventListener('click', () => {
        card.classList.toggle('is-selected');
        selectedDresses[index].selected = card.classList.contains('is-selected');
        updateHiddenSummary();
      });
    });

    // Single Primary Size Selection
    let currentSelectedSize = 'M (UK 10 / Bust 36")';

    sizePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        sizePills.forEach((p) => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        currentSelectedSize = pill.dataset.size;

        const sizeInput = document.getElementById('waitlistSizeInput');
        if (sizeInput) sizeInput.value = currentSelectedSize;

        // Toggle custom measurement input if custom selected
        if (pill.dataset.isCustom === 'true') {
          customMeasureRow?.classList.add('is-open');
        } else {
          customMeasureRow?.classList.remove('is-open');
        }

        updateHiddenSummary();
      });
    });

    function updateHiddenSummary() {
      const hiddenDressesInput = document.getElementById('selectedDressesSummary');
      const hiddenNotes = document.getElementById('contactBodySummary');

      const chosen = Object.values(selectedDresses).filter((d) => d.selected);
      const summaryList = chosen.map((d) => `${d.title} [${d.price}]`).join(', ');

      if (hiddenDressesInput) {
        hiddenDressesInput.value = summaryList || 'No dresses explicitly selected';
      }

      if (hiddenNotes) {
        const city = document.getElementById('waitlistCity')?.value || '';
        const state = document.getElementById('waitlistState')?.value || '';
        const pincode = document.getElementById('waitlistPincode')?.value || '';
        const phone = document.getElementById('waitlistPhone')?.value || '';
        const customNotes = customMeasureInput?.value || '';

        hiddenNotes.value = `Waitlist Reservation Details:\nLocation: ${city}, ${state} - PIN: ${pincode}\nPhone: +91 ${phone}\nSize: ${currentSelectedSize}${customNotes ? ` (Measurements: ${customNotes})` : ''}\nSelected Looks:\n${summaryList}`;
      }
    }

    // Handle Form Submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const chosen = Object.values(selectedDresses).filter((d) => d.selected);
      if (chosen.length === 0) {
        alert('Please select at least one gown from our runway looks to join the waitlist.');
        document.querySelector('.waitlist-dresses-section')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // Validate 10-digit Indian phone
      const phoneInput = document.getElementById('waitlistPhone');
      const cleanPhone = phoneInput ? phoneInput.value.replace(/[^0-9]/g, '') : '';
      if (cleanPhone.length < 10) {
        alert('Please enter a valid 10-digit Indian mobile number for WhatsApp VIP drop notifications.');
        phoneInput?.focus();
        return;
      }

      // Validate 6-digit Indian PIN Code
      const pinInput = document.getElementById('waitlistPincode');
      const cleanPin = pinInput ? pinInput.value.replace(/[^0-9]/g, '') : '';
      if (cleanPin.length !== 6) {
        alert('Please enter a valid 6-digit Indian PIN code.');
        pinInput?.focus();
        return;
      }

      updateHiddenSummary();

      // UI Loading state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Securing VIP Access... ✦</span>`;
      }

      const name = document.getElementById('waitlistFullName')?.value?.trim() || 'Guest';
      const email = document.getElementById('waitlistEmail')?.value?.trim() || '';
      const city = document.getElementById('waitlistCity')?.value?.trim() || '';
      const state = document.getElementById('waitlistState')?.value?.trim() || '';
      const customNotes = customMeasureInput?.value?.trim() || '';
      const summaryList = chosen.map((d) => `${d.title} [${d.price}]`).join(' | ');

      const code = 'TB-IN-' + Math.floor(100000 + Math.random() * 900000);
      const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      // Construct payload for Google Sheets with all expected and alias keys
      const payload = {
        code: code,
        name: name,
        fullName: name,
        email: email,
        phone: '+91 ' + cleanPhone,
        whatsapp: '+91 ' + cleanPhone,
        city: city,
        state: state,
        pincode: cleanPin,
        pin: cleanPin,
        size: currentSelectedSize,
        customNotes: customNotes,
        notes: customNotes,
        dresses: summaryList,
        selectedLooks: summaryList,
        looks: summaryList,
        date: timestamp,
        timestamp: timestamp
      };

      // 1. Post to Google Sheet via Apps Script Webhook
      try {
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        }).catch((sheetErr) => {
          console.warn('Google Sheet dispatch warning:', sheetErr);
        });
      } catch (err) {
        console.warn('Google Sheet invocation warning:', err);
      }

      // 2. Save to localStorage for client-side persistence
      try {
        localStorage.setItem(
          'teekhi_bella_waitlist_data',
          JSON.stringify({
            code,
            name,
            email,
            phone: '+91 ' + cleanPhone,
            city,
            state,
            pincode: cleanPin,
            size: currentSelectedSize,
            customNotes,
            dresses: chosen,
            date: timestamp
          })
        );
      } catch (storageErr) {}

      // 4. Render Luxury Confirmation Receipt Card
      setTimeout(() => {
        showConfirmation({
          code,
          name,
          email,
          phone: cleanPhone,
          city,
          state,
          pincode: cleanPin,
          chosen,
          customNotes
        });
      }, 400);
    });

    function showConfirmation(data) {
      // Populate Receipt Card
      const receiptCard = document.getElementById('receiptDetails');
      if (receiptCard) {
        receiptCard.innerHTML = `
          <div class="receipt-row">
            <span class="receipt-label">Reservation Code</span>
            <span class="receipt-val">${data.code}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">VIP Client</span>
            <span class="receipt-val">${escapeHtml(data.name)}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">WhatsApp Contact</span>
            <span class="receipt-val">+91 ${escapeHtml(data.phone)}<br><small style="color:#777;">${escapeHtml(data.email)}</small></span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Delivery Region</span>
            <span class="receipt-val">${escapeHtml(data.city)}, ${escapeHtml(data.state)} — ${escapeHtml(data.pincode)}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Selected Size</span>
            <span class="receipt-val">${escapeHtml(currentSelectedSize)}${data.customNotes ? `<br><small style="color:#777;">(${escapeHtml(data.customNotes)})</small>` : ''}</span>
          </div>
          <div class="receipt-dresses-list">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Reserved Runway Looks (${data.chosen.length})</div>
            ${data.chosen
              .map(
                (d) => `
              <div class="receipt-dress-item">
                <img src="${d.img}" alt="${escapeHtml(d.title)}">
                <div>
                  <div style="font-weight:600;font-size:13px;color:#111;">${escapeHtml(d.title)}</div>
                  <div style="font-size:11px;color:#b38728;font-weight:600;">${escapeHtml(d.price)} • Hand-crafted Atelier</div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `;
      }

      form.style.display = 'none';
      if (successView) {
        successView.classList.add('is-visible');
        const formCard = document.querySelector('.waitlist-form-card') || successView;
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    // Minimalist Form Support (Bhawya Suri Aesthetic + Google Sheets Integration)
    const minimalForm = document.getElementById('waitlistMinimalForm');
    const minimalEmail = document.getElementById('waitlistEmail') || document.getElementById('minimalEmailInput');
    const minimalPhone = document.getElementById('waitlistPhone');
    const minimalState = document.getElementById('waitlistState');
    const minimalInterest = document.getElementById('waitlistInterest');
    const minimalSizeInput = document.getElementById('waitlistPreferredSize');
    const minimalSubmitBtn = document.getElementById('minimalSubmitBtn');
    const minimalSuccess = document.getElementById('waitlistMinimalSuccess');
    const successModal = document.getElementById('waitlistSuccessModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalDoneBtn = document.getElementById('modalDoneBtn');

    // Capsule size selection pills (supports both .waitlist-size-btn and new .wl-size-pill)
    const capsuleSizeBtns = document.querySelectorAll('.waitlist-size-btn, .wl-size-pill');
    capsuleSizeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        capsuleSizeBtns.forEach((b) => {
          b.classList.remove('is-active');
          b.classList.remove('is-selected');
        });
        btn.classList.add('is-active');
        btn.classList.add('is-selected');
        if (minimalSizeInput) {
          minimalSizeInput.value = btn.dataset.size || btn.textContent.trim();
        }
      });
    });

    // Modal Close handlers
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => {
        if (successModal) successModal.hidden = true;
      });
    }
    if (modalDoneBtn) {
      modalDoneBtn.addEventListener('click', () => {
        if (successModal) successModal.hidden = true;
      });
    }
    if (successModal) {
      const backdrop = successModal.querySelector('.modal-backdrop');
      backdrop?.addEventListener('click', () => {
        successModal.hidden = true;
      });
    }

    // Toast Notification Trigger
    function triggerToast(message) {
      let toast = document.getElementById('waitlistToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'waitlistToast';
        toast.className = 'waitlist-toast';
        document.body.appendChild(toast);
      }
      toast.innerHTML = `<span>✦</span><span>${escapeHtml(message)}</span>`;
      toast.classList.add('is-visible');
      setTimeout(() => {
        toast.classList.remove('is-visible');
      }, 4500);
    }

    // Minimal Form Submit Handler
    if (minimalForm) {
      minimalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = minimalEmail?.value?.trim();
        if (!email || !email.includes('@')) {
          minimalEmail?.focus();
          triggerToast('Please enter a valid email address');
          return;
        }

        const phoneVal = minimalPhone ? minimalPhone.value.replace(/[^0-9]/g, '') : '';
        if (minimalPhone && phoneVal.length < 10) {
          minimalPhone.focus();
          triggerToast('Please enter a valid 10-digit WhatsApp number');
          return;
        }

        const stateVal = minimalState ? minimalState.value : '';
        if (minimalState && !stateVal) {
          minimalState.focus();
          triggerToast('Please select your state');
          return;
        }

        const interestVal = minimalInterest ? minimalInterest.value : '';
        if (minimalInterest && !interestVal) {
          triggerToast('Please select at least one runway piece');
          return;
        }

        const sizeVal = minimalSizeInput ? minimalSizeInput.value : 'M (UK 10)';

        if (minimalSubmitBtn) {
          minimalSubmitBtn.disabled = true;
          minimalSubmitBtn.innerHTML = `<span>Securing Your Access...</span>`;
        }

        const code = 'TB-IN-' + Math.floor(100000 + Math.random() * 900000);
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        const payload = {
          code: code,
          email: email,
          phone: phoneVal ? '+91 ' + phoneVal : 'N/A',
          whatsapp: phoneVal ? '+91 ' + phoneVal : 'N/A',
          state: stateVal || 'N/A',
          interest: interestVal || 'Runway Look',
          pieceOfInterest: interestVal || 'Runway Look',
          dresses: interestVal || 'Runway Look',
          selectedLooks: interestVal || 'Runway Look',
          size: sizeVal,
          preferredSize: sizeVal,
          date: timestamp,
          timestamp: timestamp,
          source: 'Teekhi Bella Minimalist Waitlist'
        };

        // 1. Post to Google Sheet via Apps Script Webhook
        try {
          fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          }).catch(console.warn);
        } catch (err) {}

        // 2. Also send to Shopify Newsletter endpoint if customer form present
        const shopifyNlForm = document.getElementById('shopifyNewsletterFallback');
        if (shopifyNlForm) {
          const nlEmailInput = shopifyNlForm.querySelector('input[type="email"]');
          if (nlEmailInput) nlEmailInput.value = email;
          try {
            fetch(shopifyNlForm.action || '/contact', {
              method: 'POST',
              body: new FormData(shopifyNlForm)
            }).catch(console.warn);
          } catch (nlErr) {}
        }

        // 3. UI Update: hide the input fields, show minimal success
        const grid = minimalForm.querySelector('.waitlist-capsule-grid') || minimalForm.querySelector('.waitlist-nl-line');
        const submitWrap = minimalForm.querySelector('.waitlist-capsule-submit');
        if (grid) grid.style.display = 'none';
        if (submitWrap) submitWrap.style.display = 'none';

        // Hide new split-layout form fields too
        minimalForm.querySelectorAll('.wl-field, .wl-submit-btn, .wl-privacy-note, .wl-selected-look-badge').forEach((el) => {
          el.style.display = 'none';
        });

        const successSummary = document.getElementById('successSummaryText');
        if (successSummary) {
          successSummary.innerHTML = `Your priority spot for <strong>${escapeHtml(interestVal)}</strong> (Size: ${escapeHtml(sizeVal)}) is confirmed. VIP alerts will be sent to <strong>+91 ${escapeHtml(phoneVal)}</strong> (${escapeHtml(stateVal)}).`;
        }

        if (minimalSuccess) {
          minimalSuccess.hidden = false;
          minimalSuccess.style.display = 'block';
        }

        // 4. Update and show Pop-up Modal + Toast
        if (successModal) {
          const modalP = successModal.querySelector('.modal-card p');
          if (modalP) {
            modalP.innerHTML = `Your spot for <strong>${escapeHtml(interestVal)}</strong> (Size: ${escapeHtml(sizeVal)}) is secured.<br><small style="color:rgba(255,255,255,0.7);margin-top:8px;display:block;">VIP drop link will be sent to +91 ${escapeHtml(phoneVal)} (${escapeHtml(stateVal)}).</small>`;
          }
          successModal.hidden = false;
        }
        triggerToast("✦ Reservation Confirmed! You're on the list.");
      });
    }

    // Reserve Another Look Handler
    if (reserveAnotherBtn) {
      reserveAnotherBtn.addEventListener('click', () => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Submit Reservation</span>`;
        }
        form.style.display = 'block';
        if (successView) {
          successView.classList.remove('is-visible');
        }
        form.scrollIntoView({ behavior: 'smooth' });
      });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }
})();
