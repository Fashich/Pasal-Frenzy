# Prompt untuk Claude Design — Pasal Frenzy (brief lengkap, siap copas)

Cara pakai: salin seluruh isi mulai dari garis pemisah di bawah sampai akhir berkas ke Claude Design. Lampirkan juga berkas yang tercantum di bagian **Berkas yang kamu lampirkan** (semuanya sudah ada di repo). Hasil desain nanti diserahkan kembali ke engineer (saya) untuk diimplementasikan piksel-demi-piksel; karena itu bagian **Format serah terima** wajib dipenuhi.

---

## Peran

Kamu adalah art director senior sekaligus product designer untuk **Pasal Frenzy**, permainan web 3D naratif-kritis tentang Undang-Undang Dasar Negara Republik Indonesia Tahun 1945. Standarmu: situs studio 3D dan game indie kelas festival (Awwwards Site of the Year, Apple Design Award), bukan template SaaS. Kamu merancang **sistem visual utuh + aset** yang akan diimplementasikan engineer di Vite + TypeScript + Three.js (bukan React, bukan Tailwind), jadi setiap keputusan harus bisa diterjemahkan ke CSS, SVG, dan shader sederhana.

Tugasmu bukan "mempercantik". Tugasmu memberi identitas visual yang tidak bisa disamakan dengan produk lain, lalu membuktikannya di 7 layar dan satu set aset.

## Apa yang harus dihindari (ini penting, produk sebelumnya jatuh ke sini)

- Tampilan "buatan AI": kartu kaca abu-abu seragam berjajar rapi, gradien biru-ungu, glow neon di mana-mana, radius 16-24 px, ikon garis generik, layout simetris kosong di tengah, hero dengan judul + dua tombol + tiga stat yang bisa dipakai produk apa pun.
- Lorem ipsum, angka palsu, nama pemain contoh selain "Fashich", testimoni, logo mitra fiktif.
- Ilustrasi stok, foto orang, gambar gedung MPR, bendera, burung Garuda sebagai dekorasi. Simbol negara tidak dipakai sebagai ornamen.
- Emoji sebagai ikon.
- Dark mode "hitam + biru + putih" tanpa tekstur dan tanpa ritme tipografi.

## Konsep yang harus terasa di setiap piksel

"**Singularitas Konstitusional**": hukum menjadi ruang, pasal menjadi fisika. Teks konstitusi adalah materi: kata punya massa, alinea Pembukaan adalah bintang-bintang yang tercecer, pasal yang runtuh melengkungkan ruang. Antarmuka adalah *bagian dari dunia*, bukan lapisan di atasnya.

Tiga bahasa visual yang boleh kamu gabungkan:

1. **Dokumen negara yang dipindai** — kertas arsip, cap, garis rambut, penomoran mono, watermark tipis, halaman yang sedikit miring. Ini sumber "keasliannya".
2. **Ruang hampa non-Euclidean** — partikel cahaya dari kata-kata, garis konstelasi, lengkungan Poincaré, kedalaman berlapis. Ini sumber "3D-nya".
3. **Ruang sidang** — kayu gelap, brass/emas kusam, marmer, cahaya rendah dari samping, tipografi serif otoritatif. Ini sumber "mahalnya".

Rasa yang dicari: berat, tenang, presisi, sedikit mengancam (merah antagonis), dengan momen emas saat pemain berhasil. Bukan ceria, bukan "futuristik neon".

## Audiens & konteks pakai

Mahasiswa hukum, ilmu politik, pemerintahan di Indonesia, usia 18-30. Perangkat: laptop iGPU (1366×768 dan 1920×1080), ponsel Android kelas menengah (390×844, 360×800), tablet 768×1024. Bahasa antarmuka: Indonesia (default) dan Inggris. Semua teks hukum tetap bahasa Indonesia asli.

## Token desain (pakai persis, boleh menambah turunan)

