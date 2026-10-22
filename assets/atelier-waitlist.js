/**
 * TIKKI BELLA — ATELIER WAITLIST JS
 * Multi-dress selection, Indian sizing standard, Indian contact & address fields, and reservation receipt.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', initWaitlist);

  function initWaitlist() {
    const form = document.getElementById('atelierWaitlistForm');
    const successView = document.getElementById('waitlistSuccessView');
    const dressCards = document.querySelectorAll('.dress-tile-card');
    const sizePills = document.querySelectorAll('.size-select-pill');
    const customMeasureRow = document.getElementById('customMeasurementsRow');
    const customMeasureInput = document.getElementById('customMeasurementsInput');
    const submitBtn = document.getElementById('waitlistSubmitBtn');

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
    form?.addEventListener('submit', (e) => {
      const chosen = Object.values(selectedDresses).filter((d) => d.selected);
      if (chosen.length === 0) {
        e.preventDefault();
        alert('Please select at least one gown from our 5 runway looks to join the waitlist.');
        document.querySelector('.waitlist-dresses-section')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      // Validate 10-digit Indian phone
      const phoneInput = document.getElementById('waitlistPhone');
      if (phoneInput && phoneInput.value) {
        const cleanPhone = phoneInput.value.replace(/[^0-9]/g, '');
        if (cleanPhone.length < 10) {
          e.preventDefault();
          alert('Please enter a valid 10-digit Indian mobile number for WhatsApp VIP drop notifications.');
          phoneInput.focus();
          return;
        }
      }

      // Validate 6-digit Indian PIN Code
      const pinInput = document.getElementById('waitlistPincode');
      if (pinInput && pinInput.value) {
        const cleanPin = pinInput.value.replace(/[^0-9]/g, '');
        if (cleanPin.length !== 6) {
          e.preventDefault();
          alert('Please enter a valid 6-digit Indian PIN code.');
          pinInput.focus();
          return;
        }
      }

      updateHiddenSummary();

      // If running inside standalone preview or non-Shopify submission, render immediate success view
      if (!form.getAttribute('action') || form.getAttribute('action') === '#' || form.getAttribute('action') === '') {
        e.preventDefault();

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Reserving...</span>`;

        setTimeout(() => {
          showConfirmation();
        }, 500);
      }
    });

    function showConfirmation() {
      const name = document.getElementById('waitlistFullName')?.value || 'Guest';
      const email = document.getElementById('waitlistEmail')?.value || '';
      const phone = document.getElementById('waitlistPhone')?.value || '';
      const city = document.getElementById('waitlistCity')?.value || '';
      const state = document.getElementById('waitlistState')?.value || '';
      const pincode = document.getElementById('waitlistPincode')?.value || '';
      const chosen = Object.values(selectedDresses).filter((d) => d.selected);
      const customNotes = customMeasureInput?.value || '';

      const code = 'TB-IN-' + Math.floor(100000 + Math.random() * 900000);

      try {
        localStorage.setItem(
          'tikki_bella_waitlist_data',
          JSON.stringify({
            code,
            name,
            email,
            phone: '+91 ' + phone,
            city,
            state,
            pincode,
            size: currentSelectedSize,
            customNotes,
            dresses: chosen,
            date: new Date().toISOString()
          })
        );
      } catch (err) {}

      // Populate Receipt Card
      const receiptCard = document.getElementById('receiptDetails');
      if (receiptCard) {
        receiptCard.innerHTML = `
          <div class="receipt-row">
            <span class="receipt-label">Reservation Code</span>
            <span class="receipt-val">${code}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">VIP Client</span>
            <span class="receipt-val">${escapeHtml(name)}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">WhatsApp Contact</span>
            <span class="receipt-val">+91 ${escapeHtml(phone)}<br><small style="color:#777;">${escapeHtml(email)}</small></span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Delivery Region</span>
            <span class="receipt-val">${escapeHtml(city)}, ${escapeHtml(state)} — ${escapeHtml(pincode)}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Selected Size</span>
            <span class="receipt-val">${escapeHtml(currentSelectedSize)}${customNotes ? `<br><small style="color:#777;">(${escapeHtml(customNotes)})</small>` : ''}</span>
          </div>
          <div class="receipt-dresses-list">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Reserved Runway Looks (${chosen.length})</div>
            ${chosen
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
        successView.scrollIntoView({ behavior: 'smooth' });
      }
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
