# Brief Spline — elemen 3D kustom Pasal Frenzy

Dokumen ini untuk siapa pun yang membuat scene di [Spline](https://spline.design) (kamu, atau desainer yang kamu ajak). Kode sudah siap menerima hasil ekspornya tanpa perubahan: cukup taruh berkas di `public/spline/` dan isi `src/data/spline-scenes.json`.

## Fakta yang sudah diverifikasi (12 Sep 2026)

- Runtime yang dipakai: `@splinetool/runtime` 2.0.46 (npm). Runtime hanya diimpor bila ada slot yang terisi, jadi build tanpa scene tidak membawa runtime sama sekali.
- Berkas scene `.splinecode` bisa diunduh dari panel **Export → Code** (ikon unduh di kotak URL `prod.spline.design`) lalu di-host sendiri. Ini yang kita pakai: produk harus jalan offline dan tanpa CDN.
- Runtime memakai beberapa modul WASM (fisika, boolean, navmesh, dsb.). Tanpa `wasmPath` ia mengambilnya dari CDN Spline. Kode kita mengarahkan ke `public/spline/wasm/`; salin dengan `npm run spline:sync`.
- Paket **Free** Spline: ekspor web disertai watermark Spline. Paket Hobby (berbayar) menghilangkannya. Keputusan soal ini ada di tanganmu; kode tidak bergantung pada paket mana pun.
- Semua scene di satu halaman memakai backend yang sama; kode memaksa WebGL agar hasil identik di iGPU AMD dan Android.

## Slot yang tersedia

| Slot | Tempat tampil | Ukuran host | Perilaku |
|---|---|---|---|
| `landing-hero` | Landing, layar penuh di antara partikel kata Pembukaan dan konten | seluruh viewport | Dekoratif (tanpa pointer). Saat termuat, partikel Three.js diredupkan ke 45 %. Dijeda saat halaman lain dibuka. |
| `beranda` | Beranda, di balik blok sambutan "Selamat datang" (kanan, di sekitar gauge integritas) | ±112 % lebar blok × ±130 % tinggi blok, dengan mask radial | Dekoratif. Menerima variabel `integrity` (0–1), `menang` (0–4), `total` (4). |

Slot lain (Masuk/Daftar, kartu kasus) bisa ditambahkan di `src/data/splineScenes.ts` bila scene-nya sudah ada.

## Apa yang dibuat (arah seni, bukan pilihan bebas)

Konsep produk: **Singularitas Konstitusional**, hukum menjadi ruang, pasal menjadi fisika. Palet: latar `#080810`, merah `#DC2626`, biru `#1E3A8A`/`#3B82F6`, emas `#D4A017`, putih `#F8F8F8`. Bukan neon, bukan ungu, bukan kartun.

1. **`beranda` — "Segel Integritas"**: satu objek utama yang bisa dibaca sebagai segel/meterai negara yang terbuat dari kaca gelap dan brass kusam, mengambang pelan (rotasi Y ±6°, 12 detik), dikelilingi 2–3 cincin tipis emas yang berputar berlawanan arah dan debu partikel halus. Variabel `integrity` menggerakkan: 1.0 = utuh, cahaya biru tenang; 0.5 = retakan tipis merah muncul, cincin bergetar; 0.2 = retakan lebar, warna merah dominan, partikel menjauh. Gunakan **States** + **Variables** di Spline dan event `start`. Latar transparan.
2. **`landing-hero` — "Cakram Poincaré"**: cakram/lensa kaca raksasa di kedalaman yang melengkungkan cahaya (refraksi + dispersi tipis), miring 20°, sangat pelan berputar; di sekelilingnya garis konstelasi halus. Tidak boleh menutupi teks hero: pusat komposisi ada di kanan-atas viewport, kiri-bawah dibiarkan gelap. Latar transparan.

Jangan menaruh teks di dalam scene (teks dikelola kode agar bisa dwibahasa). Jangan memakai HTML content Spline (dimatikan di kode). Jangan memakai audio Spline (audio produk disintesis sendiri).

## Anggaran performa (wajib, target iGPU AMD 2 GB & Android kelas menengah)

- Ukuran `.splinecode` ≤ 1,5 MB per scene; total tekstur ≤ 2 MB (WebP/AVIF, ≤ 1024 px).
- ≤ 80 ribu segitiga per scene; ≤ 3 lampu; tanpa physics, tanpa navmesh, tanpa boolean runtime (agar modul WASM tidak perlu dimuat).
- Post-processing: boleh bloom tipis; hindari depth of field dan SSR.
- 60 fps di laptop iGPU, ≥ 30 fps di Android kelas menengah. Uji lewat `?dev=spline` (di bawah).

## Cara mengekspor dan memasang

1. Di Spline: **Export → Code → Vanilla JS**, unduh berkas `.splinecode` (ikon unduh di kotak URL). Beri nama sesuai slot: `beranda.splinecode`, `landing-hero.splinecode`.
2. Taruh di `public/spline/`.
3. Isi `src/data/spline-scenes.json`, contoh:
   ```json
   { "landing-hero": null, "beranda": "spline/beranda.splinecode" }
   ```
4. Jalankan `npm run spline:sync` (menyalin WASM runtime ke `public/spline/wasm/`; boleh `--only=process` bila scene tidak memakai fisika/boolean).
5. Uji cepat: `npm run dev` lalu buka `http://localhost:5173/?dev=spline&scene=/spline/beranda.splinecode`. Halaman ini menampilkan waktu muat, ukuran, dan galat.
6. Buka `#/beranda` untuk melihat scene di posisinya. Bila gagal dimuat, Beranda tetap tampil dengan latar CSS (tidak ada layar kosong), dan galat tercatat di konsol dengan awalan `[spline]`.
7. Commit berkas `.splinecode` dan `spline-scenes.json` di branch fitur sendiri (`feature/25-spline-scenes`), merge ke `development`.

## Yang saya (engineer) sediakan

- `src/ui/spline/SplineStage.ts`: pemuat dengan ResizeObserver (ukuran mengikuti host), IntersectionObserver (berhenti merender saat tidak terlihat), `setVariables`, `pause/resume/dispose`.
- `src/data/splineScenes.ts`: registri slot + base path untuk GitHub Pages (`/Pasal-Frenzy/`) dan Electron/Capacitor (`./`).
- Precache PWA sudah mencakup `.splinecode` dan `.wasm`, jadi scene ikut tersedia offline setelah kunjungan pertama.
