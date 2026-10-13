import { getJenisAntrian, getTiket, getUser, saveTiket } from "./services/storage.js";
import { logout, requireAuth } from "./utils/auth.js";
import type { JenisAntrian, Priority, Tiket } from "./types/index.js";

// --- AUTH GUARD ---
// Halaman operator hanya butuh login (role apa pun boleh mengoperasikan loket).
requireAuth();

// --- ELEMENT HTML ---
const byId = <T extends HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

const user = getUser();
const name = user?.firstName || user?.username || "Operator";
const userName = byId("userName");
const userRole = byId("userRole");
const userInitial = byId("userInitial");
if (userName) userName.textContent = name;
if (userRole) userRole.textContent = user?.role === "admin" ? "Administrator" : user?.role === "moderator" ? "Moderator" : "Petugas";
if (userInitial) userInitial.textContent = name.charAt(0).toUpperCase();
byId<HTMLButtonElement>("logoutButton")?.addEventListener("click", logout);

const today = byId("todayDate");
if (today) today.textContent = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

// --- URUTAN PRIORITAS (konsisten dengan Dashboard Admin) ---
const priorityRank: Record<Priority, number> = { VIP: 0, Disabilitas: 1, Lansia: 2, Normal: 3 };

function formatTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// --- LOGIKA ANTRIAN ---

// Tiket berikutnya menurut prioritas, lalu waktu pengambilan paling awal.
function nextWaiting(serviceId: string, tickets: Tiket[]): Tiket | undefined {
  return tickets
    .filter((ticket) => ticket.jenisAntrianId === serviceId && ticket.status === "Menunggu")
    .sort((a, b) => priorityRank[a.prioritas] - priorityRank[b.prioritas] || a.createdAt.localeCompare(b.createdAt))[0];
}

// Tiket yang sedang dipanggil untuk layanan ini (paling banyak satu).
function currentCalled(serviceId: string, tickets: Tiket[]): Tiket | undefined {
  return tickets
    .filter((ticket) => ticket.jenisAntrianId === serviceId && ticket.status === "Dipanggil")
    .sort((a, b) => (b.calledAt ?? "").localeCompare(a.calledAt ?? ""))[0];
}

// Tombol "Panggil Berikutnya": tiket aktif menjadi Selesai, lalu tiket
// berikutnya (urut prioritas) menjadi Dipanggil.
function callNext(serviceId: string): void {
  const tickets = getTiket();
  const next = nextWaiting(serviceId, tickets);
  const current = currentCalled(serviceId, tickets);
  if (!next && !current) return;

  const now = new Date().toISOString();
  saveTiket(tickets.map((ticket) => {
    if (ticket.id === current?.id) return { ...ticket, status: "Selesai", finishedAt: now };
    if (next && ticket.id === next.id) return { ...ticket, status: "Dipanggil", calledAt: now };
    return ticket;
  }));
  render();
}

// Tombol "Lewati": tiket yang tidak hadir ditandai Dilewati
// (tidak dipanggil ulang pada siklus ini).
function skipCurrent(serviceId: string): void {
  const current = currentCalled(serviceId, getTiket());
  if (!current) return;
  const now = new Date().toISOString();
  saveTiket(getTiket().map((ticket) => ticket.id === current.id ? { ...ticket, status: "Dilewati", finishedAt: now } : ticket));
  render();
}

// Tombol "Selesai": menutup tiket yang sedang dipanggil
// tanpa memanggil antrian berikutnya.
function finishCurrent(serviceId: string): void {
  const current = currentCalled(serviceId, getTiket());
  if (!current) return;
  const now = new Date().toISOString();
  saveTiket(getTiket().map((ticket) => ticket.id === current.id ? { ...ticket, status: "Selesai", finishedAt: now } : ticket));
  render();
}

