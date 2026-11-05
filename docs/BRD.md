# BRD: Business Requirements Document

| | |
|---|---|
| **Produk** | PMkanban (Project Management Kanban + Helpdesk IT) |
| **Versi dokumen** | 1.1 |
| **Tanggal** | 5 November 2026 |
| **Status** | Draft untuk review |
| **Dokumen terkait** | [PRD.md](PRD.md), [README.md](../README.md), `docs/Helpdesk_IT_Rencana_Implementasi.pdf` |

## Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 5 Nov 2026 | Draft awal |
| 1.1 | 5 Nov 2026 | Tambah glosarium, analisis biaya-manfaat, timeline, RACI, kebutuhan transisi |

---

## 1. Ringkasan Eksekutif

PMkanban menyatukan pekerjaan lintas unit dan layanan IT dalam satu aplikasi web internal. Modul **Project Management** menggantikan koordinasi tugas lewat chat dan spreadsheet. Modul **Helpdesk IT** menggantikan aplikasi `it_logbook` dan rekap Excel manual. Dengan modul ini, setiap permintaan layanan IT masuk antrean resmi, durasi dan biaya barang tercatat per tiket, dan laporan bulanan dibuat otomatis.

## 2. Glosarium

| Istilah | Arti |
|---|---|
| **TD** | Unit Transformasi Digital (unit IT), id sistem `unit_it` |
| **Board / Proyek** | Wadah tugas milik satu unit, bisa punya sub-board |
| **Kanban** | Papan berisi kolom (mis. To Do, Proses, Selesai) dan kartu tugas |
| **Sub-task** | Tugas turunan dari satu tugas utama |
| **Tiket** | Satu catatan pekerjaan helpdesk |
| **Pengajuan** | Tiket yang dibuat pengguna dari unit mana pun lewat halaman `/pengajuan` |
| **Input langsung** | Tiket yang dicatat staf TD sendiri (permintaan via telepon / datang langsung) |
| **PIC (peminta)** | Nama orang yang meminta layanan pada tiket input langsung |
| **Unit kerja / lokasi** | Lokasi atau ruangan tempat layanan diberikan (master helpdesk) |
| **Staf IT** | Pengguna aktif unit TD yang menangani tiket |
| **Ambil** | Aksi staf TD mengambil tiket `Open` untuk dikerjakan sendiri |
| **Biaya / barang keluar** | Barang yang dipakai saat perbaikan (nama, qty, harga satuan) |
| **Laporan_Logbook** | Format Excel laporan helpdesk yang sudah dipakai TD |
| **SSE** | Server-Sent Events, mekanisme kirim data realtime dari server ke browser |
| **UAT** | User Acceptance Test, uji terima oleh pengguna sebelum go-live |

## 3. Latar Belakang

Kolaborasi antarunit kerja (TD, Markom, MFK, PPSDM, Umum, dll.) selama ini tersebar di chat, spreadsheet, dan catatan pribadi. Akibatnya, progres pekerjaan sulit dipantau dan tanggung jawab tugas sering tidak jelas.

Unit TD mencatat pekerjaan helpdesk di aplikasi terpisah (`it_logbook`) lalu merekapnya ke Excel "Laporan_Logbook". Permintaan dari unit lain datang lewat telepon atau chat tanpa antrean. Barang yang dipakai saat perbaikan (tinta, kabel, sparepart) tidak tercatat per kasus, sehingga pengeluaran IT sulit dipertanggungjawabkan.

## 4. Permasalahan

| # | Masalah | Dampak |
|---|---|---|
| P1 | Tugas lintas unit tidak punya papan kerja bersama | Progres tidak terlihat, tenggat terlewat |
| P2 | Koordinasi lewat chat pribadi di luar sistem | Konteks diskusi hilang, tidak terlacak |
| P3 | Permintaan helpdesk tidak punya antrean resmi | Permintaan terlupa, tidak ada bukti layanan |
| P4 | Logbook IT terpisah dari aplikasi kerja | Rekap bulanan manual, data ganda |
| P5 | Biaya / barang keluar per perbaikan tidak tercatat | Pengeluaran IT tidak bisa dipertanggungjawabkan per kasus |
| P6 | Tidak ada data tren layanan IT | Sulit merencanakan SDM dan anggaran IT |

