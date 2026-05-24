/**
 * Field filling engine.
 *
 * Strategy per component type:
 *
 * TEXT INPUT (BaseTextField → TextField → native <input>)
 *   Use nativeInputValueSetter trick to bypass React's synthetic event system,
 *   then dispatch a real 'input' + 'change' event. React reconciles internal state.
 *
 * MASKED INPUT (BasePhoneField, SocialSecurity, BaseDateField → MaskField → native <input>)
 *   Same as text, but the mask library intercepts keystrokes. We set value directly
 *   and fire 'input'. The mask library re-formats on its own onChange, which then
 *   calls RHF's onChange with the unmasked value. We may need to also trigger 'blur'
 *   to flush validation.
 *
 * CURRENCY INPUT (BaseCurrencyField → CurrencyField → native <input>)
 *   Same as text. CurrencyField uses react-number-format which listens to native input events.
 *
 * SELECT (BaseSelectField → Select → custom dropdown, not a native <select>)
 *   Spark Select renders a button that opens a listbox. We need to:
 *   1. Find the trigger button by proximity to the label
 *   2. Click it to open the dropdown
 *   3. Find the option by value/text and click it
 *
 * TAB / BUTTON GROUP (BaseButtonGroup, BaseControlledTab → Tab → <button> elements)
 *   Find the Tab.Button with matching value attribute and click it.
 *
 * DISCLOSURE / CHECKBOX (BaseDisclosure → Disclosure → some clickable element)
 *   Find the checkbox input and click if not already checked.
 */

const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value"
).set;

/**
 * Dispatch input + change events that React's synthetic system picks up.
 */
function triggerInputChange(el, value) {
  nativeInputValueSetter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
}

/**
 * Find a native <input> by its name attribute.
 * Spark components forward the name prop to the underlying input.
 */
function findInputByName(name) {
  return document.querySelector(`input[name="${name}"]`);
}

/**
 * Fill a plain text field.
 */
function fillTextField(name, value) {
  const input = findInputByName(name);
  if (!input) return false;
  triggerInputChange(input, String(value));
  return true;
}

/**
 * Fill a masked field (phone, SSN, date).
 * The mask library re-processes the value on input event.
 * We set the raw unmasked value and let the mask handle formatting.
 */
function fillMaskedField(name, value) {
  const input = findInputByName(name);
  if (!input) return false;
  // Clear first, then set — some mask libs need this to reset state
  triggerInputChange(input, "");
  triggerInputChange(input, String(value));
  return true;
}

/**
 * Fill a currency field.
 * react-number-format listens to native input events.
 */
function fillCurrencyField(name, value) {
  const input = findInputByName(name);
  if (!input) return false;
  triggerInputChange(input, String(value));
  return true;
}

/**
 * Fill a Spark Select (custom dropdown).
 *
 * Spark Select structure (approximate):
 *   <div> ← field wrapper, contains a data attribute or label
 *     <button> ← trigger, clicking opens listbox
 *     <ul role="listbox">
 *       <li role="option" data-value="...">label</li>
 *     </ul>
 *   </div>
 *
 * We locate the trigger by finding an element near a <label> that references
 * the input name, then click the matching option.
 */
async function fillSelectField(name, value) {
  // Spark Select renders a hidden <select> or uses aria — find the trigger button
  // Strategy: find any button inside a container that also contains an input[name]
  // or find by aria-label / data attributes

  // First try: find a [role="combobox"] or button near an element with the field context
  // Spark Select typically wraps in a div and the trigger has role="combobox"
  const comboboxes = document.querySelectorAll('[role="combobox"]');

  let trigger = null;
  for (const cb of comboboxes) {
    // Walk up to find the field container, then check if our named input is nearby
    const container = cb.closest('[class*="field"], [class*="Field"], [class*="select"], [class*="Select"]') || cb.parentElement;
    // Spark may render the name on a hidden input in the same container
    const hiddenInput = container?.querySelector(`input[name="${name}"]`);
    if (hiddenInput) {
      trigger = cb;
      break;
    }
  }

  // Fallback: look for a button whose parent contains an element with the label text
  if (!trigger) {
    // Try finding by label association
    const labels = document.querySelectorAll("label");
    for (const label of labels) {
      const forAttr = label.htmlFor;
      if (forAttr === name) {
        const container = label.closest("div");
        trigger = container?.querySelector('[role="combobox"], button');
        if (trigger) break;
      }
    }
  }

  if (!trigger) return false;

  // Open the dropdown
  trigger.click();

  // Wait a tick for the listbox to render
  await sleep(100);

  // Find option by value attribute or text content
  const options = document.querySelectorAll('[role="option"]');
  for (const option of options) {
    const optionValue = option.getAttribute("data-value") || option.getAttribute("value");
    const optionText = option.textContent?.trim();
    if (optionValue === String(value) || optionText?.toLowerCase() === String(value).toLowerCase()) {
      option.click();
      return true;
    }
  }

  // Close dropdown if option not found
  trigger.click();
  return false;
}

