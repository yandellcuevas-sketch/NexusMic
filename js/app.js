/* ==========================================================================
   NEXUS VOICE DESKTOP — UI PROTOTYPE LOGIC
   All data below is DEMO / MOCK. No real voice recognition, OS control,
   or backend logic is implemented. This file only drives the interface
   states, navigation and simulated interactions for design review.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Mock data                                                          */
  /* ------------------------------------------------------------------ */
  const QUICK_ACTIONS = [
    { label: "Open Browser", icon: iconBrowser() },
    { label: "Open ShieldPort", icon: iconShield() },
    { label: "Files", icon: iconFolder() },
    { label: "Volume", icon: iconVolume() },
    { label: "Notes", icon: iconNote() },
    { label: "USB Devices", icon: iconUsb() },
  ];

  const COMMAND_HISTORY = [
    { time: "21:42:03", text: "Open Chrome", sub: null, status: "success" },
    { time: "21:43:17", text: "Set volume to 40%", sub: null, status: "success" },
    { time: "21:44:02", text: "Search invoice August", sub: "3 results found in Documents", status: "success" },
    { time: "21:45:22", text: "Delete Backup folder", sub: "D:\\Backup", status: "confirm" },
    { time: "21:46:40", text: "Open project folder", sub: null, status: "success" },
    { time: "21:48:12", text: "Tell me disk space left", sub: "C: 214GB free of 512GB", status: "success" },
    { time: "21:51:05", text: "Open Spotify", sub: "App not recognized", status: "failed" },
    { time: "21:53:44", text: "Create a note", sub: null, status: "success" },
    { time: "21:55:10", text: "Shut down PC", sub: "Cancelled by user", status: "cancelled" },
    { time: "21:58:33", text: "List connected USB drives", sub: "2 devices found", status: "success" },
  ];

  const STATUS_BADGE = {
    success: { cls: "badge-success", label: "Completed", icon: "✓" },
    failed: { cls: "badge-failed", label: "Failed", icon: "✕" },
    cancelled: { cls: "badge-cancelled", label: "Cancelled", icon: "–" },
    confirm: { cls: "badge-confirm", label: "Confirmation required", icon: "⚠" },
  };

  const STATE_LABELS = {
    idle: "IDLE",
    listening: "LISTENING",
    understanding: "UNDERSTANDING",
    executing: "EXECUTING",
    success: "SUCCESS",
    error: "ERROR",
  };

  const STATE_COLOR_VAR = {
    idle: "--c-idle",
    listening: "--c-listening",
    understanding: "--c-understanding",
    executing: "--c-executing",
    success: "--c-success",
    error: "--c-error",
  };

  /* ------------------------------------------------------------------ */
  /* Icons (inline SVG strings, kept tiny & currentColor-based)          */
  /* ------------------------------------------------------------------ */
  function iconBrowser() { return `<svg viewBox="0 0 20 20" width="18" height="18"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M2.5 10h15M10 2.5c2.2 2.1 3.3 4.9 3.3 7.5s-1.1 5.4-3.3 7.5c-2.2-2.1-3.3-4.9-3.3-7.5S7.8 4.6 10 2.5z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>`; }
  function iconShield() { return `<svg viewBox="0 0 20 20" width="18" height="18"><path d="M10 2.5 16.5 5v5c0 4-2.8 6.7-6.5 7.8C6.3 16.7 3.5 14 3.5 10V5z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/><path d="M7.2 10 9 11.8l3.6-3.9" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
  function iconFolder() { return `<svg viewBox="0 0 20 20" width="18" height="18"><path d="M2.5 5.5a1 1 0 0 1 1-1H8l1.6 2H16.5a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linejoin="round"/></svg>`; }
  function iconVolume() { return `<svg viewBox="0 0 20 20" width="18" height="18"><path d="M3 8v4h3l4 3.4V4.6L6 8z" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linejoin="round"/><path d="M13.2 7a4.2 4.2 0 0 1 0 6M15.4 4.8a7.6 7.6 0 0 1 0 10.4" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>`; }
  function iconNote() { return `<svg viewBox="0 0 20 20" width="18" height="18"><rect x="4" y="2.5" width="12" height="15" rx="1.4" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`; }
  function iconUsb() { return `<svg viewBox="0 0 20 20" width="18" height="18"><path d="M10 2.5v6M7.5 5 10 2.5 12.5 5" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="13.5" r="3.2" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M10 8.5v2" stroke="currentColor" stroke-width="1.3"/></svg>`; }

  /* ------------------------------------------------------------------ */
  /* DOM refs                                                            */
  /* ------------------------------------------------------------------ */
  const appShell = document.getElementById("appShell");
  const collapseBtn = document.getElementById("collapseBtn");
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view");

  const orbWrap = document.getElementById("orbWrap");
  const orbBarsEl = document.getElementById("orbBars");
  const orbStateLabel = document.getElementById("orbStateLabel");
  const transcriptYouText = document.getElementById("transcriptYouText");
  const transcriptResponseText = document.getElementById("transcriptResponseText");
  const transcriptBadge = document.getElementById("transcriptBadge");
  const simulateBtn = document.getElementById("simulateBtn");
  const stateDotBtns = document.querySelectorAll(".state-dot-btn");

  const vuMeter = document.getElementById("vuMeter");
  const muteBtn = document.getElementById("muteBtn");
  const testMicBtn = document.getElementById("testMicBtn");
  const audioPanel = document.querySelector(".audio-panel");

  const recentList = document.getElementById("recentList");
  const commandTable = document.getElementById("commandTable");
  const filterTabs = document.getElementById("filterTabs");

  const quickGridHome = document.getElementById("quickGridHome");
  const quickGridFull = document.getElementById("quickGridFull");

  const settingsTabs = document.getElementById("settingsTabs");

  const modalBackdrop = document.getElementById("modalBackdrop");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmTarget = document.getElementById("confirmTarget");
  const confirmCancelBtn = document.getElementById("confirmCancelBtn");
  const confirmOkBtn = document.getElementById("confirmOkBtn");

  const miniModeBtn = document.getElementById("miniModeBtn");
  const miniMode = document.getElementById("miniMode");
  const miniExpandBtn = document.getElementById("miniExpandBtn");
  const miniOrbDot = document.getElementById("miniOrbDot");
  const miniStateLabel = document.getElementById("miniStateLabel");
  const miniBarsEl = document.getElementById("miniBars");
  const miniTranscript = document.getElementById("miniTranscript");

  const commandsTodayValue = document.getElementById("commandsTodayValue");
  const lastCommandValue = document.getElementById("lastCommandValue");

  /* ------------------------------------------------------------------ */
  /* Sidebar: collapse + navigation                                     */
  /* ------------------------------------------------------------------ */
  collapseBtn.addEventListener("click", () => {
    appShell.classList.toggle("is-collapsed");
  });

  function switchView(viewName) {
    navItems.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.view === viewName));
    views.forEach((v) => v.classList.toggle("is-active", v.id === "view-" + viewName));
  }
  navItems.forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));
  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.goto));
  });

  /* ------------------------------------------------------------------ */
  /* Orb visualizer: circular bar equalizer                             */
  /* ------------------------------------------------------------------ */
  const BAR_COUNT = 40;
  const ORB_RADIUS = 105; // matches transform-origin in CSS
  const barEls = [];

  function buildOrbBars() {
    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (360 / BAR_COUNT) * i;
      const bar = document.createElement("div");
      bar.className = "orb-bar";
      bar.style.transform = `rotate(${angle}deg)`;
      bar.style.height = "6px";
      orbBarsEl.appendChild(bar);
      barEls.push(bar);
    }
  }
  buildOrbBars();

  let currentState = "idle";
  let orbAnimHandle = null;

  function setOrbState(state) {
    currentState = state;
    orbWrap.dataset.state = state;
    orbStateLabel.textContent = STATE_LABELS[state];
    orbStateLabel.style.color = `var(${STATE_COLOR_VAR[state]})`;

    // Sync mini mode
    miniStateLabel.textContent = STATE_LABELS[state];
    miniOrbDot.style.background = `var(${STATE_COLOR_VAR[state]})`;
    miniOrbDot.style.boxShadow = `0 0 0 4px color-mix(in srgb, var(${STATE_COLOR_VAR[state]}) 25%, transparent)`;
  }

  function animateOrbBars() {
    barEls.forEach((bar) => {
      let h = 6;
      if (currentState === "listening") h = 6 + Math.random() * 34;
      else if (currentState === "understanding") h = 6 + Math.random() * 16;
      else if (currentState === "executing") h = 6 + Math.random() * 24;
      else if (currentState === "success" || currentState === "error") h = 6;
      else h = 5 + Math.sin(Date.now() / 500) * 2;
      bar.style.height = h.toFixed(1) + "px";
    });
    orbAnimHandle = requestAnimationFrame(throttledAnimate);
  }
  let lastFrame = 0;
  function throttledAnimate(t) {
    if (t - lastFrame > 70) { lastFrame = t; animateOrbBars(); }
    else { orbAnimHandle = requestAnimationFrame(throttledAnimate); }
  }
  throttledAnimate(0);

  /* Manual state buttons */
  stateDotBtns.forEach((btn) => {
    btn.addEventListener("click", () => setOrbState(btn.dataset.state));
  });

  /* ------------------------------------------------------------------ */
  /* Simulated wake word -> command flow (scripted demo sequence)       */
  /* ------------------------------------------------------------------ */
  let demoRunning = false;
  function runSimulation() {
    if (demoRunning) return;
    demoRunning = true;
    simulateBtn.disabled = true;

    transcriptBadge.textContent = "";
    transcriptYouText.textContent = "—";
    transcriptResponseText.textContent = "Listening…";

    setOrbState("listening");

    setTimeout(() => {
      transcriptYouText.textContent = "Nexus, abre ShieldPort";
      setOrbState("understanding");
      transcriptResponseText.textContent = "Interpreting command…";
    }, 1400);

    setTimeout(() => {
      setOrbState("executing");
      transcriptResponseText.textContent = "Opening ShieldPort…";
    }, 2600);

    setTimeout(() => {
      setOrbState("success");
      transcriptResponseText.textContent = "Opened ShieldPort";
      transcriptBadge.textContent = "✓";
      addRecentCommand({ time: nowStamp(), text: "Nexus, abre ShieldPort", status: "success" });
    }, 3800);

    setTimeout(() => {
      setOrbState("idle");
      demoRunning = false;
      simulateBtn.disabled = false;
    }, 5600);
  }
  simulateBtn.addEventListener("click", runSimulation);

  function nowStamp() {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  }

  /* ------------------------------------------------------------------ */
  /* Audio panel: VU meter + mute + test mic                            */
  /* ------------------------------------------------------------------ */
  const VU_BARS = 28;
  for (let i = 0; i < VU_BARS; i++) {
    const b = document.createElement("div");
    b.className = "vu-bar";
    b.style.height = "4px";
    vuMeter.appendChild(b);
  }
  const vuBarEls = vuMeter.querySelectorAll(".vu-bar");
  let micMuted = false;

  function animateVU() {
    vuBarEls.forEach((b, i) => {
      let h = 4;
      if (!micMuted) {
        const wave = Math.sin(Date.now() / 220 + i) * 0.5 + 0.5;
        h = 4 + wave * 34 * (0.4 + Math.random() * 0.6);
      }
      b.style.height = h.toFixed(1) + "px";
    });
    requestAnimationFrame(animateVU);
  }
  animateVU();

  muteBtn.addEventListener("click", () => {
    micMuted = !micMuted;
    audioPanel.classList.toggle("is-muted", micMuted);
    muteBtn.classList.toggle("btn-danger-ghost", micMuted);
    muteBtn.querySelector("svg").style.opacity = micMuted ? 0.5 : 1;
    muteBtn.lastChild.textContent = micMuted ? " Unmute" : " Mute";
  });

  testMicBtn.addEventListener("click", () => {
    if (testMicBtn.dataset.busy) return;
    testMicBtn.dataset.busy = "1";
    const original = testMicBtn.innerHTML;
    testMicBtn.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4" fill="none"/></svg> Testing…`;
    setTimeout(() => {
      testMicBtn.innerHTML = original;
      delete testMicBtn.dataset.busy;
    }, 1800);
  });

  /* ------------------------------------------------------------------ */
  /* Recent commands (home) + full command table                        */
  /* ------------------------------------------------------------------ */
  function badgeHtml(status) {
    const s = STATUS_BADGE[status];
    return `<span class="cmd-status-badge ${s.cls}">${s.icon} ${s.label}</span>`;
  }

  function renderRecentList() {
    recentList.innerHTML = "";
    COMMAND_HISTORY.slice(-3).reverse().forEach((c) => {
      const row = document.createElement("div");
      row.className = "recent-item";
      row.innerHTML = `
        <span class="recent-time mono">${c.time}</span>
        <span class="recent-cmd">${c.text}</span>
        <span class="recent-status">${STATUS_BADGE[c.status].icon}</span>
      `;
      recentList.appendChild(row);
    });
  }

  function renderCommandTable(filter) {
    commandTable.innerHTML = "";
    const list = COMMAND_HISTORY.slice().reverse().filter((c) => {
      if (!filter || filter === "all") return true;
      return c.status === filter;
    });

    if (list.length === 0) {
      commandTable.innerHTML = `<div style="padding:32px 8px;text-align:center;color:var(--text-tertiary);font-size:13px;">No commands match this filter.</div>`;
      return;
    }

    list.forEach((c) => {
      const row = document.createElement("div");
      row.className = "command-row" + (c.status === "confirm" ? " is-clickable" : "");
      row.innerHTML = `
        <span class="cmd-time mono">${c.time}</span>
        <div>
          <div class="cmd-text">"${c.text}"</div>
          ${c.sub ? `<div class="cmd-text-sub mono">${c.sub}</div>` : ""}
        </div>
        ${badgeHtml(c.status)}
        <span class="cmd-chevron">${c.status === "confirm" ? "›" : ""}</span>
      `;
      if (c.status === "confirm") {
        row.addEventListener("click", () => openConfirmModal(c));
      }
      commandTable.appendChild(row);
    });
  }

  function addRecentCommand(entry) {
    COMMAND_HISTORY.push(entry);
    renderRecentList();
    renderCommandTable(getActiveFilter());
    lastCommandValue.textContent = "just now";
    commandsTodayValue.textContent = String(Number(commandsTodayValue.textContent) + 1);
  }

  function getActiveFilter() {
    const active = filterTabs.querySelector(".filter-tab.is-active");
    return active ? active.dataset.filter : "all";
  }

  filterTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-tab");
    if (!btn) return;
    filterTabs.querySelectorAll(".filter-tab").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    renderCommandTable(btn.dataset.filter);
  });

  renderRecentList();
  renderCommandTable("all");

  /* ------------------------------------------------------------------ */
  /* Quick actions grids                                                */
  /* ------------------------------------------------------------------ */
  function renderQuickGrid(container) {
    container.innerHTML = "";
    QUICK_ACTIONS.forEach((a) => {
      const tile = document.createElement("button");
      tile.className = "quick-tile";
      tile.innerHTML = `<span class="quick-tile-icon">${a.icon}</span><span class="quick-tile-label">${a.label}</span>`;
      tile.addEventListener("click", () => {
        if (a.label === "Delete Backup folder") return; // n/a, placeholder guard
        flashTileFeedback(tile);
      });
      container.appendChild(tile);
    });
  }
  function flashTileFeedback(tile) {
    tile.style.borderColor = "rgba(61,220,151,0.5)";
    tile.style.color = "var(--c-success)";
    setTimeout(() => { tile.style.borderColor = ""; tile.style.color = ""; }, 500);
  }
  renderQuickGrid(quickGridHome);
  renderQuickGrid(quickGridFull);

  /* ------------------------------------------------------------------ */
  /* Settings tabs                                                      */
  /* ------------------------------------------------------------------ */
  settingsTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".settings-tab");
    if (!btn) return;
    settingsTabs.querySelectorAll(".settings-tab").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.querySelectorAll(".settings-pane").forEach((p) => p.classList.remove("is-active"));
    document.getElementById("pane-" + btn.dataset.stab).classList.add("is-active");
  });

  /* ------------------------------------------------------------------ */
  /* Confirmation modal                                                 */
  /* ------------------------------------------------------------------ */
  function openConfirmModal(entry) {
    confirmTitle.textContent = entry.text.replace(/^Nexus,\s*/i, "").replace(/^delete\s*/i, "Delete: ");
    confirmTarget.textContent = entry.sub || "—";
    modalBackdrop.classList.add("is-open");
  }
  function closeConfirmModal() { modalBackdrop.classList.remove("is-open"); }

  confirmCancelBtn.addEventListener("click", closeConfirmModal);
  modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeConfirmModal(); });
  confirmOkBtn.addEventListener("click", () => {
    closeConfirmModal();
    setOrbState("executing");
    setTimeout(() => setOrbState("success"), 900);
    setTimeout(() => setOrbState("idle"), 2200);
  });

  /* ------------------------------------------------------------------ */
  /* Mini mode                                                          */
  /* ------------------------------------------------------------------ */
  const MINI_BAR_COUNT = 22;
  for (let i = 0; i < MINI_BAR_COUNT; i++) {
    const b = document.createElement("div");
    b.className = "mini-bar";
    b.style.height = "4px";
    miniBarsEl.appendChild(b);
  }
  const miniBarEls = miniBarsEl.querySelectorAll(".mini-bar");
  function animateMiniBars() {
    miniBarEls.forEach((b) => {
      let h = 4;
      if (currentState === "listening") h = 4 + Math.random() * 20;
      else if (currentState === "executing") h = 4 + Math.random() * 14;
      b.style.background = `var(${STATE_COLOR_VAR[currentState]})`;
      b.style.height = h.toFixed(1) + "px";
    });
    requestAnimationFrame(animateMiniBars);
  }
  animateMiniBars();

  miniModeBtn.addEventListener("click", () => {
    miniMode.classList.add("is-visible");
    appShell.style.display = "none";
    document.querySelector(".demo-banner").style.display = "none";
    document.body.classList.add("mini-active");
  });
  miniExpandBtn.addEventListener("click", () => {
    miniMode.classList.remove("is-visible");
    appShell.style.display = "";
    document.querySelector(".demo-banner").style.display = "";
    document.body.classList.remove("mini-active");
  });

  /* keep mini transcript loosely synced with main transcript on simulation */
  const observer = new MutationObserver(() => {
    miniTranscript.textContent = transcriptResponseText.textContent;
  });
  observer.observe(transcriptResponseText, { childList: true, characterData: true, subtree: true });

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */
  setOrbState("idle");
})();
