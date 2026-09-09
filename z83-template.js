window.createOfficialZ83Document = async (profile = {}) => {
  if (!window.PDFLib) throw new Error('PDF library is unavailable');

  const response = await fetch('Z83.pdf');
  if (!response.ok) throw new Error(`Unable to load Z83.pdf (${response.status})`);

  const pdf = await window.PDFLib.PDFDocument.load(await response.arrayBuffer());
    const form = pdf.getForm();
    const personal = profile.profile?.personal || {};
    const additional = profile.profile?.additional || {};
    const references = profile.profile?.references || {};
    const education = Array.isArray(profile.profile?.education) ? profile.profile.education : [];
    const employment = Array.isArray(profile.profile?.employment) ? profile.profile.employment : [];
    const value = (entry) => entry === undefined || entry === null ? '' : String(entry);
    const firstName = profile.firstName || personal.firstName || '';
    const lastName = profile.lastName || personal.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const email = profile.email || personal.email || '';
    const date = (entry) => {
      const parts = value(entry).split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}` : value(entry);
    };
    const setText = (name, entry) => {
      const field = form.getTextField(name);
      field.setText(value(entry));
    };
    const setDropdown = (name, entry) => {
      const field = form.getDropdown(name);
      const selected = value(entry);
      if (selected && field.getOptions().includes(selected)) field.select(selected);
    };
    const setRadio = (name, entry, yesValue = 'Choice6', noValue = 'Choice7') => {
      const normalized = value(entry).toLowerCase();
      if (normalized === 'yes' || normalized === 'true') form.getRadioGroup(name).select(yesValue);
      if (normalized === 'no' || normalized === 'false') form.getRadioGroup(name).select(noValue);
    };
    const setChoice = (name, entry, choices) => {
      const normalized = value(entry).toLowerCase();
      const selected = choices.find(([label]) => normalized === label.toLowerCase());
      if (selected) form.getRadioGroup(name).select(selected[1]);
    };

    setText('Position for which you are applying as advertised', additional.positionApplied);
    setText('Department where the position was advertised', additional.department);
    setText('Reference number as stated in the advert', additional.referenceNumber);
    setText('If you are offered the position when can you start OR how much notice must you serve with your current employer', additional.startDate ? date(additional.startDate) : additional.noticePeriod);
    setText('Surname and Full names', fullName);
    setText('Surname and Full names_2', lastName);
    setText('DDMMYY', date(personal.dob));
    setText('Identity Number', profile.idNumber || personal.idNumber);
    setText('Passport2 number', personal.passportNumber);
    setText('Preferred language for correspondence', personal.preferredLanguage);
    setText('Contact details in terms of the above', `${personal.address || ''}${personal.phone ? ` | ${personal.phone}` : ''}${email ? ` | ${email}` : ''}`.trim());

    setChoice('Group2', personal.race, [['African', 'Choice1'], ['White', 'Choice2'], ['Coloured', 'Choice3'], ['Indian', 'Choice4'], ['Other', 'Choice5']]);
    setChoice('Group3', personal.gender, [['Female', 'Choice7'], ['Male', 'Choice6']]);
    setRadio('Group4', additional.disability);
    setRadio('Group5', additional.citizenship === 'South African' ? 'Yes' : additional.citizenship);
    setRadio('Group6', personal.workPermit);
    setRadio('Group7', personal.criminalRecord);
    setRadio('Group8', personal.pendingCriminalCase);
    setRadio('Group9', personal.dismissedMisconduct);
    setRadio('Group10', personal.pendingDisciplinaryCase);
    setRadio('Group11', personal.resignedPendingDisciplinary);
    setRadio('Group12', personal.dischargedIllHealth);
    setRadio('Group13', personal.stateBusinessInterests);
    setRadio('Group14', personal.relinquishBusinessInterests);

    const educationRows = [1, 2, 3, 4];
    educationRows.forEach((row, index) => {
      const item = education[index] || {};
      setText(`Name of SchoolTechnical CollegeRow${row}`, item.institution || item.school);
      setText(`Name of qualification obtainedRow${row}`, item.title);
      setText(`Year obtainedRow${row}`, item.year);
    });
    setText('Current study institution and qualification', personal.currentStudy);

    const employmentRows = [1, 2, 3];
    employmentRows.forEach((row, index) => {
      const item = employment[index] || {};
      const dates = value(item.period).split(/\s*(?:-|to)\s*/i);
      setText(`Employer including current employerRow${row}`, item.employer || item.company);
      setText(`Post heldRow${row}`, item.title);
      setDropdown(`Dropdown1.${index}.0`, dates[0]?.slice(0, 2));
      setDropdown(`Dropdown1.${index}.1`, dates[0]?.slice(-2));
      setDropdown(`Dropdown1.${index}.2`, dates[1]?.slice(0, 2));
      setDropdown(`Dropdown1.${index}.3`, dates[1]?.slice(-2));
      setText(`Reason for leavingRow${row}`, item.reason);
    });
    setText('If yes Provide the name of the previous employing department and indicate the nature of the condition', personal.reappointmentConditionDetails);
    setRadio('Group17', personal.publicServiceReappointmentCondition, 'Choice1', 'Choice2');

    const referenceRows = [1, 2, 3];
    referenceRows.forEach((row, index) => {
      const reference = [references.ref1, references.ref2][index] || {};
      setText(index === 0 ? 'NameRow1' : `NameRow${row}`, reference.name);
      setText(`Relationship to youRow${row}`, reference.role);
      setText(`Tel No office hoursRow${row}`, reference.phone);
    });

    setText('Date', date(new Date().toISOString().slice(0, 10)));
    setText('Signature', personal.signature);
    setText('Initials', personal.initials);

    const languages = [personal.language1, personal.language2, personal.language3, personal.language4, personal.language5];
    languages.forEach((language, index) => setText(`Languages specifyRow1${index ? `_${index}` : ''}`, language));
    [personal.language1Speak, personal.language2Speak, personal.language3Speak, personal.language4Speak, personal.language5Speak]
      .forEach((entry, index) => setDropdown(`Dropdown3.0.${index}`, entry));
    [personal.language1Write, personal.language2Write, personal.language3Write, personal.language4Write, personal.language5Write]
      .forEach((entry, index) => setDropdown(`Dropdown3.1.${index}`, entry));

    setChoice('Group16', personal.communicationMethod, [['Post', 'Choice1'], ['E-mail', 'Choice2'], ['Fax', 'Choice3'], ['Tel', 'Choice4']]);
    form.updateFieldAppearances();
    return pdf.save({ updateFieldAppearances: true });
  const personal = profile.profile?.personal || {};
  const additional = profile.profile?.additional || {};
  const references = profile.profile?.references || {};
  const education = Array.isArray(profile.profile?.education) ? profile.profile.education : [];
  const employment = Array.isArray(profile.profile?.employment) ? profile.profile.employment : [];
  const text = (entry) => entry === undefined || entry === null ? '' : String(entry);
  const fullName = `${profile.firstName || personal.firstName || ''} ${profile.lastName || personal.lastName || ''}`.trim();
  const idNumber = profile.idNumber || personal.idNumber || '';
  const email = profile.email || personal.email || '';
  const formatDate = (entry) => {
    const parts = text(entry).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}` : text(entry);
  };
  const write = (page, value, x, y, size = 8, maxWidth = 0, bold = false) => {
    const content = text(value);
    if (!content) return;
    const selectedFont = bold ? boldFont : font;
    let fontSize = size;
    if (maxWidth) {
      while (fontSize > 5 && selectedFont.widthOfTextAtSize(content, fontSize) > maxWidth) fontSize -= 0.5;
    }
    page.drawText(content, { x, y, size: fontSize, font: selectedFont, color: window.PDFLib.rgb(0, 0, 0) });
  };
  const writeLines = (page, value, x, y, maxWidth, size = 7, lineHeight = 8) => {
    const words = text(value).split(/\s+/).filter(Boolean);
    let line = '';
    let offset = 0;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        write(page, line, x, y - offset, size);
        line = word;
        offset += lineHeight;
      } else {
        line = candidate;
      }
    }
    if (line) write(page, line, x, y - offset, size);
  };
  const mark = (page, value, x, y) => {
    const normalized = text(value).toLowerCase();
    if (normalized === 'yes' || normalized === 'true') write(page, 'X', x, y, 10, 12, true);
    if (normalized === 'no' || normalized === 'false') write(page, 'X', x + 43, y, 10, 12, true);
  };
  const personalPage = pdf.getPage(0);
  const secondPage = pdf.getPage(1);

  // Page 1, section A.
  writeLines(personalPage, additional.positionApplied, 255, 650, 165);
  writeLines(personalPage, additional.department, 430, 650, 165);
  write(personalPage, additional.referenceNumber, 255, 595, 160);
  writeLines(personalPage, formatDate(additional.startDate) || additional.noticePeriod, 430, 610, 165);

  // Page 1, section B.
  writeLines(personalPage, fullName, 285, 548, 235);
  write(personalPage, formatDate(personal.dob), 255, 505, 85);
  write(personalPage, idNumber, 350, 505, 8, 155);
  write(personalPage, personal.passportNumber, 350, 480, 8, 155);
  write(personalPage, personal.race, 285, 458, 8, 210);
  write(personalPage, personal.gender, 285, 436, 8, 210);
  mark(personalPage, additional.disability, 522, 414);
  mark(personalPage, additional.citizenship === 'South African' ? 'Yes' : additional.citizenship, 522, 393);
  write(personalPage, additional.nationality, 285, 371, 8, 210);
  mark(personalPage, personal.workPermit, 522, 349);
  mark(personalPage, personal.criminalRecord, 522, 327);
  writeLines(personalPage, personal.criminalRecordDetails, 285, 311, 210, 6);
  mark(personalPage, personal.pendingCriminalCase, 522, 287);
  writeLines(personalPage, personal.pendingCriminalCaseDetails, 285, 271, 210, 6);
  mark(personalPage, personal.dismissedMisconduct, 522, 247);
  writeLines(personalPage, personal.dismissedMisconductDetails, 285, 231, 210, 6);
  mark(personalPage, personal.pendingDisciplinaryCase, 522, 207);
  writeLines(personalPage, personal.pendingDisciplinaryCaseDetails, 285, 191, 210, 6);
  mark(personalPage, personal.resignedPendingDisciplinary, 522, 167);
  mark(personalPage, personal.dischargedIllHealth, 522, 132);
  mark(personalPage, personal.stateBusinessInterests, 522, 95);
  mark(personalPage, personal.relinquishBusinessInterests, 522, 60);
  write(personalPage, personal.privateSectorExperience, 470, 32, 8, 45);
  write(personalPage, personal.publicSectorExperience, 545, 32, 8, 45);
  write(personalPage, personal.professionalRegistrationDate, 480, 10, 7, 45);
  write(personalPage, personal.professionalRegistrationNumber, 545, 10, 7, 45);

  // Page 2, sections C and D.
  write(secondPage, personal.preferredLanguage, 410, 735, 8, 150);
  write(secondPage, personal.communicationMethod, 350, 705, 8, 120);
  writeLines(secondPage, `${personal.address || ''} ${personal.phone || ''} ${email}`.trim(), 350, 675, 235, 7);
  write(secondPage, personal.language1, 245, 602, 7, 65);
  write(secondPage, personal.language1Speak, 325, 602, 7, 65);
  write(secondPage, personal.language1Write, 410, 602, 7, 65);
  write(secondPage, personal.language2, 245, 580, 7, 65);
  write(secondPage, personal.language2Speak, 325, 580, 7, 65);
  write(secondPage, personal.language2Write, 410, 580, 7, 65);

  // Page 2, section E.
  education.slice(0, 5).forEach((item, index) => {
    const y = 535 - (index * 25);
    write(secondPage, item.institution || item.school, 85, y, 7, 190);
    write(secondPage, item.title, 275, y, 7, 185);
    write(secondPage, item.year, 500, y, 7, 70);
  });
  writeLines(secondPage, personal.currentStudy, 90, 410, 490, 7);

  // Page 2, section F.
  employment.slice(0, 3).forEach((item, index) => {
    const y = 350 - (index * 28);
    const period = text(item.period);
    const dates = period.split(/\s*(?:-|to)\s*/i);
    write(secondPage, item.employer || item.company, 85, y, 7, 140);
    write(secondPage, item.title, 225, y, 7, 110);
    write(secondPage, dates[0], 345, y, 7, 55);
    write(secondPage, dates[1], 405, y, 7, 55);
    write(secondPage, item.reason, 465, y, 7, 105);
  });
  mark(secondPage, personal.publicServiceReappointmentCondition, 455, 260);
  writeLines(secondPage, personal.reappointmentConditionDetails, 90, 237, 480, 7);

  // Page 2, section G.
  [references.ref1, references.ref2].filter(Boolean).slice(0, 3).forEach((reference, index) => {
    const y = 180 - (index * 27);
    write(secondPage, reference.name, 85, y, 7, 145);
    write(secondPage, reference.role, 245, y, 7, 145);
    write(secondPage, reference.phone, 410, y, 7, 150);
  });

  return pdf.save();
};
