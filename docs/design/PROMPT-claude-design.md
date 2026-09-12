# Prompt siap-copas untuk Claude Design — Pasal Frenzy

Salin seluruh isi blok di bawah garis ke Claude Design. Prompt ini memakai teks UUD 1945 asli (bukan lorem ipsum) dan token desain yang sama dengan yang dipakai di kode, sehingga hasil desain bisa langsung dijadikan acuan implementasi.

---

Kamu adalah art director dan product designer untuk **Pasal Frenzy**, permainan web 3D naratif-kritis tentang Undang-Undang Dasar Negara Republik Indonesia Tahun 1945. Rancang antarmuka yang terasa seperti situs studio 3D kelas atas: gelap, sinematik, presisi tipografis, dengan elemen tiga dimensi yang hidup. Hindari estetika generik: tanpa gradien ungu-biru, tanpa ilustrasi stok, tanpa kartu kaca abu-abu yang seragam, tanpa lorem ipsum. Semua teks hukum di bawah adalah kutipan asli dan harus dipakai apa adanya.

## Konsep

"Singularitas Konstitusional": hukum menjadi ruang, pasal menjadi fisika. Antarmuka bukan lapisan di atas dunia game, melainkan bagian dari dunianya. Tidak ada title screen datar. Kata-kata dari Pembukaan UUD 1945 melayang sebagai partikel cahaya di ruang hampa; ketika pemain merangkainya, dunia menyala.

Audiens utama: mahasiswa hukum, ilmu politik, dan pemerintahan di Indonesia, usia 18-30, membuka dari laptop iGPU dan ponsel Android kelas menengah. Bahasa antarmuka: Indonesia.

## Token desain (wajib dipakai persis)

- Latar: `#080810` (near-black), ruang hampa: `#000005`
- Teks: `#F8F8F8`, teks redup: `#B3B3BD`
- Merah konstitusional (aksen utama, antagonis/ancaman dalam game): `#DC2626`, merah gelap `#7F1D1D`
- Biru argumen solid: `#1E3A8A`, biru terang `#3B82F6`
- Emas pencapaian: `#D4A017`
- Abu erosi demokrasi: `#6B7280`
- Font display: Playfair Display (900/700) untuk judul dan kutipan pasal
- Font UI: Space Grotesk (400/500/700) untuk label, tombol, metadata
- Font legal/mono: JetBrains Mono (400/700) untuk teks pasal di dalam game
- Logotype: kata "PASAL" merah `#DC2626`, kata "FRENZY" putih `#F8F8F8`, Playfair Display 900, tracking -2%
- Radius sudut: 4 px (tegas, formal), bukan 16-24 px
- Grid: 12 kolom desktop, gutter 24 px; margin 80 px (desktop), 32 px (tablet), 20 px (mobile)

## Layar yang harus dirancang (artboard: 1440×900 desktop, 768×1024 tablet, 390×844 mobile)

1. **Intro** (sebelum landing): layar hampir hitam. Kata-kata alinea pertama Pembukaan muncul satu per satu sebagai partikel yang mengumpul membentuk kalimat, lalu logotype PASAL FRENZY terbentuk dari huruf-huruf yang datang dari kedalaman. Tampilkan tiga keyframe.
   Teks: "Bahwa sesungguhnya kemerdekaan itu ialah hak segala bangsa dan oleh sebab itu, maka penjajahan di atas dunia harus dihapuskan, karena tidak sesuai dengan peri-kemanusiaan dan peri-keadilan."

2. **Loading**: logotype di tengah, bar progres tipis (2 px) gradien merah→putih, angka persen mono di kanan bar. **Di bawah bar** ada dua baris: baris 1 deskripsi tahap yang sedang dimuat (contoh nyata: "Memuat naskah UUD 1945 (37 pasal, 4 alinea Pembukaan)", "Menyusun ruang non-Euclidean", "Menyiapkan sintesis audio spasial"), baris 2 deskripsi produk satu kalimat: "Permainan web 3D tentang UUD NRI 1945: rangkai Pembukaan, pertahankan integritas konstitusional." Sertakan tombol "Lewati intro" kecil di pojok untuk kunjungan kedua.