## 5. Tujuan Bisnis

| ID | Tujuan | Masalah |
|---|---|---|
| BO-1 | Satu tempat kerja bersama untuk proyek dan tugas lintas unit | P1 |
| BO-2 | Komunikasi tugas (komentar, chat, notifikasi) tercatat di dalam sistem | P2 |
| BO-3 | Semua permintaan layanan IT masuk antrean resmi dan bisa dilacak sampai selesai | P3 |
| BO-4 | Logbook helpdesk dan laporan bulanan dibuat otomatis, tanpa rekap manual | P4 |
| BO-5 | Biaya / barang keluar tercatat per tiket dan bisa direkap per bulan | P5 |
| BO-6 | Manajemen punya data tren (volume, durasi, biaya, kategori) untuk mengambil keputusan | P6 |

## 6. Ruang Lingkup

### 6.1 Termasuk (In Scope)

- Manajemen board / proyek per unit, Kanban, timeline, sub-task, komentar, lampiran, log aktivitas.
- Chat pribadi (P2P) dan notifikasi realtime.
- Registrasi dengan persetujuan admin, serta master unit.
- Modul Helpdesk IT khusus unit TD: antrean, input, data, riwayat, biaya, dashboard, tren, export Excel, master data.
- Pengajuan helpdesk oleh semua pengguna.

### 6.2 Tidak Termasuk (Out of Scope, fase ini)

- Aplikasi mobile native.
- Integrasi email / WhatsApp untuk notifikasi.
- Master barang dengan harga baku dan stok gudang (barang diketik bebas per tiket).
- SLA otomatis (eskalasi berdasarkan waktu tunggu).
- Persetujuan anggaran / pengadaan barang.
- Migrasi penuh semua data historis `it_logbook` (baru 5 data contoh).

## 7. Pemangku Kepentingan

| Peran | Kepentingan |
|---|---|
| Pemilik bisnis / manajemen | Memantau progres proyek, tren layanan IT, dan biaya |
| Kepala unit TD | Mengelola beban kerja staf IT, laporan bulanan, biaya |
| Admin sistem | Menyetujui akun, mengelola unit dan pengguna |
| Staf semua unit | Mengerjakan tugas, berkolaborasi, mengajukan helpdesk |
| Staf IT (unit TD) | Menangani tiket, mencatat tindakan, durasi, dan biaya |
| Admin TD | Mengelola master helpdesk, menghapus tiket |
| Tim pengembang | Membangun, menguji, dan memelihara aplikasi |

### 7.1 Matriks RACI

R = Responsible (mengerjakan), A = Accountable (penanggung jawab akhir), C = Consulted (dimintai masukan), I = Informed (diberi tahu).

| Aktivitas | Pemilik bisnis | Kepala TD | Admin sistem | Staf TD | Pengguna unit | Pengembang |
|---|---|---|---|---|---|---|
| Menyetujui BRD / PRD | A | C | C | I | I | C |
| Pengembangan & perbaikan | I | C | I | C | I | R/A |
| UAT modul Helpdesk | I | A | C | R | R | C |
| UAT modul Project Management | A | C | C | R | R | C |
| Approve akun & master unit | I | I | R/A | I | I | I |
| Master helpdesk (kategori, unit kerja) | I | A | I | R (admin TD) | I | I |
| Laporan bulanan helpdesk | I | A | I | R | I | I |
| Deploy & backup | I | C | A | I | I | R |

## 8. Kebutuhan Bisnis

