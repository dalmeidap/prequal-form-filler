// Content script - injected into the page, has DOM access.
// Receives fill commands from the popup via chrome.runtime.onMessage.

// --- Profiles ---

const PROFILES = {
  george_beer_approved: {
    label: "George Beer - Approved",
    primary: {
      firstName: "GEORGE", lastName: "BEER", birthDate: "09/15/1941",
      street1: "116 State St", street2: "85", city: "Holmen",
      state: "NV", zipCode: "54636", residentialStatus: "R",
      residentialDate: "01/2020", employmentStatus: "employed",
      yearlyIncome: 170000, incomeInterval: "yearly",
      contactPreference: "call", phoneNumber: "6085261867", cellPhoneNumber: "6085261867",
      purchaseIntent: "week", citizenshipStatus: "us_citizen",
      monthlyHousePayment: 1000, employerName: "Octane",
      employerPhone: "5165165165", jobTitle: "Bug Hunter",
      employerDate: "01/2020", ssn: "666570450",
    },
  },
  tanya_perrine_approved: {
    label: "Tanya Perrine - Approved",
    primary: {
      firstName: "TANYA", lastName: "PERRINE", birthDate: "09/26/1952",
      street1: "789 POWERS RD", city: "CONKLIN", state: "NY",
      zipCode: "13748", residentialStatus: "R", residentialDate: "01/2020",
      employmentStatus: "employed", yearlyIncome: 48000, incomeInterval: "yearly",
      contactPreference: "call", phoneNumber: "6077249711",
      purchaseIntent: "week", citizenshipStatus: "us_citizen",
      monthlyHousePayment: 1000, employerName: "Octane",
      employerPhone: "5165165165", jobTitle: "Bug Hunter",
      employerDate: "01/2020", ssn: "666290559",
    },
  },
  tanya_perrine_declined: {
    label: "Tanya Perrine - Declined",
    primary: {
      firstName: "TANYA", lastName: "PERRINE", birthDate: "09/26/1952",
      street1: "789 POWERS RD", city: "CONKLIN", state: "NY",
      zipCode: "13748", residentialStatus: "R", residentialDate: "01/2020",
      employmentStatus: "employed", yearlyIncome: 16000, incomeInterval: "yearly",
      contactPreference: "call", phoneNumber: "6077249711",
      purchaseIntent: "week", citizenshipStatus: "us_citizen",
      monthlyHousePayment: 1000, employerName: "Octane",
      employerPhone: "5165165165", jobTitle: "Bug Hunter",
      employerDate: "01/2020", ssn: "666290559",
    },
  },
  cathy_bellamy_declined: {
    label: "Cathy Bellamy - Full Decline",
    primary: {
      firstName: "CATHY", lastName: "BELLAMY", birthDate: "08/26/1966",
      street1: "315 HUDSON AVE", city: "STILLWATER", state: "NY",
      zipCode: "12170", residentialStatus: "R", residentialDate: "01/2020",
      employmentStatus: "employed", yearlyIncome: 48000, incomeInterval: "yearly",
      contactPreference: "call", phoneNumber: "5186643027",
      purchaseIntent: "week", citizenshipStatus: "us_citizen",
      monthlyHousePayment: 1000, employerName: "Octane",
      employerPhone: "5165165165", jobTitle: "Bug Hunter",
      employerDate: "01/2020", ssn: "666275271",
    },
  },
  donald_madera_thinfile: {
    label: "Donald Madera - Thinfile 9001",
    primary: {
      firstName: "DONALD", lastName: "MADERA", birthDate: "12/06/1916",
      street1: "4212 ALABAMA AVE", city: "KENNER", state: "LA",
      zipCode: "70065", residentialStatus: "R", residentialDate: "01/2020",
      employmentStatus: "employed", yearlyIncome: 48000, incomeInterval: "yearly",
      contactPreference: "call", phoneNumber: "5044662001",
      purchaseIntent: "week", citizenshipStatus: "us_citizen",
      monthlyHousePayment: 4000, employerName: "Octane",
      employerPhone: "5165165165", jobTitle: "Bug Hunter",
      employerDate: "01/2020", ssn: "666523068",
    },
  },
  jeanette_robinson_locked: {
    label: "Jeanette Robinson - Credit Locked",
    primary: {
      firstName: "Jeanette", lastName: "Robinson", birthDate: "11/10/1972",
      street1: "2593 Vonoa Drive", city: "Radcliff", state: "KY",
      zipCode: "40160", residentialStatus: "R", residentialDate: "01/2020",
      employmentStatus: "employed", yearlyIncome: 120000, incomeInterval: "yearly",
      contactPreference: "call", phoneNumber: "2297347497",
      purchaseIntent: "week", citizenshipStatus: "us_citizen",
      monthlyHousePayment: 9000, employerName: "Octane",
      employerPhone: "5165165165", jobTitle: "Bug Hunter",
      employerDate: "01/2020", ssn: "666114114",
    },
  },
  george_tanya_joint: {
    label: "George Beer + Tanya Perrine - Joint",
    primary: {
      firstName: "GEORGE", lastName: "BEER", birthDate: "09/15/1941",
      street1: "116 State St", street2: "85", city: "Holmen",
      state: "NV", zipCode: "54636", residentialStatus: "R",
      residentialDate: "01/2020", employmentStatus: "employed",
      yearlyIncome: 120000, incomeInterval: "yearly",
      contactPreference: "call", phoneNumber: "6085261867",
      purchaseIntent: "week", citizenshipStatus: "us_citizen",
      monthlyHousePayment: 1000, employerName: "Octane",
      employerPhone: "5165165165", jobTitle: "Bug Hunter",
      employerDate: "01/2020", ssn: "666570450",
    },
    coApplicant: {
      relationshipToPrimary: "SPOUSE",
      firstName: "TANYA", lastName: "PERRINE", birthDate: "09/26/1952",
      reusePrimaryAddress: "NO", street1: "789 POWERS RD",
      city: "CONKLIN", state: "NY", zipCode: "13748",
      residentialStatus: "R", residentialDate: "01/2020",
      employmentStatus: "employed", yearlyIncome: 48000, incomeInterval: "yearly",
      cellPhoneNumber: "6077249711", citizenshipStatus: "us_citizen",
      monthlyHousePayment: 1000, employerName: "Octane",
      employerPhone: "5165165165", jobTitle: "Bug Hunter",
      employerDate: "01/2020", ssn: "666290559",
    },
  },
};