- Latar: `#080810`; ruang hampa: `#000005`; kertas arsip (jika dipakai): `#E9E3D3` dengan tinta `#141418`
- Teks: `#F8F8F8`; teks redup: `#B3B3BD`
- Merah konstitusional (aksen utama; dalam game = ancaman/antagonis): `#DC2626`; merah gelap `#7F1D1D`
- Biru argumen solid: `#1E3A8A`; biru terang `#3B82F6`
- Emas pencapaian: `#D4A017` (pakai hemat: garis rambut, angka, momen menang)
- Abu erosi demokrasi: `#6B7280`
- Font display: **Playfair Display** 400/700/900 + italic (judul, kutipan pasal, angka besar)
- Font UI: **Space Grotesk** 400/500/700 (label, tombol, metadata)
- Font legal/mono: **JetBrains Mono** 400/700 (teks pasal di dalam game, nomor, hash)
- Logotype: "PASAL" `#DC2626` + "FRENZY" `#F8F8F8`, Playfair Display 900, tracking −2%. Tidak ada logogram lain saat ini (logo PNG 123×123 px yang ada hanya layak untuk favicon, lihat aset).
- Radius sudut: 2-4 px. Tombol primer: merah solid, teks putih, tinggi 44-52 px.
- Grid: 12 kolom, gutter 24 px; margin 80 (desktop) / 32 (tablet) / 20 (mobile). Kontainer maksimum 1200 px.

## Berkas yang kamu lampirkan (dari repo, semua nyata)

- `docs/PRD` (naskah PRD) — untuk memahami mekanik.
- `src/data/pembukaan.json` — empat alinea Pembukaan, per kata (untuk partikel).
- `src/data/intro-passages.json` — 14 kutipan yang dipakai intro.
- `docs/data-validation/uud-1945-report.md` — bukti sumber naskah dan SHA-256 (untuk kartu provenance).
- `public/icons/icon.svg` dan `Pasal Frenzy.png` (123×123) — logo lama sebagai referensi, bukan patokan kualitas.
- Tangkapan layar landing & beranda saat ini (di `docs/screenshots/`) — sebagai contoh yang **harus dikalahkan**.

## Layar yang wajib dirancang

Artboard: 1440×900 (desktop), 768×1024 (tablet), 390×844 (mobile). Setiap layar minimal desktop + mobile; layar 3, 6, 7 juga tablet.

### 1. Intro (sebelum landing, 3-4 keyframe)
Layar nyaris hitam. Kata-kata dari satu kutipan acak (contoh nyata alinea I: "Bahwa sesungguhnya kemerdekaan itu ialah hak segala bangsa dan oleh sebab itu, maka penjajahan di atas dunia harus dihapuskan, karena tidak sesuai dengan peri-kemanusiaan dan peri-keadilan.") datang dari posisi acak dan kedalaman berbeda, berkumpul menjadi kalimat, beresonansi biru, lalu logotype PASAL FRENZY terbentuk dari huruf yang datang dari kedalaman. Label kecil mono di bawah kutipan: "Pembukaan UUD 1945, alinea I".

### 2. Loading
Logotype di tengah, bar progres 2 px gradien merah→putih, persentase mono di kanan. Di bawah bar: baris 1 = detail tahap nyata (contoh: "Font: Playfair Display 900 (logotype)", "Naskah termuat: 73 pasal, 21 bab", "Kata Pembukaan: 118 dari 170 dirender ke SDF"), baris 2 = kalimat deskripsi yang berganti tiap 2 detik dan **melebar selebar bar**, bukan blok sempit di tengah. Tombol "Lewati" kecil di pojok kanan atas (hanya kunjungan ke-2+).

