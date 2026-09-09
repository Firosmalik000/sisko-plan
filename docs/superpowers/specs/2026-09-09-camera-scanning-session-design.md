# XSisten — kamera, sesi scan, dan draft produk

Status: rancangan implementasi; bukan perubahan aplikasi atau deployment.

## Tujuan dan keputusan utama

Pengguna mengumpulkan barang dengan kamera, lalu memeriksa bagian yang perlu dikoreksi. Foto menjadi jalur utama; barcode kamera dan input manual tetap tersedia. Kamera tidak ditutup setelah setiap foto. Pengambilan foto dan pemrosesan berjalan bersamaan.

POS: ambil foto → proses otomatis di belakang → lanjut foto → periksa → tambahkan ke keranjang.

Produk baru: ambil 1–3 foto satu produk → Produk berikutnya atau Periksa draft → proses kelompok itu di belakang → lengkapi informasi yang belum tersedia → simpan.

Tidak ada tombol global Mulai proses. Tombol akhir adalah Periksa hasil atau Periksa draft. Tombol simpan/keranjang tetap merupakan keputusan pengguna.

## Dasar referensi

Ditinjau 9 September 2026:

- Loyverse: kamera tetap aktif setelah barcode terbaca, barcode dapat diisi dari form produk. https://help.loyverse.com/help/barcodes-scanning-built-device
- Scandit: continuous scanning dan kendali preview. https://docs.scandit.com/sdks/flutter/sparkscan/advanced/
- Scandit: jeda/resume sesuai lifecycle, release kamera ketika aplikasi ditinggalkan. Pola ini diadaptasi ke MediaStream milik XSisten, tidak mengasumsikan API Standby tersedia di browser. https://support.scandit.com/hc/en-us/articles/20407003057948-WebSDK-How-to-Manage-the-Camera
- Scandit UX: kontrol mudah dijangkau, feedback visual/suara/getaran, serta perhatian pada konteks fisik pengguna. https://www.scandit.com/blog/scanning-at-scale-ux-insights/
- Sortly: scan untuk membantu pengisian produk, pemeriksaan detail sebelum simpan. https://help.sortly.com/how-to-add-items

Referensi mendukung pola interaksi, bukan bukti akurasi AI, performa server, atau rekomendasi membeli SDK. Tidak menambahkan Scandit sebagai dependency.

## Konteks yang sudah diverifikasi

- Kamera foto barang saat ini: sisi panjang maksimal 768 px, JPEG quality 0,66; barcode dan normalizer galeri: 1280 px / 0,82.
- Frontend POS membuka maksimal enam request recognition paralel; hook draft produk dua request discovery.
- Backend recognition mendukung multi-item, tetapi frontend mengambil satu bestResult dan menggabungkan capture berdasarkan hasil pertamanya. Kedua jalur ini harus diganti agar tidak kehilangan barang.
- ProductScanner mengalihkan foto/barcode berhasil ke review. Jalur foto produk baru menutup kamera setelah satu foto.
- Recognition memakai model CPU lokal; discovery memakai provider eksternal. Provider produksi yang dilaporkan pengguna adalah DeepSeek saja.
- Server yang dilaporkan: 4 core / 4 GB; kemungkinan upgrade 6 core / 8 GB. Metrik produksi belum dapat diakses (403), kapasitas belum terukur.
- Satu proses recognition memiliki satu slot aktif; antrean produksi saat ini satu. Discovery memiliki lima operasi aktif per proses.
- Laravel menggabungkan semua upstream 429 menjadi SCANNER_BUSY dan memotong kuota sebelum upstream berhasil. Keduanya perlu diperbaiki sebelum auto-retry.
- Scanner juga dipakai pembelian dan stok opname. Perubahan kontrak bersama wajib memigrasikan pemanggil tersebut tanpa mengubah aturan bisnisnya.

## Cakupan

Termasuk: kamera POS; campuran foto/barcode; review; close/reopen; multi-item; antrean dan retry; kelompok foto produk baru; perubahan minimum form produk agar alur kamera selesai; input barcode yang bisa diketik/ditempel; regresi pembelian/stok opname.