// --- Select field label map ---
// Spark Select has no name/id on the wrapper - the <label> text is the only stable identifier.
// Maps field name -> label text rendered in the DOM.
const SELECT_FIELD_LABEL = {
  state:                 "State",
  citizenshipStatus:     "Citizenship Status",
  employmentStatus:      "Employment Status",
  incomeInterval:        "Income Interval",
  relationshipToPrimary: "Relationship to Primary Applicant",
};

// Maps profile value -> option display text shown in the listbox.
const SELECT_VALUE_TO_LABEL = {
  state: {},
  citizenshipStatus: {
    us_citizen:     "US Citizen",
    resident_alien: "Residential Alien",
  },
  employmentStatus: {
    employed:   "Full-Time Employed",
    self:       "Self-Employed",
    "1099":     "Contractor / 1099",
    military:   "Military",
    student:    "Student",
    retired:    "Retired",
    unemployed: "Unemployed",
    other:      "Other",
  },
  incomeInterval: {
    yearly:  "Yearly",
    monthly: "Monthly",
    weekly:  "Weekly",
  },
  relationshipToPrimary: {
    SPOUSE:  "Spouse",
    PARENT:  "Parent",
    SIBLING: "Sibling",
    OTHER:   "Other",
  },
};

// --- Profile key -> RHF input name map ---
// For cases where the profile key differs from the DOM input name attribute.
const FIELD_NAME_MAP = {
  street1:         "street1",
  street2:         "street2",
  cellPhoneNumber: "cellPhoneNumber",
  birthDate: "dob",
  yearlyIncome: "grossIncome",
  monthlyHousePayment: "monthlyHousingPayment",
  ssn: "socialSecurityNumber",
};

// --- Filler engine ---

const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype, "value"
).set;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function triggerReactInputChange(el, value) {
  nativeInputValueSetter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
}

function findInputByName(name) {
  return document.querySelector('input[name="' + name + '"]');
}

function fillTextField(name, value) {
  const el = findInputByName(name);
  if (!el) return false;
  triggerReactInputChange(el, String(value));
  return true;
}

function fillMaskedField(name, value) {
  const el = findInputByName(name);
  if (!el) return false;
  triggerReactInputChange(el, "");
  triggerReactInputChange(el, String(value));
  return true;
}

function fillCurrencyField(name, value) {
  const el = findInputByName(name);
  if (!el) return false;
  triggerReactInputChange(el, String(value));
  return true;
}

