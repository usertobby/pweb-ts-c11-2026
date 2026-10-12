const STORAGE_KEYS = {
    USER: "hospital_user",
    JENIS_ANTRIAN: "hospital_jenis_antrian",
    TIKET: "hospital_tiket"
};
// --- GENERIC STORAGE ---
function getData(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
        return fallback;
    }
    try {
        return JSON.parse(data);
    }
    catch {
        return fallback;
    }
}
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}
// --- USER SESSION ---
export function getUser() {
    return getData(STORAGE_KEYS.USER, null);
}
export function saveUser(user) {
    saveData(STORAGE_KEYS.USER, user);
}
export function removeUser() {
    localStorage.removeItem(STORAGE_KEYS.USER);
}
// --- JENIS ANTRIAN ---
export function getJenisAntrian() {
    return getData(STORAGE_KEYS.JENIS_ANTRIAN, []);
}
export function saveJenisAntrian(data) {
    saveData(STORAGE_KEYS.JENIS_ANTRIAN, data);
}
// --- TIKET ---
export function getTiket() {
    return getData(STORAGE_KEYS.TIKET, []);
}
export function saveTiket(data) {
    saveData(STORAGE_KEYS.TIKET, data);
}
