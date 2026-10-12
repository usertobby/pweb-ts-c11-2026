import type {
  User,
  JenisAntrian,
  Tiket
} from "../types/index.js";

const STORAGE_KEYS = {
  USER: "hospital_user",
  JENIS_ANTRIAN: "hospital_jenis_antrian",
  TIKET: "hospital_tiket"
} as const;

// --- GENERIC STORAGE ---
function getData<T>(key: string, fallback: T): T {
  const data = localStorage.getItem(key);

  if (!data) {
    return fallback;
  }

  try {
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

function saveData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// --- USER SESSION ---
export function getUser(): User | null {
  return getData<User | null>(
    STORAGE_KEYS.USER,
    null
  );
}

export function saveUser(user: User): void {
  saveData(STORAGE_KEYS.USER, user);
}

export function removeUser(): void {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// --- JENIS ANTRIAN ---
export function getJenisAntrian(): JenisAntrian[] {
  return getData<JenisAntrian[]>(
    STORAGE_KEYS.JENIS_ANTRIAN,
    []
  );
}

export function saveJenisAntrian(
  data: JenisAntrian[]
): void {
  saveData(STORAGE_KEYS.JENIS_ANTRIAN, data);
}

// --- TIKET ---
export function getTiket(): Tiket[] {
  return getData<Tiket[]>(
    STORAGE_KEYS.TIKET,
    []
  );
}

export function saveTiket(data: Tiket[]): void {
  saveData(STORAGE_KEYS.TIKET, data);
}