/**
 * Fill a Tab/button group field (ResidentialStatus, ContactPreference, PurchaseIntent, Condition, Year).
 *
 * Spark Tab.Button renders as <button role="tab" value="..."> or similar.
 * We find all tab buttons in the page and click the one matching our value.
 *
 * The container for a tab group doesn't have a name attribute, so we rely on
 * the value being unique enough per screen, or we scope by label text.
 */
function fillTabField(name, value, labelHint) {
  // Tab.Button elements — Spark renders them as buttons with a data value
  // Try finding by value attribute directly
  const buttons = document.querySelectorAll('button[role="tab"], [role="tab"]');

  for (const btn of buttons) {
    const btnValue = btn.getAttribute("value") || btn.getAttribute("data-value");
    if (btnValue === String(value)) {
      // If we have a label hint, verify this button is in the right group
      if (labelHint) {
        const group = btn.closest('[role="tablist"]')?.closest("div");
        const groupLabel = group?.querySelector("label, [class*='label'], [class*='Label']");
        if (groupLabel && !groupLabel.textContent?.toLowerCase().includes(labelHint.toLowerCase())) {
          continue; // wrong group
        }
      }
      btn.click();
      return true;
    }
  }
  return false;
}

/**
 * Fill a checkbox / disclosure.
 */
function fillCheckbox(name, value) {
  const input = document.querySelector(`input[type="checkbox"][name="${name}"]`);
  if (!input) return false;
  if (Boolean(value) !== input.checked) {
    input.click();
  }
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Field type map.
 * Determines which fill strategy to use per field name.
 */
const FIELD_TYPES = {
  // Text
  firstName: "text",
  lastName: "text",
  email: "text",
  street1: "text",
  street2: "text",
  city: "text",
  employerName: "text",
  jobTitle: "text",

  // Masked — date
  birthDate: "masked",
  residentialDate: "masked",
  employerDate: "masked",

  // Masked — phone/SSN
  phoneNumber: "masked",
  cellPhoneNumber: "masked",
  employerPhone: "masked",
  socialSecurityNumber: "masked",

  // Currency
  yearlyIncome: "currency",
  monthlyHousePayment: "currency",

  // Select (custom dropdown)
  state: "select",
  citizenshipStatus: "select",
  employmentStatus: "select",
  relationshipToPrimary: "select",

  // Tab / button group
  residentialStatus: "tab",
  contactPreference: "tab",
  purchaseIntent: "tab",
  reusePrimaryAddress: "tab",

  // Zip — text but numeric
  zipCode: "text",

  // Checkboxes
  partnerConsent: "checkbox",
  contactConsent: "checkbox",
};

/**
 * Fill a single field by name and value.
 * Returns true if the field was found and filled.
 */
async function fillField(name, value) {
  const type = FIELD_TYPES[name];
  if (!type) {
    console.warn(`[OctaneFiller] Unknown field type for: ${name}`);
    return false;
  }

  switch (type) {
    case "text":
      return fillTextField(name, value);
    case "masked":
      return fillMaskedField(name, value);
    case "currency":
      return fillCurrencyField(name, value);
    case "select":
      return await fillSelectField(name, value);
    case "tab":
      return fillTabField(name, value);
    case "checkbox":
      return fillCheckbox(name, value);
    default:
      return false;
  }
}

/**
 * Fill all fields from a profile data object.
 * Only fills fields that exist in the current DOM — safe to call on any route.
 * Applies a small delay between fields to let React re-render between state updates.
 */
async function fillForm(profileData, emailOverride) {
  const data = { ...profileData };

  if (emailOverride && "email" in data) {
    data.email = emailOverride;
  }

  const results = { filled: [], skipped: [], failed: [] };

  for (const [name, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === "") {
      results.skipped.push(name);
      continue;
    }

    const fieldInDOM = !!findInputByName(name) ||
      document.querySelector(`[role="tab"][value="${value}"]`) ||
      document.querySelector(`input[type="checkbox"][name="${name}"]`);

    if (!fieldInDOM && FIELD_TYPES[name] !== "select" && FIELD_TYPES[name] !== "tab") {
      results.skipped.push(name);
      continue;
    }

    const success = await fillField(name, value);
    if (success) {
      results.filled.push(name);
    } else {
      results.skipped.push(name);
    }

    await sleep(50); // small gap between fields
  }

  console.log("[OctaneFiller] Fill results:", results);
  return results;
}
