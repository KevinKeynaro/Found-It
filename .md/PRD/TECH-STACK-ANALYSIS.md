# Analisis Tech Stack — Found It!

**Repository:** `Found-It` (Lost & Found sekolah)
**Tanggal analisis:** 16 Oktober 2026
**Branch aktif:** `main` @ `cacbc2b`
**Metode:** pembacaan manifest dependensi, konfigurasi, dan source code aktual (tanpa menjalankan/mengubah kode)

> Catatan: dokumen ini adalah laporan hasil analisis. Tidak ada file kode, konfigurasi, maupun dependensi yang diubah, ditambah, atau dihapus saat penyusunan laporan ini. Satu-satunya file yang dibuat adalah laporan ini sendiri.

---

## 1. Ringkasan Eksekutif

Found It! adalah aplikasi web lost & found untuk lingkungan sekolah dengan arsitektur **two-tier terpisah** (bukan monorepo terkelola):

| Layer | Teknologi utama | Status kematangan |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 | Scaffold resmi `create-next-app`, siap dikembangkan |
| Backend | Node.js + Express 5 (REST API) | **Baru tahap rangka (skeleton)** — belum bisa dijalankan |
| Database | MySQL (via `mysql2`) — diklaim Prisma di dokumentasi | **Belum terpasang & kontradiktif** |
| Media storage | Cloudinary | Terpasang, belum dipakai |
| Auth | JWT + bcrypt, RBAC 3 role | Terpasang, middleware masih kosong |
| DevOps | — | Belum ada CI/CD, Docker, atau test |

**Kesimpulan singkat:** fondasi frontend modern dan solid, sementara backend masih jauh dari kondisi runnable. Terdapat **3 temuan blocking** (lihat §7) yang harus dibereskan sebelum fitur apa pun bisa diuji end-to-end.

---

## 2. Peta Repository

```
Found-It/
├── .md/
│   ├── DESIGN/DESIGN.md      (0 byte — masih kosong)
│   └── PRD/PRD.md            (0 byte — masih kosong)
├── backend/
│   ├── src/
│   │   ├── app.js                      (7 baris — hanya import)
│   │   ├── db/index.js                 (10 baris — koneksi MySQL pool)
│   │   ├── controllers/users.controller.js  (1 baris)
│   │   ├── middlewares/authMiddleware.js    (0 byte)
│   │   ├── middlewares/adminMiddleware.js   (0 byte)
│   │   └── routes/users.routes.js           (0 byte)
│   ├── .env                  (berisi kunci konfigurasi, sudah di-gitignore)
│   ├── .gitignore
│   ├── package.json / package-lock.json
│   ├── node_modules/         (⚠ ikut ter-commit ke git)
│   └── README.md             (218 baris — spesifikasi API paling lengkap)
├── frontend/
│   ├── src/app/{layout.js, page.js, globals.css, favicon.ico}
│   ├── public/               (aset default create-next-app)
│   ├── next.config.mjs, eslint.config.mjs, jsconfig.json
│   ├── AGENTS.md             (auto-generated oleh `next dev`)
│   ├── package.json / package-lock.json
│   └── README.md             (template bawaan Next.js)
└── README.md                 (deskripsi produk, 33 baris)
```

**Total file ter-track git:** 4.082 — di antaranya **4.052 (99,3%) adalah `backend/node_modules/`**; hanya **30 file** yang benar-benar source code/dokumentasi proyek.

---

## 3. Frontend

### 3.1 Dependensi runtime

| Paket | Versi di `package.json` | Versi terpasang | Fungsi |
|---|---|---|---|
| `next` | `16.4.0` (pin) | 16.4.0 | Framework React full-stack, App Router |
| `react` | `19.3.0` (pin) | 19.3.0 | UI library |
| `react-dom` | `19.3.0` (pin) | 19.3.0 | Renderer DOM |
| `lucide-react` | `^1.52.0` | 1.52.0 | Ikon SVG (dipakai di `page.js`) |

### 3.2 Dependensi pengembangan

