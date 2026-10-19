# Laporan ekstraksi dan validasi UUD NRI 1945

Dibuat otomatis oleh `scripts/build-uud1945.py` pada 2026-09-12T12:28:13+00:00 (UTC).

## Sumber

- Berkas: `data-source/UUD-NRI-1945-Dalam-Satu-Naskah.pdf`
- SHA-256: `ec6615bead1fa534af3a06c060716ab407b90fc3fbb3b7d2d25a646b49502445`
- Alat: PyMuPDF 1.28.2 · Python 3.11.9
- Rendisi kanonik: A (halaman 2-28); pembanding: B (halaman 29-49)

## Ringkasan isi

| Unit | Jumlah |
|---|---|
| Alinea Pembukaan | 4 |
| BAB | 21 |
| Pasal (batang tubuh) | 73 |
| Ayat (batang tubuh) | 170 |
| Pasal Aturan Peralihan | 3 |
| Pasal Aturan Tambahan | 2 |

## Sebaran penanda amandemen (per ayat / pasal tanpa ayat, batang tubuh)

| Amandemen | Jumlah unit |
|---|---|
| Teks asli 1945 (tanpa penanda) | 25 |
| Perubahan Pertama | 16 |
| Perubahan Kedua | 59 |
| Perubahan Ketiga | 68 |
| Perubahan Keempat | 29 |

## Validasi struktural

LULUS: semua pemeriksaan struktural terpenuhi (37 pasal bernomor, pasal berhuruf, jumlah ayat kunci, tanpa noise).

## Pemeriksaan silang rendisi A vs rendisi B

Unit dibandingkan: 217. Perbedaan: 17.

Perbedaan dicatat apa adanya; rendisi A tetap dipakai tanpa koreksi manual.