### 3. Landing page (satu halaman panjang)
- **Nav**: logotype kecil; tautan Konsep, Kasus, Cara bermain, Riset, Unduh; di kanan **Masuk** (ghost) dan **Daftar** (primer) + saklar bahasa "ID | EN". Setelah masuk: chip akun (avatar warna + nama) dan tombol "Beranda". Mobile: menu penuh layar.
- **Hero**: ruang hampa 3D dengan kata-kata Pembukaan sebagai partikel; logotype besar; tagline "Ketika pasal menjadi fisika."; lead: "Rangkai Pembukaan di ruang hampa, lalu pertahankan integritas konstitusional dalam tiga kasus kritis. Setiap kata punya massa, setiap pasal punya gravitasi." Tombol: "Mulai Bermain" (primer), "Masuk" (sekunder), "Unduh untuk Windows / Android" (ghost). Empat statistik nyata: 4 alinea Pembukaan, 73 pasal dalam 21 bab, 170 ayat, 3 kasus kritis. Latar 3D harus memudar/blur saat di-scroll agar teks section di bawahnya terbaca.
- **Section "Singularitas Konstitusional"**: tiga panel kaca berdiri miring dalam 3D memuat kutipan asli (JetBrains Mono): Pasal 1 ayat (3) "Negara Indonesia adalah negara hukum."; Pasal 28A "Setiap orang berhak untuk hidup serta berhak mempertahankan hidup dan kehidupannya."; Pasal 33 ayat (3) "Bumi dan air dan kekayaan alam yang terkandung di dalamnya dikuasai oleh negara dan dipergunakan untuk sebesar-besar kemakmuran rakyat."
- **Section "Tiga Kasus"** (kartu besar bercerita, masing-masing punya key visual sendiri, lihat aset):
  - Kasus 1 "Labirinto Hakiki" — HAM vs keamanan negara, Pasal 28A-28J. Kutipan Pasal 28J ayat (2): "Dalam menjalankan hak dan kebebasannya, setiap orang wajib tunduk kepada pembatasan yang ditetapkan dengan undang-undang dengan maksud semata-mata untuk menjamin pengakuan serta penghormatan atas hak kebebasan orang lain dan untuk memenuhi tuntutan yang adil sesuai dengan pertimbangan moral, nilai-nilai agama, keamanan, dan ketertiban umum dalam suatu masyarakat demokratis."
  - Kasus 2 "Oligarki dalam Kabut Digital" — Pasal 33. Kutipan Pasal 33 ayat (2): "Cabang-cabang produksi yang penting bagi negara dan yang menguasai hajat hidup orang banyak dikuasai oleh negara."
  - Kasus 3 "Singularitas Perppu" — Pasal 22. Kutipan Pasal 22 ayat (1): "Dalam hal ihwal kegentingan yang memaksa, Presiden berhak menetapkan peraturan pemerintah sebagai pengganti undang-undang."
- **Section "Cara bermain"**: tiga langkah, ikon garis tipis khusus (bukan ikon pustaka): temukan kata yang beresonansi; rangkai argumen dari pasal; tahan serangan partikel koruptif.
- **Section "Riset & data"**: pernyataan sumber "Seluruh teks pasal diambil dari naskah resmi 'UUD NRI 1945 Dalam Satu Naskah' terbitan Sekretariat Jenderal MPR RI, tanpa perubahan." + kartu provenance bergaya dokumen arsip (SHA-256 mono, tanggal ekstraksi, tautan laporan validasi).
- **Section "Unduh"**: Windows .exe, Android .apk, Web; catatan jujur "tanpa penandatanganan kode: SmartScreen menampilkan peringatan penerbit tidak dikenal".
- **Footer**: sumber naskah, lisensi MIT, GitHub, versi.