Di luar tahap ini: eSIM/ICCID, pengaturan/pairing scanner fisik, jaminan kompatibilitas semua scanner, aplikasi native, penyimpanan offline lintas restart, redesign seluruh master-data, pergantian provider/model, auto-checkout, dan pengenalan beberapa produk baru yang tidak terkait dalam satu request discovery.

## Kontrak sesi dan navigasi

Satu sesi belum diterapkan dimiliki oleh halaman dan konteks toko + tujuan + transaksi/draft. Menutup tampilan kamera berbeda dari membuang sesi. Menambahkan ke keranjang berbeda dari membayar.

| Kejadian | Perilaku pasti |
|---|---|
| Buka Scan barang pertama kali | Kamera mode Foto barang; hasil kosong; shutter manual tersedia; auto mengikuti pengaturan yang sudah ada |
| Foto selesai diambil | Thumbnail langsung muncul, proses dijadwalkan, kamera tetap tampil |
| Recognition selesai | Perbarui hasil di tempat; jangan membuka drawer otomatis atau menggeser posisi review |
| Tekan Periksa hasil | Buka review; hentikan pengambilan otomatis/decoding; request yang sudah berjalan tetap berjalan |
| Tekan Tambah foto dari review | Kembali ke kamera dalam satu ketukan; hasil, koreksi, mode, dan antrean tetap ada |
| Tekan X/Back pada scanner | Tutup overlay, kembali ke halaman; simpan sesi selama halaman masih hidup; kamera dilepas; proses dapat lanjut saat halaman masih aktif |
| Halaman memiliki hasil belum diterapkan | Tampilkan Lanjut scan dan Lihat hasil (jumlah), tanpa memaksa review sebelum bisa mengambil foto baru |
| Buka Lanjut scan | Kamera siap mengambil barang berikutnya; tidak mengirim ulang foto lama; baseline auto-capture dibuat ulang |
| Tekan Tambahkan ke keranjang | Hanya hasil terpilih yang valid diterapkan satu kali; disable double-tap; item gagal diterapkan tetap terlihat beserta sebabnya |
| Buka kamera setelah hasil sudah masuk keranjang | Mulai kumpulan scan baru; isi keranjang sebelumnya tetap; hasil lama tidak diterapkan ulang |
| Tekan Bayar saat ada sesi belum diterapkan | Minta menyelesaikan atau membuang hasil scan terlebih dahulu, dengan Periksa hasil dan Buang hasil scan; tidak diam-diam melewatkan barang |
| Transaksi berhasil | Bersihkan sesi terkait; transaksi berikutnya dimulai kosong |
| Buang hasil scan | Konfirmasi hanya bila ada data; batalkan pekerjaan yang dapat dibatalkan, abaikan respons terlambat, lepaskan preview |
| Keluar route, ganti toko/akun, refresh | Beri perlindungan meninggalkan draft sesuai mekanisme navigation browser/Inertia; data sesi tidak dijanjikan pulih lintas reload. Jangan bocorkan sesi ke toko berikutnya |
| Aplikasi masuk background/HP terkunci | Hentikan capture/decoding dan release kamera. Jangan mengandalkan browser menyelesaikan request saat background |
| Kembali ke aplikasi | Rekonsiliasi request selesai/tertunda; tampilkan Lanjut kamera. Jangan mengambil foto tanpa pengguna kembali ke scanner |

Tidak tampilkan popup konfirmasi untuk perpindahan mode, review, atau close yang mempertahankan data. Retake/target barcode sementara menggunakan Back untuk kembali ke hasil asal; tidak membuang seluruh sesi.

## Kamera dan input campuran