3. **Landing page** (satu halaman panjang, scroll halus):
   - Hero: ruang hampa 3D dengan ratusan kata Pembukaan melayang sebagai partikel; logotype besar; tagline "Ketika pasal menjadi fisika."; dua tombol: primer "Mulai Bermain" (merah, teks putih), sekunder "Unduh untuk Windows / Android" (outline putih). Indikator scroll minimal.
   - Section "Singularitas Konstitusional": tiga panel kaca transparan berdiri miring dalam 3D, masing-masing memuat kutipan asli dengan JetBrains Mono:
     - Pasal 1 ayat (3): "Negara Indonesia adalah negara hukum."
     - Pasal 28A: "Setiap orang berhak untuk hidup serta berhak mempertahankan hidup dan kehidupannya."
     - Pasal 33 ayat (3): "Bumi dan air dan kekayaan alam yang terkandung di dalamnya dikuasai oleh negara dan dipergunakan untuk sebesar-besar kemakmuran rakyat."
   - Section "Tiga Kasus" (tiga kartu besar, bukan grid kecil):
     - Kasus 1 "Labirinto Hakiki" — HAM vs keamanan negara, Pasal 28A–28J. Visual: labirin kaca dengan retakan, bayangan pekat mendekat. Kutipan: Pasal 28J ayat (2): "Dalam menjalankan hak dan kebebasannya, setiap orang wajib tunduk kepada pembatasan yang ditetapkan dengan undang-undang dengan maksud semata-mata untuk menjamin pengakuan serta penghormatan atas hak kebebasan orang lain dan untuk memenuhi tuntutan yang adil sesuai dengan pertimbangan moral, nilai-nilai agama, keamanan, dan ketertiban umum dalam suatu masyarakat demokratis."
     - Kasus 2 "Oligarki dalam Kabut Digital" — Pasal 33. Visual: kabut partikel hijau-kebiruan, node fraktal yang saling terhubung, sumur gravitasi merah-putih. Kutipan: Pasal 33 ayat (2): "Cabang-cabang produksi yang penting bagi negara dan yang menguasai hajat hidup orang banyak dikuasai oleh negara."
     - Kasus 3 "Singularitas Perppu" — Pasal 22. Visual: antarmuka yang retak, strip horizontal bergeser (VHS tracking), aberasi kromatik. Kutipan: Pasal 22 ayat (1): "Dalam hal ihwal kegentingan yang memaksa, Presiden berhak menetapkan peraturan pemerintah sebagai pengganti undang-undang."
   - Section "Cara Bermain": tiga langkah tanpa teks tutorial panjang, dijelaskan lewat ikon garis tipis dan satu kalimat: temukan kata yang beresonansi; rangkai argumen dari pasal; tahan serangan partikel koruptif.
   - Section "Riset & Data": pernyataan bahwa teks berasal dari naskah resmi MPR RI "Dalam Satu Naskah", data pemain tersimpan di perangkat dan hanya diekspor atas persetujuan. Tampilkan visual kecil "kartu provenance" dengan hash SHA-256 (gaya mono).
   - Section "Unduh": dua kartu unduhan (Windows .exe, Android .apk) plus catatan "bisa dimainkan tanpa internet".
   - Footer: sumber naskah, lisensi MIT, tautan GitHub.

4. **HUD dalam game** (overlay minimal, in-world): integritas konstitusional tidak ditampilkan sebagai bar konvensional melainkan sebagai ketebalan bingkai cahaya di tepi layar (tebal = sehat, tipis dan merah = krisis); peta konstelasi pasal di pojok kanan atas (bintang-bintang yang terhubung garis tipis); indikator Mode Frenzy: seluruh tepi layar bergetar halus dan hue bergeser. Rancang varian normal, krisis (integritas 0.3), dan Frenzy.

5. **Overlay Pause/Settings** (in-world, panel kaca gelap, bukan modal putih): volume, kualitas grafis (Rendah/Sedang/Tinggi), kurangi gerakan, izin partisipasi riset (opt-in, jelaskan data apa yang dicatat), ekspor data JSON/CSV, reset progres.

6. **Layar mobile**: kontrol sentuh dua zona (kiri gerak, kanan lihat), tombol interaksi bulat merah di kanan bawah, orientasi landscape untuk gameplay; landing tetap portrait.

## Gerak (motion)

- Reveal section memakai clip-path dan blur, bukan fade biasa. Durasi 600-800 ms, easing power3.out.
- Kursor kustom di desktop: titik 4 px mengikuti instan + cincin 40 px mengikuti dengan lag; cincin membesar dan terisi merah transparan saat hover elemen interaktif.
- Transisi antar bab: "Constitutional Dive" (kamera masuk ke dalam teks pasal), "Void Collapse", "Chromatic Shatter". Buat storyboard 4 frame untuk satu transisi.
- Semua gerakan punya varian reduced-motion (hanya opacity).
- Tidak ada kilatan lebih dari 3 kali per detik.

## Keluaran yang diminta

- Artboard semua layar untuk tiga ukuran.
- Halaman style guide: palet, skala tipe (display 96/64/40, heading 32/24, body 18/16, mono 14), komponen tombol (primer, sekunder, ghost; state hover/focus/disabled), panel kaca, kartu kasus, bar progres, kartu unduhan.
- Spesifikasi motion ringkas per komponen (durasi, easing, properti).
- Catatan aksesibilitas: kontras minimal AA, fokus terlihat (outline emas `#D4A017`), ukuran sasaran sentuh 44 px.