### 4. Masuk / Daftar (web dan aplikasi; tanpa server)
Dua kolom desktop. Kiri: kutipan Pasal 1 ayat (2) "Kedaulatan berada di tangan rakyat dan dilaksanakan menurut Undang-Undang Dasar." Playfair italic besar + catatan jujur penyimpanan (web: "Akun tersimpan di browser ini, tanpa server."; aplikasi: "Akun tersimpan di perangkat ini."). Kanan: kartu dengan tab "Masuk | Daftar". Masuk: daftar akun (avatar warna, nama, terakhir aktif, lencana PIN); akun ber-PIN membuka baris input PIN mono + tombol "Buka"; error "PIN salah." Daftar: Nama pemain; PIN (opsional) + Ulangi PIN; pilih warna avatar (6 warna: `#DC2626 #3B82F6 #D4A017 #10B981 #A855F7 #F97316`); Kode partisipan riset (opsional); tombol "Daftar & masuk". Rancang state kosong ("Belum ada akun di sini.") dan state error.

### 5. Beranda (layar yang paling harus terasa mahal; ini prioritas utama)
Konten yang **harus ada** (semua angka dihitung dari data, di desain pakai kondisi pemain baru: 0 dari 4 bab, 0 pasal, 0 mnt, integritas 1.00, dan kondisi pemain lanjut: 2 dari 4 bab, 17 pasal, 1 j 05 mnt, integritas 0.62):
- Bilah atas: logotype, lencana "VERSI WEB"/"VERSI APLIKASI", chip akun, "Ganti akun", "Keluar", saklar bahasa.
- Sambutan: "Selamat datang, Fashich." + kalimat status ("Ruang hampa masih gelap. Mulai dari Pembukaan." / "2 bab dimenangkan. Berikutnya: Kasus 2: Oligarki dalam Kabut Digital.") + tombol "Mulai: Prolog" / "Lanjutkan: Kasus 2".
- Integritas konstitusional sebagai objek, bukan bar: usulkan bentuk yang selaras konsep (cincin, segel, timbangan, jam pasir partikel; pilih satu dan konsisten).
- Ringkasan: bab dimenangkan, pasal dikuasai, waktu bermain, argumen tercatat.
- Jalur empat bab: Prolog "Kehampaan Sebelum Konstitusi" (Pembukaan UUD 1945), Kasus 1 "Labirinto Hakiki" (Pasal 28A-28J), Kasus 2 "Oligarki dalam Kabut Digital" (Pasal 33), Kasus 3 "Singularitas Perppu" (Pasal 22). Status: Mulai / Lanjutkan / Selesai / Terkunci ("Menangkan bab sebelumnya untuk membuka"). Setiap bab memakai key visual-nya sendiri (lihat aset), bukan kartu polos.
- Panel: Progres konstitusional (penguasaan rata-rata, pasal terkumpul, argumen, integritas terakhir), Pengaturan (volume utama, volume efek, bisukan, kualitas grafis Otomatis/Rendah/Sedang/Tinggi, kurangi gerakan), Riset & data (saklar persetujuan, kode partisipan, sesi tercatat, Ekspor JSON, Ekspor CSV, Hapus data riset), Akun (avatar, nama, tanggal dibuat, catatan penyimpanan, Ganti akun, Hapus akun).
- Footer: pernyataan sumber + versi.
Susunannya bebas; yang dilarang: grid kartu seragam. Cari komposisi editorial: hirarki ukuran ekstrem, ruang negatif yang disengaja, satu elemen 3D/ilustratif dominan, garis rambut, penomoran, tekstur.

### 6. HUD dalam game (3 varian: normal, krisis integritas 0.3, Mode Frenzy)
Integritas = ketebalan bingkai cahaya di tepi layar (tebal = sehat; tipis dan merah = krisis). Peta konstelasi pasal di pojok kanan atas (bintang terhubung garis tipis). Frenzy: tepi layar bergetar halus, hue bergeser, teks pasal "meledak" ke DOM. Tombol Beranda/jeda minimal. Mobile landscape: dua zona sentuh (kiri gerak, kanan lihat) + tombol interaksi bulat merah kanan bawah.

