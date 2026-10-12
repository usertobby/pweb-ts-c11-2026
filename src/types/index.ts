export type Role = "admin" | "moderator" | "user";

export type Priority =
  | "Normal"
  | "Lansia"
  | "Disabilitas"
  | "VIP";

export type TicketStatus =
  | "Menunggu"
  | "Dipanggil"
  | "Selesai"
  | "Dilewati";

export interface User {
  id: number;
  username: string;
  firstName: string;
  role: Role;
  accessToken: string;
}

export interface JenisAntrian {
  id: string;
  kode: string;
  nama: string;
  aktif: boolean;
}

export interface Tiket {
  id: string;
  nomor: string;
  jenisAntrianId: string;
  prioritas: Priority;
  status: TicketStatus;
  createdAt: string;
  calledAt?: string;
  finishedAt?: string;
}