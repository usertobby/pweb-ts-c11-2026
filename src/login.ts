import {
  getUser,
  saveUser
} from "./services/storage.js";

import {
  redirectByRole
} from "./utils/auth.js";

import type {
  Role,
  User
} from "./types/index.js";


// --- ELEMENT HTML ---
const loginForm = document.getElementById(
  "loginForm"
) as HTMLFormElement | null;

const usernameInput = document.getElementById(
  "username"
) as HTMLInputElement | null;

const passwordInput = document.getElementById(
  "password"
) as HTMLInputElement | null;

const loginButton = document.getElementById(
  "loginButton"
) as HTMLButtonElement | null;

const buttonText = document.getElementById(
  "buttonText"
) as HTMLSpanElement | null;

const loginError = document.getElementById(
  "loginError"
) as HTMLParagraphElement | null;


// --- API RESPONSE TYPE ---
interface LoginResponse {
  id: number;
  username: string;
  firstName: string;
  accessToken: string;
}


// --- CEK SESSION ---
const existingUser = getUser();
if (existingUser && existingUser.accessToken) {
  redirectByRole(existingUser.role);
}


// --- LOADING STATE ---
function setLoading(isLoading: boolean): void {
  if (!loginButton || !buttonText) {
    return;
  }
  loginButton.disabled = isLoading;
  buttonText.textContent = isLoading
    ? "Memproses..."
    : "Masuk";
}


// --- ERROR MESSAGE ---
function showError(message: string): void {
  if (!loginError) {
    return;
  }
  loginError.textContent = message;
  loginError.hidden = false;
}

function clearError(): void {
  if (!loginError) {
    return;
  }
  loginError.textContent = "";
  loginError.hidden = true;
}


// --- LOGIN API ---
async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(
    "https://dummyjson.com/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password,
        expiresInMins: 60
      })
    }
  );

  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      throw new Error("Username atau password salah.");
    }
    throw new Error("Terjadi kesalahan pada server.");
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("accessToken" in data) ||
    typeof data.accessToken !== "string" ||
    !("id" in data) ||
    typeof data.id !== "number" ||
    !("username" in data) ||
    typeof data.username !== "string" ||
    !("firstName" in data) ||
    typeof data.firstName !== "string"
  ) {
    throw new Error("Data login dari server tidak valid.");
  }

  return {
    id: data.id,
    username: data.username,
    firstName: data.firstName,
    accessToken: data.accessToken
  };
}

// --- GET USER ROLE ---
async function getUserRole(
  userId: number,
  accessToken: string
): Promise<Role> {
  const response = await fetch(
    `https://dummyjson.com/auth/me`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error("Gagal mengambil data role pengguna.");
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("id" in data) ||
    data.id !== userId ||
    !("role" in data) ||
    (
      data.role !== "admin" &&
      data.role !== "moderator" &&
      data.role !== "user"
    )
  ) {
    throw new Error("Role pengguna tidak valid.");
  }

  return data.role;
}

// --- SUBMIT FORM ---
loginForm?.addEventListener(
  "submit",
  async (event: SubmitEvent) => {
    event.preventDefault();
    clearError();
    if (!usernameInput || !passwordInput) {
      return;
    }
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Validasi input kosong
    if (!username || !password) {
      showError(
        "Username dan password wajib diisi."
      );
      return;
    }
    setLoading(true);

    try {

      // Request login ke API
        const response = await login(
            username,
            password
        );

        // Ambil role pengguna dari API
        const role = await getUserRole(
            response.id,
            response.accessToken
        );

        // Membuat data user
        const user: User = {
            id: response.id,
            username: response.username,
            firstName: response.firstName,
            role: role,
            accessToken: response.accessToken
        };

        // Simpan ke Local Storage
        saveUser(user);

        // Redirect berdasarkan role
        redirectByRole(user.role);

    } catch (error: unknown) {
      if (error instanceof TypeError) {
        showError(
          "Gagal terhubung ke server. Periksa koneksi internet."
        );
      } else if (error instanceof Error) {
        showError(error.message);
      } else {
        showError(
          "Terjadi kesalahan yang tidak diketahui."
        );
      }
    } finally {
      setLoading(false);
    }
  }
);