- Mode terlihat: Foto barang | Barcode. Mode diingat dalam sesi; sesi baru dimulai Foto barang.
- Foto A → foto B → barcode C → foto D boleh dalam satu sesi. Pergantian mode tidak mengosongkan atau mengirim ulang antrean.
- Foto merupakan satu event capture; semua region hasilnya dipertahankan. Satu barcode valid merupakan satu event input terpisah.
- Barcode lokal tidak dikirim ke AI. Di mode foto, jangan sekaligus menambahkan barang dari decoder barcode diam-diam.
- Untuk memperjelas hasil foto, gunakan Pastikan dengan barcode pada item yang dituju. Barcode mengganti identitas item tersebut, bukan menambah event penjualan baru.
- Barcode yang tetap terlihat tidak menambah jumlah lagi. Barcode perlu keluar dari frame sebelum dapat dibaca ulang; tombol + tetap tersedia untuk unit identik. Kode lain dapat dibaca segera.
- Retake foto mengganti seluruh hasil capture itu; jika foto berisi tiga barang, tiga hasil lama diganti bersama. Pilihan barcode untuk satu item hanya mengganti item itu.
- Jangan menyimpulkan dua foto SKU sama adalah foto ulang atau dua unit fisik hanya dari kesamaan SKU. Pertahankan jejak capture, gabungkan jumlah hanya pada ringkasan pilihan; pengguna dapat mengoreksi.
- Auto-capture mengambil maksimal satu foto per pemandangan stabil, memakai ambang stabilisasi awal yang sudah ada (1,5 detik), dan baru aktif kembali setelah perubahan pemandangan bermakna. Abaikan auto ketika antrean penuh, kamera tertutup, review, atau target retake sedang selesai.
- Setelah antrean penuh kembali memiliki ruang, tombol manual aktif segera; auto harus menunggu pemandangan baru untuk menghindari foto ganda.
- Lampu, galeri, tombol ambil foto besar, dan Auto aktif/Jeda tersedia; feedback visual tetap bekerja saat getaran/suara tidak didukung.

## Antrean dan kegagalan

- Maksimal 10 foto belum selesai per halaman/sesi aktif, termasuk foto sedang dikompresi, queued, request aktif, retry-wait, dan foto kelompok produk baru yang belum ditutup. Failed terminal dan hasil selesai tidak memblokir ruang baru.
- Maksimal satu request foto aktif per halaman: recognition satu foto; discovery satu kelompok berisi 1–3 foto. Ini bukan batas global lintas tab/perangkat.
- Saat penuh: shutter/galeri penambahan dijeda, tampilkan Antrean penuh · Menunggu pemrosesan. Review, hapus, dan barcode tetap dapat dipakai.
- Kelompok produk saat penuh masih dapat ditutup melalui Produk berikutnya/Periksa draft agar diproses; jangan menciptakan deadlock.
- Satu foto selesai membebaskan satu slot; satu kelompok discovery selesai membebaskan jumlah fotonya. Foto ke-11, ke-21, dst tidak memerlukan sesi baru.
- Busy recognition/discovery: retry otomatis maksimum dua kali setelah percobaan awal, dengan jeda 1 dan 2 detik ditambah jitter 0–500 ms; hormati Retry-After jika tersedia dan hentikan otomatis jika penundaan melewati batas 30 detik sejak pengiriman pertama.
- Retry memakai identitas request logis yang sama. Capacity rejection bukan scan baru dan tidak memotong kuota.
- Kuota, subscription, auth, unsupported image, dan validation failure tidak di-retry otomatis.
- Timeout/network dengan hasil server tidak pasti: tampilkan Belum selesai + Coba lagi/Pilih manual; tidak menjalankan loop otomatis berbayar. Satu foto bermasalah tidak mengunci semua foto berikutnya.
- Offline sebelum request: simpan antrean dalam memori halaman dan lanjut saat online/visible. Jelaskan bahwa refresh/keluar halaman dapat menghilangkan foto.
- Batas 10 bukan pembatas total sesi; setelah review dibuka dan proses selesai, lepas blob penuh yang tidak lagi diperlukan untuk retry, pertahankan thumbnail dan hasil. Jangan mempertahankan semua frame resolusi penuh sepanjang sesi.

## Review dan kebenaran jumlah

