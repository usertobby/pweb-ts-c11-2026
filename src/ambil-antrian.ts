import {
  getJenisAntrian,
  getTiket,
  saveTiket
} from "./services/storage.js";

import type {
  JenisAntrian,
  Priority,
  Tiket
} from "./types/index.js";


// --- ELEMENT HTML ---
const ambilForm = document.getElementById(
  "ambilForm"
) as HTMLFormElement | null;

const jenisSelect = document.getElementById(
  "jenisAntrian"
) as HTMLSelectElement | null;

const prioritasSelect = document.getElementById(
  "prioritas"
) as HTMLSelectElement | null;

const ambilError = document.getElementById(
  "ambilError"
) as HTMLParagraphElement | null;

const ambilButton = document.getElementById(
  "ambilButton"
) as HTMLButtonElement | null;

const ticketSection = document.getElementById(
  "ticketSection"
) as HTMLElement | null;

const ticketNumber = document.getElementById(
  "ticketNumber"
) as HTMLElement | null;

const ticketService = document.getElementById(
  "ticketService"
) as HTMLElement | null;

const ticketPriority = document.getElementById(
  "ticketPriority"
) as HTMLElement | null;

const ticketTime = document.getElementById(
  "ticketTime"
) as HTMLElement | null;

const printTicket = document.getElementById(
  "printTicket"
) as HTMLButtonElement | null;

const newTicket = document.getElementById(
  "newTicket"
) as HTMLButtonElement | null;


// --- VALID PRIORITY ---
const validPriorities: Priority[] = [
  "Normal",
  "Lansia",
  "Disabilitas",
  "VIP"
];


// --- ERROR HANDLING ---
function showError(message: string): void {

  if (!ambilError) return;

  ambilError.textContent = message;
  ambilError.hidden = false;

}

function clearError(): void {

  if (!ambilError) return;

  ambilError.textContent = "";
  ambilError.hidden = true;

}


// --- LOAD JENIS ANTRIAN ---
function loadJenisAntrian(): void {

  if (!jenisSelect) return;

  const selectedValue = jenisSelect.value;

  const daftarJenis = getJenisAntrian();

  const jenisAktif = daftarJenis.filter(
    (jenis: JenisAntrian) => jenis.aktif
  );

  jenisSelect.innerHTML = "";

  const defaultOption = document.createElement("option");

  defaultOption.value = "";

  defaultOption.textContent =
    jenisAktif.length > 0
      ? "Pilih Jenis Antrian"
      : "Belum ada layanan tersedia";

  jenisSelect.appendChild(defaultOption);

  jenisAktif.forEach((jenis) => {

    const option = document.createElement("option");

    option.value = jenis.id;

    option.textContent = `${jenis.kode} - ${jenis.nama}`;

    jenisSelect.appendChild(option);

  });

  const stillExists = jenisAktif.some(
    (jenis) => jenis.id === selectedValue
  );

  if (stillExists) {
    jenisSelect.value = selectedValue;
  }

  if (ambilButton) {
    ambilButton.disabled = jenisAktif.length === 0;
  }

}


// --- GENERATE NOMOR TIKET ---
function generateNomorTiket(
  jenis: JenisAntrian,
  daftarTiket: Tiket[]
): string {

  const tiketJenis = daftarTiket.filter(
    (tiket) => tiket.jenisAntrianId === jenis.id
  );

  let nomorTerbesar = 0;

  tiketJenis.forEach((tiket) => {

    const bagianNomor = tiket.nomor.split("-")[1];

    const nomor = Number(bagianNomor);

    if (Number.isFinite(nomor) && nomor > nomorTerbesar) {
      nomorTerbesar = nomor;
    }

  });

  const nomorBerikutnya = nomorTerbesar + 1;

  const nomorFormat = String(
    nomorBerikutnya
  ).padStart(3, "0");

  return `${jenis.kode}-${nomorFormat}`;

}


// --- TAMPILKAN TIKET ---
function tampilkanTiket(
  tiket: Tiket,
  jenis: JenisAntrian
): void {

  if (
    !ticketSection ||
    !ticketNumber ||
    !ticketService ||
    !ticketPriority ||
    !ticketTime
  ) {
    return;
  }

  ticketNumber.textContent = tiket.nomor;

  ticketService.textContent = jenis.nama;

  ticketPriority.textContent = tiket.prioritas;

  ticketTime.textContent = new Date(
    tiket.createdAt
  ).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  ticketSection.hidden = false;

  ticketSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


// --- SUBMIT AMBIL ANTRIAN ---
ambilForm?.addEventListener(
  "submit",
  (event: SubmitEvent) => {

    event.preventDefault();

    clearError();

    if (!jenisSelect || !prioritasSelect) {
      return;
    }

    const jenisId = jenisSelect.value;

    const prioritasValue = prioritasSelect.value;

    if (!jenisId) {
      showError("Silakan pilih jenis antrian.");
      return;
    }

    if (
      !validPriorities.includes(
        prioritasValue as Priority
      )
    ) {
      showError("Silakan pilih tingkat prioritas.");
      return;
    }

    // Ambil data terbaru
    const daftarJenis = getJenisAntrian();

    const jenis = daftarJenis.find(
      (item) => item.id === jenisId && item.aktif
    );

    if (!jenis) {
      showError(
        "Jenis antrian tidak tersedia atau sudah dinonaktifkan."
      );

      loadJenisAntrian();

      return;
    }

    // Ambil tiket yang sudah tersimpan
    const daftarTiket = getTiket();

    // Generate nomor baru
    const nomor = generateNomorTiket(
      jenis,
      daftarTiket
    );

    // Buat tiket baru
    const tiketBaru: Tiket = {
      id: crypto.randomUUID(),
      nomor: nomor,
      jenisAntrianId: jenis.id,
      prioritas: prioritasValue as Priority,
      status: "Menunggu",
      createdAt: new Date().toISOString()
    };

    // Simpan tiket
    daftarTiket.push(tiketBaru);

    saveTiket(daftarTiket);

    // Tampilkan hasil tiket
    tampilkanTiket(tiketBaru, jenis);

    // Reset form
    ambilForm?.reset();

  }
);


// --- PRINT TIKET ---
printTicket?.addEventListener(
  "click",
  () => {
    window.print();
  }
);


// --- AMBIL TIKET BARU ---
newTicket?.addEventListener(
  "click",
  () => {

    if (ticketSection) {
      ticketSection.hidden = true;
    }

    ambilForm?.reset();

    clearError();

    loadJenisAntrian();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }
);


// --- REAL-TIME UPDATE ---
// Perbarui pilihan layanan setiap 2 detik
setInterval(() => {
  loadJenisAntrian();
}, 2000);

// Update ketika Local Storage berubah
window.addEventListener(
  "storage",
  () => {
    loadJenisAntrian();
  }
);


// --- INITIAL LOAD ---
loadJenisAntrian();