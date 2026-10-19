# Laporan verifikasi teks UUD NRI 1945 di dalam game

Dibuat oleh `scripts/verify-teks-uud.py` pada 2026-10-19.

- Sumber: `data-source/UUD-NRI-1945-Dalam-Satu-Naskah.pdf`
- Data: `src/data/pembukaan.json`, `src/data/kutipan.json`, `src/data/kata-kunci.json`
- Alat: Python 3.13.16, pypdf 6.17.0, pdftotext (poppler)

Normalisasi sebelum dibandingkan: U+00A0 menjadi spasi, U+00AD menjadi tanda hubung (di naskah ini U+00AD
dirender sebagai tanda hubung terlihat), pemenggalan kata di akhir baris disambung, kaki halaman
`jdih.bapeten.go.id` dan legenda penanda amandemen dibuang. Tidak ada huruf atau tanda baca yang diubah.

Angka struktur dihitung dari batang tubuh (sebelum Aturan Peralihan): BAB dengan nomor berbeda,
judul `Pasal …` yang berdiri di barisnya sendiri, dan penanda ayat `(n)` di awal baris.

| Pemeriksaan | Hasil | Keterangan |
|---|---|---|
| SHA-256 PDF = SHA256SUMS.txt | lulus | ec6615bead1fa534af3a06c060716ab407b90fc3fbb3b7d2d25a646b49502445 |
| SHA-256 PDF = provenance pembukaan.json | lulus |  |
| SHA-256 PDF = provenance kutipan.json | lulus |  |
| Pembukaan alinea 1: ada di naskah (pypdf) | lulus | 189 karakter |
| Pembukaan alinea 1: batas kata (pdftotext) | lulus | 26 kata |
| Pembukaan alinea 1: kata[] konsisten dengan teks | lulus | 26 kata |
| Pembukaan alinea 2: ada di naskah (pypdf) | lulus | 249 karakter |
| Pembukaan alinea 2: batas kata (pdftotext) | lulus | 31 kata |
| Pembukaan alinea 2: kata[] konsisten dengan teks | lulus | 31 kata |
| Pembukaan alinea 3: ada di naskah (pypdf) | lulus | 189 karakter |
| Pembukaan alinea 3: batas kata (pdftotext) | lulus | 25 kata |
| Pembukaan alinea 3: kata[] konsisten dengan teks | lulus | 25 kata |
| Pembukaan alinea 4: ada di naskah (pypdf) | lulus | 788 karakter |
| Pembukaan alinea 4: batas kata (pdftotext) | lulus | 97 kata |
| Pembukaan alinea 4: kata[] konsisten dengan teks | lulus | 97 kata |
| Kutipan pasal-1-3 (Pasal 1 ayat (3)): ada di naskah (pypdf) | lulus |  |
| Kutipan pasal-1-3 (Pasal 1 ayat (3)): batas kata (pdftotext) | lulus | 5 kata |
| Kutipan pasal-1-3 (Pasal 1 ayat (3)): letak pasal/ayat | lulus |  |
| Kutipan pasal-22-1 (Pasal 22 ayat (1)): ada di naskah (pypdf) | lulus |  |
| Kutipan pasal-22-1 (Pasal 22 ayat (1)): batas kata (pdftotext) | lulus | 14 kata |
| Kutipan pasal-22-1 (Pasal 22 ayat (1)): letak pasal/ayat | lulus |  |
| Kutipan pasal-28a (Pasal 28A): ada di naskah (pypdf) | lulus |  |
| Kutipan pasal-28a (Pasal 28A): batas kata (pdftotext) | lulus | 11 kata |
| Kutipan pasal-28a (Pasal 28A): letak pasal/ayat | lulus |  |
| Kutipan pasal-28j-2 (Pasal 28J ayat (2)): ada di naskah (pypdf) | lulus |  |
| Kutipan pasal-28j-2 (Pasal 28J ayat (2)): batas kata (pdftotext) | lulus | 48 kata |
| Kutipan pasal-28j-2 (Pasal 28J ayat (2)): letak pasal/ayat | lulus |  |
| Kutipan pasal-33-2 (Pasal 33 ayat (2)): ada di naskah (pypdf) | lulus |  |
| Kutipan pasal-33-2 (Pasal 33 ayat (2)): batas kata (pdftotext) | lulus | 16 kata |
| Kutipan pasal-33-2 (Pasal 33 ayat (2)): letak pasal/ayat | lulus |  |
| Kutipan pasal-33-3 (Pasal 33 ayat (3)): ada di naskah (pypdf) | lulus |  |
| Kutipan pasal-33-3 (Pasal 33 ayat (3)): batas kata (pdftotext) | lulus | 19 kata |
| Kutipan pasal-33-3 (Pasal 33 ayat (3)): letak pasal/ayat | lulus |  |
| Kata kunci alinea 1: 6 kata, berurutan di naskah | lulus | kemerdekaan, hak, bangsa, penjajahan, peri-kemanusiaan, peri-keadilan |
| Kata kunci alinea 2: 6 kata, berurutan di naskah | lulus | perjuangan, merdeka, bersatu, berdaulat, adil, makmur |
| Kata kunci alinea 3: 6 kata, berurutan di naskah | lulus | rakhmat, luhur, kebangsaan, bebas, rakyat, kemerdekaannya |
| Kata kunci alinea 4: 6 kata, berurutan di naskah | lulus | pemerintah, melindungi, kesejahteraan, mencerdaskan, ketertiban, perdamaian |
| Angka Landing: 4 alinea Pembukaan | lulus | terhitung 4 |
| Angka Landing: 21 BAB berbeda | lulus | terhitung 21 |
| Angka Landing: 73 judul pasal | lulus | terhitung 73 |
| Angka Landing: 170 ayat bernomor | lulus | terhitung 170 |

**Kesimpulan: semua pemeriksaan lulus.**