// --- RENDER ---
function render(): void {
  const services = getJenisAntrian().filter((service: JenisAntrian) => service.aktif);
  const tickets = getTiket();

  const setText = (id: string, value: number | string) => {
    const element = byId(id);
    if (element) element.textContent = String(value);
  };
  setText("waitingCount", tickets.filter((ticket) => ticket.status === "Menunggu").length);
  setText("calledCount", tickets.filter((ticket) => ticket.status === "Dipanggil").length);
  setText("doneCount", tickets.filter((ticket) => ticket.status === "Selesai").length);
  setText("skippedCount", tickets.filter((ticket) => ticket.status === "Dilewati").length);
  setText("serviceCount", `${services.length} layanan`);

  const callList = byId("callList");
  if (callList) {
    callList.replaceChildren();

    services.forEach((service) => {
      const current = currentCalled(service.id, tickets);
      const next = nextWaiting(service.id, tickets);
      const waiting = tickets.filter((ticket) => ticket.jenisAntrianId === service.id && ticket.status === "Menunggu").length;

      // Kartu layanan
      const card = document.createElement("article");
      card.className = "call-card";

      // Kepala kartu: kode, nama, jumlah antrian
      const head = document.createElement("div");
      head.className = "call-card-head";
      const identity = document.createElement("div");
      identity.className = "call-identity";
      const code = document.createElement("span");
      code.className = "call-code";
      code.textContent = service.kode;
      const title = document.createElement("div");
      const titleName = document.createElement("strong");
      titleName.textContent = service.nama;
      const titleSub = document.createElement("small");
      titleSub.textContent = `${waiting} menunggu`;
      title.append(titleName, titleSub);
      identity.append(code, title);
      head.append(identity);

      // Nomor yang sedang dipanggil
      const stage = document.createElement("div");
      stage.className = "call-stage";
      const stageLabel = document.createElement("p");
      stageLabel.textContent = "SEDANG DIPANGGIL";
      const stageNumber = document.createElement("strong");
      stageNumber.textContent = current ? current.nomor : "—";
      const stageMeta = document.createElement("small");
      if (current) {
        stageMeta.textContent = `${current.prioritas} · dipanggil ${formatTime(current.calledAt)}`;
      } else {
        stageMeta.textContent = next ? "Belum ada tiket dipanggil" : "Antrian kosong";
      }
      stage.append(stageLabel, stageNumber, stageMeta);

      // Preview tiket berikutnya
      const upNext = document.createElement("div");
      upNext.className = "call-upnext";
      const upNextLabel = document.createElement("span");
      upNextLabel.textContent = "Berikutnya";
      const upNextValue = document.createElement("strong");
      upNextValue.textContent = next ? `${next.nomor} · ${next.prioritas}` : "—";
      upNext.append(upNextLabel, upNextValue);

      // Tombol aksi
      const actions = document.createElement("div");
      actions.className = "call-actions";

      const callButton = document.createElement("button");
      callButton.type = "button";
      callButton.className = "primary-button call-next-button";
      callButton.textContent = "Panggil berikutnya →";
      callButton.disabled = !current && !next;
      callButton.addEventListener("click", () => callNext(service.id));

      const skipButton = document.createElement("button");
      skipButton.type = "button";
      skipButton.className = "ghost-button skip-button";
      skipButton.textContent = "Lewati";
      skipButton.title = "Tandai tiket yang tidak hadir sebagai dilewati";
      skipButton.disabled = !current;
      skipButton.addEventListener("click", () => skipCurrent(service.id));

      const finishButton = document.createElement("button");
      finishButton.type = "button";
      finishButton.className = "ghost-button finish-button";
      finishButton.textContent = "Selesai";
      finishButton.title = "Tutup tiket yang sedang dipanggil";
      finishButton.disabled = !current;
      finishButton.addEventListener("click", () => finishCurrent(service.id));

      actions.append(callButton, skipButton, finishButton);

      card.append(head, stage, upNext, actions);
      callList.append(card);
    });
  }

  const emptyServices = byId("emptyServices");
  if (emptyServices) emptyServices.hidden = services.length > 0;
}

// --- PEMBARUAN OTOMATIS ---
// Data terbaru dari halaman lain (ambil antrian / dashboard) tampil
// tanpa reload: polling 2 detik + event storage saat tab lain berubah.
window.setInterval(render, 2000);
window.addEventListener("storage", render);
window.addEventListener("focus", render);
render();
