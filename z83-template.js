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
  const setText = (name, entry) => form.getTextField(name).setText(value(entry));
  const setTextIfPresent = (names, entry) => {
    for (const name of names) {
      try {
        form.getTextField(name).setText(value(entry));
        return;
      } catch (error) {
      }
    }
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
  setTextIfPresent(['If no what is your nationality', 'Nationality'], additional.nationality);
  setTextIfPresent(['Private Sector', 'Private Sector years'], personal.yearsPrivateSector);
  setTextIfPresent(['Public Sector', 'Public Sector years'], personal.yearsPublicSector);
  setTextIfPresent(['Date Reg.', 'Date Reg'], personal.registrationDate ? date(personal.registrationDate) : '');
  setTextIfPresent(['Reg. No.', 'Reg No'], personal.registrationNumber);
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
  setTextIfPresent(['If yes provide the details', 'If yes (provide the details)'], personal.criminalRecordDetails);
  setTextIfPresent(['If yes (provide the details)2', 'If yes provide the details2'], personal.pendingCriminalCaseDetails);
  setTextIfPresent(['If yes (provide the details)3', 'If yes provide the details3'], personal.dismissedMisconductDetails);
  setTextIfPresent(['If yes (provide the details)4', 'If yes provide the details4'], personal.pendingDisciplinaryCaseDetails);
  setTextIfPresent(['If yes (provide the details)5', 'If yes provide the details5'], personal.resignedPendingDisciplinaryDetails);
  setTextIfPresent(['If yes (provide the details)6', 'If yes provide the details6'], personal.stateBusinessInterestsDetails);

  [1, 2, 3, 4].forEach((row, index) => {
    const item = education[index] || {};
    setText(`Name of SchoolTechnical CollegeRow${row}`, item.institution || item.school);
    setText(`Name of qualification obtainedRow${row}`, item.title);
    setText(`Year obtainedRow${row}`, item.year);
  });
  setText('Current study institution and qualification', personal.currentStudy);

  [1, 2, 3].forEach((row, index) => {
    const item = employment[index] || {};
    const dates = value(item.period).split(/\s*(?:-|to)\s*/i);
    const fromParts = dates[0].split(/[\s/.-]+/).filter(Boolean);
    const toParts = (dates[1] || '').split(/[\s/.-]+/).filter(Boolean);
    setText(`Employer including current employerRow${row}`, item.employer || item.company);
    setText(`Post heldRow${row}`, item.title);
    setDropdown(`Dropdown1.${index}.0`, fromParts[0]);
    setDropdown(`Dropdown1.${index}.1`, toParts[0]);
    setText(`YYRow${row}`, fromParts[1]);
    setText(`YYRow${row}_2`, toParts[1]);
    setText(`Reason for leavingRow${row}`, item.reason);
  });
  setText('If yes Provide the name of the previous employing department and indicate the nature of the condition', personal.reappointmentConditionDetails);
  setRadio('Group17', personal.publicServiceReappointmentCondition, 'Choice1', 'Choice2');

  [references.ref1, references.ref2].forEach((reference, index) => {
    const row = index + 1;
    const item = reference || {};
    setText(`NameRow${row}`, item.name);
    setText(`Relationship to youRow${row}`, item.role);
    setText(`Tel No office hoursRow${row}`, item.phone);
  });

  setText('Date', date(personal.declarationDate || new Date().toISOString().slice(0, 10)));
  setText('Signature', personal.signature);
  setText('Initials', personal.initials);

  const languages = [personal.language1, personal.language2, personal.language3, personal.language4, personal.language5];
  languages.forEach((language, index) => setText(`Languages specifyRow1${index ? `_${index + 1}` : ''}`, language));
  [personal.language1Speak, personal.language2Speak, personal.language3Speak, personal.language4Speak, personal.language5Speak]
    .forEach((entry, index) => setDropdown(`Dropdown3.0.${index}`, entry));
  [personal.language1Write, personal.language2Write, personal.language3Write, personal.language4Write, personal.language5Write]
    .forEach((entry, index) => setDropdown(`Dropdown3.1.${index}`, entry));

  setChoice('Group16', personal.communicationMethod, [['Post', 'Choice1'], ['E-mail', 'Choice2'], ['Fax', 'Choice3'], ['Tel', 'Choice4']]);
  form.updateFieldAppearances();
  return pdf.save({ updateFieldAppearances: true });
};
