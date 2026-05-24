const profileSelect = document.getElementById("profile-select");
const emailInput = document.getElementById("email-override");
const fillBtn = document.getElementById("fill-btn");
const statusEl = document.getElementById("status");
const coApplicantRow = document.getElementById("coapplicant-row");

// Profiles with co-applicant data — kept in sync with content.js
const CO_APPLICANT_PROFILES = new Set(["george_tanya_joint"]);

const PROFILES_LIST = [
  { key: "george_beer_approved",    label: "George Beer — Approved" },
  { key: "tanya_perrine_approved",  label: "Tanya Perrine — Approved" },
  { key: "tanya_perrine_declined",  label: "Tanya Perrine — Declined" },
  { key: "cathy_bellamy_declined",  label: "Cathy Bellamy — Full Decline" },
  { key: "donald_madera_thinfile",  label: "Donald Madera — Thinfile 9001" },
  { key: "jeanette_robinson_locked",label: "Jeanette Robinson — Credit Locked" },
  { key: "george_tanya_joint",      label: "George Beer + Tanya — Joint" },
];

// Populate profile dropdown
PROFILES_LIST.forEach(({ key, label }) => {
  const opt = document.createElement("option");
  opt.value = key;
  opt.textContent = label;
  profileSelect.appendChild(opt);
});

// Restore last used profile + email from storage
chrome.storage.local.get(["lastProfile", "lastEmail"], ({ lastProfile, lastEmail }) => {
  if (lastProfile) profileSelect.value = lastProfile;
  if (lastEmail) emailInput.value = lastEmail;
  updateUI();
});

profileSelect.addEventListener("change", updateUI);

function updateUI() {
  const key = profileSelect.value;
  const hasCoApplicant = CO_APPLICANT_PROFILES.has(key);

  fillBtn.disabled = !key;
  coApplicantRow.classList.toggle("hidden", !hasCoApplicant);
}

function getSection() {
  const checked = document.querySelector('input[name="section"]:checked');
  return checked?.value ?? "primary";
}

function showStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove("hidden");
}

fillBtn.addEventListener("click", async () => {
  const profileKey = profileSelect.value;
  const emailOverride = emailInput.value.trim();
  const section = getSection();

  if (!profileKey) return;

  // Save preferences
  chrome.storage.local.set({ lastProfile: profileKey, lastEmail: emailOverride });

  fillBtn.classList.add("loading");
  fillBtn.disabled = true;
  showStatus("Filling fields…", "info");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "FILL_FORM",
      profileKey,
      emailOverride: emailOverride || null,
      section,
    });

    if (response?.error) {
      showStatus(`Error: ${response.error}`, "error");
    } else if (response?.results) {
      const { filled, skipped, failed } = response.results;
      const parts = [`✓ ${filled.length} filled`];
      if (skipped.length) parts.push(`${skipped.length} not on screen`);
      if (failed.length)  parts.push(`⚠ ${failed.length} failed`);
      showStatus(parts.join(" · "), failed.length ? "error" : "success");
    }
  } catch (err) {
    showStatus(`Could not reach page. Is this an Octane app tab?`, "error");
    console.error(err);
  } finally {
    fillBtn.classList.remove("loading");
    fillBtn.disabled = false;
  }
});
