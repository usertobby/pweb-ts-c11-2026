import { requireAuth, watchAuthChanges, logout } from "./utils/auth.js";
import { getJenisAntrian, getTiket } from "./services/storage.js";
import type { JenisAntrian, Tiket } from "./types/index.js";


function initPage(): void {
  document.getElementById("logoutButton")?.addEventListener("click", logout);
// --- ELEMENT HTML ---
const byId = <T extends HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

const layarClock = byId("layarClock");
const layarDate = byId("layarDate");
const heroNumber = byId("heroNumber");
const heroMeta = byId("heroMeta");
const layarGrid = byId("layarGrid");
const layarEmpty = byId("layarEmpty");
const soundToggle = byId<HTMLButtonElement>("soundToggle");
const soundLabel = byId("soundLabel");
const fullscreenToggle = byId<HTMLButtonElement>("fullscreenToggle");
const fullscreenLabel = byId("fullscreenLabel");

// --- JAM LAYAR ---
function renderClock(): void {
  const now = new Date();
  if (layarClock) layarClock.textContent = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (layarDate) layarDate.textContent = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
}
window.setInterval(renderClock, 1000);
renderClock();

// --- SUARA PANGGILAN (bonus, Web Audio API murni) ---
// Nada panggilan hanya berbunyi setelah ada interaksi pengguna
// (kebijakan autoplay browser), misalnya saat menekan tombol
// layar penuh atau toggle suara.
let audioContext: AudioContext | null = null;
let soundEnabled = true;
const knownCalled = new Set<string>();
let firstRender = true;

function playChime(): void {
  if (!soundEnabled) return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
    const start = audioContext.currentTime;
    [0, 0.35, 0.7].forEach((offset, index) => {
      const oscillator = audioContext!.createOscillator();
      const gain = audioContext!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = index === 2 ? 1046.5 : 830.6;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.3);
      oscillator.connect(gain).connect(audioContext!.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.32);
    });
  } catch {
    // Browser memblokir audio: abaikan, tampilan tetap berjalan.
  }
}

soundToggle?.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  if (soundToggle) soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  if (soundLabel) soundLabel.textContent = soundEnabled ? "Suara aktif" : "Suara mati";
  if (soundEnabled) playChime();
});

// --- FITUR LAYAR PENUH (Fullscreen API) ---
function updateFullscreenLabel(): void {
  const active = Boolean(document.fullscreenElement);
  if (fullscreenLabel) fullscreenLabel.textContent = active ? "Keluar layar penuh" : "Layar penuh";
}

fullscreenToggle?.addEventListener("click", () => {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void document.documentElement.requestFullscreen();
  }
});

document.addEventListener("fullscreenchange", updateFullscreenLabel);

// --- LOGIKA TAMPILAN ---
function calledTickets(tickets: Tiket[]): Tiket[] {
  return tickets.filter((ticket) => ticket.status === "Dipanggil");
}

function formatTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function render(): void {
  const services = getJenisAntrian().filter((service: JenisAntrian) => service.aktif);
  const tickets = getTiket();
  const called = calledTickets(tickets);

  // Nomor utama: tiket yang terakhir kali dipanggil di seluruh layanan.
  const latest = [...called].sort((a, b) => (b.calledAt ?? "").localeCompare(a.calledAt ?? ""))[0];
  if (heroNumber) heroNumber.textContent = latest ? latest.nomor : "—";
  if (heroMeta) {
    if (latest) {
      const service = services.find((item) => item.id === latest.jenisAntrianId);
      heroMeta.textContent = `${service ? service.nama : "Layanan"} · dipanggil ${formatTime(latest.calledAt)}`;
    } else {
      heroMeta.textContent = "Menunggu panggilan pertama";
    }
  }

  // Kartu per jenis antrian aktif: nomor dipanggil + sisa antrian.
  if (layarGrid) {
    layarGrid.replaceChildren();

    services.forEach((service) => {
      const serviceCalled = called.filter((ticket) => ticket.jenisAntrianId === service.id);
      const waiting = tickets.filter((ticket) => ticket.jenisAntrianId === service.id && ticket.status === "Menunggu").length;

      const card = document.createElement("article");
      card.className = "layar-card";

      const head = document.createElement("div");
      head.className = "layar-card-head";
      const code = document.createElement("span");
      code.className = "layar-card-code";
      code.textContent = service.kode;
      const title = document.createElement("div");
      const titleName = document.createElement("strong");
      titleName.textContent = service.nama;
      const titleSub = document.createElement("small");
      titleSub.textContent = serviceCalled.length > 0 ? `dipanggil ${formatTime(serviceCalled[0].calledAt)}` : "belum dipanggil";
      title.append(titleName, titleSub);
      head.append(code, title);

      const number = document.createElement("p");
      number.className = "layar-card-number";
      number.textContent = serviceCalled.length > 0 ? serviceCalled[0].nomor : "—";

      const remaining = document.createElement("p");
      remaining.className = "layar-card-remaining";
      const remainingStrong = document.createElement("strong");
      remainingStrong.textContent = String(waiting);
      remaining.append(remainingStrong, document.createTextNode(" menunggu"));

      card.append(head, number, remaining);
      layarGrid.append(card);
    });
  }

  if (layarEmpty) layarEmpty.hidden = services.length > 0;

  // Bunyikan nada saat ada tiket yang baru dipanggil.
  const currentIds = new Set(called.map((ticket) => ticket.id));
  if (!firstRender) {
    for (const id of currentIds) {
      if (!knownCalled.has(id)) {
        playChime();
        break;
      }
    }
  }
  knownCalled.clear();
  for (const id of currentIds) knownCalled.add(id);
  firstRender = false;
}

// --- PEMBARUAN OTOMATIS ---
// Polling 2-3 detik tanpa reload + event storage dari tab lain.
window.setInterval(render, 2500);
window.addEventListener("storage", render);
window.addEventListener("focus", render);
render();

}

if (requireAuth()) {
  watchAuthChanges(false);
  initPage();
}
