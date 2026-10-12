import { getUser, removeUser } from "../services/storage.js";
// Mengecek apakah user sudah login
export function isAuthenticated() {
    const user = getUser();
    return user !== null && Boolean(user.accessToken);
}
// Mengecek apakah user adalah admin
export function isAdmin() {
    const user = getUser();
    return (user?.role === "admin" ||
        user?.role === "moderator");
}
// Melindungi halaman yang membutuhkan login
export function requireAuth() {
    if (!isAuthenticated()) {
        window.location.replace("login.html");
    }
}
// Melindungi halaman khusus admin
export function requireAdmin() {
    if (!isAuthenticated() || !isAdmin()) {
        window.location.replace("login.html");
    }
}
// Logout
export function logout() {
    removeUser();
    window.location.replace("login.html");
}
// Redirect berdasarkan role
export function redirectByRole(role) {
    if (role === "admin" || role === "moderator") {
        window.location.replace("index.html");
    }
    else {
        window.location.replace("ambil-antrian.html");
    }
}
