# Laporan bobot kata UUD NRI 1945

Dibuat otomatis oleh `scripts/build-pasal-weights.py` pada 2026-09-12T11:34:32+00:00 (UTC).

| Ukuran | Nilai |
|---|---|
| Unit teks | 203 |
| Kosakata unik | 849 |
| Total token | 4055 |
| Kata fungsional | 69 |

## 25 kata dengan tf-idf tertinggi

| Kata | tf | df | idf | tf-idf | fungsional |
|---|---|---|---|---|---|
| hak | 28 | 12 | 3.7532 | 16.2595 | tidak |
| dan/atau | 22 | 11 | 3.8332 | 15.6818 | ya |
| wakil | 45 | 25 | 3.06 | 14.7085 | tidak |
| indonesia | 42 | 24 | 3.0992 | 14.6832 | tidak |
| angkatan | 6 | 2 | 5.2195 | 14.5716 | tidak |
| rancangan | 15 | 10 | 3.9202 | 14.5364 | tidak |
| peradilan | 7 | 3 | 4.9318 | 14.5287 | tidak |
| sumber | 8 | 4 | 4.7087 | 14.5001 | tidak |
| daya | 8 | 4 | 4.7087 | 14.5001 | tidak |
| daerah | 47 | 27 | 2.9859 | 14.4821 | tidak |
| jumlah | 10 | 6 | 4.3722 | 14.4396 | tidak |
| majelis | 28 | 19 | 3.3224 | 14.3933 | tidak |
| permusyawaratan | 28 | 19 | 3.3224 | 14.3933 | tidak |
| konstitusi | 17 | 12 | 3.7532 | 14.3867 | tidak |
| provinsi | 13 | 9 | 4.0155 | 14.3152 | tidak |
| itu | 19 | 14 | 3.6101 | 14.2397 | ya |
| republik | 16 | 12 | 3.7532 | 14.1592 | tidak |
| bangsa | 10 | 7 | 4.2387 | 13.9986 | tidak |
| calon | 10 | 7 | 4.2387 | 13.9986 | tidak |
| anggota | 28 | 21 | 3.2271 | 13.9804 | tidak |
| tersebut | 9 | 6 | 4.3722 | 13.9789 | tidak |
| memilih | 9 | 6 | 4.3722 | 13.9789 | tidak |
| suatu | 8 | 5 | 4.5264 | 13.9387 | ya |
| mahkamah | 20 | 16 | 3.4849 | 13.9248 | tidak |
| dari | 29 | 22 | 3.1826 | 13.8995 | ya |

## Catatan

- `normatifSkema` adalah parameter desain (hierarki norma dalam game), bukan pengukuran.
- `mkCitations` bernilai null: frekuensi sitasi MK tidak tersedia offline dan tidak dikarang.