| Paket | Versi | Fungsi |
|---|---|---|
| `tailwindcss` | `^4` → 4.3.3 | Utility-first CSS (CSS-first config) |
| `@tailwindcss/turbopack` | `^4` → 4.3.3 | Loader Tailwind untuk Turbopack |
| `babel-plugin-react-compiler` | `1.0.0` | React Compiler (auto-memoization) |
| `eslint` | `^9` → 9.39.5 | Linter |
| `eslint-config-next` | `16.4.0` | Preset lint Next.js |

### 3.3 Bahasa & tooling

- **JavaScript, bukan TypeScript.** Tidak ada `tsconfig.json`; hanya `jsconfig.json` yang mendefinisikan alias import `@/*` → `./src/*`.
- **ESLint 9 flat config** (`eslint.config.mjs`) memakai `eslint-config-next/core-web-vitals`.
- **Font:** `next/font/google` dengan Geist + Geist Mono, diekspos sebagai CSS variable `--font-geist-sans` / `--font-geist-mono` di `layout.js`.
- **Styling:** `globals.css` memakai `@import "tailwindcss"` dan blok `@theme inline` (pola khas Tailwind v4), plus `prefers-color-scheme: dark` untuk mode gelap otomatis.
- **Node.js minimum:** `>=20.9.0` (dari `engines` paket `next`). Lingkungan lokal terdeteksi **Node v24.20.0 / npm 12.2.0**.

### 3.4 Konfigurasi Next.js (`next.config.mjs`)

```js
cacheComponents: true        // model caching komponen baru
partialPrefetching: true     // prefetch parsial
reactCompiler: true          // aktifkan React Compiler
turbopack.rules["*.css"]     // proses CSS lewat @tailwindcss/turbopack
```

Proyek ini memakai fitur Next.js yang relatif baru/eksperimental. Repo sudah menyertakan `frontend/AGENTS.md` (auto-generated oleh `next dev`) yang memperingatkan bahwa API dan konvensi versi ini berbeda dari Next.js pada umumnya, dan mengarahkan pembaca ke `node_modules/next/dist/docs/`. Untuk pengembangan lanjutan, dokumentasi lokal itu sebaiknya dijadikan rujukan utama.

### 3.5 Kondisi implementasi

Isi UI saat ini sangat minimal — masih scaffold:

- `src/app/page.js` mengekspor komponen `Navigation` berisi 4 tombol (Home, Search, Notifications, Profile) dengan ikon Lucide. Belum ada routing ke halaman lain, belum ada state, belum ada pemanggilan API.
- `src/app/layout.js` masih memakai metadata default (`title: "Create Next App"`), belum disesuaikan dengan produk.
- Belum ada folder `components/`, `lib/`, `hooks/`, atau lapisan akses API.
- Belum ada halaman login, daftar item, maupun detail item sesuai PRD.

---

## 4. Backend

### 4.1 Dependensi

| Paket | Versi | Kategori | Fungsi yang direncanakan |
|---|---|---|---|
| `express` | `^5.2.1` | runtime | HTTP server & routing (Express 5) |
| `bcrypt` | `^6.0.0` | runtime | Hashing password |
| `jsonwebtoken` | `^9.0.3` | runtime | Terbit/verifikasi JWT |
| `zod` | `^4.6.5` | runtime | Validasi skema request |
| `multer` | `^2.4.0` | runtime | Parsing `multipart/form-data` (upload foto) |
| `cloudinary` | `^2.11.0` | runtime | Penyimpanan gambar di cloud |
| `cors` | `^2.8.6` | runtime | Cross-origin antara frontend & backend |
| `dotenv` | `^18.0.6` | runtime | Pemuat variabel `.env` |
| `nodemon` | `^1.14.10` | dev | Auto-restart saat dev |

Catatan: `nodemon` terpasang pada **1.19.4**, padahal range `^1.14.10` sudah sangat tua (rilis 2019). Untuk Node.js 24, versi tersebut tidak lagi ideal — sebaiknya di-`^3.x` agar kompatibel dan aman.

