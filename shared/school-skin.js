(() => {
  const landmarks = {
    cufe: [["library", "library.jpg"], ["longma", "longma.png"]],
    bjfu: [["grove", "bamboo-grove.jpg"], ["gate", "campus-gate.jpg"]],
  };
  const forestIcons = {
    order: '<path d="M9 29C3 12 20 5 31 5c0 16-5 27-22 24Z"/><path d="M6 34 25 13m-9 10-1-8m2 7 8 1"/>',
    nutrition: '<path d="m18 4-11 15h7L5 28h10v8h6v-8h10l-9-9h7L18 4Z"/>',
    social: '<path d="M18 35V20m0 5L8 15m10 10 10-10"/><path d="M18 20C5 21 3 9 5 5c11 0 16 6 13 15Zm0 0c13 1 15-11 13-15-11 0-16 6-13 15Z"/>',
    culture: '<path d="M18 9C13 4 5 5 4 6v25c6-2 10-1 14 3 4-4 8-5 14-3V6c-6-2-10-1-14 3Zm0 0v25M8 13l6 2m-6 5 6 2m8-7 6-2m-6 9 6-2"/>',
    orders: '<path d="M4 33h29M6 31V14h25v17M3 14l15-9 16 9M10 19h3m6 0h3m5 0h1M10 25h3m6 0h3m5 0h1M16 31v-5"/>',
  };
  const portal = location.pathname === "/" || location.pathname === "/index.html";
  function savedSession() {
    try { return JSON.parse(localStorage.getItem("zx_session")); }
    catch { return null; }
  }
  function resolveSkin(selectedSchoolId) {
    const saved = savedSession();
    // Authenticated pages use the account's school, never a cached visual preference.
    const schoolId = portal
      ? selectedSchoolId || document.getElementById("school")?.value || saved?.user?.school_id
      : saved?.token && saved?.user?.school_id;
    return schoolId === "cufe" || schoolId === "bjfu" ? schoolId : "";
  }
  function decorateNavigation(skin) {
    const pictures = { order: 0, nutrition: 1, social: 2, culture: 3 };
    document.querySelectorAll(".nav-link[data-target]").forEach((link) => {
      if (link.querySelector(".campus-nav-art")) return;
      const art = document.createElement("span");
      art.className = "campus-nav-art " + skin + "-nav-art";
      art.setAttribute("aria-hidden", "true");
      if (skin === "bjfu") {
        art.innerHTML = '<svg viewBox="0 0 36 40" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (forestIcons[link.dataset.target] || forestIcons.orders) + '</svg>';
        art.dataset.motif = link.dataset.target;
        art.title = "";
        link.prepend(art);
        return;
      }
      const index = pictures[link.dataset.target];
      if (index !== undefined) {
        art.classList.add("cufe-caibao");
        art.style.setProperty("--caibao-position", `${index * 100 / 3}%`);
      } else {
        art.classList.add("cufe-library");
      }
      link.prepend(art);
    });
  }
  function apply(selectedSchoolId) {
    const skin = resolveSkin(selectedSchoolId);
    if (skin) document.documentElement.dataset.campusSkin = skin;
    else delete document.documentElement.dataset.campusSkin;
    if (!document.body) return;
    const previousBackdrop = document.getElementById("campus-background");
    if (previousBackdrop && previousBackdrop.dataset.school !== skin) {
      previousBackdrop.remove();
      document.querySelectorAll(".campus-nav-art, .cufe-nav-art").forEach((art) => art.remove());
    }
    if (!skin) {
      document.getElementById("campus-background")?.remove();
      document.querySelectorAll(".campus-nav-art, .cufe-nav-art").forEach((art) => art.remove());
      return;
    }
    if (!document.getElementById("campus-background")) {
      const backdrop = document.createElement("div");
      backdrop.id = "campus-background";
      backdrop.dataset.school = skin;
      backdrop.setAttribute("aria-hidden", "true");
      for (const [name, file] of landmarks[skin]) {
        const img = document.createElement("img");
        img.src = "/assets/schools/" + skin + "/" + file;
        img.alt = "";
        img.className = skin + "-landmark " + skin + "-" + name;
        img.decoding = "async";
        backdrop.append(img);
      }
      document.body.prepend(backdrop);
    }
    decorateNavigation(skin);
  }
  window.ZX_SCHOOL_SKIN = { apply, resolveSkin };
  apply();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => apply());
  // Browser history restoration can reuse a document after an account switch.
  window.addEventListener("pageshow", () => apply());
  window.addEventListener("storage", (event) => {
    if (event.key === "zx_session") apply();
  });
})();
