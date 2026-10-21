const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");

async function runPopup(frames, states, response = { results: { filled: ["firstName"], skipped: [], failed: [] } }) {
  const elements = new Map();
  const messages = [];
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: id === "profile-select" ? "test-profile" : "",
      classList: { add() {}, remove() {}, toggle() {} },
      appendChild() {},
      addEventListener(event, callback) { this[event] = callback; },
    });
    return elements.get(id);
  }
  const context = {
    document: {
      getElementById: element,
      createElement: () => ({}),
      querySelector: () => null,
    },
    console: { error() {} },
    chrome: {
      storage: { local: { get(keys, callback) { callback({}); }, set() {} } },
      webNavigation: { getAllFrames: async () => frames },
      tabs: {
        query: async () => [{ id: 42 }],
        async sendMessage(tabId, message, options) {
          messages.push({ tabId, message, options });
          if (message.type === "FILL_FORM") {
            if (response instanceof Error) throw response;
            return response;
          }
          const state = states[options.documentId];
          if (state instanceof Error) throw state;
          return state;
        },
      },
    },
  };
  vm.runInNewContext(source("popup/popup.js"), context);
  await element("fill-btn").click();
  return { messages, status: element("status"), button: element("fill-btn") };
}

test("injection includes matching child frames without broadening host access", () => {
  const manifest = JSON.parse(source("manifest.json"));
  assert.equal(manifest.content_scripts[0].all_frames, true);
  assert.equal(manifest.minimum_chrome_version, "106");
  assert.deepEqual(manifest.content_scripts[0].matches, [
    "http://localhost:*/*", "https://*.qa-eks.octane.co/*", "https://*.sandbox-eks.octane.co/*",
  ]);
  assert.ok(manifest.permissions.includes("webNavigation"));
  assert.equal(manifest.host_permissions, undefined);
});

for (const [name, frames, states, target] of [
  ["standalone form", [{ documentId: "top" }], { top: { hasForm: true } }, "top"],
  ["dynamically opened nested widget", [{ documentId: "dealer" }, { documentId: "wrapper" }, { documentId: "widget" }], {
    dealer: new Error("No receiver"), wrapper: { hasForm: false }, widget: { hasForm: true },
  }, "widget"],
]) {
  test(`routes only to the ${name} document`, async () => {
    const { messages, status, button } = await runPopup(frames, states);
    const fills = messages.filter(({ message }) => message.type === "FILL_FORM");
    assert.equal(fills.length, 1);
    assert.equal(fills[0].options.documentId, target);
    assert.ok(messages.filter(({ message }) => message.type === "GET_FORM_STATE")
      .every(({ message }) => !("profileKey" in message)));
    assert.match(status.textContent, /1 filled/);
    assert.equal(button.disabled, false);
  });
}

test("unopened, loading, unsupported, and navigated frames do not receive profile data", async () => {
  const { messages, status } = await runPopup([
    { documentId: "dealer" }, { documentId: "loading" }, { documentId: "navigated" },
  ], { dealer: new Error("No receiver"), loading: { hasForm: false }, navigated: new Error("Document removed") });
  assert.ok(messages.every(({ message }) => message.type !== "FILL_FORM"));
  assert.match(status.textContent, /No Octane form found/);
  assert.match(status.className, /error/);
});

test("multiple form documents are rejected before any fill", async () => {
  const { messages, status } = await runPopup([{ documentId: "one" }, { documentId: "two" }], {
    one: { hasForm: true }, two: { hasForm: true },
  });
  assert.ok(messages.every(({ message }) => message.type !== "FILL_FORM"));
  assert.match(status.textContent, /Multiple Octane forms/);
});

test("navigation after discovery fails without falling back to another document", async () => {
  const { messages, status, button } = await runPopup([{ documentId: "original-form" }], {
    "original-form": { hasForm: true },
  }, new Error("Document removed"));
  const fills = messages.filter(({ message }) => message.type === "FILL_FORM");
  assert.equal(fills.length, 1);
  assert.equal(fills[0].options.documentId, "original-form");
  assert.match(status.textContent, /Could not reach the form/);
  assert.equal(button.disabled, false);
});

for (const [name, response, expected] of [
  ["empty fill", { results: { filled: [], skipped: ["firstName"], failed: [] } }, /No matching fields/],
  ["missing response", undefined, /did not respond/],
  ["content error", { error: "Form changed" }, /Form changed/],
  ["field failure", { results: { filled: [], skipped: [], failed: ["firstName"] } }, /1 failed/],
]) {
  test(`${name} reports an error`, async () => {
    const { status } = await runPopup([{ documentId: "form" }], { form: { hasForm: true } }, response ?? null);
    assert.match(status.textContent, expected);
    assert.match(status.className, /error/);
  });
}

function contentContext(controls) {
  const listeners = [];
  function Input() {}
  Object.defineProperty(Input.prototype, "value", { set() {} });
  const context = vm.createContext({
    HTMLInputElement: Input,
    document: { querySelectorAll: () => controls },
    getComputedStyle: (el) => ({ visibility: el.visibility || "visible" }),
    chrome: { runtime: { onMessage: { addListener: (listener) => listeners.push(listener) } } },
  });
  vm.runInContext(source("src/content.js"), context);
  return { context, listener: listeners[0] };
}

test("form discovery excludes missing, unrelated, hidden, and invisible controls", () => {
  for (const controls of [[], [{ name: "dealerSearch", matches: () => false }], [
    { name: "firstName", getClientRects: () => [], matches: () => false },
  ], [{ name: "firstName", getClientRects: () => [{}], visibility: "hidden", matches: () => false }]]) {
    const { listener } = contentContext(controls);
    listener({ type: "GET_FORM_STATE" }, {}, (state) => assert.equal(state.hasForm, false));
  }
});

test("form discovery supports text inputs, selects, and tabs", () => {
  for (const control of [
    { name: "firstName", matches: () => false },
    { matches: () => true },
  ]) {
    const { listener } = contentContext([{ ...control, getClientRects: () => [{}] }]);
    listener({ type: "GET_FORM_STATE" }, {}, (state) => assert.equal(state.hasForm, true));
  }
});

test("fill rechecks form readiness after frame discovery", () => {
  const { listener } = contentContext([]);
  listener({ type: "FILL_FORM" }, {}, (state) => assert.match(state.error, /No supported fields/));
});
