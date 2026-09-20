// ============================================================
// EASY EDITS — change the name, date, wording, or colours here
// ============================================================
const CONFIG = {
  honoree: "Choco", // used for the monogram if you change it in HTML
  eventTitle: "Choco's Baby Shower",
  dateShort: "3rd October",
  dateFull: "Saturday, 3rd October",
  storageKey: "choco-baby-shower-guests",
  lastRevealKey: "choco-baby-shower-last-reveal", // remembers the last person on this phone
  // Shared list so friends in different places see the same teams.
  github: {
    owner: "rufoabrahamguyo",
    repo: "choco-babyshower",
    path: "data/guests.json",
  },
  revealDelayMs: 2500, // suspense length (2–3 seconds)
  invitationLines: [
    "You are cordially invited to Choco's Baby Shower",
    "Saturday, 3rd October",
  ],
  dress: {
    boy: "Please wear something lovely in blue.",
    girl: "Please wear something lovely in pink.",
  },
  colors: {
    cream: "#FDF6F0",
    gold: "#C9A24B",
    ink: "#3E2B33",
    girl: "#E8A9B8",
    girlSoft: "#F7DDE2",
    boy: "#A7C3DC",
    boySoft: "#DDE9F2",
  },
};

// ============================================================
// App
// ============================================================

const els = {
  form: document.getElementById("join-form"),
  name: document.getElementById("guest-name"),
  error: document.getElementById("name-error"),
  revealBtn: document.getElementById("reveal-btn"),
  suspense: document.getElementById("suspense"),
  reveal: document.getElementById("reveal"),
  heading: document.getElementById("reveal-heading"),
  congrats: document.getElementById("reveal-congrats"),
  teamLine: document.getElementById("reveal-team"),
  dress: document.getElementById("dress-code"),
  invite1: document.getElementById("invite-line-1"),
  invite2: document.getElementById("invite-line-2"),
  copyBtn: document.getElementById("copy-btn"),
  shareBtn: document.getElementById("share-btn"),
  viewTeamBtn: document.getElementById("view-team-btn"),
  teammates: document.getElementById("teammates"),
  teammatesHeading: document.getElementById("teammates-heading"),
  teammateList: document.getElementById("teammate-list"),
  boyCount: document.getElementById("boy-count"),
  girlCount: document.getElementById("girl-count"),
  barFill: document.getElementById("bar-fill"),
  teamBar: document.getElementById("team-bar"),
  boyList: document.getElementById("boy-list"),
  girlList: document.getElementById("girl-list"),
  hostToggle: document.getElementById("host-toggle"),
  hostPanel: document.getElementById("host-panel"),
  resetAll: document.getElementById("reset-all"),
  removeName: document.getElementById("remove-name"),
  removeBtn: document.getElementById("remove-btn"),
  copyList: document.getElementById("copy-list"),
  toast: document.getElementById("toast"),
  canvas: document.getElementById("confetti"),
  eventTitle: document.getElementById("event-title"),
  heroDate: document.getElementById("hero-date"),
  footerInvite1: document.getElementById("footer-invite-1"),
  footerInvite2: document.getElementById("footer-invite-2"),
};

let guests = loadGuestsLocal();
let isRevealing = false;
let toastTimer = 0;
let lastInviteText = "";
let currentReveal = loadLastReveal();
let remoteSha = "";

applyConfigCopy();
render();
restoreLastReveal();
refreshFromRemote().then(() => {
  restoreLastReveal();
});
window.setInterval(() => {
  refreshFromRemote();
}, 12000);

els.form.addEventListener("submit", onReveal);
els.copyBtn.addEventListener("click", () => copyText(lastInviteText || buildInviteText()));
els.shareBtn.addEventListener("click", shareInvitation);
els.viewTeamBtn.addEventListener("click", toggleTeammates);
els.hostToggle.addEventListener("click", toggleHost);
els.resetAll.addEventListener("click", resetAll);
els.removeBtn.addEventListener("click", removeSelectedGuest);
els.copyList.addEventListener("click", () => copyText(formatGuestList()));