- Tampilkan tiga kelompok stabil: Perlu diperiksa, Siap, Belum selesai. Jangan memindahkan baris yang sedang diedit ketika respons lain datang.
- Nama/varian, thumbnail, satuan, harga katalog, jumlah, dan Hapus tersedia. Persentase confidence teknis tidak perlu ditampilkan.
- Tampilkan seluruh item hasil satu foto; candidate list adalah alternatif identitas satu item, bukan barang tambahan.
- Jumlah awal satu per region terdeteksi; gabungkan barang identik pada ringkasan dengan tetap mempertahankan sumber capture/itemIndex.
- Semua hasil harus siap atau secara eksplisit dilewati sebelum commit. Foto gagal tidak dianggap kosong atau sudah masuk keranjang.
- Tombol Tambahkan ke keranjang menampilkan jumlah unit terpilih. Harga/jumlah stok server tetap otoritatif. Jangan silent clamp atau menghilangkan baris tanpa memberi tahu pengguna.
- Hasil yang sudah diterapkan tidak bisa diterapkan lagi setelah reopen. Koreksi hasil terlambat untuk capture dihapus/retake tidak boleh mengubah keranjang.
- Foto baru untuk barang sama setelah commit boleh menambah jumlah lagi karena merupakan event fisik baru, bukan replay event lama.

## Produk baru dan modal

- Alur utama: satu foto depan → Produk berikutnya. Foto tambahan dan barcode opsional, maksimum tiga foto produk yang sama.
- Menekan Produk berikutnya atau Periksa draft menutup kelompok aktif dan menjadwalkan discovery. Tidak memproses foto depan lalu mengulangi seluruh discovery setiap sudut ditambahkan.
- Kamera barcode untuk draft memiliki label Barcode untuk [nama/Produk N]; pindai mengisi draft aktif. Bila kode sudah terdaftar, tawarkan Buka produk, jangan membuat duplikat otomatis.
- Foto produk A yang sudah diproses dapat ditinjau selagi kelompok B diproses. User edit dilindungi per field: hasil AI terlambat hanya mengisi field yang belum diubah pengguna.
- Hasil AI membantu nama, varian, ukuran/satuan, kategori dan deskripsi jika tersedia. Harga perkiraan ditandai Perkiraan dan tidak menjadi harga jual final tanpa konfirmasi pengguna.
- Ambil foto dari form kembali ke form asal, field aktif dan posisi scroll dipertahankan. Jangan menutup/mereset form untuk membuka kamera.
- Edit produk lama: ganti foto tidak otomatis mengganti nama, harga, atau stok. Gunakan aksi eksplisit Isi dari foto bila pengguna ingin saran.
- HP: form layar penuh dengan footer tetap; desktop: dialog. Field utama foto, nama, harga jual, satuan, barcode opsional, lacak stok dan stok awal bila relevan. Detail lainnya memuat field tambahan tanpa menghilangkan validasi yang wajib.
- Barcode menjadi input editable dengan ikon kamera; keyboard scanner dapat mengisi saat fokus, tetapi pairing/perangkat belum termasuk tahap ini.
- Draft antrean memiliki Simpan & berikutnya. Simpan yang berhasil dikeluarkan dari antrean; validasi gagal tetap berada pada draft dengan isian utuh.
- Tambah foto produk ini menambah sudut draft aktif; Tambah produk lain membuat draft baru. Maksimal tiga sudut diberi pesan singkat, bukan error service.
- Tutup modal mempertahankan draft selama halaman hidup. Buka Tambah lewat kamera lagi melanjutkan draft/antrean, tidak membuat salinan dari hasil lama. Membuka edit produk lain tidak menghapus draft create; target kamera harus membawa identitas draft/produk yang eksplisit.

## Kualitas gambar dan resource