async function fillSelectField(name, value) {
  const fieldLabel = SELECT_FIELD_LABEL[name];
  if (!fieldLabel) {
    console.warn("[OctaneFiller] No label mapping for select field: " + name);
    return false;
  }

  let wrapper = null;
  for (const el of document.querySelectorAll('[data-oid="select-wrapper"]')) {
    const labelEl = el.querySelector("label");
    if (labelEl && labelEl.textContent.trim().toLowerCase() === fieldLabel.toLowerCase()) {
      wrapper = el;
      break;
    }
  }

  if (!wrapper) {
    console.warn("[OctaneFiller] No select wrapper found with label: " + fieldLabel);
    return false;
  }

  const trigger = wrapper.querySelector('[data-oid="select-button"]');
  if (!trigger) return false;

  const optionText = (SELECT_VALUE_TO_LABEL[name] && SELECT_VALUE_TO_LABEL[name][String(value)])
    ? SELECT_VALUE_TO_LABEL[name][String(value)]
    : String(value);

  trigger.click();
  await sleep(150);

  const options = document.querySelectorAll('[data-oid="select-option"][role="option"]');
  for (const opt of options) {
    const optText = (opt.querySelector("div") && opt.querySelector("div").firstChild)
      ? opt.querySelector("div").firstChild.textContent.trim()
      : opt.textContent.trim();

    if (optText.toLowerCase() === optionText.toLowerCase()) {
      opt.click();
      await sleep(50);
      return true;
    }
  }

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  console.warn("[OctaneFiller] No option matched for " + name + "=" + value + " (looking for: " + optionText + ")");
  return false;
}

function fillTabField(name, value) {
  const tabs = document.querySelectorAll('[role="tab"]');
  for (const tab of tabs) {
    const v = tab.getAttribute("value") || tab.getAttribute("data-value");
    if (v === String(value)) {
      tab.click();
      return true;
    }
  }
  return false;
}

function fillCheckbox(name, value) {
  const el = document.querySelector('input[type="checkbox"][name="' + name + '"]');
  if (!el) return false;
  if (Boolean(value) !== el.checked) el.click();
  return true;
}

const FIELD_TYPES = {
  // text
  firstName: "text", lastName: "text", email: "text",
  street1: "text", street2: "text",
  city: "text", zipCode: "text",
  employerName: "text", jobTitle: "text",
  // masked
  dob: "masked", residentialDate: "masked", employerDate: "masked",
  phoneNumber: "masked", cellPhoneNumber: "masked", employerPhone: "masked", socialSecurityNumber: "masked",
  // currency
  grossIncome: "currency", monthlyHousingPayment: "currency",
  // select
  state: "select", citizenshipStatus: "select",
  employmentStatus: "select", incomeInterval: "select",
  relationshipToPrimary: "select",
  // tab
  residentialStatus: "tab", contactPreference: "tab",
  purchaseIntent: "tab", reusePrimaryAddress: "tab",
  // checkbox
  partnerConsent: "checkbox", contactConsent: "checkbox",
};

async function fillField(name, value) {
  const type = FIELD_TYPES[name];
  if (!type) return false;
  switch (type) {
    case "text":     return fillTextField(name, value);
    case "masked":   return fillMaskedField(name, value);
    case "currency": return fillCurrencyField(name, value);
    case "select":   return await fillSelectField(name, value);
    case "tab":      return fillTabField(name, value);
    case "checkbox": return fillCheckbox(name, value);
    default:         return false;
  }
}

async function fillForm(profileData, emailOverride) {
  const data = Object.assign({}, profileData);
  if (emailOverride) data.email = emailOverride;

  const results = { filled: [], skipped: [], failed: [] };

  for (const [rawName, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === "") {
      results.skipped.push(rawName);
      continue;
    }

    const name = FIELD_NAME_MAP[rawName] || rawName;

    try {
      const ok = await fillField(name, value);
      (ok ? results.filled : results.skipped).push(name);
    } catch (e) {
      console.error("[OctaneFiller] Error filling " + name + ":", e);
      results.failed.push(name);
    }
    await sleep(60);
  }

  return results;
}

// --- Message listeners ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "FILL_FORM") return;

  const { profileKey, emailOverride, section } = message;
  const profile = PROFILES[profileKey];
  if (!profile) {
    sendResponse({ error: "Unknown profile: " + profileKey });
    return;
  }

  const data = section === "coApplicant" ? profile.coApplicant : profile.primary;
  if (!data) {
    sendResponse({ error: "No " + section + " data in profile " + profileKey });
    return;
  }

  fillForm(data, emailOverride).then((results) => {
    sendResponse({ ok: true, results });
  });

  return true;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "GET_PROFILES") return;
  const list = Object.entries(PROFILES).map(([key, p]) => ({
    key,
    label: p.label,
    hasCoApplicant: !!p.coApplicant,
  }));
  sendResponse({ profiles: list });
});