import { logout, requireAdmin, watchAuthChanges } from "./utils/auth.js";
import { getJenisAntrian, getTiket, getUser, saveJenisAntrian, saveTiket } from "./services/storage.js";
import type { JenisAntrian, Priority, Tiket } from "./types/index.js";



function initPage(): void {
const byId = <T extends HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;
const user = getUser();
const name = user?.firstName || user?.username || "Admin";
const userName = byId("userName");
const userRole = byId("userRole");
const userInitial = byId("userInitial");
if (userName) userName.textContent = name;
if (userRole) userRole.textContent = user?.role === "moderator" ? "Moderator" : "Administrator";
if (userInitial) userInitial.textContent = name.charAt(0).toUpperCase();
byId<HTMLButtonElement>("logoutButton")?.addEventListener("click", logout);

const today = byId("todayDate");
if (today) today.textContent = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

const priorityRank: Record<Priority, number> = { VIP: 0, Disabilitas: 1, Lansia: 2, Normal: 3 };
const serviceForm = byId<HTMLFormElement>("serviceForm");
const serviceCode = byId<HTMLInputElement>("serviceCode");
const serviceName = byId<HTMLInputElement>("serviceName");
const serviceList = byId("serviceList");
const manualSelect = byId<HTMLSelectElement>("manualService");
const manualForm = byId<HTMLFormElement>("manualForm");
const serviceFeedback = byId<HTMLParagraphElement>("serviceFeedback");
const manualFeedback = byId<HTMLParagraphElement>("manualFeedback");

function feedback(target: HTMLParagraphElement | null, message = ""): void {
  if (!target) return;
  target.textContent = message;
  target.hidden = !message;
  target.classList.toggle("success-message", Boolean(message) && target === manualFeedback);
}

function createTicket(service: JenisAntrian, prioritas: Priority): Tiket {
  const tickets = getTiket();
  const max = tickets.reduce((largest, ticket) => {
    if (ticket.jenisAntrianId !== service.id) return largest;
    const value = Number(ticket.nomor.split("-")[1]);
    return Number.isFinite(value) ? Math.max(largest, value) : largest;
  }, 0);
  const ticket: Tiket = {
    id: crypto.randomUUID(), nomor: `${service.kode}-${String(max + 1).padStart(3, "0")}`,
    jenisAntrianId: service.id, prioritas, status: "Menunggu", createdAt: new Date().toISOString()
  };
  tickets.push(ticket);
  saveTiket(tickets);
  return ticket;
}

function updateTicketStatus(ticketId: string, status: Tiket["status"]): void {
  const now = new Date().toISOString();
  const updated = getTiket().map((ticket) => ticket.id === ticketId
    ? { ...ticket, status, ...(status === "Dipanggil" ? { calledAt: now } : {}), ...(["Selesai", "Dilewati"].includes(status) ? { finishedAt: now } : {}) }
    : ticket);
  saveTiket(updated);
  render();
}

function callNext(serviceId: string): void {
  const tickets = getTiket();
  const next = tickets.filter((ticket) => ticket.jenisAntrianId === serviceId && ticket.status === "Menunggu")
    .sort((a, b) => priorityRank[a.prioritas] - priorityRank[b.prioritas] || a.createdAt.localeCompare(b.createdAt))[0];
  if (!next) return;
  const now = new Date().toISOString();
  saveTiket(tickets.map((ticket) => {
    if (ticket.jenisAntrianId !== serviceId) return ticket;
    if (ticket.status === "Dipanggil") return { ...ticket, status: "Selesai", finishedAt: now };
    if (ticket.id === next.id) return { ...ticket, status: "Dipanggil", calledAt: now };
    return ticket;
  }));
  render();
}

function render(): void {
  const services = getJenisAntrian();
  const tickets = getTiket();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todaysTickets = tickets.filter((ticket) => new Date(ticket.createdAt).getTime() >= todayStart.getTime());
  const setText = (id: string, value: number | string) => { const element = byId(id); if (element) element.textContent = String(value); };
  setText("totalCount", todaysTickets.length);
  setText("waitingCount", todaysTickets.filter((ticket) => ticket.status === "Menunggu").length);
  setText("calledCount", todaysTickets.filter((ticket) => ticket.status === "Dipanggil").length);
  setText("doneCount", todaysTickets.filter((ticket) => ticket.status === "Selesai").length);
  setText("serviceCount", `${services.length} layanan`);

  if (serviceList) {
    serviceList.replaceChildren();
    services.forEach((service) => {
      const row = document.createElement("div"); row.className = "service-row";
      const identity = document.createElement("div"); identity.className = "service-identity";
      const code = document.createElement("span"); code.className = "service-code"; code.textContent = service.kode;
      const label = document.createElement("span"); label.className = "service-label";
      const title = document.createElement("strong"); title.textContent = service.nama;
      const sub = document.createElement("small"); sub.textContent = `Kode ${service.kode}`;
      label.append(title, sub); identity.append(code, label);
      const count = document.createElement("span"); count.className = "service-queue-count";
      count.textContent = String(tickets.filter((ticket) => ticket.jenisAntrianId === service.id && ["Menunggu", "Dipanggil"].includes(ticket.status)).length);
      const status = document.createElement("span"); status.className = `status-toggle ${service.aktif ? "is-active" : "is-inactive"}`;
      status.innerHTML = `<span></span>${service.aktif ? "Aktif" : "Nonaktif"}`;
      const actions = document.createElement("div"); actions.className = "service-actions";
      const toggle = document.createElement("button"); toggle.type = "button"; toggle.className = "icon-button";
      toggle.textContent = service.aktif ? "Ⅱ" : "▶"; toggle.title = service.aktif ? "Nonaktifkan layanan" : "Aktifkan layanan";
      toggle.setAttribute("aria-label", toggle.title);
      toggle.addEventListener("click", () => { saveJenisAntrian(getJenisAntrian().map((item) => item.id === service.id ? { ...item, aktif: !item.aktif } : item)); render(); });
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "icon-button delete-button"; remove.textContent = "×"; remove.title = "Hapus layanan"; remove.setAttribute("aria-label", `Hapus layanan ${service.nama}`);
      remove.addEventListener("click", () => {
        if (!window.confirm(`Hapus layanan “${service.nama}”? Tiket lama tetap tersimpan.`)) return;
        saveJenisAntrian(getJenisAntrian().filter((item) => item.id !== service.id)); render();
      });
      actions.append(toggle, remove); row.append(identity, count, status, actions); serviceList.append(row);
    });
  }
  const emptyServices = byId("emptyServices"); if (emptyServices) emptyServices.hidden = services.length > 0;
  if (manualSelect) {
    const previous = manualSelect.value;
    manualSelect.replaceChildren(new Option("Pilih layanan", ""));
    services.filter((service) => service.aktif).forEach((service) => manualSelect?.add(new Option(`${service.kode} · ${service.nama}`, service.id)));
    if (services.some((service) => service.id === previous && service.aktif)) manualSelect.value = previous;
  }

  const tbody = byId<HTMLTableSectionElement>("ticketTable");
  const emptyTickets = byId("emptyTickets");
  const sorted = [...todaysTickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (tbody) {
    tbody.replaceChildren();
    sorted.slice(0, 8).forEach((ticket) => {
      const tr = document.createElement("tr");
      const service = services.find((item) => item.id === ticket.jenisAntrianId);
      const values = [ticket.nomor, service?.nama || "Layanan dihapus", ticket.prioritas, new Date(ticket.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })];
      values.forEach((value, index) => { const td = document.createElement("td"); if (index === 0) td.className = "table-ticket-number"; td.textContent = value; tr.append(td); });
      const statusCell = document.createElement("td"); const badge = document.createElement("span");
      badge.className = `ticket-status status-${ticket.status.toLowerCase()}`; badge.textContent = ticket.status; statusCell.append(badge); tr.append(statusCell); tbody.append(tr);
    });
  }
  if (emptyTickets) emptyTickets.hidden = sorted.length > 0;

  const queueContainer = byId("queuesByService");
  if (queueContainer) {
    queueContainer.replaceChildren();
    services.forEach((service) => {
      const serviceTickets = tickets.filter((ticket) => ticket.jenisAntrianId === service.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const group = document.createElement("section"); group.className = "queue-service-group";
      const heading = document.createElement("div"); heading.className = "queue-service-heading";
      const title = document.createElement("div"); title.className = "queue-service-title";
      const code = document.createElement("span"); code.className = "queue-service-code"; code.textContent = service.kode;
      const text = document.createElement("div"); const name = document.createElement("strong"); name.textContent = service.nama;
      const summary = document.createElement("small");
      const waiting = serviceTickets.filter((ticket) => ticket.status === "Menunggu").length;
      const beingCalled = serviceTickets.filter((ticket) => ticket.status === "Dipanggil").length;
      summary.textContent = `${waiting} menunggu · ${beingCalled} dipanggil`;
      text.append(name, summary); title.append(code, text); heading.append(title);
      const nextButton = document.createElement("button"); nextButton.type = "button"; nextButton.className = "queue-call-next";
      nextButton.textContent = "Panggil berikutnya →";
      const canCall = serviceTickets.some((ticket) => ticket.status === "Menunggu");
      nextButton.disabled = !canCall;
      nextButton.addEventListener("click", () => callNext(service.id));
      heading.append(nextButton); group.append(heading);
      if (serviceTickets.length === 0) {
        const empty = document.createElement("p"); empty.className = "queue-service-empty"; empty.textContent = "Belum ada tiket untuk layanan ini."; group.append(empty);
      } else {
        const list = document.createElement("div"); list.className = "queue-ticket-list";
        serviceTickets.forEach((ticket) => {
          const row = document.createElement("div"); row.className = `queue-ticket-row queue-${ticket.status.toLowerCase()}`;
          const number = document.createElement("strong"); number.className = "queue-ticket-number"; number.textContent = ticket.nomor;
          const priority = document.createElement("span"); priority.className = `priority-badge priority-${ticket.prioritas.toLowerCase()}`; priority.textContent = ticket.prioritas;
          const status = document.createElement("span"); status.className = `ticket-status status-${ticket.status.toLowerCase()}`; status.textContent = ticket.status;
          const time = document.createElement("small"); time.className = "queue-ticket-time"; time.textContent = new Date(ticket.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          const actions = document.createElement("div"); actions.className = "queue-ticket-actions";
          if (ticket.status === "Menunggu") {
            const call = document.createElement("button"); call.type = "button"; call.textContent = "Panggil"; call.className = "ticket-action-call";
            call.title = "Panggil tiket ini"; call.addEventListener("click", () => {
              const now = new Date().toISOString();
              saveTiket(getTiket().map((item) => item.jenisAntrianId === service.id && item.status === "Dipanggil"
                ? { ...item, status: "Selesai", finishedAt: now }
                : item.id === ticket.id ? { ...item, status: "Dipanggil", calledAt: now } : item));
              render();
            });
            const skip = document.createElement("button"); skip.type = "button"; skip.textContent = "Lewati"; skip.className = "ticket-action-skip";
            skip.title = "Tandai tiket dilewati"; skip.addEventListener("click", () => updateTicketStatus(ticket.id, "Dilewati"));
            actions.append(call, skip);
          } else if (ticket.status === "Dipanggil") {
            const finish = document.createElement("button"); finish.type = "button"; finish.textContent = "Selesai"; finish.className = "ticket-action-finish";
            finish.addEventListener("click", () => updateTicketStatus(ticket.id, "Selesai")); actions.append(finish);
          }
          row.append(number, priority, status, time, actions); list.append(row);
        });
        group.append(list);
      }
      queueContainer.append(group);
    });
  }
  if (emptyTickets) emptyTickets.hidden = tickets.length > 0;
}

serviceCode?.addEventListener("input", () => { serviceCode.value = serviceCode.value.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 1); feedback(serviceFeedback); });
serviceName?.addEventListener("input", () => feedback(serviceFeedback));
serviceForm?.addEventListener("submit", (event) => {
  event.preventDefault(); feedback(serviceFeedback);
  const code = serviceCode?.value.trim().toUpperCase() || "";
  const label = serviceName?.value.trim() || "";
  if (!/^[A-Z]$/.test(code)) return feedback(serviceFeedback, "Kode harus terdiri dari tepat 1 huruf (A–Z).");
  if (label.length < 2) return feedback(serviceFeedback, "Nama layanan minimal 2 karakter.");
  const services = getJenisAntrian();
  if (services.some((service) => service.kode.toUpperCase() === code || service.nama.trim().toLocaleLowerCase("id-ID") === label.toLocaleLowerCase("id-ID"))) {
    return feedback(serviceFeedback, "Kode atau nama layanan tersebut sudah digunakan.");
  }
  services.push({ id: crypto.randomUUID(), kode: code, nama: label, aktif: true });
  saveJenisAntrian(services); serviceForm.reset(); render();
});

manualForm?.addEventListener("submit", (event) => {
  event.preventDefault(); feedback(manualFeedback);
  const service = getJenisAntrian().find((item) => item.id === manualSelect?.value && item.aktif);
  if (!service) return feedback(manualFeedback, "Pilih layanan yang masih aktif.");
  const selectedPriority = manualForm.querySelector<HTMLInputElement>('input[name="manualPriority"]:checked')?.value as Priority | undefined;
  if (!selectedPriority || !(selectedPriority in priorityRank)) return feedback(manualFeedback, "Pilih tingkat prioritas yang valid.");
  const ticket = createTicket(service, selectedPriority);
  const issued = byId("issuedTicket");
  const number = byId("issuedNumber"); const details = byId("issuedDetails");
  if (number) number.textContent = ticket.nomor;
  if (details) details.textContent = `${service.nama} · ${ticket.prioritas}`;
  if (issued) { issued.hidden = false; issued.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  manualForm.reset(); render();
});

byId<HTMLButtonElement>("dismissTicket")?.addEventListener("click", () => { const issued = byId("issuedTicket"); if (issued) issued.hidden = true; });
const dialog = byId<HTMLDialogElement>("confirmDialog");
byId<HTMLButtonElement>("resetQueue")?.addEventListener("click", () => dialog?.showModal());
byId<HTMLButtonElement>("confirmReset")?.addEventListener("click", (event) => {
  event.preventDefault(); saveTiket([]); if (dialog?.open) dialog.close();
  const issued = byId("issuedTicket"); if (issued) issued.hidden = true;
  render();
});
dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
window.addEventListener("storage", render);
window.addEventListener("focus", render);
window.setInterval(render, 2000);
render();

}

if (requireAdmin()) {
  watchAuthChanges(true);
  initPage();
}