| ID | Kebutuhan | Tujuan | Prioritas |
|---|---|---|---|
| BR-01 | Pengguna bisa membuat dan memantau tugas per proyek/unit secara visual | BO-1 | Wajib |
| BR-02 | Tugas punya penanggung jawab, prioritas, tenggat, dan riwayat aktivitas | BO-1 | Wajib |
| BR-03 | Diskusi tugas dan chat antarpengguna tersimpan di sistem | BO-2 | Wajib |
| BR-04 | Pengguna diberi tahu saat ditugaskan, di-mention, atau tenggat mendekat | BO-2 | Wajib |
| BR-05 | Akses hanya untuk akun yang sudah disetujui admin | Keamanan | Wajib |
| BR-06 | Semua pengguna bisa mengajukan permintaan layanan IT dan melihat statusnya | BO-3 | Wajib |
| BR-07 | Unit TD menerima pengajuan sebagai antrean dan bisa mengambil / menugaskannya | BO-3 | Wajib |
| BR-08 | Pekerjaan IT yang datang langsung (telepon / datang) juga bisa dicatat | BO-4 | Wajib |
| BR-09 | Setiap tiket mencatat waktu mulai/selesai sehingga durasi kerja (menit) terhitung | BO-4 | Wajib |
| BR-10 | Setiap tiket bisa mencatat banyak barang keluar beserta qty dan harga | BO-5 | Wajib |
| BR-11 | Laporan Excel format Laporan_Logbook bisa diunduh untuk periode tertentu | BO-4 | Wajib |
| BR-12 | Ada dashboard dan tren 12 bulan: jumlah tiket, menit, biaya, per kategori | BO-6 | Wajib |
| BR-13 | Setiap perubahan tiket tercatat (siapa, kapan, apa yang berubah) | Akuntabilitas | Wajib |
| BR-14 | Data helpdesk hanya bisa dilihat unit TD; unit lain hanya melihat pengajuannya sendiri | Kerahasiaan | Wajib |

## 9. Aturan Bisnis

| ID | Aturan |
|---|---|
| RB-01 | Akun baru berstatus `pending` dan tidak bisa login sampai disetujui admin. Akun `rejected` tidak bisa login. |
| RB-02 | Modul Helpdesk IT hanya untuk pengguna unit TD (`unit_it`). |
| RB-03 | Master kategori dan unit kerja helpdesk hanya bisa diubah oleh admin dari unit TD. |
| RB-04 | Status tiket: `Open` → `Proses` → `Selesai` atau `Batal`. |
| RB-05 | Tiket berstatus selain `Open` wajib punya minimal 1 staf IT penangan, dan staf itu harus pengguna aktif unit TD. |
| RB-06 | Jam selesai tidak boleh lebih awal dari jam mulai. |
| RB-07 | Pemohon hanya bisa menghapus pengajuannya selama masih `Open`. |
| RB-08 | Tiket hanya bisa dihapus permanen oleh pembuatnya atau admin TD. |
| RB-09 | Biaya per barang = qty × harga satuan (Rupiah, tanpa desimal); total biaya tiket = jumlah semua barang. |
| RB-10 | Identitas pembuat / pengubah selalu diambil dari sesi login, bukan dari input. |
| RB-11 | Board hanya bisa dihapus oleh pemiliknya atau admin. |
| RB-12 | Master data helpdesk tidak dihapus, hanya dinonaktifkan, agar tiket lama tetap valid. |

## 10. Analisis Biaya dan Manfaat

Angka di bawah adalah **estimasi untuk disepakati**, bukan hasil pengukuran. Ganti dengan data riil setelah 1–3 bulan pemakaian.

### 10.1 Biaya

| Item | Keterangan |
|---|---|
| Pengembangan | Internal (tim pengembang) |
| Infrastruktur | Server internal yang sudah ada (Laragon / Node.js 20 + MySQL 8); tanpa biaya lisensi |
| Lisensi pihak ketiga | Tidak ada; semua dependency open source (Next.js, React, mysql2, exceljs, dll.) |
| Pemeliharaan | Backup database, update dependency, perbaikan bug |
| Pelatihan | ± 1 sesi untuk staf TD, ± 1 sesi singkat untuk pengguna unit |

### 10.2 Manfaat

| Manfaat | Jenis | Estimasi |
|---|---|---|
| Rekap Laporan_Logbook bulanan otomatis | Waktu | Hemat beberapa jam kerja staf TD per bulan (ukur sebelum vs sesudah) |
| Biaya barang IT tercatat per tiket | Finansial | Pengeluaran bisa ditelusuri 100% per kasus |
| Permintaan IT tidak terlupa | Layanan | Antrean `Open` terlihat oleh semua staf TD |
| Progres proyek terlihat lintas unit | Manajemen | Rapat status bisa lebih singkat |
| Data tren untuk perencanaan SDM & anggaran | Keputusan | Volume, menit, dan biaya per bulan tersedia |

## 11. Ukuran Keberhasilan (target usulan, perlu disepakati)

