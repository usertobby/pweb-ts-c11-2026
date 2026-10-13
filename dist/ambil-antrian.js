import { requireAuth, watchAuthChanges, logout } from "./utils/auth.js";
import { getJenisAntrian, getTiket, saveTiket } from "./services/storage.js";
function initPage() {
    document.getElementById("logoutButton")?.addEventListener("click", logout);
    // --- ELEMENT HTML ---
    const ambilForm = document.getElementById("ambilForm");
    const jenisSelect = document.getElementById("jenisAntrian");
    const prioritasSelect = document.getElementById("prioritas");
    const ambilError = document.getElementById("ambilError");
    const ambilButton = document.getElementById("ambilButton");
    const ticketSection = document.getElementById("ticketSection");
    const ticketNumber = document.getElementById("ticketNumber");
    const ticketService = document.getElementById("ticketService");
    const ticketPriority = document.getElementById("ticketPriority");
    const ticketTime = document.getElementById("ticketTime");
    const printTicket = document.getElementById("printTicket");
    const newTicket = document.getElementById("newTicket");
    // --- VALID PRIORITY ---
    const validPriorities = [
        "Normal",
        "Lansia",
        "Disabilitas",
        "VIP"
    ];
    // --- ERROR HANDLING ---
    function showError(message) {
        if (!ambilError)
            return;
        ambilError.textContent = message;
        ambilError.hidden = false;
    }
    function clearError() {
        if (!ambilError)
            return;
        ambilError.textContent = "";
        ambilError.hidden = true;
    }
    // --- LOAD JENIS ANTRIAN ---
    function loadJenisAntrian() {
        if (!jenisSelect)
            return;
        const selectedValue = jenisSelect.value;
        const daftarJenis = getJenisAntrian();
        const jenisAktif = daftarJenis.filter((jenis) => jenis.aktif);
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
        const stillExists = jenisAktif.some((jenis) => jenis.id === selectedValue);
        if (stillExists) {
            jenisSelect.value = selectedValue;
        }
        if (ambilButton) {
            ambilButton.disabled = jenisAktif.length === 0;
        }
    }
    // --- GENERATE NOMOR TIKET ---
    function generateNomorTiket(jenis, daftarTiket) {
        const tiketJenis = daftarTiket.filter((tiket) => tiket.jenisAntrianId === jenis.id);
        let nomorTerbesar = 0;
        tiketJenis.forEach((tiket) => {
            const bagianNomor = tiket.nomor.split("-")[1];
            const nomor = Number(bagianNomor);
            if (Number.isFinite(nomor) && nomor > nomorTerbesar) {
                nomorTerbesar = nomor;
            }
        });
        const nomorBerikutnya = nomorTerbesar + 1;
        const nomorFormat = String(nomorBerikutnya).padStart(3, "0");
        return `${jenis.kode}-${nomorFormat}`;
    }
    // --- TAMPILKAN TIKET ---
    function tampilkanTiket(tiket, jenis) {
        if (!ticketSection ||
            !ticketNumber ||
            !ticketService ||
            !ticketPriority ||
            !ticketTime) {
            return;
        }
        ticketNumber.textContent = tiket.nomor;
        ticketService.textContent = jenis.nama;
        ticketPriority.textContent = tiket.prioritas;
        ticketTime.textContent = new Date(tiket.createdAt).toLocaleString("id-ID", {
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
    ambilForm?.addEventListener("submit", (event) => {
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
        if (!validPriorities.includes(prioritasValue)) {
            showError("Silakan pilih tingkat prioritas.");
            return;
        }
        // Ambil data terbaru
        const daftarJenis = getJenisAntrian();
        const jenis = daftarJenis.find((item) => item.id === jenisId && item.aktif);
        if (!jenis) {
            showError("Jenis antrian tidak tersedia atau sudah dinonaktifkan.");
            loadJenisAntrian();
            return;
        }
        // Ambil tiket yang sudah tersimpan
        const daftarTiket = getTiket();
        // Generate nomor baru
        const nomor = generateNomorTiket(jenis, daftarTiket);
        // Buat tiket baru
        const tiketBaru = {
            id: crypto.randomUUID(),
            nomor: nomor,
            jenisAntrianId: jenis.id,
            prioritas: prioritasValue,
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
    });
    // --- PRINT TIKET ---
    printTicket?.addEventListener("click", () => {
        window.print();
    });
    // --- AMBIL TIKET BARU ---
    newTicket?.addEventListener("click", () => {
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
    });
    // --- REAL-TIME UPDATE ---
    // Perbarui pilihan layanan setiap 2 detik
    setInterval(() => {
        loadJenisAntrian();
    }, 2000);
    // Update ketika Local Storage berubah
    window.addEventListener("storage", () => {
        loadJenisAntrian();
    });
    // --- INITIAL LOAD ---
    loadJenisAntrian();
}
if (requireAuth()) {
    watchAuthChanges(false);
    initPage();
}