- Baseline POS: panjang maksimal 768 px, JPEG 0,66. Tidak memperbesar gambar kecil.
- Produk baru dan barcode: 1280 px, JPEG 0,82; crop/perbaikan label diuji pada foto nyata. Untuk POS multi-item, uji pembanding 1280 px sebelum mengganti baseline.
- Normalisasi galeri mengikuti tujuan, tidak selalu memakai preset terbesar.
- Thumbnail sisi panjang maksimal 160 px; lepaskan object URL, bitmap, dan MediaStream pada lifecycle yang sesuai.
- Tidak menetapkan janji ukuran KB atau latency dari nilai JPEG quality saja.
- Saat review singkat tetap di overlay, pause capture dan sembunyikan preview; bila MediaStream dapat dipertahankan dengan aman, jangan restart untuk setiap edit. Tutup overlay/background/unmount melepaskan kamera. Target retake tetap mempertahankan sesi data meski kamera perlu warm-up.

## Runtime dan batas server

- Uji recognition queue 3 pada server 4 core / 4 GB; tetap satu slot aktif per proses. Jangan mengubah semaphore menjadi sepuluh.
- Selaraskan max request Laravel/service menjadi 3 untuk tahap ini; POS scheduler tetap mengirim satu foto.
- Timeout recognition service usulan uji 15 detik, Laravel 20 detik; timeout discovery provider tetap 30 detik, Laravel 45 detik. Timeout adalah batas menunggu, bukan cara mempercepat model, dan CPU work yang masih berjalan harus tetap memegang slot hingga selesai.
- Discovery concurrency awal tetap lima; tidak menaikkan quota/throttle global tanpa bukti penyebab 429.
- Pada upgrade 6 core / 8 GB, benchmark satu vs dua replica satu worker; jangan mengklaim kapasitas dua kali lipat. Provider quota lintas replica dan RAM total ikut dihitung.
- Tidak mengubah env produksi selama tugas perencanaan. Runtime tuning dipromosikan terpisah setelah metrik dan pengujian staging.

## Kriteria penerimaan

1. Sepuluh foto pending memblokir foto berikutnya; setelah satu selesai, foto ke-11 bisa diambil tanpa reopen.
2. Foto A/B, barcode C, foto D menghasilkan empat input dengan hasil lengkap tanpa reset mode/sesi.
3. Review → Tambah foto → review mempertahankan koreksi dan tidak mengirim ulang foto lama.
4. X → Lanjut scan mempertahankan antrean; kamera tidak aktif ketika overlay tertutup.
5. Commit → reopen → commit tidak menduplikasi hasil yang sudah masuk keranjang.
6. Retake/hapus selama request berjalan tidak membiarkan respons lama menghidupkan hasil yang dibuang.
7. Multi-item tiga region tidak menjadi satu bestResult; dua region SKU identik menghasilkan jumlah dua yang bisa dikoreksi.
8. Kuota habis berbeda dari busy; retry busy tidak menambah usage, tidak meminta foto ulang, dan berakhir dengan aksi jelas setelah batas retry.
9. Draft depan+belakang+barcode menghasilkan satu produk, sedangkan Produk berikutnya menghasilkan draft baru.
10. Hasil AI terlambat tidak menimpa harga/nama yang sedang dikoreksi; edit foto produk lama tidak mengubah harga otomatis.
11. Back Android, Escape desktop, izin kamera ditolak, koneksi putus, tab background/foreground, keyboard terbuka, dan pergantian toko diuji.
12. QA pada 320, 375, 640, 768, 1024, 1280, 1536 px; tidak ada overflow, tombol utama terpotong, atau focus trap yang salah.
13. Tidak ada janji kapasitas 20 pengguna sebelum pengujian; catat latency sukses P50/P95, throughput sukses, 429, CPU, RAM, dan akurasi.

## Review kesederhanaan

Gunakan komponen, hook, endpoint, cache katalog dan model yang sudah ada. Recognition capture dan discovery draft adalah dua konsep berbeda dengan kontrak service berbeda; jangan memaksakan satu job engine generik. Tidak menambahkan Redis, message broker, WebSocket, SDK kamera, global store, atau mode offline persisten untuk kebutuhan ini. Hapus jalur bestResult, merge capture destruktif, auto-review per foto, dan penutupan kamera produk setelah satu foto yang digantikan. Tidak menyimpan kredensial dalam dokumen.
