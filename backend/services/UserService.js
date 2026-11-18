import bcrypt from "bcrypt";
import { presenceRegistry } from "./presenceRegistry.js";
import { HttpError } from "../core/HttpError.js";
import { UserRepository } from "../repositories/UserRepository.js";
import coerceUserRole from "../utils/coerceUserRole.js";

export class UserService {
  constructor() {
    this.repo = new UserRepository();
  }

  project(user) {
    const { user_id, username, nama_lengkap, email, role } = user;
    return { user_id, username, nama_lengkap, email, role, is_online: presenceRegistry.isOnline(user_id) };
  }

  async list() {
    return (await this.repo.list()).map(user => this.project(user));
  }

  async detail(id) {
    const user = await this.repo.getById(id);
    if (!user) throw new HttpError(404, "User tidak ditemukan");
    return this.project(user);
  }

  async create({ username, password, nama_lengkap, email, role }) {
    if (!username || !password || !nama_lengkap || !email || !role) {
      throw new HttpError(409, "Field Wajib diisi!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const created = await this.repo.create({
        username,
        nama_lengkap,
        email,
        role: coerceUserRole(role),
        password: hashedPassword,
      });
      return this.project(created);
    } catch (e) {
      if (
        String(e.message).toLowerCase().includes("unique") ||
        String(e.message).includes("username") ||
        String(e.message).includes("email")
      ) {
        throw new HttpError(409, "Username atau email sudah dipakai");
      }
      if (String(e.message).includes("Record to update not found")) {
        throw new HttpError(404, "User tidak ditemukan");
      }
      throw e;
    }
  }

  async update(id, payload) {
    if (Object.hasOwn(payload, "is_online")) throw new HttpError(400, "Status online dikelola otomatis");
    const data = {};
    if (payload.username !== undefined) data.username = payload.username;
    if (payload.nama_lengkap !== undefined)
      data.nama_lengkap = payload.nama_lengkap;
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.role !== undefined) data.role = payload.role;

    if (payload.password && payload.password.trim()) {
      data.password = await bcrypt.hash(payload.password, 10);
    }

    try {
      const updated = await this.repo.update(id, data);
      return this.project(updated);
    } catch (e) {

      if (
        String(e.message).toLowerCase().includes("unique") ||
        String(e.message).includes("username") ||
        String(e.message).includes("email")
      ) {
        throw new HttpError(409, "Username atau email sudah dipakai");
      }
      if (String(e.message).includes("Record to update not found")) {
        throw new HttpError(404, "User tidak ditemukan");
      }
      throw e;
    }
  }

  async remove(id) {

    const linked = await this.repo.findLabByKepala(id);

    if (linked) {
      throw new HttpError(
        400,
        "Harap ubah kepala lab terlebih dahulu sebelum menghapus user"
      );
    }

    try {
      await this.repo.remove(id);
    } catch (e) {
      if (String(e.message).includes("Record to delete does not exist")) {
        throw new HttpError(404, "User tidak ditemukan");
      }
      throw e;
    }
  }
}
