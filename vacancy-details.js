(() => {
  const PDF_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  const TESSERACT_WORKER_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js';
  const TESSERACT_CORE_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1';
  const TESSERACT_LANG_URL = 'https://tessdata.projectnaptha.com/4.0.0';
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const MAX_PDF_PAGES = 15;

  const loadScript = (src) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error(`Unable to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Unable to load ${src}`)), { once: true });
    document.head.append(script);
  });

  const extractFields = (text) => {
    const fields = {};
    const patterns = {
      positionApplied: /^(?:position(?:\s+title)?|job\s+title|post(?:\s+title)?|position\s+applied\s+for|vacancy(?:\s+title)?)\s*(?:applied\s+for)?\s*[:\-–]\s*(.+)$/i,
      department: /^(?:department(?:\s*\/\s*(?:organisation|organization|component))?|organisation|organization|office)\s*[:\-–]\s*(.+)$/i,
      referenceNumber: /^(?:reference(?:\s*(?:number|no\.?))?|ref\.?\s*(?:number|no\.?)?|vacancy\s*(?:number|no\.?)?|advert(?:isement)?\s*(?:reference|number|no\.?)?)\s*[:#\-–]\s*(.+)$/i
    };

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.replace(/\s+/g, ' ').trim();
      if (!line) continue;

      for (const [field, pattern] of Object.entries(patterns)) {
        if (fields[field]) continue;
        const match = line.match(pattern);
        const departmentHeading = field === 'department' && line.match(/^department\s+of\s+(.+)$/i);
        const value = match?.[1] || departmentHeading?.[1];
        if (value) fields[field] = value.trim().replace(/[;,|]+$/, '');
      }
    }

    return fields;
  };

  const readPdfText = async (file) => {
    await loadScript(PDF_JS_URL);
    if (!window.pdfjsLib) throw new Error('PDF reader is unavailable.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
    const pageTexts = [];
    let hasText = false;

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let previousY;
      const pageText = content.items.reduce((lines, item) => {
        const value = (item.str || '').trim();
        if (!value) return lines;
        const y = item.transform?.[5];
        const separator = lines && Number.isFinite(y) && Number.isFinite(previousY)
          ? (Math.abs(y - previousY) > 2 ? '\n' : ' ')
          : ' ';
        previousY = y;
        return `${lines}${separator}${value}`;
      }, '');
      pageTexts.push(pageText);
      if (pageText.trim().length > 20) hasText = true;
    }

    if (hasText) return { text: pageTexts.join('\n'), truncated: pdf.numPages > pageCount };

    await loadScript(TESSERACT_URL);
    if (!window.Tesseract) throw new Error('Circular text recognition is unavailable.');
    const worker = await window.Tesseract.createWorker('eng', 1, {
      workerPath: TESSERACT_WORKER_URL,
      corePath: TESSERACT_CORE_URL,
      langPath: TESSERACT_LANG_URL
    });

    try {
      const scannedPageTexts = [];
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const result = await worker.recognize(canvas);
        scannedPageTexts.push(result.data.text);
        canvas.width = 0;
        canvas.height = 0;
      }
      return { text: scannedPageTexts.join('\n'), truncated: pdf.numPages > pageCount };
    } finally {
      await worker.terminate();
    }
  };

  const readImageText = async (file) => {
    await loadScript(TESSERACT_URL);
    if (!window.Tesseract) throw new Error('Circular text recognition is unavailable.');
    const worker = await window.Tesseract.createWorker('eng', 1, {
      workerPath: TESSERACT_WORKER_URL,
      corePath: TESSERACT_CORE_URL,
      langPath: TESSERACT_LANG_URL
    });

    try {
      const result = await worker.recognize(file);
      return result.data.text;
    } finally {
      await worker.terminate();
    }
  };

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
      .vacancy-dialog .vacancy-choice { display: flex; gap: 10px; margin-bottom: 18px; }
      .vacancy-dialog .vacancy-choice label {
        flex: 1; display: flex; align-items: center; gap: 8px; padding: 12px;
        border: 1px solid rgba(255,255,255,.12); border-radius: 12px; cursor: pointer;
      }
      .vacancy-dialog input[type="radio"] { accent-color: #fff; }
      .vacancy-dialog .vacancy-upload { margin-bottom: 14px; }
      .vacancy-dialog input[type="file"], .vacancy-dialog input[type="text"] {
        width: 100%; padding: 12px; color: #f3f3f3; background: #1b1b1b;
        border: 1px solid rgba(255,255,255,.14); border-radius: 10px;
      }
      .vacancy-dialog .vacancy-fields { display: grid; gap: 12px; }
      .vacancy-dialog .vacancy-fields label { display: grid; gap: 6px; color: #d7d7d7; font-size: .86rem; }
      .vacancy-dialog .vacancy-status { min-height: 24px; margin: 12px 0; color: #d0d0d0; font-size: .84rem; }
      .vacancy-dialog .vacancy-status[data-error="true"] { color: #ff9a9a; }
      .vacancy-dialog .vacancy-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
      .vacancy-dialog button {
        padding: 11px 16px; border: 1px solid rgba(255,255,255,.15); border-radius: 10px;
        color: #f3f3f3; background: #202020; font: inherit; cursor: pointer;
      }
      .vacancy-dialog button[type="submit"] { color: #080808; background: #fff; font-weight: 600; }
      .vacancy-dialog button:disabled { opacity: .6; cursor: wait; }
      @media (max-width: 520px) {
        .vacancy-dialog form { padding: 20px; }
        .vacancy-dialog .vacancy-choice { flex-direction: column; }
      }
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
        <p>Upload a vacancy circular to extract the role, department and reference, or enter them manually. Review the details before generating your Z83. Circulars are processed in this browser and are not saved.</p>
        <div class="vacancy-choice">
          <label><input type="radio" name="entryMethod" value="upload" checked> Upload circular</label>
          <label><input type="radio" name="entryMethod" value="manual"> Enter manually</label>
        </div>
        <div class="vacancy-upload">
          <label for="vacancy-circular">Circular (PDF, JPG or PNG)</label>
          <input id="vacancy-circular" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp">
        </div>
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
    const uploadInput = dialog.querySelector('#vacancy-circular');
    const uploadPanel = dialog.querySelector('.vacancy-upload');
    const status = dialog.querySelector('.vacancy-status');
    const submitButton = dialog.querySelector('button[type="submit"]');
    const fields = {
      positionApplied: dialog.querySelector('#vacancy-position'),
      department: dialog.querySelector('#vacancy-department'),
      referenceNumber: dialog.querySelector('#vacancy-reference')
    };
    let settled = false;
    let extracting = false;

    fields.positionApplied.value = initialDetails.positionApplied || '';
    fields.department.value = initialDetails.department || '';
    fields.referenceNumber.value = initialDetails.referenceNumber || '';

    const finish = (result) => {
      if (settled) return;
      settled = true;
      dialog.close();
      dialog.remove();
      resolve(result);
    };

    dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => finish(null));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(null);
    });
    dialog.querySelectorAll('input[name="entryMethod"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const isUpload = dialog.querySelector('input[name="entryMethod"]:checked').value === 'upload';
        uploadPanel.hidden = !isUpload;
        status.textContent = '';
        status.removeAttribute('data-error');
      });
    });

    uploadInput.addEventListener('change', async () => {
      const file = uploadInput.files?.[0];
      if (!file) return;
      if (file.size > MAX_FILE_SIZE) {
        status.textContent = 'The circular must be smaller than 20 MB.';
        status.dataset.error = 'true';
        uploadInput.value = '';
        return;
      }

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!isPdf && !isImage) {
        status.textContent = 'Choose a PDF, JPG, PNG or WebP circular.';
        status.dataset.error = 'true';
        uploadInput.value = '';
        return;
      }

      extracting = true;
      submitButton.disabled = true;
      status.textContent = 'Reading circular in this browser...';
      status.removeAttribute('data-error');

      try {
        const result = isPdf
          ? await readPdfText(file)
          : { text: await readImageText(file), truncated: false };
        const extracted = extractFields(result.text);
        Object.entries(fields).forEach(([name, input]) => {
          if (extracted[name]) input.value = extracted[name];
        });
        const count = Object.keys(extracted).length;
        const extractionMessage = count
          ? `Found ${count} detail${count === 1 ? '' : 's'}. Check and correct the fields before continuing.`
          : 'Could not identify these details automatically. Enter them below or switch to manual entry.';
        status.textContent = result.truncated
          ? `${extractionMessage} Only the first ${MAX_PDF_PAGES} PDF pages were checked.`
          : extractionMessage;
      } catch (error) {
        status.textContent = error.message || 'Could not read the circular. Enter the details manually.';
        status.dataset.error = 'true';
      } finally {
        extracting = false;
        submitButton.disabled = false;
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (extracting) return;
      const values = Object.fromEntries(
        Object.entries(fields).map(([name, input]) => [name, input.value.trim()])
      );
      if (Object.values(values).some((value) => !value)) {
        status.textContent = 'Enter the role, department and reference number to continue.';
        status.dataset.error = 'true';
        const firstMissing = Object.values(fields).find((input) => !input.value.trim());
        firstMissing?.focus();
        return;
      }
      finish(values);
    });

    document.body.append(dialog);
    dialog.showModal();
  });
})();
