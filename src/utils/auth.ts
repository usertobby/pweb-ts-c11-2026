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

// Melindungi halaman yang membutuhkan login
export function requireAuth(): void {
  if (!isAuthenticated()) {
    window.location.replace("login.html");
  }
}

// Melindungi halaman khusus admin
export function requireAdmin(): void {
  if (!isAuthenticated() || !isAdmin()) {
    window.location.replace("login.html");
  }
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