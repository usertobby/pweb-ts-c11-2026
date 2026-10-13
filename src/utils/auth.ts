import { getUser, removeUser } from "../services/storage.js";

import type { Role } from "../types/index.js";

// Mengecek apakah user sudah login
export function isAuthenticated(): boolean {
  const user = getUser();

  return user !== null && Boolean(user.accessToken);
}

// Mengecek apakah user adalah admin
export function isAdmin(): boolean {
  const user = getUser();

  return (
    user?.role === "admin" ||
    user?.role === "moderator"
  );
}

// Guard mengembalikan false agar inisialisasi halaman dapat dihentikan.
export function requireAuth(): boolean {
  if (!isAuthenticated()) {
    window.location.replace("login.html");
    return false;
  }
  return true;
}

export function requireAdmin(): boolean {
  if (!isAuthenticated()) {
    window.location.replace("login.html");
    return false;
  }
  if (!isAdmin()) {
    window.location.replace("ambil-antrian.html");
    return false;
  }
  return true;
}

// Bila logout terjadi di tab lain, halaman terlindungi ikut menutup akses.
export function watchAuthChanges(adminOnly = false): void {
  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === "hospital_user" || event.key === null) {
      if (adminOnly) requireAdmin();
      else requireAuth();
    }
  });
}

// Logout
export function logout(): void {
  removeUser();

  window.location.replace("login.html");
}

// Redirect berdasarkan role
export function redirectByRole(role: Role): void {
  if (role === "admin" || role === "moderator") {
    window.location.replace("index.html");
  } else {
    window.location.replace("ambil-antrian.html");
  }
}