### 4.2 Konfigurasi yang terdeteksi

- `package.json` menetapkan `"type": "commonjs"` dan `main: index.js`, tetapi file entry aktual untuk dev adalah `src/app.js` (via `nodemon src/app.js`). Tidak ada `index.js`.
- Skrip yang tersedia hanya `dev` dan `test` (yang `test`-nya masih placeholder `exit 1`). **Tidak ada skrip `start`**, walaupun `backend/README.md` mendokumentasikan `npm start`.
- `.env` (sudah di-gitignore) mendefinisikan tiga kelompok kunci:
  - Database: `DB_HOST`, `DB_USER`, `DB_DATABASE`
  - JWT: `JWT_SECRET`
  - Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - Sisa/rencana: `SUPABASE_URL`, `SUPABASE_KEY` — **tidak ada dependensi Supabase** di `package.json`, jadi ini kemungkinan sisa eksplorasi.
- Tidak ada file `.env.example`, padahal `backend/.gitignore` sudah mengizinkan `!.env.example` untuk di-commit. Ini menyulitkan onboarding developer baru.

### 4.3 Kondisi implementasi (sangat awal)

| File | Ukuran | Isi |
|---|---|---|
| `src/app.js` | 211 B / 7 baris | **Hanya 7 baris `import`** — tidak ada `express()`, tidak ada `app.listen`, tidak ada route |
| `src/db/index.js` | 292 B | `mysql.createPool()` dengan `host`/`user`/`database` dari env — **tanpa password** |
| `src/controllers/users.controller.js` | 32 B | Satu baris `const bcrypt = require("bcrypt")` |
| `src/middlewares/authMiddleware.js` | 0 B | Kosong |
| `src/middlewares/adminMiddleware.js` | 0 B | Kosong |
| `src/routes/users.routes.js` | 0 B | Kosong |

Artinya: **seluruh spesifikasi di `backend/README.md` (auth, users, items, claims, upload, RBAC) masih berupa rencana**, belum ada implementasinya. `backend/README.md` justru merupakan artefak paling matang di sisi backend dan berfungsi sebagai kontrak API.

### 4.4 Inkonsistensi sistem modul (ESM vs CJS)

Ini temuan penting. Dalam satu proyek yang sama terdapat tiga gaya berbeda:

| File | Gaya | Masalah |
|---|---|---|
| `package.json` | `"type": "commonjs"` | Menetapkan default CJS |
| `src/app.js` | `import express from "express"` (ESM) | Akan gagal dijalankan sebagai CJS |
| `src/db/index.js` | `import` + `await` di top-level (ESM) | Top-level `await` tidak valid di CJS |
| `src/controllers/users.controller.js` | `require("bcrypt")` (CJS) | Konsisten dengan `type`, tapi beda dengan dua file di atas |

Kombinasi ini membuat backend **tidak konsisten secara modul dan berpotensi error saat start**. Perlu satu keputusan: pindah ke ESM (`"type": "module"`) atau tetap CJS dan ganti semua `import` menjadi `require`. Mengingat Express 5 dan Node 24, ESM adalah pilihan yang lebih future-proof.

---

## 5. Database & Penyimpanan

Terdapat **kontradiksi antara dokumentasi dan kode aktual**:

| Aspek | Klaim `backend/README.md` | Kenyataan di repo |
|---|---|---|
| Driver/ORM | "MySQL with **Prisma ORM**" | `src/db/index.js` memakai `mysql2/promise` (raw pool) |
| Perintah setup | `npx prisma migrate dev`, `npx prisma db seed` | Tidak ada `prisma/` dir, tidak ada `schema.prisma`, `prisma` tidak terpasang |
| Dependensi | Prisma sebagai dependency | `mysql2` **tidak ada di `package.json`** dan **tidak terpasang di `node_modules`** |
| Model data | User, Item, Claim (terdokumentasi lengkap) | Belum ada definisi skema apa pun |

