/* ==========================================================================
   NEXUS VOICE DESKTOP — PRODUCTION APPLICATION LOGIC
   Fully connected UI with Real AudioEngine, STT, WakeWordEngine,
   CommandRouter, Storage persistence, Mini Mode & System Tray.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Quick Actions Mapping                                              */
  /* ------------------------------------------------------------------ */
  const QUICK_ACTIONS = [
    { label: "Open Browser", intent: "OPEN_CHROME", icon: iconBrowser() },
    { label: "Open ShieldPort", intent: "OPEN_SHIELDPORT", icon: iconShield() },
    { label: "Files", intent: "OPEN_EXPLORER", icon: iconFolder() },
    { label: "Volume", intent: "SET_VOLUME", params: { level: 40 }, icon: iconVolume() },
    { label: "Notes", intent: "CREATE_NOTE", params: { content: "Quick note from NEXUS" }, icon: iconNote() },
    { label: "USB Devices", intent: "LIST_USB_DRIVES", icon: iconUsb() },
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
  /* Icons (SVG strings)                                                */
  /* ------------------------------------------------------------------ */
  function iconBrowser() { return `<svg viewBox="0 0 20 20" width="18" height="18"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M2.5 10h15M10 2.5c2.2 2.1 3.3 4.9 3.3 7.5s-1.1 5.4-3.3 7.5c-2.2-2.1-3.3-4.9-3.3-7.5S7.8 4.6 10 2.5z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>`; }
  function iconShield() { return `<svg viewBox="0 0 20 20" width="18" height="18"><path d="M10 2.5 16.5 5v5c0 4-2.8 6.7-6.5 7.8C6.3 16.7 3.5 14 3.5 10V5z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/><path d="M7.2 10 9 11.8l3.6-3.9" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
  function iconFolder() { return `<svg viewBox="0 0 20 20" width="18" height="18"><path d="M2.5 5.5a1 1 0 0 1 1-1H8l1.6 2H16.5a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linejoin="round"/></svg>`; }
  function iconVolume() { return `<svg viewBox="0 0 20 20" width="18" height="18"><path d="M3 8v4h3l4 3.4V4.6L6 8z" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linejoin="round"/><path d="M13.2 7a4.2 4.2 0 0 1 0 6M15.4 4.8a7.6 7.6 0 0 1 0 10.4" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>`; }
  function iconNote() { return `<svg viewBox="0 0 20 20" width="18" height="18"><rect x="4" y="2.5" width="12" height="15" rx="1.4" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`; }
  function iconUsb() { return `<svg viewBox="0 0 20 20" width="18" height="18"><path d="M10 2.5v6M7.5 5 10 2.5 12.5 5" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="13.5" r="3.2" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M10 8.5v2" stroke="currentColor" stroke-width="1.3"/></svg>`; }

  /* ------------------------------------------------------------------ */
  /* DOM elements                                                       */
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

  const micStatusValue = document.getElementById("micStatusValue");
  const deviceSelect = document.getElementById("deviceSelect");
  const vuMeter = document.getElementById("vuMeter");
  const muteBtn = document.getElementById("muteBtn");
  const testMicBtn = document.getElementById("testMicBtn");
  const audioPanel = document.querySelector(".audio-panel");

  const recentList = document.getElementById("recentList");
  const commandTable = document.getElementById("commandTable");
  const filterTabs = document.getElementById("filterTabs");
  const commandSearchInput = document.getElementById("commandSearchInput");

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
  /* Real Instances                                                      */
  /* ------------------------------------------------------------------ */
  const audioEngine = new AudioEngine();
  const sttEngine = typeof WebSpeechEngine !== 'undefined' ? new WebSpeechEngine() : new LocalSpeechEngine();
  const wakeWordEngine = new WakeWordEngine("Nexus", true);

  let currentState = "idle";
  let currentRmsLevel = 0;
  let activePendingActionId = null;

  /* ------------------------------------------------------------------ */
  /* Sidebar Navigation                                                 */
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
  /* Real Visualizer & Orb Setup                                         */
  /* ------------------------------------------------------------------ */
  const BAR_COUNT = 40;
  const barEls = [];

  function buildOrbBars() {
    orbBarsEl.innerHTML = "";
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

  const VU_BARS = 28;
  vuMeter.innerHTML = "";
  for (let i = 0; i < VU_BARS; i++) {
    const b = document.createElement("div");
    b.className = "vu-bar";
    b.style.height = "4px";
    vuMeter.appendChild(b);
  }
  const vuBarEls = vuMeter.querySelectorAll(".vu-bar");

  const MINI_BAR_COUNT = 22;
  miniBarsEl.innerHTML = "";
  for (let i = 0; i < MINI_BAR_COUNT; i++) {
    const b = document.createElement("div");
    b.className = "mini-bar";
    b.style.height = "4px";
    miniBarsEl.appendChild(b);
  }
  const miniBarEls = miniBarsEl.querySelectorAll(".mini-bar");

  function setOrbState(state) {
    currentState = state;
    orbWrap.dataset.state = state;
    orbStateLabel.textContent = STATE_LABELS[state] || state.toUpperCase();
    orbStateLabel.style.color = `var(${STATE_COLOR_VAR[state] || "--c-idle"})`;

    miniStateLabel.textContent = STATE_LABELS[state] || state.toUpperCase();
    miniOrbDot.style.background = `var(${STATE_COLOR_VAR[state] || "--c-idle"})`;
    miniOrbDot.style.boxShadow = `0 0 0 4px color-mix(in srgb, var(${STATE_COLOR_VAR[state] || "--c-idle"}) 25%, transparent)`;
  }

  // Update visualizers based on REAL RMS audio level
  audioEngine.onAudioLevel((levelPercent, rms) => {
    currentRmsLevel = levelPercent;

    // Update VU meter bars
    const activeCount = Math.round((levelPercent / 100) * VU_BARS);
    vuBarEls.forEach((bar, idx) => {
      bar.style.height = idx < activeCount ? `${Math.max(4, (idx + 1) * 1.5)}px` : "4px";
      bar.style.opacity = idx < activeCount ? "1" : "0.3";
    });

    // Update Orb bars
    barEls.forEach((bar, idx) => {
      let h = 6;
      if (currentState === "listening" || currentState === "understanding") {
        h = 6 + (levelPercent * 0.4) * (0.8 + Math.sin(idx + Date.now() / 100) * 0.2);
      } else {
        h = 6 + (levelPercent * 0.15);
      }
      bar.style.height = `${Math.min(40, Math.max(6, h)).toFixed(1)}px`;
    });

    // Update Mini bars
    miniBarEls.forEach((bar, idx) => {
      const h = 4 + (levelPercent * 0.2);
      bar.style.height = `${Math.min(24, Math.max(4, h)).toFixed(1)}px`;
      bar.style.background = `var(${STATE_COLOR_VAR[currentState] || "--c-idle"})`;
    });
  });

  // Manual state dots (for quick state inspection)
  stateDotBtns.forEach((btn) => {
    btn.addEventListener("click", () => setOrbState(btn.dataset.state));
  });

  /* ------------------------------------------------------------------ */
  /* Real Audio Device Setup                                             */
  /* ------------------------------------------------------------------ */
  async function initAudioDevices() {
    const devices = await audioEngine.getAudioDevices();
    deviceSelect.innerHTML = "";

    if (devices.length === 0) {
      deviceSelect.innerHTML = `<option value="">No microphones found</option>`;
      updateMicStatus(false, "DISCONNECTED");
      return;
    }

    devices.forEach((dev) => {
      const opt = document.createElement("option");
      opt.value = dev.deviceId;
      opt.textContent = dev.label + (dev.isDJI ? " (DJI Mic Mini)" : "");
      deviceSelect.appendChild(opt);
    });

    // Auto-select DJI Mic Mini if present
    const selectedId = audioEngine.autoSelectDJIMic(devices);
    if (selectedId) {
      deviceSelect.value = selectedId;
      const res = await audioEngine.selectDevice(selectedId);
      if (res.success) {
        document.querySelector(".device-name").textContent = res.label;
        updateMicStatus(true, "CONNECTED");
      } else {
        updateMicStatus(false, res.error === "NotAllowedError" ? "PERMISSION DENIED" : "DISCONNECTED");
      }
    }
  }

  deviceSelect.addEventListener("change", async () => {
    const devId = deviceSelect.value;
    if (!devId) return;
    const res = await audioEngine.selectDevice(devId);
    if (res.success) {
      document.querySelector(".device-name").textContent = res.label;
      updateMicStatus(true, "CONNECTED");
    } else {
      updateMicStatus(false, "DISCONNECTED");
    }
  });

  audioEngine.onDeviceChange(async () => {
    await initAudioDevices();
  });

  audioEngine.onStatusChange((isConnected, labelText) => {
    updateMicStatus(isConnected, labelText);
  });

  function updateMicStatus(isConnected, labelText) {
    micStatusValue.textContent = labelText || (isConnected ? "CONNECTED" : "DISCONNECTED");
    micStatusValue.previousElementSibling.className = "status-chip-label";
    
    const pill = audioPanel.querySelector(".pill");
    if (pill) {
      pill.textContent = isConnected ? "CONNECTED" : "DISCONNECTED";
      pill.className = isConnected ? "pill pill-success" : "pill pill-neutral";
    }
  }

  muteBtn.addEventListener("click", () => {
    const muted = audioEngine.toggleMute();
    audioPanel.classList.toggle("is-muted", muted);
    muteBtn.classList.toggle("btn-danger-ghost", muted);
    muteBtn.lastChild.textContent = muted ? " Unmute" : " Mute";
  });

  testMicBtn.addEventListener("click", async () => {
    if (testMicBtn.dataset.busy) return;
    testMicBtn.dataset.busy = "1";
    const original = testMicBtn.innerHTML;
    testMicBtn.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4" fill="none"/></svg> Testing (3s)…`;
    
    const res = await audioEngine.testMicrophone(3, (progress, level) => {
      transcriptResponseText.textContent = `Testing microphone... ${Math.round(progress * 100)}%`;
    });

    testMicBtn.innerHTML = original;
    delete testMicBtn.dataset.busy;

    if (res.passed) {
      transcriptResponseText.textContent = `Microphone test PASSED (Max level: ${Math.round(res.maxRms * 100)}%)`;
      transcriptBadge.textContent = "✓";
    } else {
      transcriptResponseText.textContent = `Microphone test LOW SIGNAL or SILENT`;
      transcriptBadge.textContent = "⚠";
    }
  });

  /* ------------------------------------------------------------------ */
  /* Real STT & Pipeline Integration                                    */
  /* ------------------------------------------------------------------ */
  async function initSpeechEngine() {
    if (!sttEngine.isAvailable()) {
      transcriptResponseText.textContent = "SPEECH RECOGNITION UNAVAILABLE (Chromium WebSpeech disabled)";
      return;
    }

    const ok = await sttEngine.init();
    if (!ok) {
      transcriptResponseText.textContent = "SPEECH RECOGNITION UNAVAILABLE";
      return;
    }

    sttEngine.onResult((transcript, isFinal) => {
      transcriptYouText.textContent = `"${transcript}"`;

      if (currentState === "idle" || currentState === "listening") {
        const wakeRes = wakeWordEngine.processTranscript(transcript);
        if (wakeRes.detected) {
          setOrbState("understanding");
          transcriptResponseText.textContent = "Wake word detected! Interpreting command…";
          
          if (wakeRes.payloadText && isFinal) {
            executeRecognizedCommand(wakeRes.payloadText);
          }
        }
      } else if (isFinal && currentState === "understanding") {
        executeRecognizedCommand(transcript);
      }
    });

    sttEngine.onError((err) => {
      console.warn("[STT UI Error]", err);
      // 'network' and 'service-not-allowed' are expected in Electron (no embedded Google API key).
      // The recognition engine will auto-restart via onend. Show nothing to the user.
      if (err.code === "network" || err.code === "service-not-allowed") {
        return; // Silently restart — onend handler handles it
      }
      if (err.code === "STT_UNAVAILABLE") {
        transcriptResponseText.textContent = "SPEECH RECOGNITION UNAVAILABLE (Chromium WebSpeech disabled)";
      } else if (err.code === "not-allowed") {
        transcriptResponseText.textContent = "STT Error: Permiso de micrófono denegado";
      } else if (err.code === "audio-capture") {
        transcriptResponseText.textContent = "STT Error: No se puede acceder al micrófono";
      } else {
        console.warn("[STT] Unhandled error:", err.code);
      }
    });

    sttEngine.start();
  }

  async function executeRecognizedCommand(commandText) {
    setOrbState("executing");
    transcriptResponseText.textContent = `Executing: "${commandText}"...`;

    try {
      // Wrap the text transcript into an object payload so preload validation passes.
      // main.js detects { transcript } and routes it through IntentParser automatically.
      const response = await window.nexusAPI.executeVoiceIntent({ transcript: commandText });
      const { result } = response;

      if (result.status === "CONFIRMATION_REQUIRED") {
        setOrbState("understanding");
        openConfirmModal(response);
        return;
      }

      if (result.success) {
        setOrbState("success");
        transcriptResponseText.textContent = result.message || "Command executed successfully";
        transcriptBadge.textContent = "✓";
      } else {
        setOrbState("error");
        transcriptResponseText.textContent = `Error: ${result.message || result.error || "Command failed"}`;
        transcriptBadge.textContent = "✕";
      }
    } catch (err) {
      setOrbState("error");
      transcriptResponseText.textContent = `IPC Error: ${err.message}`;
      transcriptBadge.textContent = "✕";
    }

    await refreshHistory();

    setTimeout(() => {
      setOrbState("idle");
      transcriptResponseText.textContent = "Waiting for wake word…";
      transcriptBadge.textContent = "";
    }, 4000);
  }

  // Simulation button triggers real pipeline execution
  simulateBtn.addEventListener("click", () => {
    executeRecognizedCommand("Nexus, abre ShieldPort");
  });

  /* ------------------------------------------------------------------ */
  /* Real Command History & Command Center                              */
  /* ------------------------------------------------------------------ */
  function badgeHtml(status) {
    const s = STATUS_BADGE[status] || STATUS_BADGE.failed;
    return `<span class="cmd-status-badge ${s.cls}">${s.icon} ${s.label}</span>`;
  }

  async function refreshHistory() {
    if (!window.nexusAPI || !window.nexusAPI.getHistory) return;
    
    const filter = getActiveFilter();
    const historyList = await window.nexusAPI.getHistory(filter);
    
    renderRecentList(historyList);
    renderCommandTable(historyList);

    // Update dashboard counters
    const today = new Date().toISOString().split("T")[0];
    const todayCount = historyList.filter((item) => item.timestamp && item.timestamp.startsWith(today)).length;
    commandsTodayValue.textContent = String(todayCount);

    if (historyList.length > 0) {
      lastCommandValue.textContent = historyList[historyList.length - 1].time || "just now";
    }
  }

  function renderRecentList(list) {
    recentList.innerHTML = "";
    const recent = list.slice(-3).reverse();
    if (recent.length === 0) {
      recentList.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-tertiary);font-size:13px;">No commands recorded yet.</div>`;
      return;
    }

    recent.forEach((c) => {
      const row = document.createElement("div");
      row.className = "recent-item";
      row.innerHTML = `
        <span class="recent-time mono">${c.time || ""}</span>
        <span class="recent-cmd">${c.transcript || c.text || ""}</span>
        <span class="recent-status">${(STATUS_BADGE[c.status] || STATUS_BADGE.failed).icon}</span>
      `;
      recentList.appendChild(row);
    });
  }

  function renderCommandTable(list) {
    commandTable.innerHTML = "";
    const searchTerm = (commandSearchInput.value || "").toLowerCase().trim();

    const filtered = list.filter((c) => {
      if (!searchTerm) return true;
      const text = (c.transcript || c.text || "").toLowerCase();
      const intent = (c.intent || "").toLowerCase();
      const sub = (c.subText || "").toLowerCase();
      return text.includes(searchTerm) || intent.includes(searchTerm) || sub.includes(searchTerm);
    });

    if (filtered.length === 0) {
      commandTable.innerHTML = `<div style="padding:32px 8px;text-align:center;color:var(--text-tertiary);font-size:13px;">No commands match this filter/search.</div>`;
      return;
    }

    filtered.slice().reverse().forEach((c) => {
      const row = document.createElement("div");
      row.className = "command-row" + (c.status === "confirm" ? " is-clickable" : "");
      row.innerHTML = `
        <span class="cmd-time mono">${c.time || ""}</span>
        <div>
          <div class="cmd-text">"${c.transcript || c.text || ""}"</div>
          ${c.subText ? `<div class="cmd-text-sub mono">${c.subText}</div>` : ""}
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

  function getActiveFilter() {
    const active = filterTabs.querySelector(".filter-tab.is-active");
    return active ? active.dataset.filter : "all";
  }

  filterTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-tab");
    if (!btn) return;
    filterTabs.querySelectorAll(".filter-tab").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    refreshHistory();
  });

  commandSearchInput.addEventListener("input", () => {
    refreshHistory();
  });

  /* ------------------------------------------------------------------ */
  /* Real Quick Actions Grid                                             */
  /* ------------------------------------------------------------------ */
  function renderQuickGrid(container) {
    container.innerHTML = "";
    QUICK_ACTIONS.forEach((a) => {
      const tile = document.createElement("button");
      tile.className = "quick-tile";
      tile.innerHTML = `<span class="quick-tile-icon">${a.icon}</span><span class="quick-tile-label">${a.label}</span>`;
      tile.addEventListener("click", async () => {
        flashTileFeedback(tile);
        if (!a.intent) return;

        // Dispatch directly by intent — bypasses the Spanish-only text parser.
        setOrbState("executing");
        transcriptYouText.textContent = `"${a.label}"`;
        transcriptResponseText.textContent = `Executing: ${a.label}\u2026`;
        transcriptBadge.textContent = "";

        try {
          const intentPayload = { intent: a.intent, parameters: a.params || {} };
          const response = await window.nexusAPI.executeVoiceIntent(intentPayload);
          const { result } = response;

          if (result.success) {
            setOrbState("success");
            transcriptResponseText.textContent = result.message || "Done";
            transcriptBadge.textContent = "\u2713";
          } else {
            setOrbState("error");
            transcriptResponseText.textContent = result.message || result.error || "Command failed";
            transcriptBadge.textContent = "\u2715";
          }
          await refreshHistory();
          setTimeout(() => {
            setOrbState("idle");
            transcriptResponseText.textContent = "Waiting for wake word\u2026";
            transcriptBadge.textContent = "";
          }, 3000);
        } catch (err) {
          setOrbState("error");
          transcriptResponseText.textContent = `Error: ${err.message}`;
        }
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
  /* Real Settings Integration                                          */
  /* ------------------------------------------------------------------ */
  settingsTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".settings-tab");
    if (!btn) return;
    settingsTabs.querySelectorAll(".settings-tab").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.querySelectorAll(".settings-pane").forEach((p) => p.classList.remove("is-active"));
    document.getElementById("pane-" + btn.dataset.stab).classList.add("is-active");
  });

  async function loadSettingsUI() {
    if (!window.nexusAPI || !window.nexusAPI.getSettings) return;
    const settings = await window.nexusAPI.getSettings();

    // General pane
    const startWindowsCb = document.querySelector('#pane-general input[type="checkbox"]:nth-of-type(1)');
    const startMinCb = document.querySelectorAll('#pane-general input[type="checkbox"]')[1];
    const trayModeCb = document.querySelectorAll('#pane-general input[type="checkbox"]')[2];

    if (startWindowsCb) startWindowsCb.checked = Boolean(settings.startWithWindows);
    if (startMinCb) startMinCb.checked = Boolean(settings.startMinimized);
    if (trayModeCb) trayModeCb.checked = Boolean(settings.systemTrayMode);

    // Voice pane
    const wakeWordInput = document.querySelector('#pane-voice input[type="text"]');
    const wakeWordCb = document.querySelector('#pane-voice input[type="checkbox"]');
    const langSelect = document.querySelector('#pane-voice select');

    if (wakeWordInput) {
      wakeWordInput.value = settings.wakeWord || "Nexus";
      wakeWordEngine.setWakeWord(settings.wakeWord || "Nexus");
    }
    if (wakeWordCb) {
      wakeWordCb.checked = Boolean(settings.wakeWordEnabled);
      wakeWordEngine.setEnabled(Boolean(settings.wakeWordEnabled));
    }
    if (langSelect) {
      langSelect.value = settings.recognitionLanguage === "en-US" ? "English" : "Español";
    }

    // Attach real change listeners to save settings
    bindSettingChange(startWindowsCb, "startWithWindows");
    bindSettingChange(startMinCb, "startMinimized");
    bindSettingChange(trayModeCb, "systemTrayMode");

    if (wakeWordInput) {
      wakeWordInput.addEventListener("change", () => {
        const val = wakeWordInput.value.trim() || "Nexus";
        wakeWordEngine.setWakeWord(val);
        window.nexusAPI.updateSettings({ wakeWord: val });
      });
    }
    if (wakeWordCb) {
      wakeWordCb.addEventListener("change", () => {
        const enabled = wakeWordCb.checked;
        wakeWordEngine.setEnabled(enabled);
        window.nexusAPI.updateSettings({ wakeWordEnabled: enabled });
      });
    }
  }

  function bindSettingChange(element, key) {
    if (!element) return;
    element.addEventListener("change", () => {
      const val = element.type === "checkbox" ? element.checked : element.value;
      window.nexusAPI.updateSettings({ [key]: val });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Confirmation Modal                                                 */
  /* ------------------------------------------------------------------ */
  function openConfirmModal(intentResponse) {
    // Support both response shapes:
    // 1. IPC result: { intent, parameters, result: { status: 'CONFIRMATION_REQUIRED', actionId } }
    // 2. History entry: { actionId, intent, transcript, status: 'confirm', ... }
    const actionId = (intentResponse.result && intentResponse.result.actionId)
      || intentResponse.actionId
      || null;

    activePendingActionId = actionId;

    if (!activePendingActionId) {
      console.warn('[NEXUS Modal] No actionId available — confirm will be a no-op (historical entry or expired action)');
    }

    confirmTitle.textContent = intentResponse.intent
      || (intentResponse.result && intentResponse.result.intent)
      || "Sensitive Operation";
    confirmTarget.textContent = JSON.stringify(intentResponse.parameters || {});
    modalBackdrop.classList.add("is-open");
  }
  function closeConfirmModal() { modalBackdrop.classList.remove("is-open"); }

  confirmCancelBtn.addEventListener("click", () => {
    closeConfirmModal();
    if (activePendingActionId && window.nexusAPI.confirmSensitiveAction) {
      window.nexusAPI.confirmSensitiveAction(activePendingActionId, false);
    }
    setOrbState("idle");
  });
  modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeConfirmModal(); });
  confirmOkBtn.addEventListener("click", async () => {
    closeConfirmModal();
    setOrbState("executing");
    if (activePendingActionId && window.nexusAPI.confirmSensitiveAction) {
      await window.nexusAPI.confirmSensitiveAction(activePendingActionId, true);
    }
    setOrbState("success");
    setTimeout(() => setOrbState("idle"), 2000);
  });

  /* ------------------------------------------------------------------ */
  /* Real Mini Mode & System Tray                                       */
  /* ------------------------------------------------------------------ */
  miniModeBtn.addEventListener("click", async () => {
    miniMode.classList.add("is-visible");
    appShell.style.display = "none";
    document.querySelector(".demo-banner").style.display = "none";
    document.body.classList.add("mini-active");
    if (window.nexusAPI && window.nexusAPI.toggleMiniMode) {
      await window.nexusAPI.toggleMiniMode(true);
    }
  });

  miniExpandBtn.addEventListener("click", async () => {
    miniMode.classList.remove("is-visible");
    appShell.style.display = "";
    document.querySelector(".demo-banner").style.display = "";
    document.body.classList.remove("mini-active");
    if (window.nexusAPI && window.nexusAPI.toggleMiniMode) {
      await window.nexusAPI.toggleMiniMode(false);
    }
  });

  if (window.nexusAPI && window.nexusAPI.onSystemTrayAction) {
    window.nexusAPI.onSystemTrayAction((action) => {
      if (action === "toggle-mini-mode") {
        miniModeBtn.click();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Init Application                                                  */
  /* ------------------------------------------------------------------ */
  async function init() {
    setOrbState("idle");
    await initAudioDevices();
    await initSpeechEngine();
    await refreshHistory();
    await loadSettingsUI();
  }

  init();
})();