function applyConfigCopy() {
  document.title = `Team Boy vs Team Girl — ${CONFIG.eventTitle}`;
  els.eventTitle.textContent = CONFIG.eventTitle;
  els.heroDate.textContent = CONFIG.dateShort;
  els.invite1.textContent = CONFIG.invitationLines[0];
  els.invite2.textContent = CONFIG.invitationLines[1];
  els.footerInvite1.textContent = CONFIG.invitationLines[0];
  els.footerInvite2.textContent = CONFIG.invitationLines[1];
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function findGuest(name) {
  const key = name.toLowerCase();
  return guests.find((guest) => guest.name.toLowerCase() === key);
}

// Keep the two teams within one person of each other.
function pickBalancedTeam(list) {
  const boy = list.filter((guest) => guest.team === "boy").length;
  const girl = list.filter((guest) => guest.team === "girl").length;
  if (boy < girl) return "boy";
  if (girl < boy) return "girl";
  return Math.random() < 0.5 ? "boy" : "girl";
}

function teamLabel(team) {
  return team === "boy" ? "TEAM BOY" : "TEAM GIRL";
}

function buildInviteText(name, team) {
  const guestName = name || els.name.value || "guest";
  const side = team || (findGuest(normalizeName(guestName)) || {}).team || "boy";
  return [
    `Congratulations, ${guestName} — you are ${teamLabel(side)}!`,
    "",
    CONFIG.dress[side],
    "",
    CONFIG.invitationLines.join("\n"),
  ].join("\n");
}

function showError(message) {
  els.error.hidden = !message;
  els.error.textContent = message || "";
}

async function onReveal(event) {
  event.preventDefault();
  if (isRevealing) return;

  const name = normalizeName(els.name.value);
  if (!name) {
    showError("Please write your name upon the card.");
    els.name.focus();
    return;
  }

  showError("");
  await refreshFromRemote();
  const existing = findGuest(name);
  const displayName = existing ? existing.name : name;
  const team = existing ? existing.team : pickBalancedTeam(guests);

  if (!existing) {
    guests = [...guests, { name: displayName, team }];
    persistGuests(guests);
    render();
  }

  currentReveal = { name: displayName, team };
  els.name.value = displayName;
  lastInviteText = buildInviteText(displayName, team);
  saveLastReveal(currentReveal);
  await playReveal(displayName, team);
}

async function playReveal(name, team, options = {}) {
  const skipSuspense = Boolean(options.skipSuspense);
  isRevealing = true;
  els.revealBtn.disabled = true;
  els.reveal.hidden = true;
  els.reveal.classList.remove("unfold", "team-boy", "team-girl");

  if (!skipSuspense && !prefersReducedMotion()) {
    els.suspense.hidden = false;
    els.suspense.setAttribute("aria-hidden", "false");
    els.suspense.scrollIntoView({ behavior: "smooth", block: "center" });
    await wait(CONFIG.revealDelayMs);
  }

  els.suspense.hidden = true;
  els.suspense.setAttribute("aria-hidden", "true");
  els.congrats.textContent = `Congratulations, ${name}`;
  els.teamLine.textContent = `you are ${teamLabel(team)}!`;
  els.dress.textContent = CONFIG.dress[team];
  els.reveal.classList.add(team === "boy" ? "team-boy" : "team-girl");
  els.reveal.hidden = false;
  els.reveal.classList.add("unfold");
  els.reveal.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "center",
  });

  if (!options.skipConfetti) burstConfetti(team);
  isRevealing = false;
  els.revealBtn.disabled = false;
}

function restoreLastReveal() {
  const saved = loadLastReveal();
  if (!saved) return;

  const current = findGuest(saved.name);
  const name = current ? current.name : saved.name;
  const team = current ? current.team : saved.team;
  if (team !== "boy" && team !== "girl") return;

  currentReveal = { name, team };
  els.name.value = name;
  lastInviteText = buildInviteText(name, team);
  playReveal(name, team, { skipSuspense: true, skipConfetti: true });
}

function render() {
  const boy = guests.filter((guest) => guest.team === "boy");
  const girl = guests.filter((guest) => guest.team === "girl");
  const total = guests.length;
  const boyShare = total === 0 ? 50 : (boy.length / total) * 100;

  els.boyCount.textContent = String(boy.length);
  els.girlCount.textContent = String(girl.length);
  els.barFill.style.width = `${boyShare}%`;
  els.teamBar.setAttribute(
    "aria-label",
    `Team balance: Team Boy ${boy.length}, Team Girl ${girl.length}`
  );

  renderList(els.boyList, boy);
  renderList(els.girlList, girl);
  renderHostSelect();
  renderTeammates();
}

