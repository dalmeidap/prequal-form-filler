# Octane Form Filler — Chrome Extension (Spike)

Dev tool for filling Octane apply forms with test profiles. No app changes required.

## Install

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this folder (`octane-filler/`)

## Use

1. Open your local app (`localhost:5173`) on any form screen
2. Click the extension icon
3. Enter your email (will replace the profile's email so you receive submissions)
4. Select a test profile
5. Click **Fill visible fields**

Only fields present in the current DOM are filled — safe to run on any route.
For multi-screen flows, navigate to the next screen and click Fill again.

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