**Dampak:** `src/db/index.js` akan gagal pada `import mysql from 'mysql2/promise'` karena modulnya tidak ada. Ini adalah **blocking issue** yang harus diputuskan lebih dulu: raw `mysql2` (sesuai kode) atau Prisma (sesuai dokumentasi). Jika Prisma yang dipilih, `src/db/index.js` perlu ditulis ulang dan `README` sudah benar; jika `mysql2` yang dipilih, `README` harus dikoreksi dan `mysql2` ditambahkan ke dependency.

**Penyimpanan gambar:** Cloudinary sudah menjadi pilihan (dependensi + kredensial env), dengan Multer sebagai perantara upload. Belum ada kode integrasi. Alternatif seperti Supabase Storage tampaknya pernah dipertimbangkan (kunci env `SUPABASE_*`) namun belum diputuskan.

---

## 6. Autentikasi & Otorisasi

Dirancang dengan pola yang rapi dan terdokumentasi baik:

- **JWT bearer token** pada header `Authorization: Bearer <token>`, diterbitkan saat login (tanpa self-registration).
- **bcrypt** untuk hashing password.
- **3 role:** `admin`, `teacher`, `student`, dengan matriks izin yang sudah eksplisit di `backend/README.md` (termasuk aturan kepemilikan: teacher hanya bisa mengubah/menghapus item miliknya sendiri).
- **Alur request yang direncanakan:** `route → authenticate → authorize → validate → error handler → controller`.
- **State machine** yang jelas: Item `FOUND → CLAIMED → RETURNED`; Claim `PENDING → APPROVED | REJECTED`.

Yang belum ada: seluruh middleware, skema Zod, dan controller. Jadi arsitektur otorisasinya sudah dipikirkan, tetapi nol persen terimplementasi.

---

## 7. Temuan & Risiko

### Blocking (harus diselesaikan sebelum backend bisa jalan)

1. **`mysql2` tidak terdaftar dan tidak terpasang** — `src/db/index.js` akan langsung error saat import. Database layer harus diputuskan dan dependensinya ditambahkan.
2. **Percampuran ESM/CJS** — `"type": "commonjs"` bertabrakan dengan `import` di `app.js` dan `db/index.js`. Harus dipilih satu gaya modul.
3. **`app.js` belum menjadi aplikasi Express** — tidak ada instansiasi `express()`, `app.listen()`, maupun route. Backend belum bisa dijalankan sama sekali.

### Penting (kebersihan & kualitas)

4. **`backend/node_modules` ikut ter-commit** — 4.052 file dari 4.082 total file ter-track. Ini membuat repo berat, diff berisik, dan review praktis tidak mungkin. `backend/.gitignore` sudah ada dan mengabaikan `/node_modules`, tetapi isinya terlanjur ter-track sebelum aturan itu dibuat, sehingga tetap terlacak.
5. **Kontradiksi dokumentasi database** (Prisma vs `mysql2`) — sumber kebingungan utama bagi kontributor berikutnya.
6. **Tidak ada `.env.example`** — padahal `.gitignore` sudah menyiapkan pengecualian untuknya. Developer baru tidak tahu variabel apa saja yang dibutuhkan.
7. **Tidak ada skrip `start`** di `package.json` backend, padahal `README` mendokumentasikannya.
8. **`nodemon` 1.19.4** sudah usang untuk Node.js modern.
9. **Tidak ada strategi testing** — skrip `test` masih placeholder, tidak ada framework test (Jest/Vitest/Supertest) di kedua sisi.

### Ringan (catatan perawatan)

10. **`backend/.env` berisi kredensial** — sudah aman karena ter-gitignore, tetapi nilainya sebaiknya dirotasi jika pernah dibagikan lewat chat/screenshot.
11. **Kunci `SUPABASE_*` tanpa dependensi** — sisa eksplorasi, berpotensi menyesatkan.
12. **Metadata frontend belum disesuaikan** — masih `"Create Next App"`.
13. **Dokumen `.md/DESIGN/DESIGN.md` dan `.md/PRD/PRD.md` masih 0 byte** — belum diisi.
14. **Dua branch (`main`, `development`) dengan isi hampir identik**; branch `development` justru lebih maju dalam hal menghapus `node_modules` dari tracking. Perlu disepakati alur kerja branch.