function renderList(listEl, people) {
  listEl.replaceChildren();
  if (!people.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = "Awaiting the first guest…";
    listEl.append(empty);
    return;
  }

  for (const guest of people) {
    const item = document.createElement("li");
    item.className = "name-card";
    item.innerHTML = `<span class="mark" aria-hidden="true">❧</span><span></span><span class="mark" aria-hidden="true">❧</span>`;
    item.children[1].textContent = guest.name;
    listEl.append(item);
  }
}

function renderHostSelect() {
  const current = els.removeName.value;
  els.removeName.replaceChildren();

  if (!guests.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No guests yet";
    els.removeName.append(option);
    els.removeName.disabled = true;
    els.removeBtn.disabled = true;
    return;
  }

  els.removeName.disabled = false;
  els.removeBtn.disabled = false;
  guests.forEach((guest, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${guest.name} — ${teamLabel(guest.team)}`;
    els.removeName.append(option);
  });
  if (current && [...els.removeName.options].some((opt) => opt.value === current)) {
    els.removeName.value = current;
  }
}

function toggleTeammates() {
  const open = els.teammates.hidden;
  els.teammates.hidden = !open;
  els.viewTeamBtn.setAttribute("aria-expanded", String(open));
  els.viewTeamBtn.textContent = open ? "Hide people on your team" : "View people on your team";
  renderTeammates();
}

function renderTeammates() {
  if (!els.teammateList) return;
  const team = currentReveal && currentReveal.team;
  const people = team ? guests.filter((guest) => guest.team === team) : [];
  els.teammatesHeading.textContent =
    team === "girl" ? "People on Team Girl" : team === "boy" ? "People on Team Boy" : "People on your team";
  els.teammateList.replaceChildren();

  if (!team) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = "Reveal your team to see your people.";
    els.teammateList.append(empty);
    return;
  }

  if (!people.length) {
    const empty = document.createElement("p");
    empty.className = "empty-list";
    empty.textContent = "You are the first on this side. Friends will appear as they join.";
    els.teammateList.append(empty);
    return;
  }

  renderList(els.teammateList, people);
}

function toggleHost() {
  const open = els.hostPanel.hidden;
  els.hostPanel.hidden = !open;
  els.hostPanel.setAttribute("aria-hidden", String(!open));
  els.hostToggle.setAttribute("aria-expanded", String(open));
}

function resetAll() {
  const confirmed = window.confirm("This will clear every guest. Continue?");
  if (!confirmed) return;
  guests = [];
  currentReveal = null;
  persistGuests(guests);
  clearLastReveal();
  els.reveal.hidden = true;
  els.teammates.hidden = true;
  lastInviteText = "";
  render();
  showToast("The register is cleared.");
}

function removeSelectedGuest() {
  const index = Number(els.removeName.value);
  if (!Number.isInteger(index) || !guests[index]) return;
  const removed = guests[index];
  guests = guests.filter((_, i) => i !== index);
  persistGuests(guests);
  const saved = loadLastReveal();
  if (saved && saved.name.toLowerCase() === removed.name.toLowerCase()) {
    clearLastReveal();
    currentReveal = null;
    els.reveal.hidden = true;
    els.teammates.hidden = true;
    lastInviteText = "";
  }
  render();
  showToast(`${removed.name} has been excused.`);
}

function formatGuestList() {
  const boy = guests.filter((guest) => guest.team === "boy");
  const girl = guests.filter((guest) => guest.team === "girl");
  const lines = [
    `${CONFIG.eventTitle} — Guest list`,
    "",
    `TEAM BOY (${boy.length})`,
    ...(boy.length ? boy.map((guest) => `• ${guest.name}`) : ["• —"]),
    "",
    `TEAM GIRL (${girl.length})`,
    ...(girl.length ? girl.map((guest) => `• ${guest.name}`) : ["• —"]),
  ];
  return lines.join("\n");
}

async function shareInvitation() {
  const text = lastInviteText || buildInviteText();
  if (navigator.share) {
    try {
      await navigator.share({ title: CONFIG.eventTitle, text });
      return;
    } catch (error) {
      if (error && error.name === "AbortError") return;
    }
  }
  await copyText(text);
}

async function copyText(text) {
  if (!text) return;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text);
    }
    showToast("Copied to your clipboard.");
  } catch {
    try {
      fallbackCopy(text);
      showToast("Copied to your clipboard.");
    } catch {
      showToast("Unable to copy just now.");
    }
  }
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 2200);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// --- persistence (always wrapped so private mode cannot break the page) ---

function sanitizeGuests(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter((guest) => guest && typeof guest.name === "string" && (guest.team === "boy" || guest.team === "girl"))
    .map((guest) => ({ name: normalizeName(guest.name), team: guest.team }))
    .filter((guest) => guest.name);
}

function loadGuestsLocal() {
  try {
    const raw =
      localStorage.getItem(CONFIG.storageKey) ||
      localStorage.getItem("coco-baby-shower-guests");
    if (!raw) return [];
    const list = sanitizeGuests(JSON.parse(raw));
    if (list.length) saveGuestsLocal(list);
    return list;
  } catch {
    return [];
  }
}

function saveGuestsLocal(list) {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(list));
  } catch {
    // Storage may be blocked; the evening can still continue in this tab.
  }
}

function persistGuests(list) {
  saveGuestsLocal(list);
  saveGuestsRemote(list);
}

function githubContentsUrl() {
  const { owner, repo, path } = CONFIG.github;
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
}

function writeToken() {
  return (typeof window !== "undefined" && window.CHOCO_WRITE_TOKEN) || "";
}

async function refreshFromRemote() {
  try {
    const response = await fetch(`${githubContentsUrl()}?t=${Date.now()}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return;
    const payload = await response.json();
    remoteSha = payload.sha || "";
    const decoded = decodeBase64(payload.content || "");
    const list = sanitizeGuests(JSON.parse(decoded));
    guests = list;
    saveGuestsLocal(list);
    render();
  } catch {
    // Stay on the locally saved list if the shared file cannot be reached.
  }
}

async function saveGuestsRemote(list) {
  const token = writeToken();
  if (!token) return;
  try {
    if (!remoteSha) await refreshFromRemote();
    const body = {
      message: "Update guest list",
      content: encodeBase64(JSON.stringify(list, null, 2)),
      sha: remoteSha || undefined,
    };
    const response = await fetch(githubContentsUrl(), {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return;
    const payload = await response.json();
    remoteSha = (payload.content && payload.content.sha) || remoteSha;
  } catch {
    // The name is still saved on this phone.
  }
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64(content) {
  const cleaned = content.replace(/\n/g, "");
  const binary = atob(cleaned);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function loadLastReveal() {
  try {
    const raw = localStorage.getItem(CONFIG.lastRevealKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.name !== "string") return null;
    if (data.team !== "boy" && data.team !== "girl") return null;
    return { name: normalizeName(data.name), team: data.team };
  } catch {
    return null;
  }
}

function saveLastReveal(entry) {
  try {
    localStorage.setItem(CONFIG.lastRevealKey, JSON.stringify(entry));
  } catch {
    // ignore blocked storage
  }
}

function clearLastReveal() {
  try {
    localStorage.removeItem(CONFIG.lastRevealKey);
  } catch {
    // ignore blocked storage
  }
}

// --- confetti in the team's colour ---

function burstConfetti(team) {
  if (prefersReducedMotion() || !els.canvas) return;

  const canvas = els.canvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);
  const palette =
    team === "boy"
      ? [CONFIG.colors.boy, CONFIG.colors.boySoft, CONFIG.colors.gold]
      : [CONFIG.colors.girl, CONFIG.colors.girlSoft, CONFIG.colors.gold];

  const pieces = Array.from({ length: 90 }, () => ({
    x: width * 0.5 + (Math.random() - 0.5) * 80,
    y: height * 0.32,
    vx: (Math.random() - 0.5) * 11,
    vy: Math.random() * -9 - 3,
    size: Math.random() * 6 + 3,
    color: palette[Math.floor(Math.random() * palette.length)],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.25,
    life: 0,
  }));

  const started = performance.now();
  const duration = 1400;

  function frame(now) {
    const t = now - started;
    ctx.clearRect(0, 0, width, height);
    for (const piece of pieces) {
      piece.vy += 0.18;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.rot += piece.vr;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rot);
      ctx.globalAlpha = Math.max(0, 1 - t / duration);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      ctx.restore();
    }
    if (t < duration) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  }

  requestAnimationFrame(frame);
}