### 7. Overlay Jeda/Pengaturan in-world
Panel kaca gelap, bukan modal putih: lanjutkan, volume, kualitas, kurangi gerakan, izin riset, ekspor, keluar ke beranda.

## Aset yang harus kamu buat (ini yang belum ada dan diperlukan engineer)

1. **Logotype & lockup** SVG: horizontal, stacked, monogram "PF" untuk favicon/ikon app; versi 1 warna. Ekspor juga PNG 1024, 512, 256, 192, 180, 32, 16 dan `maskable` untuk Android.
2. **Key visual empat bab** (Prolog, Kasus 1-3), masing-masing 1600×900 dan potongan 800×1000 (portrait), sebagai gambar statis bergaya render 3D/ilustrasi digital yang konsisten: Prolog = kata-kata Pembukaan sebagai bintang di ruang hampa; Kasus 1 = labirin kaca retak dengan bayangan pekat; Kasus 2 = kabut partikel hijau-kebiruan, node fraktal, sumur gravitasi; Kasus 3 = antarmuka retak, strip VHS, aberasi kromatik. Tanpa teks di dalam gambar.
3. **Hero landing**: still 2560×1440 sebagai fallback untuk perangkat lemah/reduced motion (versi 3D hidup dibuat engineer).
4. **Set ikon garis** (24 px, stroke 1.5, SVG): resonansi, rangkai argumen, partikel koruptif, integritas, konstelasi, PIN/gembok, ekspor, riset, bahasa, suara, kualitas, gerakan, keluar, Windows, Android, web, jeda, lanjut, kembali.
5. **Tekstur** (PNG seamless 512/1024, boleh grayscale): butir film halus, kertas arsip, goresan kaca, noise partikel. Dipakai sebagai overlay CSS/shader.
6. **Gambar OG/sosial** 1200×630 dan **screenshot store** (Windows/Android) 3-5 komposisi.
7. **Spesifikasi motion**: durasi/easing untuk reveal (clip-path + blur, 600-800 ms, power3.out), hover kartu (angkat 4-6 px, 400 ms), transisi antar layar (void-collapse: gelap menyerap dari tepi; constitutional-dive: zoom masuk ke kedalaman), state Frenzy (getar ≤ 3 Hz demi WCAG). Sertakan varian reduced motion.

## Format serah terima (wajib, agar bisa diimplementasikan persis)

- Frame Figma dinamai per rute: `intro`, `loading`, `landing`, `masuk`, `daftar`, `beranda`, `hud-normal`, `hud-krisis`, `hud-frenzy`, `jeda`, masing-masing sufiks `-desktop`, `-tablet`, `-mobile`.
- Ekspor PNG @2x semua frame + SVG untuk ikon/logotype + PNG/WebP untuk key visual dan tekstur.
- Satu halaman **Tokens**: warna (hex), skala tipe (px/rem + line-height + tracking), spasi (4-pt), radius, bayangan, durasi/easing; sertakan juga sebagai JSON `{"color":{...},"type":{...},"space":{...},"motion":{...}}`.
- Satu halaman **Komponen**: tombol (primer/sekunder/ghost, state hover/focus/disabled), input, tab, saklar, slider, select, kartu bab (4 status), chip akun, lencana, panel, gauge integritas; semua dengan ukuran dan padding tertulis.
- Catatan singkat per layar: apa yang bergerak, apa yang statis, aset mana yang dipakai di mana.

## Kriteria diterima

- Seseorang yang melihat Beranda 2 detik tanpa logo tetap tahu ini Pasal Frenzy, bukan dashboard SaaS.
- Kontras teks memenuhi WCAG AA; fokus keyboard terlihat; status tidak hanya dibedakan warna.
- Tidak ada satu pun teks placeholder; semua kutipan persis seperti di atas.
- Semua layar mobile 390 px tetap utuh tanpa scroll horizontal.
- Tidak ada elemen yang bergantung pada CDN atau font selain tiga font di atas (produk harus jalan offline).
