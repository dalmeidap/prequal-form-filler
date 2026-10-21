# Prequal Form Filler — Chrome Extension

Dev tool for filling Octane apply forms with test profiles. No app changes required.

## Install

Requires Chrome 106 or later for document-targeted messaging.

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this folder (`prequal-form-filler/`)

## Use

1. Open your local app (`localhost:5173`) on any form screen
2. Click the extension icon
3. Enter your email (will replace the profile's email so you receive submissions)
4. Select a test profile
5. Click **Fill visible fields**

Only fields present in the current DOM are filled — safe to run on any route.
For multi-screen flows, navigate to the next screen and click Fill again.

### Embedded widgets

Open the dealer site's Octane CTA and wait for the form to load before clicking
the extension's **Fill visible fields** button. The extension supports iframe
forms on the same localhost, QA, and sandbox origins as standalone forms,
including iframes created after the dealer page loads. Production forms and
unrelated dealer forms are not supported.

The `webNavigation` permission lets the popup discover frame document IDs in the
active tab. It probes those documents for the extension's content script and
sends profile data only to the single document reporting a visible form. It does
not inject scripts into dealer pages or request all-sites host access. If more
than one form is detected, close the extra forms before filling.

After updating the extension, reload it in `chrome://extensions` and refresh
already-open pages so the new content script is installed in widget frames.

### Verification

Run the dependency-free regression tests with `node --test tests/*.test.cjs`.
These tests mock Chrome APIs and DOM controls; they do not replace browser testing.

Browser checklist (do not submit an application):

- Open the sandbox [dealer example](https://www.mallofgeorgiaindianmotorcycle.com/Motorcycles-CFMOTO-Papio-CL-2024-Buford-GA-ac091eab-5962-4eeb-868c-b4bf017d2c8a?olenv=sandbox), click the Octane CTA, and fill the loaded form.
- Confirm text, masked, select, and tab fields update correctly inside the iframe.
- Navigate to another form screen and fill again; close and reopen the widget and repeat.
- Confirm an unopened/loading widget reports no form instead of zero-field success.
- Confirm existing standalone localhost, QA, and sandbox forms still fill.
- Confirm production widgets and unrelated dealer forms are not filled.

For joint profiles (George + Tanya), a **Primary / Co-applicant** toggle appears
so you can fill the co-applicant screen separately.

---

## Spike validation checklist

Before treating this as done, verify these four field types work correctly
in the running app. Open the browser console to see `[OctaneFiller]` logs.

### 1. Text field — `FirstName`

- Fill George Beer on `/` (LeadForm or LongForm)
- Expected: `firstName` input shows "GEORGE", RHF marks it valid
- Check: console shows `filled: ['firstName', ...]`

### 2. Masked input — `BirthDate`

- Fill any profile on LongForm
- Expected: `birthDate` shows "09/15/1941" formatted as MM/DD/YYYY
- If blank or malformed: the `nativeInputValueSetter` approach isn't reaching imask's internal state
- Fix path: dispatch character-by-character keydown events instead

### 3. Tab/button group — `ResidentialStatus`

- Fill any profile, check the "I own / I rent / Rent-free" buttons
- Expected: correct option appears selected (highlighted)
- If not: Spark Tab.Button may not use `value` attribute — inspect DOM and adjust
  `fillTabField` to match the actual attribute name

### 4. Custom Select — `State`
- Fill any profile on a form with the State field
- Expected: dropdown shows the correct state, RHF marks valid
- If not: the combobox → option click chain needs adjusting based on actual
  Spark Select DOM structure — open DevTools, click State manually, observe
  what elements appear and update `fillSelectField` accordingly

---

## Known limitations of this spike

- **Masked fields**: `nativeInputValueSetter` sets the raw value but imask
  may not reformat it correctly since it tracks its own state independently
  of the DOM value. If dates/phones show wrong, we need to simulate keystroke
  events character by character — more reliable but more code.

- **Select**: The combobox selector is a best-guess at Spark's DOM structure.
  Spark's Select component may render differently — needs verification against
  actual rendered HTML.

- **Tab groups with duplicate values**: If two tab groups on the same screen
  both have an option with value "R" (unlikely but possible), `fillTabField`
  clicks the first match. Add label-scoping if this becomes an issue.

---

## File structure

```
octane-filler/
├── manifest.json          # Extension config
├── src/
│   ├── content.js         # Injected into page — filler engine + profiles
│   └── profiles.js        # Profiles only (reference, not loaded directly)
└── popup/
    ├── popup.html
    ├── popup.css
    └── popup.js
```