---

## 8. Rekomendasi

Prioritas berdasarkan dampak:

**Jangka pendek — buat backend bisa jalan**
1. Tetapkan satu gaya modul (disarankan ESM: `"type": "module"`, lalu ubah `require` di controller).
2. Pilih dan pasang driver database. Jika mengikuti kode yang ada: tambahkan `mysql2`. Jika mengikuti dokumentasi: pasang `prisma` + buat `prisma/schema.prisma` untuk model User, Item, Claim.
3. Lengkapi `src/app.js`: instansiasi Express, `cors`, `express.json()`, mount router, dan `app.listen` dengan `PORT`.
4. Isi middleware `authMiddleware` (verifikasi JWT) dan `adminMiddleware` (cek role) beserta error handler global.

**Jangka menengah — kualitas & kolaborasi**
5. Bersihkan git: hapus `backend/node_modules` dari tracking (`git rm -r --cached backend/node_modules`) dan pastikan `.gitignore` berlaku efektif.
6. Tambahkan `backend/.env.example` dan skrip `start` (`node src/app.js`).
7. Perbarui `nodemon` ke `^3.x`.
8. Tambahkan testing: Vitest/Jest + Supertest di backend, dan minimal lint di CI.

**Jangka panjang — produk**
9. Isi `.md/PRD/PRD.md` dan `.md/DESIGN/DESIGN.md` agar kontrak API di `backend/README.md` punya padanan produk dan desain.
10. Bangun lapisan UI frontend: halaman login, daftar item dengan pencarian, detail item, form posting untuk teacher, dan panel admin.
11. Pertimbangkan lapisan akses API terpusat di frontend (mis. `src/lib/api.js`) plus middleware/proxy Next.js untuk menyimpan token.
12. Tambahkan CI (GitHub Actions) untuk lint + build kedua sisi, dan tentukan target deployment (Vercel untuk frontend, host Node/MySQL untuk backend).

---

## 9. Matriks Ringkas

| Kategori | Teknologi | Versi | Terpasang | Terimplementasi |
|---|---|---|---|---|
| Runtime frontend | Next.js | 16.4.0 | Ya | Sebagian (scaffold) |
| UI | React / React DOM | 19.3.0 | Ya | Sebagian |
| Styling | Tailwind CSS (+ Turbopack plugin) | 4.3.3 | Ya | Ya (konfigurasi dasar) |
| Ikon | lucide-react | 1.52.0 | Ya | Ya (satu komponen) |
| Compiler | babel-plugin-react-compiler | 1.0.0 | Ya | Aktif di config |
| Lint frontend | ESLint + eslint-config-next | 9.39.5 / 16.4.0 | Ya | Ya |
| Bahasa | JavaScript (JSX) | — | Ya | Ya |
| Runtime backend | Node.js | 24.20.0 (lokal) | Ya | Ya |
| Framework backend | Express | 5.2.1 | Ya | Belum (hanya import) |
| Auth | jsonwebtoken + bcrypt | 9.0.3 / 6.0.0 | Ya | Belum |
| Validasi | Zod | 4.6.5 | Ya | Belum |
| Upload | Multer + Cloudinary | 2.4.0 / 2.11.0 | Ya | Belum |
| CORS / env | cors + dotenv | 2.8.6 / 18.0.6 | Ya | Sebagian (env) |
| Database | MySQL (`mysql2` di kode) | — | **Tidak** | Belum |
| ORM | Prisma (klaim dokumentasi) | — | **Tidak** | Belum |
| Dev server | Nodemon | 1.19.4 | Ya | Ya |
| Testing | — | — | Tidak | Tidak |
| CI/CD & Docker | — | — | Tidak | Tidak |

---

*Laporan disusun dari pembacaan statis repository pada commit `cacbc2b`. Tidak ada file kode yang dimodifikasi.*
