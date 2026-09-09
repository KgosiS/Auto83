window.createOfficialZ83Document = (profile = {}) => {
  const personal = profile.profile?.personal || {};
  const additional = profile.profile?.additional || {};
  const references = profile.profile?.references || {};
  const education = Array.isArray(profile.profile?.education) ? profile.profile.education : [];
  const employment = Array.isArray(profile.profile?.employment) ? profile.profile.employment : [];
  const value = (entry) => entry === undefined || entry === null ? '' : String(entry);
  const escapeHtml = (entry) => value(entry)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const cell = (label, entry, className = '') => `<div class="field ${className}"><span class="label">${label}</span><span class="value">${escapeHtml(entry)}</span></div>`;
  const yesNo = (entry) => entry ? escapeHtml(entry) : 'Yes &nbsp;&nbsp;&nbsp;&nbsp; No';
  const fullName = `${profile.firstName || personal.firstName || ''} ${profile.lastName || personal.lastName || ''}`.trim();
  const referencesMarkup = [references.ref1, references.ref2]
    .filter(Boolean)
    .map((reference) => `<tr><td>${escapeHtml(reference.name)}</td><td>${escapeHtml(reference.role)}</td><td>${escapeHtml(reference.phone)}</td></tr>`)
    .join('');
  const educationMarkup = education.map((item) => `<tr><td>${escapeHtml(item.institution || item.school)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.year)}</td></tr>`).join('');
  const employmentMarkup = employment.map((item) => {
    const period = value(item.period);
    const parts = period.split(/\s*(?:-|to)\s*/i);
    return `<tr><td>${escapeHtml(item.employer || item.company)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(parts[0])}</td><td>${escapeHtml(parts[1] || '')}</td><td>${escapeHtml(item.reason || '')}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Z83 Application Form</title>
<style>
  @page { size: A4; margin: 9mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; background: #eee; font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
  .page { width: 190mm; min-height: 277mm; margin: 10mm auto; padding: 7mm; background: #fff; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .header { display: grid; grid-template-columns: 25mm 1fr 29mm; align-items: center; gap: 6mm; margin-bottom: 6mm; }
  .crest { font-size: 8px; text-align: center; border: 1px solid #222; padding: 12px 2px; }
  h1 { margin: 0; text-align: center; font-size: 19px; border: 1px solid #222; border-radius: 5px; background: #aaa; padding: 4px; }
  .form-code { text-align: center; font-size: 9px; border: 1px solid #222; padding: 4px 2px; }
  .section { border: 1px solid #111; margin-bottom: 4mm; }
  .section-title { padding: 3px 5px; font-size: 12px; font-weight: 700; background: #aaa; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); }
  .grid.three { grid-template-columns: repeat(3, 1fr); }
  .field { min-height: 11mm; padding: 3px 5px; border-right: 1px solid #111; border-bottom: 1px solid #111; }
  .field:nth-child(2n) { border-right: 0; }
  .three .field:nth-child(2n) { border-right: 1px solid #111; }
  .three .field:nth-child(3n) { border-right: 0; }
  .field.full { grid-column: 1 / -1; border-right: 0; }
  .label { display: block; font-weight: 700; font-size: 9px; }
  .value { display: block; min-height: 13px; margin-top: 4px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { min-height: 9mm; padding: 4px; border: 1px solid #111; text-align: left; vertical-align: top; }
  th { font-weight: 700; background: #eee; }
  .note { padding: 5px; line-height: 1.35; }
  .check { white-space: nowrap; }
  .declaration { min-height: 24mm; padding: 5px; }
  .signature { height: 19mm; border-top: 1px solid #111; display: grid; grid-template-columns: 1fr 1fr; margin-top: 8px; }
  .signature div { padding: 5px; border-right: 1px solid #111; }
  .signature div:last-child { border-right: 0; }
  .footer { display: flex; justify-content: space-between; margin-top: 7mm; font-weight: 700; }
  @media print { body { background: #fff; } .page { width: auto; min-height: auto; margin: 0; padding: 0; } }
</style>
</head>
<body>
  <section class="page">
    <div class="header"><div class="crest">REPUBLIC OF<br />SOUTH AFRICA</div><h1>APPLICATION FOR EMPLOYMENT</h1><div class="form-code">Z83 (81/971431)<br /><br />Effective 01 January 2021</div></div>
    <div class="section"><div class="section-title">A. THE ADVERTISED POST (All sections of this form are compulsory)</div><div class="grid">${cell('Position for which you are applying (as advertised)', additional.positionApplied)}${cell('Department where the position was advertised', additional.department)}${cell('Reference number (as stated in the advert)', additional.referenceNumber)}${cell('When can you start OR how much notice must you serve?', additional.startDate || additional.noticePeriod)}</div></div>
    <div class="section"><div class="section-title">B. PERSONAL INFORMATION</div><div class="grid">${cell('Surname and Full names', fullName, 'full')}${cell('Date of Birth DD/MM/YY', personal.dob)}${cell('Identity Number', profile.idNumber || personal.idNumber)}${cell('Passport number', personal.passportNumber)}${cell('Race', personal.race)}${cell('Gender', personal.gender)}${cell('Do you have a disability?', additional.disability)}${cell('Are you a South African citizen?', additional.citizenship)}${cell('If no, what is your nationality?', additional.nationality)}${cell('Valid work permit (if non-South African)', personal.workPermit)}${cell('Criminal offence / admission of guilt', personal.criminalRecord)}${cell('Pending criminal case', personal.pendingCriminalCase)}${cell('Dismissed for misconduct from Public Service', personal.dismissedMisconduct)}${cell('Pending disciplinary case', personal.pendingDisciplinaryCase)}${cell('Resigned pending disciplinary proceeding', personal.resignedPendingDisciplinary)}${cell('Discharged or retired on ill-health grounds', personal.dischargedIllHealth)}${cell('Business interests with the State', personal.stateBusinessInterests)}${cell('Relinquish business interests if employed', personal.relinquishBusinessInterests)}${cell('Total years of experience - Private Sector', personal.privateSectorExperience)}${cell('Total years of experience - Public Sector', personal.publicSectorExperience)}${cell('Professional registration date / number', personal.professionalRegistration, 'full')}</div></div>
    <div class="section"><div class="section-title">C. CONTACT DETAILS AND MEDIUM OF COMMUNICATIONS</div><div class="grid">${cell('Preferred language for correspondence', personal.preferredLanguage)}${cell('Method for correspondence', personal.communicationMethod)}${cell('Contact details', `${personal.address || ''}${personal.phone ? ` | ${personal.phone}` : ''}${profile.email || personal.email ? ` | ${profile.email || personal.email}` : ''}`, 'full')}</div></div>
    <div class="section"><div class="section-title">D. SOUTH AFRICAN OFFICIAL LANGUAGE PROFICIENCY</div><table><thead><tr><th>Languages (specify)</th><th>Speak</th><th>Write or read</th></tr></thead><tbody><tr><td>${escapeHtml(personal.language1)}</td><td>${escapeHtml(personal.language1Speak)}</td><td>${escapeHtml(personal.language1Write)}</td></tr><tr><td>${escapeHtml(personal.language2)}</td><td>${escapeHtml(personal.language2Speak)}</td><td>${escapeHtml(personal.language2Write)}</td></tr></tbody></table></div>
    <div class="footer"><span>Page 1 of 2</span><span>Initial…………</span></div>
  </section>
  <section class="page">
    <div class="section"><div class="section-title">E. FORMAL QUALIFICATION (from highest to the lowest)</div><table><thead><tr><th>Name of School/Technical College</th><th>Name of qualification obtained</th><th>Year obtained</th></tr></thead><tbody>${educationMarkup}<tr><td colspan="3">Current study (institution and qualification): ${escapeHtml(personal.currentStudy)}</td></tr></tbody></table></div>
    <div class="section"><div class="section-title">F. WORK EXPERIENCE (Also attach a detailed CV)</div><table><thead><tr><th>Employer (including current employer)</th><th>Post held</th><th>From</th><th>To</th><th>Reason for leaving</th></tr></thead><tbody>${employmentMarkup}</tbody></table><div class="grid"><div class="field full"><span class="label">Previously employed in Public Service, is there any condition preventing re-appointment?</span><span class="value">${yesNo(personal.publicServiceReappointmentCondition)}</span></div><div class="field full"><span class="label">If yes, previous employing department and nature of condition</span><span class="value">${escapeHtml(personal.reappointmentConditionDetails)}</span></div></div></div>
    <div class="section"><div class="section-title">G. REFERENCES</div><table><thead><tr><th>Name</th><th>Relationship to you</th><th>Tel. No. (office hours)</th></tr></thead><tbody>${referencesMarkup}</tbody></table></div>
    <div class="section"><div class="section-title">DECLARATION</div><div class="declaration">I declare that all the information provided (including any attachments) is complete and correct to the best of my knowledge. I understand that any false information provided will result in my application being disqualified or disciplinary action taken against me if I am appointed:<div class="signature"><div><strong>Signature:</strong></div><div><strong>Date:</strong></div></div></div></div>
    <div class="footer"><span>Page 2 of 2</span><span>Initial…………</span></div>
  </section>
</body>
</html>`;
};