| KPI | Cara ukur | Target usulan |
|---|---|---|
| Adopsi | Pengguna aktif per bulan / total pengguna | ≥ 80% dalam 3 bulan |
| Pengajuan resmi | Tiket dari Pengajuan / total tiket | Naik setiap bulan |
| Antrean | Tiket `Open` lebih dari 1 hari kerja | Mendekati 0 |
| Rekap otomatis | Laporan bulanan dari export, bukan rekap manual | 100% |
| Pencatatan biaya | Tiket ber-barang yang biayanya tercatat | 100% |
| Kelengkapan durasi | Tiket `Selesai` yang punya jam mulai & selesai | ≥ 95% |

## 12. Timeline dan Milestone

| Milestone | Isi | Status / target |
|---|---|---|
| M1 | Project Management (board, Kanban, timeline, chat, notifikasi, admin) | Selesai (5 Nov 2026) |
| M2 | Pengamanan API: sesi wajib, identitas dari sesi, realtime SSE | Selesai (5 Nov 2026) |
| M3 | Helpdesk IT + Pengajuan | Selesai (5 Nov 2026) |
| M4 | Biaya / barang keluar per tiket | Selesai (5 Nov 2026) |
| M5 | Perbaikan keamanan `password_plain` | Wajib sebelum go-live |
| M6 | UAT (skenario di PRD Lampiran B) | Target: perlu dijadwalkan |
| M7 | Migrasi data `it_logbook` + pelatihan | Target: perlu dijadwalkan |
| M8 | Go-live | Setelah M5–M7 |
| M9 | Evaluasi KPI | Go-live + 3 bulan |

## 13. Kebutuhan Transisi

| # | Kebutuhan |
|---|---|
| T1 | Jalankan migrasi database (`scripts/migrate_helpdesk.sql` dan skrip lain di README) di server production. |
| T2 | Isi `AUTH_SECRET` acak yang panjang di `.env` production. |
| T3 | Hapus kolom `users.password_plain` dan berhenti menyimpannya (M5). |
| T4 | Pastikan semua staf IT terdaftar dengan unit TD (`unit_it`) dan status `active`. |
| T5 | Migrasi data historis `it_logbook` (kategori, unit kerja, PIC, tiket), dicek dengan total menit per bulan. |
| T6 | Jalankan `it_logbook` dan aplikasi baru paralel selama 1 bulan, lalu matikan `it_logbook`. |
| T7 | Pelatihan: staf TD (semua tab helpdesk), pengguna unit (Pengajuan, board, chat). |
| T8 | Jadwalkan backup database harian. |

## 14. Asumsi dan Batasan

- Aplikasi berjalan di jaringan internal dengan satu server (realtime SSE berjalan in-process).
- Database MySQL 8 / MariaDB; skrip migrasi dijalankan manual.
- Unit TD tetap memakai id `unit_it` sebagai penentu akses.
- Harga barang diinput manual oleh staf IT; tidak ada validasi terhadap harga pasar atau stok.
- Pengguna memakai browser modern (Chrome, Edge, Firefox versi terbaru).

## 15. Risiko

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Staf tidak konsisten mengisi jam / biaya | Sedang | Sedang | Total menit dan biaya tampil langsung di form; KPI kelengkapan dipantau |
| Nama barang tidak seragam (mis. "Tinta" vs "Tinta hitam") | Tinggi | Rendah | Fase berikut: master barang |
| Server tunggal menjadi titik gagal | Rendah | Tinggi | Backup DB harian; scale-out butuh pengganti SSE in-process |
| `AUTH_SECRET` tidak diisi di production | Sedang | Tinggi | Checklist deploy (T2) |
| Password tersimpan dalam teks asli (`users.password_plain`) | Pasti (sudah terjadi) | Tinggi | **Wajib diperbaiki sebelum go-live** (M5, T3) |
| Pengguna enggan pindah dari chat / telepon | Sedang | Sedang | Pelatihan, kebijakan "tiket wajib lewat Pengajuan" |
| Data `it_logbook` tidak cocok saat migrasi | Sedang | Sedang | Rekonsiliasi total menit per bulan (T5), masa paralel (T6) |

## 16. Persetujuan

| Nama | Peran | Tanggal | Tanda tangan |
|---|---|---|---|
| | Pemilik bisnis | | |
| | Kepala unit TD | | |
| | Admin sistem | | |
| | Perwakilan pengembang | | |
