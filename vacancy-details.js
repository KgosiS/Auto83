(() => {
  const addDialogStyles = () => {
    if (document.getElementById('vacancy-details-styles')) return;
    const style = document.createElement('style');
    style.id = 'vacancy-details-styles';
    style.textContent = `
      .vacancy-dialog {
        width: min(620px, calc(100% - 32px));
        max-height: min(90vh, 760px);
        padding: 0;
        color: #f3f3f3;
        background: #121212;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 20px;
        box-shadow: 0 24px 80px rgba(0,0,0,.7);
      }
      .vacancy-dialog::backdrop { background: rgba(0,0,0,.78); backdrop-filter: blur(5px); }
      .vacancy-dialog form { padding: 24px; overflow-y: auto; max-height: min(90vh, 760px); }
      .vacancy-dialog h2 { font-size: 1.35rem; margin: 0 0 8px; }
      .vacancy-dialog p { color: #aaa; font-size: .9rem; line-height: 1.6; margin: 0 0 18px; }
      .vacancy-dialog .vacancy-fields { display: grid; gap: 12px; }
      .vacancy-dialog .vacancy-fields label { display: grid; gap: 6px; color: #d7d7d7; font-size: .86rem; }
      .vacancy-dialog input[type="text"] {
        width: 100%; padding: 12px; color: #f3f3f3; background: #1b1b1b;
        border: 1px solid rgba(255,255,255,.14); border-radius: 10px;
      }
      .vacancy-dialog .vacancy-status { min-height: 24px; margin: 12px 0; color: #ff9a9a; font-size: .84rem; }
      .vacancy-dialog .vacancy-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
      .vacancy-dialog button {
        padding: 11px 16px; border: 1px solid rgba(255,255,255,.15); border-radius: 10px;
        color: #f3f3f3; background: #202020; font: inherit; cursor: pointer;
      }
      .vacancy-dialog button[type="submit"] { color: #080808; background: #fff; font-weight: 600; }
      @media (max-width: 520px) { .vacancy-dialog form { padding: 20px; } }
    `;
    document.head.append(style);
  };

  window.requestVacancyDetails = (initialDetails = {}) => new Promise((resolve) => {
    addDialogStyles();
    const dialog = document.createElement('dialog');
    dialog.className = 'vacancy-dialog';
    dialog.setAttribute('aria-labelledby', 'vacancy-dialog-title');
    dialog.innerHTML = `
      <form method="dialog" novalidate>
        <h2 id="vacancy-dialog-title">Vacancy details</h2>
        <p>Enter the role, department and reference number from the vacancy circular. These details will be saved to your profile and added to your Z83.</p>
        <div class="vacancy-fields">
          <label for="vacancy-position">Role / position
            <input id="vacancy-position" type="text" autocomplete="off" required>
          </label>
          <label for="vacancy-department">Department
            <input id="vacancy-department" type="text" autocomplete="off" required>
          </label>
          <label for="vacancy-reference">Reference number
            <input id="vacancy-reference" type="text" autocomplete="off" required>
          </label>
        </div>
        <div class="vacancy-status" role="status" aria-live="polite"></div>
        <div class="vacancy-actions">
          <button type="button" data-action="cancel">Cancel</button>
          <button type="submit">Continue to Z83</button>
        </div>
      </form>`;

    const form = dialog.querySelector('form');
    const status = dialog.querySelector('.vacancy-status');
    const fields = {
      positionApplied: dialog.querySelector('#vacancy-position'),
      department: dialog.querySelector('#vacancy-department'),
      referenceNumber: dialog.querySelector('#vacancy-reference')
    };

    fields.positionApplied.value = initialDetails.positionApplied || '';
    fields.department.value = initialDetails.department || '';
    fields.referenceNumber.value = initialDetails.referenceNumber || '';

    const finish = (result) => {
      dialog.close();
      dialog.remove();
      resolve(result);
    };

    dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => finish(null));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(null);
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(
        Object.entries(fields).map(([name, input]) => [name, input.value.trim()])
      );
      if (Object.values(values).some((value) => !value)) {
        status.textContent = 'Enter the role, department and reference number to continue.';
        const firstMissing = Object.values(fields).find((input) => !input.value.trim());
        firstMissing?.focus();
        return;
      }

      const z83Window = window.open('', '_blank', 'width=1200,height=900');
      if (!z83Window) {
        status.textContent = 'Please allow pop-ups to generate the Z83 preview.';
        return;
      }

      finish({ details: values, z83Window });
    });

    document.body.append(dialog);
    dialog.showModal();
  });
})();
