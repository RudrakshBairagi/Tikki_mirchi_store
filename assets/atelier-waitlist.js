/**
 * TIKKI BELLA — ATELIER WAITLIST JS
 * Multi-product tile selection, size mapping, client-side validation, and reservation receipts.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', initWaitlist);

  function initWaitlist() {
    const form = document.getElementById('atelierWaitlistForm');
    const successView = document.getElementById('waitlistSuccessView');
    const dressCards = document.querySelectorAll('.dress-tile-card');
    const globalSizeSelect = document.getElementById('globalSizeSelect');
    const submitBtn = document.getElementById('waitlistSubmitBtn');

    // Dresses state: map of index -> { selected: boolean, size: string, title: string, img: string }
    const selectedDresses = {};

    dressCards.forEach((card) => {
      const index = card.dataset.index;
      const title = card.dataset.title;
      const img = card.dataset.img;
      const defaultSize = card.querySelector('.size-pill.is-active')?.dataset.size || 'M';

      // Initialize
      selectedDresses[index] = {
        selected: card.classList.contains('is-selected'),
        size: defaultSize,
        title: title,
        img: img
      };

      // Toggle card selection
      card.addEventListener('click', (e) => {
        // If clicking on a size pill, handle size selection without deselecting card
        if (e.target.classList.contains('size-pill')) {
          e.stopPropagation();
          const sizePills = card.querySelectorAll('.size-pill');
          sizePills.forEach((p) => p.classList.remove('is-active'));
          e.target.classList.add('is-active');

          const newSize = e.target.dataset.size;
          selectedDresses[index].size = newSize;

          // Ensure card is also selected when choosing size
          if (!card.classList.contains('is-selected')) {
            card.classList.add('is-selected');
            selectedDresses[index].selected = true;
          }
          updateHiddenInput();
          return;
        }

        // Click on the card itself toggles selection
        card.classList.toggle('is-selected');
        selectedDresses[index].selected = card.classList.contains('is-selected');
        updateHiddenInput();
      });
    });

    // Global Size Select: updates all selected dresses' sizes
    globalSizeSelect?.addEventListener('change', (e) => {
      const globalSize = e.target.value;
      if (!globalSize) return;

      dressCards.forEach((card) => {
        const index = card.dataset.index;
        const targetPill = card.querySelector(`.size-pill[data-size="${globalSize}"]`);
        if (targetPill) {
          card.querySelectorAll('.size-pill').forEach((p) => p.classList.remove('is-active'));
          targetPill.classList.add('is-active');
          selectedDresses[index].size = globalSize;
        }
      });
      updateHiddenInput();
    });

    function updateHiddenInput() {
      const hiddenInput = document.getElementById('selectedDressesSummary');
      const hiddenNotes = document.getElementById('contactBodySummary');

      const chosen = Object.values(selectedDresses).filter((d) => d.selected);
      const summaryList = chosen.map((d) => `${d.title} (Size: ${d.size})`).join(', ');

      if (hiddenInput) {
        hiddenInput.value = summaryList || 'No dresses explicitly selected';
      }

      if (hiddenNotes) {
        const city = document.getElementById('waitlistCity')?.value || '';
        const state = document.getElementById('waitlistState')?.value || '';
        const phone = document.getElementById('waitlistPhone')?.value || '';
        hiddenNotes.value = `Waitlist Reservation:\nCity: ${city}\nState: ${state}\nPhone: ${phone}\nSelected Dresses: ${summaryList}`;
      }
    }

    // Handle Form Submit
    form?.addEventListener('submit', (e) => {
      // Check if at least 1 dress is selected
      const chosen = Object.values(selectedDresses).filter((d) => d.selected);
      if (chosen.length === 0) {
        e.preventDefault();
        alert('Please select at least one dress from our 5 runway looks to join the waitlist.');
        document.querySelector('.waitlist-dresses-section')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      updateHiddenInput();

      // If running inside standalone preview or non-Shopify submission, render immediate success view
      if (!form.getAttribute('action') || form.getAttribute('action') === '#' || form.getAttribute('action') === '') {
        e.preventDefault();

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Reserving...</span>`;

        setTimeout(() => {
          showConfirmation();
        }, 600);
      }
    });

    function showConfirmation() {
      const name = document.getElementById('waitlistFullName')?.value || 'Guest';
      const email = document.getElementById('waitlistEmail')?.value || '';
      const phone = document.getElementById('waitlistPhone')?.value || '';
      const city = document.getElementById('waitlistCity')?.value || '';
      const state = document.getElementById('waitlistState')?.value || '';
      const chosen = Object.values(selectedDresses).filter((d) => d.selected);

      // Generate random reservation code
      const code = 'TB-WL-' + Math.floor(100000 + Math.random() * 900000);

      // Save to localStorage
      try {
        localStorage.setItem(
          'tikki_bella_waitlist_data',
          JSON.stringify({
            code,
            name,
            email,
            phone,
            city,
            state,
            dresses: chosen,
            date: new Date().toISOString()
          })
        );
      } catch (err) {}

      // Populate Receipt
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
            <span class="receipt-label">Contact</span>
            <span class="receipt-val">${escapeHtml(email)}<br><small style="color:#777;">${escapeHtml(phone)}</small></span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Location</span>
            <span class="receipt-val">${escapeHtml(city)}, ${escapeHtml(state)}</span>
          </div>
          <div class="receipt-dresses-list">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Reserved Pieces (${chosen.length})</div>
            ${chosen
              .map(
                (d) => `
              <div class="receipt-dress-item">
                <img src="${d.img}" alt="${escapeHtml(d.title)}">
                <div>
                  <div style="font-weight:600;font-size:13px;color:#111;">${escapeHtml(d.title)}</div>
                  <div style="font-size:11px;color:#777;">Size: <strong>${escapeHtml(d.size)}</strong> • Hand-crafted Atelier</div>
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
