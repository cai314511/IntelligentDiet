import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../shared/school-skin.js", import.meta.url), "utf8");
function skinPage(pathname, session) {
  const dataset = {}, events = {}, storage = { zx_session: JSON.stringify(session) };
  const document = {
    documentElement: { dataset }, body: null, readyState: "loading",
    getElementById: () => null, addEventListener: () => {},
  };
  const window = { addEventListener: (name, handler) => { events[name] = handler; } };
  vm.runInNewContext(source, {
    document, window, location: { pathname },
    localStorage: { getItem: (key) => storage[key] ?? null },
  });
  return { skin: window.ZX_SCHOOL_SKIN, dataset, storage, events, document };
}
const account = (school, cached = school) => ({
  token: "test-session", user: { school_id: school }, school: { id: cached },
});

test("CUFE skin follows authenticated school on both systems, ignoring cached school metadata", () => {
  for (const page of ["/canteen/", "/management/"]) {
    assert.equal(skinPage(page, account("cufe", "bjfu")).dataset.campusSkin, "cufe");
    for (const school of ["tju"]) {
      const state = skinPage(page, account(school, "cufe"));
      state.skin.apply("cufe");
      assert.equal(state.dataset.campusSkin, undefined);
    }
  }
});
test("a school choice without a signed-in account cannot apply CUFE skin to protected pages", () => {
  for (const saved of [null, { user: { school_id: "cufe" } }, { token: "token" }]) {
    const state = skinPage("/canteen/", saved);
    state.skin.apply("cufe");
    assert.equal(state.dataset.campusSkin, undefined);
  }
});
test("portal preview switches with the selected school and keeps restored dropdown choice", () => {
  const state = skinPage("/", account("cufe"));
  state.skin.apply("bjfu");
  assert.equal(state.dataset.campusSkin, "bjfu");
  state.skin.apply("cufe");
  assert.equal(state.dataset.campusSkin, "cufe");
  state.document.getElementById = () => ({ value: "tju" });
  state.events.pageshow();
  assert.equal(state.dataset.campusSkin, undefined);
});
test("history restoration and cross-tab account changes clear the former account's skin", () => {
  const state = skinPage("/canteen/", account("cufe"));
  state.storage.zx_session = JSON.stringify(account("tju"));
  state.events.pageshow();
  assert.equal(state.dataset.campusSkin, undefined);
  state.storage.zx_session = JSON.stringify(account("cufe"));
  state.events.storage({ key: "zx_session" });
  assert.equal(state.dataset.campusSkin, "cufe");
  state.storage.zx_session = "bad json";
  state.events.storage({ key: "zx_session" });
  assert.equal(state.dataset.campusSkin, undefined);
});

 test("BJFU theme follows only authenticated BJFU accounts in either app", () => {
  for (const page of ["/canteen/", "/management/"]) {
    const state = skinPage(page, account("bjfu", "cufe"));
    assert.equal(state.dataset.campusSkin, "bjfu");
    state.skin.apply("cufe");
    assert.equal(state.dataset.campusSkin, "bjfu");
    state.storage.zx_session = JSON.stringify(account("cufe", "bjfu"));
    state.events.storage({key:"zx_session"});
    assert.equal(state.dataset.campusSkin, "cufe");
  }
});