| Unit | Jenis | Rendisi A | Rendisi B |
|---|---|---|---|
| pasal/2/ayat-1 | teks-berbeda | Majelis Permusyawaratan Rakyat terdiri atas anggota Dewan Perwakilan Rakyat dan anggota Dewan Perwakilan Daerah yang dipilih melalui pemilihan umum dan diatur lebih lanjut dengan undang-undang. | Majelis Permusyawaratan Rakyat terdiri atas anggota-anggota Dewan Perwakilan Rakyat dan anggota Dewan Perwakilan Daerah yang pilih melalui pemilihan umum dan daitur lebih lanjut dengan undang-undang. |
| pasal/22D/ayat-2 | teks-berbeda | Dewan Perwakilan Daerah ikut membahas rancangan undang-undang yang berkaitan dengan otonomi daerah; hubungan pusat dan daerah; pembentukan, pemekaran, dan penggabungan daerah; pengelolaan sumber daya alam dan sumber daya ekonomi lainnya, serta perimbangan keuangan pusat dan daerah; serta memberikan pertimbangan kepada Dewan Perwakilan Rakyat atas rancangan undang-undang anggaran pendapatan dan belanja negara dan rancangan undang-undang yang berkaitan dengan pajak, pendidikan, dan agama. | Dewan Perwakilan Daerah ikut membahas rancangan undang-undang yang berkaitan dengan otonomi daerah; hubungan pusat dan daerah; pembentukan, pemekaran, dan penggabungan daerah; pengelolaan sumber daya alam dan sumber daya ekonomi lainnya, serta perimbangan keuangan pusat dan daerah; serta memberikan pertimbangan kepada Dewan Perwakilan Rakyat atas rancangan undang-undang anggaran pendapatan dan belanja negara dan rancangan undang-undang yang berkaitan dengan pajak, pendidikan, dan agama. |
| pasal/28 | teks-berbeda | Kemerdekaan berserikat dan berkumpul, mengeluarkan pikiran dengan lisan dan tulisan dan sebagainya ditetapkan dengan undang-undang. | Kemerdekaan berserikat dan berkumpul, mengeluarkan pikiran dengan lisan dan tulisan dan sebaganya ditetapkan dengan undang-undang. |
| pasal/31 | hanya-di-B |  | 1. Setiap warga negara berhak mendapat pendidikan. 4) 2. Setiap warga negara wajib mengikuti pendidikan dasar dan pemerintah wajib membiayainya. 4) 3. Pemerintah mengusahakan dan menyelenggarakan satu sistem pendidikan nasional, yang meningkatkan keimanan dan ketakwaan serta akhlak mulia dalam rangka mencerdaskan kehidupan bangsa, yang diatur dengan undang-undang. 4) 4. Negara memprioritaskan anggaran pendidikan sekurang-kurangnya dua puluh persen dari anggaran pendapatan dan belanja negara serta dari aggaran pendapatan dan belanja daerah untuk memenuhi kebutuhan penyelenggaraan pendidikan nasional. 4) 5. Pemerintah memajukan ilmu pengetahuan dan tekhnologi dengan menjunjung tinggi nilai-nilai agama dan persatuan bangsa untuk kemajuan peradaban serta kesejahteraan umat manusia. |
| pasal/31/ayat-1 | hanya-di-A | Setiap warga negara berhak mendapat pendidikan. |  |
| pasal/31/ayat-2 | hanya-di-A | Setiap warga negara wajib mengikuti pendidikan dasar dan pemerintah wajib membiayainya. |  |
| pasal/31/ayat-3 | hanya-di-A | Pemerintah mengusahakan dan menyelenggarakan satu sistem pendidikan nasional, yang meningkatkan keimanan dan ketakwaan serta akhlak mulia dalam rangka mencerdaskan kehidupan bangsa, yang diatur dengan undang-undang. |  |
| pasal/31/ayat-4 | hanya-di-A | Negara memprioritaskan anggaran pendidikan sekurang-kurangnya dua puluh persen dari anggaran pendapatan dan belanja negara serta dari aggaran pendapatan dan belanja daerah untuk memenuhi kebutuhan penyelenggaraan pendidikan nasional. |  |
| pasal/31/ayat-5 | hanya-di-A | Pemerintah memajukan ilmu pengetahuan dan tekhnologi dengan menjunjung tinggi nilai-nilai agama dan persatuan bangsa untuk kemajuan peradaban serta kesejahteraan umat manusia. |  |
| pasal/32/ayat-1 | teks-berbeda | Negara memajukan kebudayaan nasional Indonesia di tengah peradaban dunia dengan menjamin kebebasan masyarakat dalam memelihara dalam mengembangkan nilai-nilai budayanya. | Negara memajukan kebudayaan nasional Indonesia ditengah peradaban dunia dengan menjamin kebebasan mesyarakat dalam memelihara dalam mengembangkan nilai-nilai budayanya. |
| pasal/7B/ayat-1 | teks-berbeda | Usul pemberhentian Presiden dan/atau Wakil Presiden dapat diajukan oleh Dewan Perwakilan Rakyat kepada Majelis Permusyawaratan Rakyat hanya dengan terlebih dahulu mengajukan permintaan kepada Mahkamah Konstitusi untuk memeriksa, mengadili, dan memutus pendapat Dewan Perwakilan Rakyat bahwa Presiden dan/atau Wakil Presiden telah melakukan pelanggaran hukum berupa pengkhianatan terhadap negara, korupsi, penyuapan, tindak pidana berat lainnya, atau perbuatan tercela; dan/atau pendapat bahwa Presiden dan/atau Wakil Presiden tidak lagi memenuhi syarat sebagai Presiden dan/atau Wakil Presiden. | Usul pemberhentian Presiden dan/atau Wakil Presiden dapat diajukan oleh Dewan Perwakilan Rakyat kepada Majelis Permusyawaratan Rakyat hanya dengan terlebih dahulu mengajukan permintaan kepada Mahkamah Konstitusi untuk memeriksa, mengadili, dan memutus pendapat Dewan Perwakilan Rakyat bahwa Presiden dan/atau Wakil Presiden telah melakukan pelanggaran hukum berupa pengkhianatan terhadap negara, korupsi, penyuapan, tindak pidana berat lainnya, atau perbuatan tercela; dan/atau pendapat bahwa Presiden dan/atau Wakil Presiden tidak lagi memenuhi syarat sebagai Presiden dan/atau Wakil Presiden. |
| pasal/7B/ayat-5 | teks-berbeda | Apabila Mahkamah Konstitusi memutuskan bahwa Presiden dan/atau Wakil Presiden terbukti melakukan pelanggaran hukum berupa pengkhianatan terhadap negara, korupsi, penyuapan, tindak pidana berat lainnya, atau perbuatan tercela; dan/atau terbukti bahwa Presiden dan/atau Wakil Presiden tidak lagi memenuhi syarat sebagai Presiden dan/atau Wakil Presiden, Dewan Perwakilan Rakyat menyelenggarakan sidang paripurna untuk meneruskan usul pemberhentian Presiden dan/atau Wakil Presiden kepada Majelis Permusyawaratan Rakyat. | Apabila Mahkamah Konstitusi memutuskan bahwa Presiden dan/atau Wakil Presiden terbukti melakukan pelanggaran hukum berupa pengkhianatan terhadap negara, korupsi, penyuapan, tindak pidana berat lainnya, atau perbuatan tercela; dan/atau terbukti bahwa Presiden dan/atau Wakil Presiden tidak lagi memenuhi syarat sebagai Presiden dan/atau Wakil Presiden, Dewan Perwakilan Rakyat menyelenggarakan sidang paripurna untuk meneruskan usul pemberhentian Presiden dan/atau Wakil Presiden kepada Majelis Permusyawaratan Rakyat. |
| pasal/7C | hanya-di-A | Presiden tidak dapat membekukan dan/atau membubarkan Dewan Perwakilan Rakyat. |  |
| pasal/9/ayat-1 | teks-berbeda | Sebelum memangku jabatannya, Presiden dan Wakil Presiden bersumpah menurut agama, atau berjanji dengan sungguh-sungguh dihadapan Majelis Permusyawaratan Rakyat atau Dewan Perwakilan Rakyat sebagai berikut : Sumpah Presiden (Wakil Presiden): “ Demi Allah, saya bersumpah akan memenuhi kewajiban Presiden Republik Indonesia (Wakil Presiden Republik Indonesia) dengan sebaik-baiknya dan seadil-adilnya, memegang teguh Undang-Undang Dasar dan menjalankan segala undang-undang dan peraturannya dengan selurus-lurusnya serta berbakti, kepada Nusa dan Bangsa”. Janji Presiden (Wakil Presiden) : “Saya berjanji dengan sungguh-sungguh akan memenuhi kewajiban Presiden Republik Indonesia (Wakil Presiden Republik Indonesia) dengan sebaik-baiknya dan seadil-adilnya, memegang teguh Undang-Undang Dasar dan menjalankan segala undang-undang dan peraturannya dengan selurus-lurusnya serta berbakti kepada Nusa dan Bangsa” . | Sebelum memangku jabatannya, Presiden danWakil Presiden bersumpah menurut agama, atau berjanji dengan sungguh-sungguh dihadapan Majelis Permusyawaratan Rakyat atau Dewan Perwakilan Rakyat sebagai berikut : Sumpah Presiden (Wakil Presiden): “ Demi Allah, saya bersumpah akan memenuhi kewajiban Presiden Republik Indoensia (Wakil Presiden Republik Indonesia) dengan sebaik-baiknya dan seadil-adilnya, memegang teguh Undang-Undang Dasar dan menjalankan segala undang-undang dan peraturannya dengan selurus-lurusnya serta berbakti, kepada Nusa dan Bangsa”. Janji Presiden (Wakil Presiden) : “Saya berjanji dengan sungguh-sungguh akan memenuhi kewajiban Presiden Republik Indonesia (Wakil Presiden Republik Indonesia) dengan sebaik-baiknya dan seadil-adilnya, memegang teguh Undang-Undang Dasar dan menjalankan segala undang-undang dan peraturannya dengan selurus-lurusnya serta berbakti kepada Nusa dan Bangsa” . |
| pembukaan/alinea-1 | teks-berbeda | Bahwa sesungguhnya kemerdekaan itu ialah hak segala bangsa dan oleh sebab itu, maka penjajahan di atas dunia harus dihapuskan, karena tidak sesuai dengan peri-kemanusiaan dan peri-keadilan. | Bahwa sesungguhnya kemerdekaan itu ialah hak segala bangsa dan oleh sebab itu, maka penjajahan di atas dunia harus dihapuskan, karena tidak sesuai dengan peri-kemanusiaan dan peri- keadilan. |
| tambahan/II | hanya-di-A | Dengan ditetapkannya perubahan Undang-Undang Dasar ini, Undang-Undang Dasar Negara Republik Indonesia Tahun 1945 terdiri atas Pembukaan dan pasal-pasal. |  |
| tambahan/III | hanya-di-B |  | Dengan ditetapkannya perubahan Undang-Undang Dasar ini, Undang-Undang Dasar Negara Republik Indonesia Tahun 1945 terdiri atas Pembukaan dan pasal-pasal. |
