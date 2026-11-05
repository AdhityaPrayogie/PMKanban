# PRD: Product Requirements Document

| | |
|---|---|
| **Produk** | PMkanban (Project Management Kanban + Helpdesk IT) |
| **Versi dokumen** | 1.1 |
| **Tanggal** | 5 November 2026 |
| **Status** | Draft untuk review |
| **Acuan** | [BRD.md](BRD.md) (kebutuhan bisnis, glosarium), [README.md](../README.md) (instalasi, API) |

## Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 5 Nov 2026 | Draft awal |
| 1.1 | 5 Nov 2026 | Tambah user story, kriteria penerimaan, matriks akses & alur Project Management, peta layar, pesan error, kamus data, skenario UAT |

---

## 1. Ringkasan Produk

PMkanban adalah aplikasi web internal yang terdiri dari dua modul:

1. **Project Management**: board Kanban per unit, timeline, sub-task, komentar, lampiran, chat, dan notifikasi realtime.
2. **Helpdesk IT**: logbook layanan IT untuk unit TD (antrean pengajuan, input langsung, durasi, biaya barang, dashboard, tren, export Excel), ditambah halaman **Pengajuan** untuk semua pengguna.

Istilah (TD, PIC, Ambil, dll.) dijelaskan di [BRD §2 Glosarium](BRD.md#2-glosarium).

## 2. Pengguna dan Peran

| Peran | Siapa | Hak utama |
|---|---|---|
| Pengguna | Semua akun `active` | Board, tugas, chat, notifikasi, Pengajuan Helpdesk |
| Admin | `role = admin` | + approve/reject/hapus pengguna, hapus board siapa pun |
| Staf TD | `unit_id = unit_it` | + seluruh modul Helpdesk IT |
| Admin TD | Staf TD + `role = admin` | + master kategori / unit kerja, hapus tiket siapa pun |

### 2.1 Persona

- **Rina, staf Markom:** printer di ruangannya rusak. Ia membuka *Pengajuan Helpdesk*, memilih kategori Hardware dan lokasinya, lalu memantau statusnya sampai *Selesai*.
- **Budi, staf IT (TD):** menerima notifikasi pengajuan dan klik *Ambil*. Setelah printer diperbaiki, ia mengisi tindakan, jam selesai, dan barang "Tinta hitam × 2 @ Rp 85.000".
- **Sari, kepala TD (Admin TD):** setiap awal bulan membuka *Trend Helpdesk* untuk melihat volume, durasi, dan biaya, lalu mengunduh Excel untuk laporan. Ia juga mengelola master kategori.
- **Andi, koordinator proyek PPSDM:** membuat board pelatihan, membagi tugas ke anggota tim, dan memantau tenggat lewat Timeline.

## 3. User Story

| ID | Sebagai… | Saya ingin… | Agar… | FR |
|---|---|---|---|---|
| US-01 | calon pengguna | mendaftar akun dengan unit saya | bisa memakai aplikasi setelah disetujui | FR-A1 |
| US-02 | admin | menyetujui atau menolak pendaftaran | hanya orang yang berhak yang bisa masuk | FR-A4 |
| US-03 | koordinator proyek | membuat board dan kolom untuk unit saya | pekerjaan tim terlihat di satu tempat | FR-P1, FR-P2 |
| US-04 | koordinator proyek | membuat tugas dengan assignee, prioritas, dan tenggat | tanggung jawab dan target jelas | FR-P3 |
| US-05 | anggota tim | memindahkan kartu tugas antar kolom dengan drag-and-drop | status pekerjaan selalu terbaru | FR-P2 |
| US-06 | anggota tim | berkomentar dan me-mention rekan di tugas | diskusi tersimpan bersama tugasnya | FR-P4, FR-P7 |
| US-07 | anggota tim | diberi tahu saat ditugaskan atau tenggat mendekat | tidak ada tugas yang terlewat | FR-P7 |
| US-08 | koordinator proyek | melihat timeline tugas dan sub-task | jadwal proyek mudah dipantau | FR-P5 |
| US-09 | pengguna | chat langsung dengan rekan | koordinasi cepat tanpa keluar aplikasi | FR-P6 |
| US-10 | pengguna unit | mengajukan permintaan bantuan IT | permintaan saya tercatat resmi | FR-H1, FR-H2 |
| US-11 | pengguna unit | melihat status pengajuan saya | tahu kapan masalah ditangani | FR-H4, FR-H6 |
| US-12 | staf TD | melihat antrean pengajuan dan mengambil tiket | permintaan tidak terlupa dan tidak dikerjakan ganda | FR-T2 |
| US-13 | staf TD | mencatat pekerjaan yang datang via telepon | semua layanan masuk logbook | FR-T4 |
| US-14 | staf TD | mencatat barang yang dipakai beserta harganya | biaya perbaikan bisa dipertanggungjawabkan | FR-T6 |
| US-15 | staf TD | mencari dan memfilter tiket | cepat menemukan kasus lama | FR-T7 |
| US-16 | kepala TD | melihat dashboard dan tren 12 bulan | bisa merencanakan SDM dan anggaran | FR-T11, FR-T12 |
| US-17 | kepala TD | mengunduh Laporan_Logbook Excel | laporan bulanan tanpa rekap manual | FR-T13 |
| US-18 | admin TD | mengelola kategori dan unit kerja | pilihan di form selalu sesuai kondisi | FR-T14 |
| US-19 | kepala TD | melihat riwayat perubahan tiket | tahu siapa mengubah apa dan kapan | FR-T9 |

## 4. Kebutuhan Fungsional

### 4.1 Autentikasi dan Akun

| ID | Kebutuhan | BRD |
|---|---|---|
| FR-A1 | Register dengan nama, email, password (min. 6 karakter), dan unit. Akun berstatus `pending`, semua admin dinotifikasi | BR-05 |
| FR-A2 | Login hanya untuk akun `active`; sesi berupa token HMAC di cookie `auth_token` | BR-05, RB-01 |
| FR-A3 | Semua API mewajibkan sesi; identitas pengguna diambil dari sesi | RB-10 |
| FR-A4 | Admin: approve / reject / hapus pengguna | BR-05 |
| FR-A5 | Master unit: tambah dan ubah unit (kode unik) | |
| FR-A6 | Pengaturan profil: nama, avatar, password (min. 6 karakter) | |
| FR-A7 | Satu tombol logout di menu pengguna (header) | |

### 4.2 Project Management

| ID | Kebutuhan | BRD |
|---|---|---|
| FR-P1 | Boards Hub: board per unit dengan stage `Planning`, `Active`, `Review`, `Completed` dan sub-board. Hapus board hanya oleh pemilik atau admin | BR-01, RB-11 |
| FR-P2 | Kanban: tambah / ubah / hapus kolom; kartu tugas dipindah dengan drag-and-drop | BR-01 |
| FR-P3 | Detail tugas: judul, deskripsi, prioritas (`Low`, `Medium`, `High`, `Urgent`), tanggal mulai / tenggat, assignee, label, customer, tag unit, sub-task | BR-02 |
| FR-P4 | Komentar (bisa dengan gambar), lampiran file (maks 50 MB), log aktivitas | BR-02, BR-03 |
| FR-P5 | Timeline / Gantt dengan sub-task bertingkat | BR-01 |
| FR-P6 | Chat P2P realtime (SSE): indikator mengetik, status dibaca, status online | BR-03 |
| FR-P7 | Notifikasi lonceng: `assignment` (ditugaskan), `mention` (di komentar), `deadline` (tenggat ≤ besok dan tugas belum di kolom Done/Selesai, maks 1× per hari per tugas), `system` | BR-04 |
| FR-P8 | Gambar chat / komentar dikompres otomatis (maks 20 MB) | |
| FR-P9 | Dark mode dan keyboard shortcut (`Ctrl+K`, `/`, `N`, `B`, `T`, `M`, `D`, `?`, `Esc`) | |

### 4.3 Pengajuan Helpdesk (`/pengajuan`, semua pengguna)

| ID | Kebutuhan | BRD |
|---|---|---|
| FR-H1 | Form pengajuan: kategori, lokasi / unit kerja, isi keluhan (semua wajib) | BR-06 |
| FR-H2 | Pengajuan tersimpan dengan status `Open`; field lain dari klien (status, staf, pemohon) diabaikan | RB-10 |
| FR-H3 | Semua staf TD aktif mendapat notifikasi realtime saat ada pengajuan baru | BR-07 |
| FR-H4 | Pemohon melihat daftar pengajuannya sendiri beserta status terkini | BR-06, BR-14 |
| FR-H5 | Pemohon bisa menghapus pengajuan selama masih `Open` | RB-07 |
| FR-H5a | Maksimal 10 pengajuan `Open` per pemohon (anti-spam); lebih dari itu ditolak 429 | |
| FR-H6 | Pemohon dinotifikasi saat tiket diambil dan saat statusnya berubah | BR-06 |

### 4.4 Helpdesk IT (`/helpdesk`, khusus TD)

| ID | Kebutuhan | BRD |
|---|---|---|
| FR-T1 | Halaman dijaga di server: pengguna non-TD diarahkan ke `/pengajuan`, API mengembalikan 403 | BR-14 |
| FR-T2 | **Antrian**: daftar tiket `Open` (terlama di atas). *Ambil* → status `Proses`, staf = diri sendiri, jam mulai = sekarang jika kosong. Ambil ganda ditolak (409) | BR-07 |
| FR-T3 | **Tugaskan**: membuka form edit untuk memilih staf TD lain; staf baru dinotifikasi | BR-07 |
| FR-T4 | **Input langsung**: tanggal, jam mulai/selesai, PIC (wajib; nama baru otomatis masuk master), kategori, unit kerja, isi, tindakan, status, jenis pelayanan, staf IT | BR-08 |
| FR-T5 | **Total menit** = jam selesai − jam mulai, tampil langsung di form dan dihitung DB (generated column) | BR-09 |
| FR-T6 | **Biaya / barang keluar**: banyak baris berisi nama barang (maks 150 karakter), qty (1–9999), dan harga satuan (Rp 0 – 2 miliar, bulat), maksimal 50 baris. Baris bisa ditambah dan dihapus; total biaya tampil langsung | BR-10, RB-09 |
| FR-T7 | **Data**: tabel tiket dengan kolom Total Menit dan Biaya. Filter tanggal, status, kategori, staf, sumber, dan pencarian teks (isi, tindakan, PIC, pemohon, unit kerja); 25 tiket per halaman | BR-12 |
| FR-T8 | Edit tiket dengan row lock (dua staf yang menyimpan bersamaan diproses berurutan) | BR-13 |
| FR-T9 | **Riwayat**: setiap create / ambil / update mencatat pengguna, waktu, dan field yang berubah (lama → baru), termasuk biaya | BR-13 |
| FR-T10 | Hapus permanen (riwayat, staf, dan biaya ikut terhapus); hanya pembuat atau admin TD, dengan konfirmasi | RB-08 |
| FR-T11 | **Dashboard** per bulan: kartu Total, Hari Ini, Open, Proses, Selesai, Batal, Total Menit, Total Biaya. Grafik tiket per hari (klik batang membuka modal tiket hari itu, lengkap dengan rincian barang), aktivitas terbaru, dan per kategori. Periode default = bulan tiket terakhir | BR-12 |
| FR-T12 | **Trend Helpdesk**: grafik 12 bulan (klik membuka dashboard bulan itu) dan rekap per bulan: tiket, selesai, total & rata-rata menit, biaya, jumlah per kategori, dengan baris total | BR-12 |
| FR-T13 | **Export Excel** periode `start`–`end` (opsional filter kategori), format Laporan_Logbook ditambah kolom Barang dan Biaya (Rp); baris TOTAL MENIT dan TOTAL BIAYA | BR-11 |
| FR-T14 | **Master Data** (admin TD): kategori, unit kerja, PIC. Tambah, ganti nama, aktif/nonaktif (tidak dihapus) | RB-03, RB-12 |

## 5. Kriteria Penerimaan (Acceptance Criteria)

Format: **Diberikan** (kondisi awal) / **Ketika** (aksi) / **Maka** (hasil yang diharapkan).

### 5.1 Autentikasi

| ID | Diberikan | Ketika | Maka |
|---|---|---|---|
| AC-A1 | Email belum terdaftar | Register dengan data lengkap & password ≥ 6 | Akun dibuat `pending`, admin dapat notifikasi, pengguna belum bisa login |
| AC-A2 | Email sudah terdaftar | Register dengan email sama | Ditolak 409 "Email sudah terdaftar" |
| AC-A3 | Password < 6 karakter | Register / ganti password | Ditolak dengan pesan minimal 6 karakter |
| AC-A4 | Akun `pending` | Login | Ditolak 403: "menunggu persetujuan" |
| AC-A5 | Akun `rejected` | Login | Ditolak 403: "ditolak atau dinonaktifkan" |
| AC-A6 | Akun `active` | Login dengan password benar | Masuk ke halaman utama, cookie `auth_token` terpasang |
| AC-A7 | Belum login | Membuka halaman apa pun | Diarahkan ke `/login` |
| AC-A8 | Belum login | Memanggil API apa pun | 401 Unauthorized |
| AC-A9 | Pengguna non-admin | Memanggil API admin pengguna | 403 |

### 5.2 Project Management

| ID | Diberikan | Ketika | Maka |
|---|---|---|---|
| AC-P1 | Pengguna login | Membuat board baru | Board tampil di Boards Hub dengan pemilik = pengguna |
| AC-P2 | Board milik orang lain, pengguna bukan admin | Menghapus board | Ditolak 403 |
| AC-P3 | Board punya kolom | Kartu di-drag ke kolom lain | Kartu pindah dan posisinya tersimpan setelah refresh |
| AC-P4 | Tugas baru dengan assignee B | Disimpan oleh A | B mendapat notifikasi `assignment` realtime |
| AC-P5 | Komentar me-mention B | Disimpan | B mendapat notifikasi `mention` |
| AC-P6 | Tugas B tenggat besok, belum di kolom Done/Selesai | B membuka notifikasi | Muncul 1 notifikasi `deadline`, tidak berulang di hari yang sama |
| AC-P7 | Lampiran > 50 MB | Diunggah | Ditolak dengan pesan ukuran |
| AC-P8 | Tugas punya sub-task | Membuka Timeline | Sub-task tampil menjorok di bawah tugas utama |
| AC-P9 | A dan B membuka chat | A mengirim pesan | B menerima tanpa refresh; status dibaca berubah saat B membuka |

### 5.3 Pengajuan Helpdesk

| ID | Diberikan | Ketika | Maka |
|---|---|---|---|
| AC-H1 | Pengguna non-TD login | Mengirim pengajuan lengkap | Tiket `Open` dibuat, pemohon = pengguna, semua staf TD dapat notifikasi |
| AC-H2 | Kategori / lokasi / isi kosong | Mengirim | Ditolak 400 |
| AC-H3 | Body berisi `status: Selesai` dan `requested_by` orang lain | Mengirim | Diabaikan: status tetap `Open`, pemohon tetap pengguna sesi |
| AC-H4 | Pengguna punya pengajuan | Membuka `/pengajuan` | Hanya pengajuan miliknya yang tampil |
| AC-H5 | Pengajuan masih `Open` | Pemohon menghapus | Terhapus |
| AC-H6 | Pengajuan sudah `Proses` | Pemohon menghapus | Ditolak 409 |
| AC-H7 | Staf TD mengambil / mengubah status | Disimpan | Pemohon dapat notifikasi status baru |
| AC-H8 | Pemohon sudah punya 10 pengajuan `Open` | Mengirim pengajuan ke-11 | Ditolak 429 "Maksimal 10 pengajuan yang belum diproses" |

### 5.4 Helpdesk IT

| ID | Diberikan | Ketika | Maka |
|---|---|---|---|
| AC-T1 | Pengguna non-TD | Membuka `/helpdesk` | Diarahkan ke `/pengajuan` |
| AC-T2 | Pengguna non-TD | Memanggil list / stats / export / ambil | 403 |
| AC-T3 | Tiket `Open` di antrean | Staf TD klik *Ambil* | Status `Proses`, staf = dirinya, jam mulai terisi, tiket keluar dari antrean |
| AC-T4 | Tiket sudah diambil | Staf lain klik *Ambil* | 409, tidak ada perubahan |
| AC-T5 | Form input | Jam selesai < jam mulai | Form menampilkan "jam selesai sebelum jam mulai"; API menolak 400 |
| AC-T6 | Form input jam 08:00–08:45 | Diisi | Tampil "Total: 45 menit"; setelah disimpan kolom Total Menit = 45 |
| AC-T7 | Status selain `Open` tanpa staf | Disimpan | Ditolak 400 "Pilih minimal 1 staf IT" |
| AC-T8 | Staf dari unit lain dipilih (via API) | Disimpan | Ditolak 400 "Staf IT harus user aktif unit TD" |
| AC-T9 | Input PIC nama baru | Disimpan | PIC otomatis masuk master, form memberi tanda "PIC baru" |
| AC-T10 | Form biaya | Tambah 2 barang: Tinta hitam 2 × 85.000, Kabel LAN 1 × 15.000 | Total biaya tampil Rp 185.000; setelah disimpan kolom Biaya = Rp 185.000 dan nama barang tampil |
| AC-T11 | Barang qty 0, harga negatif / desimal, atau nama kosong | Disimpan | Ditolak 400 dengan nama barang yang salah |
| AC-T12 | Tiket diedit (status & biaya berubah) | Disimpan | Riwayat mencatat pengguna, waktu, status lama → baru, biaya lama → baru |
| AC-T13 | Staf TD bukan pembuat & bukan admin | Menghapus tiket | Tombol hapus tidak tampil; API 403 |
| AC-T14 | Admin TD | Menghapus tiket (konfirmasi) | Tiket, staf, biaya, dan riwayatnya terhapus |
| AC-T15 | Dashboard | Klik batang tanggal 10 | Modal menampilkan semua tiket tanggal 10, urut jam mulai, dengan rincian barang |
| AC-T16 | Tidak ada tiket di bulan berjalan | Membuka dashboard | Periode otomatis = bulan tiket terakhir |
| AC-T17 | Trend Helpdesk | Klik batang bulan | Pindah ke dashboard bulan itu |
| AC-T18 | Data Sep 2026 (5 tiket, 180 menit) | Export 1–30 Sep 2026 | File `Laporan_Logbook_2026-09-01_sd_2026-09-30.xlsx`, sheet "Sep 26", 5 baris, TOTAL MENIT 180, TOTAL BIAYA terisi |
| AC-T19 | Export tanpa tanggal | Klik Excel | Peringatan "Isi tanggal mulai dan akhir" |
| AC-T20 | Isi tiket diawali `=` (formula) | Di-export | Sel diawali `'` sehingga tidak dieksekusi Excel |
| AC-T21 | Staf TD bukan admin | Menambah kategori via API | 403 |
| AC-T22 | Kategori dinonaktifkan | Membuka form input | Kategori tidak muncul di pilihan; tiket lama tetap menampilkan namanya |
| AC-T23 | Dua staf mengedit tiket yang sama bersamaan | Keduanya menyimpan | Keduanya tersimpan berurutan; riwayat mencatat dua perubahan terpisah |

## 6. Matriks Akses

### 6.1 Project Management

| Aksi | Pengguna | Pemilik board | Admin |
|---|---|---|---|
| Lihat board, tugas, timeline | ✔ | ✔ | ✔ |
| Buat board, kolom, tugas, komentar, lampiran | ✔ | ✔ | ✔ |
| Pindah / ubah / hapus tugas & kolom | ✔ | ✔ | ✔ |
| Hapus board | ✘ | ✔ | ✔ |
| Chat P2P (percakapan sendiri) | ✔ | ✔ | ✔ |
| Approve / reject / hapus pengguna | ✘ | ✘ | ✔ |
| Tambah / ubah master unit | ✔ ¹ | ✔ ¹ | ✔ |

¹ API master unit saat ini hanya mewajibkan login, belum membatasi ke admin (lihat Backlog #9).

### 6.2 Helpdesk

| Aksi | Non-TD | Staf TD | Admin TD |
|---|---|---|---|
| Kirim / lihat / hapus (Open) pengajuan sendiri | ✔ | ✔ | ✔ |
| Baca master kategori & unit kerja | ✔ | ✔ | ✔ |
| Buka `/helpdesk`, daftar tiket, stats, export | ✘ | ✔ | ✔ |
| Ambil, input, edit tiket, isi biaya | ✘ | ✔ | ✔ |
| Master PIC | ✘ | ✔ | ✔ |
| Tulis master kategori / unit kerja | ✘ | ✘ | ✔ |
| Hapus tiket | ✘ | milik sendiri | semua |

Matriks 6.2 diuji otomatis oleh `scripts/test_helpdesk_access.mjs`.

## 7. Alur Utama

### 7.1 Registrasi

```
Calon pengguna          Sistem                         Admin
──────────────          ──────                         ─────
Register ─────────────▶ Akun pending + notif admin ──▶ Kelola Pengguna
                                                        Approve / Reject
Login ◀──────────────── active: masuk │ rejected: ditolak
```

### 7.2 Project Management

```
Koordinator              Sistem                          Anggota tim
───────────              ──────                          ───────────
Buat board + kolom ────▶ Board di Boards Hub
Buat tugas + assignee ─▶ Notif assignment ─────────────▶ Lonceng
                                                          Drag kartu ke "Proses"
                         Log aktivitas ◀──────────────── Komentar @mention
Notif mention ◀───────── 
                         Tenggat ≤ besok ──────────────▶ Notif deadline
                                                          Drag ke "Selesai"
Pantau Timeline ◀─────── 
```

### 7.3 Helpdesk

```
Pemohon (semua unit)       Staf TD                          Sistem
────────────────────       ───────                          ──────
Kirim pengajuan ──────────────────────────────────────────▶ Tiket Open + notif ke TD
                           Antrian → Ambil ────────────────▶ Proses, jam mulai, notif pemohon
                           Kerjakan; isi tindakan, jam
                           selesai, barang & harga
                           Simpan status Selesai ──────────▶ Riwayat + notif pemohon
Lihat status "Selesai" ◀───────────────────────────────────
                           (telepon / datang) Input ───────▶ Tiket langsung + riwayat
                           Awal bulan: Trend / Export ─────▶ Excel Laporan_Logbook
```

### 7.4 Status Tiket

```
            Ambil / Tugaskan          Simpan
  Open ─────────────────────▶ Proses ─────────▶ Selesai
    │                           │
    └──────── Batal ◀───────────┘
```

Status bisa diubah bebas lewat form edit; diagram di atas adalah alur normal.

## 8. Peta Layar

| Layar | Rute | Akses | Isi utama |
|---|---|---|---|
| Login / Register | `/login` | Publik | Form login, form register dengan pilihan unit |
| Boards Hub | `/` | Pengguna | Daftar board per unit dan stage |
| Kanban | `/` (pilih board) | Pengguna | Kolom, kartu, drag-and-drop, tombol tugas baru |
| Timeline | `/` (tombol / `T`) | Pengguna | Gantt tugas & sub-task |
| Detail tugas | panel samping | Pengguna | Field tugas, sub-task, komentar, lampiran, aktivitas |
| Chat | `/messages` + mini widget | Pengguna | Daftar percakapan, pesan, gambar |
| Notifikasi | lonceng di header | Pengguna | Daftar notifikasi, tandai dibaca |
| Pengaturan | modal | Pengguna | Profil, avatar, password |
| Kelola Pengguna / Master Unit | modal | Admin | Approve/reject/hapus; tambah/ubah unit |
| Pengajuan Helpdesk | `/pengajuan` | Pengguna | Form pengajuan, daftar pengajuan sendiri |
| Helpdesk IT | `/helpdesk` | Staf TD | Tab Dashboard, Antrian, Input, Data, Trend Helpdesk, Master Data (admin TD) |

Menu sidebar **Layanan IT** berisi *Pengajuan Helpdesk* (semua pengguna) dan *Helpdesk IT* (hanya tampil untuk TD).

> Screenshot / mockup tiap layar belum ada. Tambahkan setelah UAT di browser (Lampiran B).

## 9. Pesan Error Utama (Helpdesk)

| Kondisi | HTTP | Pesan |
|---|---|---|
| Tidak login | 401 | Unauthorized |
| Bukan TD | 403 | Khusus unit TD |
| Tulis master kategori / unit kerja bukan admin TD | 403 | Khusus admin unit TD |
| Hapus tiket bukan pembuat / admin TD | 403 | Hanya pembuat tiket atau admin TD yang bisa menghapus |
| Tanggal salah | 400 | Tanggal tidak valid |
| Jam salah format | 400 | Format jam tidak valid (HH:MM) |
| Jam selesai < mulai | 400 | Jam selesai harus setelah jam mulai |
| Kategori kosong | 400 | Kategori wajib dipilih |
| Isi kosong | 400 | Isi helpdesk wajib diisi |
| Teks terlalu panjang | 400 | Teks maksimal 5000 karakter |
| Tanpa staf (status ≠ Open) | 400 | Pilih minimal 1 staf IT untuk status selain Open (input langsung: Pilih minimal 1 staf IT) |
| Staf bukan TD aktif | 400 | Staf IT harus user aktif unit TD |
| PIC kosong (input langsung) | 400 | PIC (peminta) wajib dipilih |
| Barang tidak valid | 400 | Nama barang wajib diisi (maks 150 karakter) / Qty "…" harus 1-9999 / Harga "…" tidak valid / Daftar biaya tidak valid (maks 50 barang) |
| Pengajuan tidak lengkap | 400 | Kategori, lokasi, dan keluhan wajib diisi |
| Id master tidak ada | 400 | PIC / kategori / unit kerja / staf tidak ditemukan |
| Lolos validasi tapi ditolak CHECK DB | 400 | Data tidak valid: cek jam atau peminta (PIC) |
| Tiket tidak ada | 404 | Tiket tidak ditemukan |
| Ambil tiket yang bukan Open | 409 | Tiket #… sudah diambil / tidak Open lagi |
| Hapus pengajuan yang sudah diproses | 409 | Pengajuan sudah diproses TD, tidak bisa dihapus |
| Nama master duplikat (ganti nama) | 409 | Nama sudah ada |
| Master masih dipakai | 409 | Data masih dipakai tiket lain |
| > 10 pengajuan Open | 429 | Maksimal 10 pengajuan yang belum diproses |
| Export tanpa tanggal | 400 | Parameter start dan end (YYYY-MM-DD) wajib diisi |

## 10. Kebutuhan Non-Fungsional

| ID | Kebutuhan |
|---|---|
| NFR-1 | **Keamanan**: semua API wajib sesi; akses helpdesk dicek di server (halaman dan API); query terparameter; teks export dilindungi dari formula injection Excel; password di-hash PBKDF2; `AUTH_SECRET` wajib di production |
| NFR-2 | **Validasi** di batas API: tanggal, format jam, id, panjang teks (maks 5000), status/jenis enum, qty/harga bulat dalam rentang, ukuran file |
| NFR-3 | **Integritas**: tulis tiket + staf + biaya + riwayat dalam satu transaksi; constraint DB (CHECK, FK, UNIQUE) sebagai lapis terakhir |
| NFR-4 | **Realtime**: chat & notifikasi via SSE; kegagalan notifikasi tidak menggagalkan penyimpanan data |
| NFR-5 | **Aksesibilitas**: label pada semua input, `aria-live` untuk total menit/biaya, grafik bisa dioperasikan keyboard dengan tooltip teks, angka selalu tampil sebagai teks (tidak hanya warna/batang) |
| NFR-6 | **Tampilan**: responsif (mobile–desktop), dark mode, mengikuti tema "True Blue" `#034694` |
| NFR-7 | **Kinerja**: daftar tiket dipaging (25, maks 200 per request); pencarian di-debounce 300 ms; gambar dikompres |
| NFR-8 | **Browser**: Chrome, Edge, Firefox versi terbaru |
| NFR-9 | **Teruji**: `scripts/check_helpdesk.mjs` (validasi/diff/biaya) dan `scripts/test_helpdesk_access.mjs` (matriks akses, biaya, export) |
| NFR-10 | **Deploy**: satu server Node.js 20+ dan MySQL 8 / MariaDB; backup database harian |

## 11. Status Rilis

| Item | Status |
|---|---|
| Project Management (board, Kanban, timeline, chat, notifikasi, admin) | Rilis |
| Pengamanan API (sesi wajib, identitas dari sesi) | Rilis (commit `f772b18`) |
| Helpdesk IT + Pengajuan | Rilis (commit `f7812ff`) |
| Biaya / barang keluar per tiket | Rilis (commit `e21dbce`) |
| UAT di browser (Lampiran B, persetujuan Lampiran C) | Belum |

## 12. Backlog dan Pertanyaan Terbuka

| # | Item | Prioritas | Catatan |
|---|---|---|---|
| 1 | **Hapus `users.password_plain`** | **Kritis** | Register menyimpan password asli (`src/app/api/auth/register/route.ts`). Wajib sebelum go-live |
| 2 | Batasi master unit ke admin | Tinggi | API `master-units` hanya mewajibkan login |
| 3 | Master barang + harga baku | Sedang | Menyeragamkan nama barang, mempercepat input |
| 4 | Lampiran foto pada tiket / pengajuan | Sedang | Bukti kerusakan dan perbaikan |
| 5 | SLA dan eskalasi antrean | Sedang | Target waktu respons per kategori perlu disepakati |
| 6 | Migrasi penuh data `it_logbook` | Tinggi | Saat ini baru 5 data contoh (BRD T5) |
| 7 | Menghapus pengguna yang punya tiket | Rendah | Ditolak FK (RESTRICT); perlu soft-delete pengguna |
| 8 | Rekap biaya per kategori / per unit kerja | Rendah | Saat ini biaya direkap per bulan |
| 9 | Multi-server | Rendah | SSE in-process perlu diganti pub/sub (mis. Redis) |
| 10 | Screenshot tiap layar di dokumen ini | Rendah | Setelah UAT |

---

## Lampiran A. Kamus Data

Tipe sesuai database `kanbandb` per 5 Nov 2026. **PK** = primary key, **FK** = foreign key, **UQ** = unique. Kolom `created_at` / `updated_at` (timestamp otomatis) tidak diulang di tiap tabel.

### A.1 Pengguna dan Unit

**`users`**

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| id | varchar(36) | ✘ | PK, UUID |
| name | varchar(255) | ✘ | Nama tampilan |
| email | varchar(255) | ✘ | UQ, disimpan huruf kecil |
| avatar_url | varchar(255) | ✔ | URL avatar |
| unit_id | varchar(36) | ✔ | Id unit (`unit_it` = TD, penentu akses helpdesk) |
| unit_name | varchar(100) | ✔ | Nama unit (tampilan) |
| password_hash | varchar(255) | ✔ | Hash PBKDF2 |
| password_plain | varchar(255) | ✔ | ⚠ Password asli, **harus dihapus** (Backlog #1) |
| role | enum('admin','user') | ✔ | Default `user` |
| status | enum('pending','active','rejected') | ✔ | Default `pending` |
| last_active_at | timestamp | ✔ | Untuk status online |

**`units`**: `id` varchar(36) PK · `name` varchar(100) · `code` varchar(20) UQ (mis. TD, Markom) · `description` text.

### A.2 Project Management

**`projects`** (board)

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| id | varchar(36) | ✘ | PK |
| name | varchar(255) | ✘ | Nama board |
| description | text | ✔ | |
| owner_id | varchar(36) | ✘ | FK → users (CASCADE) |
| parent_id | varchar(36) | ✔ | Board induk (sub-board) |
| stage | varchar(50) | ✘ | `Planning` / `Active` / `Review` / `Completed`, default `Active` |
| unit_tag | varchar(50) | ✘ | Unit pemilik, default `IT` |
| position | float | ✘ | Urutan tampil |

**`board_columns`**: `id` PK · `project_id` FK → projects (CASCADE) · `title` varchar(100) · `position` float.

**`tasks`**

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| id | varchar(36) | ✘ | PK |
| project_id | varchar(36) | ✘ | FK → projects (CASCADE) |
| column_id | varchar(36) | ✘ | FK → board_columns (CASCADE) |
| parent_id | varchar(36) | ✔ | FK → tasks (CASCADE), untuk sub-task |
| title | varchar(255) | ✘ | |
| description | text | ✔ | |
| customer | varchar(255) | ✔ | |
| unit_tags | text | ✔ | Tag unit terkait |
| priority | enum('Low','Medium','High','Urgent') | ✔ | Default `Medium` |
| start_date, due_date | date | ✔ | |
| position | float | ✘ | Urutan dalam kolom |
| creator_id | varchar(36) | ✘ | FK → users |

| Tabel | Kolom | Keterangan |
|---|---|---|
| `task_assignees` | task_id, user_id (PK gabungan), assigned_at | FK CASCADE ke tasks & users |
| `labels` | id, project_id, name varchar(50), color varchar(20) | Label per board |
| `task_labels` | task_id, label_id (PK gabungan) | FK CASCADE |
| `comments` | id, task_id, user_id, content text, image_url | FK CASCADE |
| `task_attachments` | id, task_id, file_name, file_url, file_size int, file_type, uploaded_by | `uploaded_by` SET NULL saat pengguna dihapus |
| `task_activities` | id, task_id, project_id, user_id, action varchar(50), details text | Log aktivitas |

### A.3 Komunikasi

| Tabel | Kolom | Keterangan |
|---|---|---|
| `conversations` | id, user_one_id, user_two_id | Percakapan P2P, FK CASCADE ke users |
| `messages` | id, conversation_id, sender_id, content text, image_url, is_read tinyint | FK CASCADE |
| `notifications` | id, user_id, title varchar(255), message text, type enum('deadline','mention','assignment','system'), related_task_id, is_read | Helpdesk memakai type `system` |

### A.4 Helpdesk

**`hd_tickets`**

| Kolom | Tipe | Null | Keterangan |
|---|---|---|---|
| id | int | ✘ | PK, auto increment (nomor tiket) |
| tanggal | date | ✘ | Tanggal layanan |
| jam_mulai, jam_selesai | time | ✔ | CHECK `jam_selesai ≥ jam_mulai` |
| total_menit | int | ✔ | **Generated**: `TIME_TO_SEC(TIMEDIFF(jam_selesai, jam_mulai)) DIV 60` |
| requested_by | varchar(36) | ✔ | FK → users, pemohon (tiket dari Pengajuan) |
| pic_id | int | ✔ | FK → hd_pic, peminta (input langsung) |
| kategori_id | int | ✘ | FK → hd_kategori |
| unit_kerja_id | int | ✔ | FK → hd_unit_kerja |
| isi_helpdesk | text | ✘ | Keluhan / pekerjaan, maks 5000 karakter |
| tindakan | text | ✔ | Tindakan yang dilakukan |
| status | enum('Open','Proses','Selesai','Batal') | ✘ | Default `Open` |
| jenis_pelayanan | enum('Pelayanan','Non Pelayanan') | ✘ | Default `Pelayanan` |
| task_id | varchar(36) | ✔ | FK → tasks (SET NULL); disiapkan untuk tautan ke tugas |
| created_by | varchar(36) | ✘ | FK → users, pembuat |

CHECK `requested_by IS NOT NULL OR pic_id IS NOT NULL` (peminta wajib ada).

| Tabel | Kolom | Keterangan |
|---|---|---|
| `hd_ticket_staff` | ticket_id, user_id (PK gabungan) | Staf TD penangan; CASCADE dari tiket |
| `hd_ticket_biaya` | id, ticket_id, nama_barang varchar(150), qty smallint unsigned (CHECK > 0), harga int unsigned | Barang keluar; CASCADE dari tiket |
| `hd_ticket_history` | id, ticket_id, aksi enum('create','update'), user_id, changes json | `changes` = daftar `{field, label, old, new}`; CASCADE dari tiket |
| `hd_kategori` | id, nama varchar(100) UQ, aktif | Hardware, Software, Jaringan, Streaming, SIMRS, Telepon |
| `hd_unit_kerja` | id, nama varchar(150) UQ, aktif | Lokasi / ruangan |
| `hd_pic` | id, nama varchar(150) UQ, aktif | Nama peminta |

---

## Lampiran B. Skenario UAT

Siapkan akun: **U1** (non-TD, mis. MFK), **T1** dan **T2** (staf TD), **A1** (Admin TD), **ADM** (admin). Kolom **Hasil** diisi penguji: ✔ Lulus / ✘ Gagal + catatan.

### B.1 Akun

| No | Langkah | Hasil yang diharapkan | AC | Hasil |
|---|---|---|---|---|
| 1 | Register akun baru, lalu login | Login ditolak: menunggu persetujuan | AC-A1, AC-A4 | |
| 2 | ADM approve akun dari Kelola Pengguna, lalu login ulang | Berhasil masuk | AC-A6 | |
| 3 | ADM reject akun lain, akun itu login | Ditolak: ditolak/dinonaktifkan | AC-A5 | |
| 4 | Logout, buka `/helpdesk` langsung | Diarahkan ke `/login` | AC-A7 | |
| 5 | Ganti password dengan 5 karakter | Ditolak | AC-A3 | |

### B.2 Project Management

| No | Langkah | Hasil yang diharapkan | AC | Hasil |
|---|---|---|---|---|
| 6 | U1 buat board + 3 kolom | Board tampil di Boards Hub | AC-P1 | |
| 7 | U1 buat tugas, assignee T1, tenggat besok | T1 dapat notifikasi assignment | AC-P4 | |
| 8 | T1 drag kartu ke kolom lain, refresh | Posisi tetap | AC-P3 | |
| 9 | T1 komentar "@U1 sudah dicek" | U1 dapat notifikasi mention | AC-P5 | |
| 10 | T1 buka lonceng | Ada notifikasi deadline (sekali hari itu) | AC-P6 | |
| 11 | Tambah sub-task, buka Timeline | Sub-task menjorok di bawah tugas | AC-P8 | |
| 12 | Unggah lampiran > 50 MB | Ditolak | AC-P7 | |
| 13 | T1 coba hapus board milik U1 | Ditolak | AC-P2 | |
| 14 | U1 chat ke T1 (dua browser) | Pesan masuk tanpa refresh, indikator mengetik tampil | AC-P9 | |

### B.3 Pengajuan dan Helpdesk

| No | Langkah | Hasil yang diharapkan | AC | Hasil |
|---|---|---|---|---|
| 15 | U1 buka sidebar Layanan IT | Hanya ada *Pengajuan Helpdesk* | AC-T1 | |
| 16 | U1 buka `/helpdesk` lewat URL | Diarahkan ke `/pengajuan` | AC-T1 | |
| 17 | U1 kirim pengajuan "Printer macet" | Tampil di daftar U1 status Open; T1, T2, A1 dapat notifikasi | AC-H1 | |
| 18 | U1 kirim pengajuan tanpa isi | Ditolak | AC-H2 | |
| 19 | T1 buka tab Antrian, klik *Ambil* | Status Proses, staf T1, jam mulai terisi; U1 dapat notifikasi | AC-T3, AC-H7 | |
| 20 | T2 coba *Ambil* tiket yang sama (refresh dulu jika masih tampil) | Ditolak, tiket tetap milik T1 | AC-T4 | |
| 21 | U1 coba hapus pengajuan tersebut | Ditolak (sudah Proses) | AC-H6 | |
| 22 | T1 edit tiket: jam selesai lebih awal dari jam mulai | Tampil peringatan merah, simpan ditolak | AC-T5 | |
| 23 | T1 isi jam 08:00–08:45 | Tampil "Total: 45 menit" | AC-T6 | |
| 24 | T1 tambah barang Tinta hitam 2 × 85000 dan Kabel LAN 1 × 15000 | Total biaya Rp 185.000 | AC-T10 | |
| 25 | Ubah qty satu barang jadi 0, simpan | Ditolak dengan nama barang | AC-T11 | |
| 26 | Perbaiki qty, status Selesai, simpan | Tersimpan; U1 dapat notifikasi Selesai | AC-H7 | |
| 27 | Tab Data: cek baris tiket | Total Menit 45, Biaya Rp 185.000 + nama barang | AC-T6, AC-T10 | |
| 28 | Klik ikon Riwayat | Tercatat create, ambil, update (status, jam, biaya) | AC-T12 | |
| 29 | T1 tab Input: tiket telepon, PIC nama baru | Tersimpan, PIC masuk master | AC-T9 | |
| 30 | Input status Proses tanpa staf | Ditolak | AC-T7 | |
| 31 | Filter Data: kategori Hardware + cari "printer" | Hanya tiket yang cocok tampil | FR-T7 | |
| 32 | Dashboard: klik batang hari ini | Modal tiket hari ini lengkap dengan barang | AC-T15 | |
| 33 | Dashboard: cek kartu Total Biaya | Termasuk Rp 185.000 | FR-T11 | |
| 34 | Trend Helpdesk: klik batang bulan Sep 2026 | Pindah ke dashboard Sep 2026 | AC-T17 | |
| 35 | Data: export Excel 1–30 Sep 2026 | 5 baris, TOTAL MENIT 180 | AC-T18 | |
| 36 | Export bulan berjalan | Ada kolom Barang & Biaya, TOTAL BIAYA benar | AC-T18 | |
| 37 | Klik Excel tanpa isi tanggal | Muncul peringatan | AC-T19 | |
| 38 | T2 coba hapus tiket buatan T1 | Tombol hapus tidak tampil | AC-T13 | |
| 39 | A1 hapus tiket (konfirmasi) | Tiket hilang dari Data | AC-T14 | |
| 40 | T1 buka tab Master Data | Tab tidak tampil (bukan admin) | AC-T21 | |
| 41 | A1 nonaktifkan satu kategori, buka form Input | Kategori tidak ada di pilihan; tiket lama tetap tampil | AC-T22 | |
| 42 | Ulangi langkah 17–27 di layar HP (lebar ± 375 px) | Semua bisa dipakai tanpa geser horizontal halaman | NFR-6 | |
| 43 | Ulangi langkah 27 & 32 dalam dark mode | Teks dan grafik tetap terbaca | NFR-6 | |
| 44 | Isi form helpdesk hanya dengan keyboard (Tab / Enter) | Semua field dan tombol bisa dijangkau | NFR-5 | |

### B.4 Uji Otomatis (dijalankan pengembang sebelum UAT)

```bash
node scripts/check_helpdesk.mjs          # validasi, diff riwayat, biaya, akses
node scripts/test_helpdesk_access.mjs    # butuh `npm run dev`; matriks akses, biaya, export
```

## Lampiran C. Persetujuan UAT

| Nama | Peran | Modul | Tanggal | Hasil (Lulus / Lulus bersyarat / Gagal) | Tanda tangan |
|---|---|---|---|---|---|
| | Kepala unit TD | Helpdesk | | | |
| | Perwakilan pengguna unit | Pengajuan, Project Management | | | |
| | Pemilik bisnis | Semua | | | |
