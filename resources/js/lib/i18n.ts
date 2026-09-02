import { usePage } from '@inertiajs/react';
import type { AppLocale } from '@/lib/currency';

let activeLocale: AppLocale = 'id';

const translations: Record<AppLocale, Record<string, string>> = {
    id: {
        Platform: 'Platform',
        Fitur: 'Fitur',
        'Cara kerja': 'Cara kerja',
        Paket: 'Paket',
        FAQ: 'FAQ',
        Masuk: 'Masuk',
        'Buat akun': 'Buat akun',
        'Pilih paket': 'Pilih paket',
        'Buka dashboard': 'Buka dashboard',
        'Buka navigasi': 'Buka navigasi',
        'Tutup navigasi': 'Tutup navigasi',
        'Kembali ke halaman utama': 'Kembali ke halaman utama',
        'Akses aman': 'Akses aman',
        'Kasir cepat': 'Kasir cepat',
        'Stok real-time': 'Stok real-time',
        'Laporan ringkas': 'Laporan ringkas',
        'Ruang kerja toko Anda': 'Ruang kerja toko Anda',
        'Dengan melanjutkan, Anda menyetujui kebijakan penggunaan layanan':
            'Dengan melanjutkan, Anda menyetujui kebijakan penggunaan layanan',
        'Navigasi utama': 'Navigasi utama',
        'Scan barangnya. Sisanya langsung tercatat.':
            'Scan barangnya. Sisanya langsung tercatat.',
        'Masuk dengan Google': 'Masuk dengan Google',
        'Alamat email': 'Alamat email',
        'Kata sandi': 'Kata sandi',
        'Lupa kata sandi?': 'Lupa kata sandi?',
        'Ingat saya': 'Ingat saya',
        'Belum memiliki akun?': 'Belum memiliki akun?',
        Daftar: 'Daftar',
        'Daftar dengan Google': 'Daftar dengan Google',
        'Nama lengkap': 'Nama lengkap',
        'Konfirmasi kata sandi': 'Konfirmasi kata sandi',
        'Sudah memiliki akun?': 'Sudah memiliki akun?',
        'Lupa kata sandi': 'Lupa kata sandi',
        'Kirim tautan reset kata sandi': 'Kirim tautan reset kata sandi',
        'Atau kembali ke': 'Atau kembali ke',
        masuk: 'masuk',
        'Atur ulang kata sandi': 'Atur ulang kata sandi',
        'Sembunyikan kata sandi': 'Sembunyikan kata sandi',
        'Tampilkan kata sandi': 'Tampilkan kata sandi',
        Passkey: 'Passkey',
        'Kelola passkey untuk masuk tanpa kata sandi':
            'Kelola passkey untuk masuk tanpa kata sandi',
        'Semua pekerjaan toko, terasa lebih terarah.':
            'Semua pekerjaan toko, terasa lebih terarah.',
        'Masuk untuk melanjutkan transaksi, memantau stok, dan melihat perkembangan usaha dari satu tempat.':
            'Masuk untuk melanjutkan transaksi, memantau stok, dan melihat perkembangan usaha dari satu tempat.',
        'Akses aman dan terkontrol untuk setiap peran.':
            'Akses aman dan terkontrol untuk setiap peran.',
        'Kategori biaya berhasil ditambahkan.':
            'Kategori biaya berhasil ditambahkan.',
        'Kategori biaya berhasil diperbarui.':
            'Kategori biaya berhasil diperbarui.',
        'Biaya toko berhasil diposting.': 'Biaya toko berhasil diposting.',
        'Produk berhasil ditambahkan.': 'Produk berhasil ditambahkan.',
        'Produk berhasil diperbarui.': 'Produk berhasil diperbarui.',
        'Produk berhasil dihapus.': 'Produk berhasil dihapus.',
        'Supplier berhasil ditambahkan.': 'Supplier berhasil ditambahkan.',
        'Supplier berhasil diperbarui.': 'Supplier berhasil diperbarui.',
        'Penjualan berhasil diposting.': 'Penjualan berhasil diposting.',
        'Retur dan refund berhasil diposting.':
            'Retur dan refund berhasil diposting.',
        'Verifikasi email': 'Verifikasi email',
        'Tautan verifikasi baru telah dikirim ke alamat email yang Anda gunakan saat mendaftar.':
            'Tautan verifikasi baru telah dikirim ke alamat email yang Anda gunakan saat mendaftar.',
        'Kirim ulang email verifikasi': 'Kirim ulang email verifikasi',
        Keluar: 'Keluar',
        'Kode pemulihan': 'Kode pemulihan',
        'Konfirmasi akses akun dengan memasukkan salah satu kode pemulihan darurat.':
            'Konfirmasi akses akun dengan memasukkan salah satu kode pemulihan darurat.',
        'Masukkan kode autentikasi dari aplikasi autentikator Anda.':
            'Masukkan kode autentikasi dari aplikasi autentikator Anda.',
        'masuk menggunakan kode autentikasi':
            'masuk menggunakan kode autentikasi',
        'Kode autentikasi': 'Kode autentikasi',
        'masuk menggunakan kode pemulihan': 'masuk menggunakan kode pemulihan',
        'Masukkan kode pemulihan': 'Masukkan kode pemulihan',
        Lanjutkan: 'Lanjutkan',
        'atau Anda dapat': 'atau Anda dapat',
    },
    ms: {
        Platform: 'Platform',
        Fitur: 'Ciri-ciri',
        'Cara kerja': 'Cara kerja',
        Paket: 'Pelan',
        FAQ: 'Soalan lazim',
        Masuk: 'Log masuk',
        'Buat akun': 'Buat akaun',
        'Pilih paket': 'Pilih pelan',
        'Buka dashboard': 'Buka papan pemuka',
        'Buka navigasi': 'Buka navigasi',
        'Tutup navigasi': 'Tutup navigasi',
        'Kembali ke halaman utama': 'Kembali ke halaman utama',
        'Akses aman': 'Akses selamat',
        'Kasir cepat': 'Juruwang pantas',
        'Stok real-time': 'Stok masa nyata',
        'Laporan ringkas': 'Laporan ringkas',
        'Verifikasi email': 'Pengesahan e-mel',
        'Tautan verifikasi baru telah dikirim ke alamat email yang Anda gunakan saat mendaftar.':
            'Pautan pengesahan baharu telah dihantar ke alamat e-mel yang anda gunakan semasa mendaftar.',
        'Kirim ulang email verifikasi': 'Hantar semula e-mel pengesahan',
        Keluar: 'Log keluar',
        'Kode pemulihan': 'Kod pemulihan',
        'Konfirmasi akses akun dengan memasukkan salah satu kode pemulihan darurat.':
            'Sahkan akses akaun dengan memasukkan salah satu kod pemulihan kecemasan.',
        'Masukkan kode autentikasi dari aplikasi autentikator Anda.':
            'Masukkan kod pengesahan daripada aplikasi pengesah anda.',
        'masuk menggunakan kode autentikasi':
            'log masuk menggunakan kod pengesahan',
        'Kode autentikasi': 'Kod pengesahan',
        'masuk menggunakan kode pemulihan':
            'log masuk menggunakan kod pemulihan',
        'Masukkan kode pemulihan': 'Masukkan kod pemulihan',
        Lanjutkan: 'Teruskan',
        'atau Anda dapat': 'atau anda boleh',
        'Ruang kerja toko Anda': 'Ruang kerja kedai anda',
        'Dengan melanjutkan, Anda menyetujui kebijakan penggunaan layanan':
            'Dengan meneruskan, anda bersetuju dengan dasar penggunaan perkhidmatan',
        'Navigasi utama': 'Navigasi utama',
        'Scan barangnya. Sisanya langsung tercatat.':
            'Imbas barangnya. Selebihnya direkodkan terus.',
        'Masuk dengan Google': 'Log masuk dengan Google',
        'Alamat email': 'Alamat e-mel',
        'Kata sandi': 'Kata laluan',
        'Lupa kata sandi?': 'Lupa kata laluan?',
        'Ingat saya': 'Ingat saya',
        'Belum memiliki akun?': 'Belum mempunyai akaun?',
        Daftar: 'Daftar',
        'Daftar dengan Google': 'Daftar dengan Google',
        'Nama lengkap': 'Nama penuh',
        'Konfirmasi kata sandi': 'Sahkan kata laluan',
        'Sudah memiliki akun?': 'Sudah mempunyai akaun?',
        'Lupa kata sandi': 'Lupa kata laluan',
        'Kirim tautan reset kata sandi':
            'Hantar pautan tetapan semula kata laluan',
        'Atau kembali ke': 'Atau kembali ke',
        masuk: 'log masuk',
        'Atur ulang kata sandi': 'Tetapkan semula kata laluan',
        'Sembunyikan kata sandi': 'Sembunyikan kata laluan',
        'Tampilkan kata sandi': 'Tunjukkan kata laluan',
        Passkey: 'Passkey',
        'Kelola passkey untuk masuk tanpa kata sandi':
            'Urus passkey untuk log masuk tanpa kata laluan',
        'Semua pekerjaan toko, terasa lebih terarah.':
            'Semua kerja kedai, lebih tersusun.',
        'Masuk untuk melanjutkan transaksi, memantau stok, dan melihat perkembangan usaha dari satu tempat.':
            'Log masuk untuk meneruskan transaksi, memantau stok dan melihat perkembangan perniagaan dari satu tempat.',
        'Akses aman dan terkontrol untuk setiap peran.':
            'Akses selamat dan terkawal untuk setiap peranan.',
        'Kategori biaya berhasil ditambahkan.':
            'Kategori perbelanjaan berjaya ditambah.',
        'Kategori biaya berhasil diperbarui.':
            'Kategori perbelanjaan berjaya dikemas kini.',
        'Biaya toko berhasil diposting.':
            'Perbelanjaan kedai berjaya direkodkan.',
        'Produk berhasil ditambahkan.': 'Produk berjaya ditambah.',
        'Produk berhasil diperbarui.': 'Produk berjaya dikemas kini.',
        'Produk berhasil dihapus.': 'Produk berjaya dipadam.',
        'Supplier berhasil ditambahkan.': 'Pembekal berjaya ditambah.',
        'Supplier berhasil diperbarui.': 'Pembekal berjaya dikemas kini.',
        'Penjualan berhasil diposting.': 'Jualan berjaya direkodkan.',
        'Retur dan refund berhasil diposting.':
            'Pemulangan dan bayaran balik berjaya direkodkan.',
    },
};

const indonesianOverrides: Record<string, string> = {
    '2FA admin': '2FA admin',
    Admin: 'Admin',
    'Admin Platform': 'Admin Platform',
    'Admin platform': 'Admin platform',
    'Admin toko': 'Admin toko',
    'Aktivitas admin': 'Aktivitas admin',
    Continue: 'Lanjutkan',
    'Each recovery code can be used once to access your account and will be removed after use. If you need more, click':
        'Setiap kode pemulihan hanya dapat digunakan sekali dan akan dihapus setelah dipakai. Jika perlu kode baru, pilih',
    'Kembali ke Super Admin': 'Kembali ke Super Admin',
    'Login memerlukan authenticator atau satu recovery code.':
        'Login memerlukan aplikasi autentikator atau satu kode pemulihan.',
    'Menunggu owner/admin memposting hasil':
        'Menunggu pemilik atau admin memposting hasil',
    'Or continue with email': 'Atau lanjutkan dengan email',
    'Please enter your new password below':
        'Masukkan kata sandi baru Anda di bawah ini',
    'Please verify your email address by clicking on the link we just emailed to you.':
        'Verifikasi alamat email dengan membuka tautan yang baru kami kirim.',
    'Recovery code': 'Kode pemulihan',
    'SEO default': 'SEO utama',
    'Seluruh penerimaan subscription yang dicatat oleh admin platform.':
        'Seluruh penerimaan subscription yang dicatat oleh admin platform.',
    'Sign in with a passkey': 'Masuk dengan passkey',
    'Super Admin': 'Super Admin',
    'Tambah admin platform': 'Tambah admin platform',
    'Tambah admin': 'Tambah admin',
    'above.': 'di atas.',
    Added: 'Ditambahkan',
    Back: 'Kembali',
    Confirm: 'Konfirmasi',
    Default: 'Utama',
    Documentation: 'Dokumentasi',
    Inventory: 'Persediaan',
    Repository: 'Repositori',
    'SaaS administration': 'Administrasi SaaS',
    'Security posture': 'Status keamanan',
    'Enable two-factor authentication': 'Aktifkan autentikasi dua faktor',
    'Enter the 6-digit code from your authenticator app':
        'Masukkan kode 6 digit dari aplikasi autentikator',
    'To finish enabling two-factor authentication, scan the QR code or enter the setup key in your authenticator app':
        'Untuk menyelesaikan aktivasi autentikasi dua faktor, pindai kode QR atau masukkan kunci pengaturan di aplikasi autentikator',
    'Two-factor authentication enabled': 'Autentikasi dua faktor telah aktif',
    'Two-factor authentication is now enabled. Scan the QR code or enter the setup key in your authenticator app.':
        'Autentikasi dua faktor telah aktif. Pindai kode QR atau masukkan kunci pengaturan di aplikasi autentikator.',
    'Verify authentication code': 'Verifikasi kode autentikasi',
    'Regenerate codes': 'Buat ulang kode',
    '2FA recovery codes': 'Kode pemulihan 2FA',
    'Recovery codes let you regain access if you lose your 2FA device. Store them in a secure password manager.':
        'Kode pemulihan membantu Anda mengakses akun jika perangkat 2FA hilang. Simpan di pengelola kata sandi yang aman.',
    'Hide recovery codes': 'Sembunyikan kode pemulihan',
    'View recovery codes': 'Lihat kode pemulihan',
    Hide: 'Sembunyikan',
    View: 'Lihat',
    'recovery codes': 'kode pemulihan',
    'or, enter the code manually': 'atau masukkan kode secara manual',
    'Each recovery code can be used once to access your account and will be removed after use. If you need more, click Regenerate codes above.':
        'Setiap kode pemulihan hanya dapat digunakan sekali dan akan dihapus setelah dipakai. Jika perlu kode baru, pilih Buat ulang kode di atas.',
    'Authentication code': 'Kode autentikasi',
    Cancel: 'Batal',
    'Cash ledger': 'Buku kas',
    Close: 'Tutup',
    'Confirm password': 'Konfirmasi kata sandi',
    'Current password': 'Kata sandi saat ini',
    'Displays the mobile sidebar.': 'Menampilkan sidebar seluler.',
    'Email address': 'Alamat email',
    'Email verification': 'Verifikasi email',
    'Enter recovery code': 'Masukkan kode pemulihan',
    'Hide password': 'Sembunyikan kata sandi',
    'Identity management': 'Manajemen identitas',
    Loading: 'Memuat',
    'Loading recovery codes': 'Memuat kode pemulihan',
    'Log out': 'Keluar',
    'Manage your passkeys for passwordless sign-in':
        'Kelola passkey untuk masuk tanpa kata sandi',
    'Manage your two-factor authentication settings':
        'Kelola pengaturan autentikasi dua faktor',
    More: 'Lainnya',
    'New password': 'Kata sandi baru',
    'No passkeys yet': 'Belum ada passkey',
    Password: 'Kata sandi',
    'Passkey name': 'Nama passkey',
    Receipt: 'Bukti pembayaran',
    Remove: 'Hapus',
    'Remove passkey': 'Hapus passkey',
    Save: 'Simpan',
    'Security settings': 'Pengaturan keamanan',
    Settings: 'Pengaturan',
    'Show password': 'Tampilkan kata sandi',
    Sidebar: 'Sidebar',
    'Tenant management': 'Manajemen tenant',
    'Toggle sidebar': 'Buka atau tutup sidebar',
    'Two-factor authentication': 'Autentikasi dua faktor',
    breadcrumb: 'Navigasi halaman',
    'Add a passkey to sign in without a password':
        'Tambahkan passkey untuk masuk tanpa kata sandi',
    'Add passkey': 'Tambah passkey',
    'A name helps you identify this passkey later.':
        'Nama membantu Anda mengenali passkey ini nanti.',
    'Commercial ledger': 'Catatan komersial',
    'Confirm with passkey': 'Konfirmasi dengan passkey',
    'Confirming...': 'Mengonfirmasi...',
    'Continue setup': 'Lanjutkan pengaturan',
    Dashboard: 'Dashboard',
    'Disable 2FA': 'Nonaktifkan 2FA',
    'Enable 2FA': 'Aktifkan 2FA',
    'Enter your email to receive a password reset link':
        'Masukkan email untuk menerima tautan pengaturan ulang kata sandi',
    'Forgot password': 'Lupa kata sandi',
    'Last used': 'Terakhir digunakan',
    'Or confirm with password': 'Atau konfirmasi dengan kata sandi',
    'Passkeys are not supported in this browser.':
        'Browser ini tidak mendukung passkey.',
    'Register passkey': 'Daftarkan passkey',
    'Registering...': 'Mendaftarkan...',
    'Removing...': 'Menghapus...',
    Tenant: 'Tenant',
    'This is a secure area of the application. Please confirm your password before continuing.':
        'Ini adalah area aman aplikasi. Konfirmasikan kata sandi sebelum melanjutkan.',
    'When you enable two-factor authentication, you will be prompted for a secure pin during login. This pin can be retrieved from a TOTP-supported application on your phone.':
        'Saat autentikasi dua faktor diaktifkan, Anda akan diminta memasukkan PIN aman ketika masuk. PIN tersedia di aplikasi TOTP pada ponsel Anda.',
    'You will be prompted for a secure, random pin during login, which you can retrieve from the TOTP-supported application on your phone.':
        'Anda akan diminta memasukkan PIN acak yang aman ketika masuk. PIN tersedia di aplikasi TOTP pada ponsel Anda.',
};

const landingMalayOverrides: Record<string, string> = {
    'Scan Barang, Kelola Toko Lebih Cepat':
        'Imbas Barang, Urus Kedai Dengan Lebih Pantas',
    'Scan barang, catat transaksi, perbarui stok, dan pantau laporan toko dalam satu alur.':
        'Imbas barang, rekod transaksi, kemas kini stok dan pantau laporan kedai dalam satu aliran.',
    'Scan barangnya. Sisanya langsung tercatat.':
        'Imbas barang. Selebihnya terus direkodkan.',
    'Kasir cepat, operasional rapi': 'Juruwang pantas, operasi teratur',
    'Scan barangnya.': 'Imbas barang.',
    'Sisanya langsung tercatat.': 'Selebihnya terus direkodkan.',
    'Dari transaksi ke stok, kas, dan laporan.':
        'Daripada transaksi kepada stok, tunai dan laporan.',
    'menyatukan semuanya agar toko bergerak lebih cepat tanpa catatan yang tercecer.':
        'menggabungkan semuanya supaya kedai bergerak lebih pantas tanpa rekod yang tercicir.',
    'Buka dashboard': 'Buka papan pemuka',
    'Lihat cara kerjanya': 'Lihat cara ia berfungsi',
    'Bisa tanpa scanner khusus': 'Boleh digunakan tanpa pengimbas khas',
    'Akses tim terkontrol': 'Akses pasukan terkawal',
    'Data contoh': 'Data contoh',
    'Kasir aktif': 'Juruwang aktif',
    'Produk ditemukan': 'Produk ditemui',
    Keranjang: 'Troli',
    '3 item': '3 item',
    'Total bayar': 'Jumlah bayaran',
    'Selesaikan transaksi': 'Lengkapkan transaksi',
    'Stok diperbarui': 'Stok dikemas kini',
    'Penjualan hari ini': 'Jualan hari ini',
    Scan: 'Imbas',
    Transaksi: 'Transaksi',
    Stok: 'Stok',
    Kas: 'Tunai',
    Laporan: 'Laporan',
    'Lebih ringan setiap hari': 'Lebih mudah setiap hari',
    'Toko sibuk tidak butuh aplikasi yang ikut merepotkan.':
        'Kedai yang sibuk tidak memerlukan aplikasi yang menyusahkan.',
    'dibuat untuk pemilik toko yang ingin bekerja cepat sekaligus tetap memahami kondisi usahanya.':
        'dibina untuk pemilik kedai yang mahu bekerja pantas sambil memahami keadaan perniagaan mereka.',
    'Satu alur, bukan banyak catatan': 'Satu aliran, bukan banyak rekod',
    'Istilah yang mudah dipahami': 'Istilah yang mudah difahami',
    'Nyaman dipakai dari ponsel': 'Selesa digunakan melalui telefon',
    'Yang sering terjadi': 'Perkara yang sering berlaku',
    'Jualannya jalan. Catatannya tertinggal.':
        'Jualan berjalan. Rekod pula tertinggal.',
    'Masalah kecil yang berulang bisa membuat kondisi toko sulit dibaca.':
        'Masalah kecil yang berulang boleh menyebabkan keadaan kedai sukar difahami.',
    'Catatan mudah tercecer': 'Rekod mudah tercicir',
    'Transaksi tersimpan di banyak tempat dan sulit diperiksa kembali.':
        'Transaksi disimpan di banyak tempat dan sukar disemak semula.',
    'Stok baru dihitung saat terlambat':
        'Stok hanya dikira apabila sudah lewat',
    'Barang laris habis tanpa tanda, barang lambat justru terus menumpuk.':
        'Barang laris habis tanpa amaran, manakala barang yang perlahan terus bertimbun.',
    'Rekap menghabiskan waktu': 'Rekapitulasi mengambil masa',
    'Angka penjualan, pengeluaran, dan laba harus disatukan ulang secara manual.':
        'Angka jualan, perbelanjaan dan keuntungan perlu digabungkan semula secara manual.',
    'Cara kerja': 'Cara ia berfungsi',
    'Tiga gerakan. Satu catatan yang utuh.':
        'Tiga langkah. Satu rekod yang lengkap.',
    'Barang masuk, transaksi selesai, kondisi toko langsung terbaca.':
        'Barang masuk, transaksi selesai dan keadaan kedai terus dapat dilihat.',
    'Scan atau cari barang': 'Imbas atau cari barang',
    'Gunakan barcode, nama produk, atau SKU.':
        'Gunakan kod bar, nama produk atau SKU.',
    'Atur jumlah, pembayaran, dan kembalian.':
        'Tetapkan kuantiti, pembayaran dan baki.',
    'Pantau hasilnya': 'Pantau hasilnya terus',
    'Stok, kas, dan laporan ikut diperbarui.':
        'Stok, tunai dan laporan turut dikemas kini.',
    'Satu sistem toko': 'Satu sistem kedai',
    'Bukan cuma kasir. Semua pekerjaan penting ikut rapi.':
        'Bukan sekadar juruwang. Semua kerja penting turut teratur.',
    'Kasir yang langsung paham barang': 'Juruwang yang terus mengenali barang',
    'Scan barcode, masukkan jumlah, lalu selesaikan pembayaran tanpa berpindah layar.':
        'Imbas kod bar, masukkan kuantiti kemudian selesaikan pembayaran tanpa berpindah skrin.',
    'Stok ikut bergerak otomatis': 'Stok bergerak secara automatik',
    'Setiap penjualan dan kulakan memperbarui persediaan hingga tingkat varian.':
        'Setiap jualan dan pembelian mengemas kini inventori hingga peringkat varian.',
    'Uang toko tetap terbaca': 'Wang kedai kekal jelas',
    'Kas, modal, biaya, dan utang supplier tercatat dalam alur yang bisa ditelusuri.':
        'Tunai, modal, kos dan hutang pembekal direkodkan dalam aliran yang boleh dijejaki.',
    'Keputusan tidak lagi pakai tebakan':
        'Keputusan tidak lagi berdasarkan tekaan',
    'Lihat penjualan bersih, laba kotor, produk terlaris, dan stok kritis.':
        'Lihat jualan bersih, untung kasar, produk terlaris dan stok kritikal.',
    'Satu pandangan': 'Satu paparan',
    'Dari meja kasir sampai keputusan pemilik.':
        'Daripada kaunter juruwang hingga keputusan pemilik.',
    'Informasi penting muncul saat dibutuhkan, tanpa layar yang penuh dan membingungkan.':
        'Maklumat penting muncul apabila diperlukan tanpa skrin yang sarat dan mengelirukan.',
    'Scan barcode atau cari produk': 'Imbas kod bar atau cari produk',
    'Stok kritis': 'Stok kritikal',
    '8 produk': '8 produk',
    'Batas minimum': 'Had minimum',
    'Perlu ditambah': 'Perlu ditambah',
    'Ringkasan hari ini': 'Ringkasan hari ini',
    'Penjualan bersih': 'Jualan bersih',
    'Naik 12% dari kemarin': 'Naik 12% daripada semalam',
    'Operasional menyeluruh': 'Operasi menyeluruh',
    'Satu toko, banyak pekerjaan. Tetap satu alur.':
        'Satu kedai, banyak kerja. Kekal dalam satu aliran.',
    'Lihat paket yang tersedia': 'Lihat pelan yang tersedia',
    'Penjualan & retur': 'Jualan & pemulangan',
    'Pembelian & supplier': 'Pembelian & pembekal',
    'Stok & opname': 'Stok & kiraan stok',
    'Kas, modal & biaya': 'Tunai, modal & kos',
    'Toko & anggota': 'Kedai & ahli',
    'Laporan operasional': 'Laporan operasi',
    'Cara kerja yang berbeda': 'Kaedah kerja yang berbeza',
    'Lebih sedikit mencatat ulang. Lebih banyak waktu untuk melayani.':
        'Kurangkan rekod berulang. Lebihkan masa untuk melayan pelanggan.',
    Pekerjaan: 'Kerja',
    'Cara manual': 'Cara manual',
    'Catat penjualan': 'Rekod jualan',
    'Scan atau cari, lalu simpan': 'Imbas atau cari, kemudian simpan',
    'Tulis dan hitung satu per satu': 'Tulis dan kira satu demi satu',
    'Perbarui stok': 'Kemas kini stok',
    'Mengikuti transaksi': 'Mengikut transaksi',
    'Hitung ulang secara manual': 'Kira semula secara manual',
    'Pantau kas': 'Pantau tunai',
    'Terhubung dengan operasional': 'Dihubungkan dengan operasi',
    'Terpisah dari catatan penjualan': 'Berasingan daripada rekod jualan',
    'Baca laporan': 'Lihat laporan',
    'Ringkasan siap dilihat': 'Ringkasan sedia dilihat',
    'Rekap kembali di akhir periode': 'Rekap semula pada akhir tempoh',
    'Pertanyaan umum': 'Soalan lazim',
    'Sebelum mulai, pastikan semuanya jelas.':
        'Sebelum bermula, pastikan semuanya jelas.',
    'Apakah harus membeli alat scanner khusus?':
        'Adakah perlu membeli pengimbas khas?',
    'Tidak. Barcode dapat dimasukkan dari perangkat yang Anda gunakan. Scanner eksternal tetap dapat dipakai untuk alur kasir yang lebih cepat.':
        'Tidak. Kod bar boleh dimasukkan melalui peranti yang anda gunakan. Pengimbas luaran masih boleh digunakan untuk aliran juruwang yang lebih pantas.',
    'Apakah produk tanpa barcode tetap bisa dijual?':
        'Bolehkah produk tanpa kod bar tetap dijual?',
    'Bisa. Cari produk berdasarkan nama atau SKU, lalu tambahkan ke keranjang seperti biasa.':
        'Boleh. Cari produk berdasarkan nama atau SKU, kemudian tambah ke troli seperti biasa.',
    'Apakah satu akun bisa mengelola beberapa toko?':
        'Bolehkah satu akaun mengurus beberapa kedai?',
    'Bisa, sesuai kapasitas paket. Data, anggota, dan operasional setiap toko tetap terpisah.':
        'Boleh, mengikut kapasiti pelan. Data, ahli dan operasi setiap kedai kekal berasingan.',
    'Apa yang berubah setelah transaksi disimpan?':
        'Apakah yang berubah selepas transaksi disimpan?',
    'Penjualan, stok, kas, dan ringkasan laporan diperbarui dalam satu alur yang saling terhubung.':
        'Jualan, stok, tunai dan ringkasan laporan dikemas kini dalam satu aliran yang saling berhubung.',
    'Mulai lebih rapi': 'Mula dengan lebih teratur',
    'Scan penjualannya. Pegang kendali tokonya.':
        'Imbas jualannya. Kekalkan kawalan kedai.',
    'Mulai kelola toko': 'Mula urus kedai',
    'Data setiap toko tetap terpisah': 'Data setiap kedai kekal berasingan',
};

const malayOverrides: Record<string, string> = {
    'Ringkasan usaha': 'Ringkasan perniagaan',
    'Katalog barang': 'Katalog produk',
    'Scan jual cepat': 'Imbas jualan pantas',
    'Riwayat penjualan': 'Sejarah jualan',
    'Kontrol persediaan': 'Kawalan inventori',
    'Stock opname': 'Kiraan stok',
    Pembelian: 'Pembelian',
    'Kulakan dan supplier': 'Pembelian stok dan pembekal',
    'Kontak pemasok': 'Hubungan pembekal',
    'Saldo dan mutasi': 'Baki dan transaksi',
    'Biaya Toko': 'Perbelanjaan Kedai',
    'Catat pengeluaran': 'Rekod perbelanjaan',
    'Scan penjualan': 'Imbas jualan',
    'Buka kasir untuk transaksi cepat': 'Buka juruwang untuk transaksi pantas',
    'Scan kulakan': 'Imbas pembelian stok',
    'Catat pembelian stok masuk': 'Rekod pembelian stok masuk',
    'Cek stok': 'Semak stok',
    'Lihat persediaan dan batas minimum': 'Lihat inventori dan had minimum',
    'Scan produk baru': 'Imbas produk baharu',
    'Tambah item yang belum ada': 'Tambah item yang belum tersedia',
    'Input penjualan': 'Masukkan jualan',
    'Buka kasir tanpa scan': 'Buka juruwang tanpa imbasan',
    'Cek stok manual': 'Semak stok secara manual',
    'Lihat persediaan sekarang': 'Lihat inventori semasa',
    'Ringkasan performa usaha': 'Ringkasan prestasi perniagaan',
    'Kelola cabang dan tim': 'Urus cawangan dan pasukan',
    'Saldo dan perpindahan kas': 'Baki dan pindahan tunai',
    'Pengeluaran harian': 'Perbelanjaan harian',
    'Kelola pemasok toko': 'Urus pembekal kedai',
    'Akun & Paket': 'Akaun & Pelan',
    Modal: 'Modal',
    'Setoran dan penarikan modal': 'Suntikan dan pengeluaran modal',
    Langganan: 'Langganan',
    'Status paket aktif': 'Status pelan aktif',
    'Menu cepat': 'Menu pantas',
    'Menu lainnya': 'Menu lain',
    ...indonesianOverrides,
    ...landingMalayOverrides,
    'Login Google belum dikonfigurasi.':
        'Log masuk Google belum dikonfigurasikan.',
    'Respons akun Google tidak valid.': 'Respons akaun Google tidak sah.',
    'Login Google tidak dapat diselesaikan. Silakan coba lagi.':
        'Log masuk Google tidak dapat diselesaikan. Sila cuba lagi.',
    'Akun Anda sedang dinonaktifkan.': 'Akaun anda sedang dinyahaktifkan.',
    'Admin platform harus masuk menggunakan metode utama.':
        'Pentadbir platform mesti log masuk menggunakan kaedah utama.',
    'Google tidak memberikan email terverifikasi.':
        'Google tidak memberikan e-mel yang disahkan.',
    'Email ini sudah terhubung ke akun Google lain.':
        'E-mel ini telah dipautkan kepada akaun Google lain.',
    '2FA admin': '2FA admin',
    Admin: 'Admin',
    'Admin Platform': 'Admin Platform',
    'Admin platform': 'Admin platform',
    'Admin toko': 'Admin kedai',
    'Aktivitas admin': 'Aktiviti admin',
    Continue: 'Teruskan',
    'Each recovery code can be used once to access your account and will be removed after use. If you need more, click':
        'Setiap kod pemulihan hanya boleh digunakan sekali dan akan dipadam selepas digunakan. Jika perlu kod baharu, pilih',
    'Kembali ke Super Admin': 'Kembali ke Super Admin',
    'Login memerlukan authenticator atau satu recovery code.':
        'Log masuk memerlukan aplikasi pengesah atau satu kod pemulihan.',
    'Menunggu owner/admin memposting hasil':
        'Menunggu pemilik atau admin merekodkan hasil',
    'Or continue with email': 'Atau teruskan dengan e-mel',
    'Please enter your new password below':
        'Masukkan kata laluan baharu anda di bawah',
    'Please verify your email address by clicking on the link we just emailed to you.':
        'Sahkan alamat e-mel dengan membuka pautan yang baru kami hantar.',
    'Recovery code': 'Kod pemulihan',
    'SEO default': 'SEO utama',
    'Seluruh penerimaan subscription yang dicatat oleh admin platform.':
        'Semua penerimaan langganan yang direkodkan oleh admin platform.',
    'Sign in with a passkey': 'Log masuk dengan passkey',
    'Super Admin': 'Super Admin',
    'Tambah admin platform': 'Tambah admin platform',
    'Tambah admin': 'Tambah admin',
    'above.': 'di atas.',
    Added: 'Ditambah',
    Back: 'Kembali',
    Confirm: 'Sahkan',
    Default: 'Utama',
    Documentation: 'Dokumentasi',
    Inventory: 'Inventori',
    Repository: 'Repositori',
    'SaaS administration': 'Pentadbiran SaaS',
    'Security posture': 'Status keselamatan',
    'Enable two-factor authentication': 'Aktifkan pengesahan dua faktor',
    'Enter the 6-digit code from your authenticator app':
        'Masukkan kod 6 digit daripada aplikasi pengesah',
    'To finish enabling two-factor authentication, scan the QR code or enter the setup key in your authenticator app':
        'Untuk menyelesaikan pengaktifan pengesahan dua faktor, imbas kod QR atau masukkan kunci persediaan dalam aplikasi pengesah',
    'Two-factor authentication enabled': 'Pengesahan dua faktor telah aktif',
    'Two-factor authentication is now enabled. Scan the QR code or enter the setup key in your authenticator app.':
        'Pengesahan dua faktor telah aktif. Imbas kod QR atau masukkan kunci persediaan dalam aplikasi pengesah.',
    'Verify authentication code': 'Sahkan kod pengesahan',
    'Regenerate codes': 'Jana semula kod',
    '2FA recovery codes': 'Kod pemulihan 2FA',
    'Recovery codes let you regain access if you lose your 2FA device. Store them in a secure password manager.':
        'Kod pemulihan membolehkan anda mengakses akaun jika peranti 2FA hilang. Simpan dalam pengurus kata laluan yang selamat.',
    'Hide recovery codes': 'Sembunyikan kod pemulihan',
    'View recovery codes': 'Lihat kod pemulihan',
    Hide: 'Sembunyikan',
    View: 'Lihat',
    'recovery codes': 'kod pemulihan',
    'or, enter the code manually': 'atau masukkan kod secara manual',
    'Each recovery code can be used once to access your account and will be removed after use. If you need more, click Regenerate codes above.':
        'Setiap kod pemulihan hanya boleh digunakan sekali dan akan dipadam selepas digunakan. Jika perlu kod baharu, pilih Jana semula kod di atas.',
    'Authentication code': 'Kod pengesahan',
    Cancel: 'Batal',
    'Cash ledger': 'Buku tunai',
    Close: 'Tutup',
    'Confirm password': 'Sahkan kata laluan',
    'Current password': 'Kata laluan semasa',
    'Displays the mobile sidebar.': 'Memaparkan bar sisi mudah alih.',
    'Email address': 'Alamat e-mel',
    'Email verification': 'Pengesahan e-mel',
    'Enter recovery code': 'Masukkan kod pemulihan',
    'Hide password': 'Sembunyikan kata laluan',
    'Identity management': 'Pengurusan identiti',
    Loading: 'Memuatkan',
    'Loading recovery codes': 'Memuatkan kod pemulihan',
    'Log out': 'Log keluar',
    'Manage your passkeys for passwordless sign-in':
        'Urus passkey untuk log masuk tanpa kata laluan',
    'Manage your two-factor authentication settings':
        'Urus tetapan pengesahan dua faktor',
    More: 'Lain-lain',
    'New password': 'Kata laluan baharu',
    'No passkeys yet': 'Tiada passkey lagi',
    Password: 'Kata laluan',
    'Passkey name': 'Nama passkey',
    Receipt: 'Resit',
    Remove: 'Padam',
    'Remove passkey': 'Padam passkey',
    Save: 'Simpan',
    Settings: 'Tetapan',
    'Show password': 'Tunjukkan kata laluan',
    Sidebar: 'Bar sisi',
    'Tenant management': 'Pengurusan penyewa',
    'Toggle sidebar': 'Buka atau tutup bar sisi',
    'Two-factor authentication': 'Pengesahan dua faktor',
    breadcrumb: 'Navigasi halaman',
    'Add a passkey to sign in without a password':
        'Tambah passkey untuk log masuk tanpa kata laluan',
    'Add passkey': 'Tambah passkey',
    'A name helps you identify this passkey later.':
        'Nama membantu anda mengenal pasti passkey ini kemudian.',
    'Commercial ledger': 'Lejar komersial',
    'Confirm with passkey': 'Sahkan dengan passkey',
    'Confirming...': 'Mengesahkan...',
    'Continue setup': 'Teruskan persediaan',
    Dashboard: 'Papan pemuka',
    'Disable 2FA': 'Nyahaktifkan 2FA',
    'Enable 2FA': 'Aktifkan 2FA',
    'Enter your email to receive a password reset link':
        'Masukkan e-mel untuk menerima pautan tetapan semula kata laluan',
    'Forgot password': 'Lupa kata laluan',
    'Last used': 'Kali terakhir digunakan',
    'Or confirm with password': 'Atau sahkan dengan kata laluan',
    'Passkeys are not supported in this browser.':
        'Pelayar ini tidak menyokong passkey.',
    'Register passkey': 'Daftar passkey',
    'Registering...': 'Mendaftarkan...',
    'Removing...': 'Memadam...',
    Tenant: 'Penyewa',
    'This is a secure area of the application. Please confirm your password before continuing.':
        'Ini ialah kawasan selamat aplikasi. Sahkan kata laluan sebelum meneruskan.',
    'When you enable two-factor authentication, you will be prompted for a secure pin during login. This pin can be retrieved from a TOTP-supported application on your phone.':
        'Apabila pengesahan dua faktor diaktifkan, anda akan diminta memasukkan PIN selamat semasa log masuk. PIN tersedia dalam aplikasi TOTP pada telefon anda.',
    'You will be prompted for a secure, random pin during login, which you can retrieve from the TOTP-supported application on your phone.':
        'Anda akan diminta memasukkan PIN rawak yang selamat semasa log masuk. PIN tersedia dalam aplikasi TOTP pada telefon anda.',
    Akses: 'Akses',
    'Akses admin': 'Akses admin',
    'Akses aman': 'Akses selamat',
    'Akses anggota berhasil diperbarui.': 'Akses ahli berjaya dikemas kini.',
    Akun: 'Akaun',
    'Akun keuangan': 'Akaun kewangan',
    'Akun saya': 'Akaun saya',
    Alasan: 'Sebab',
    'Alasan / catatan retur': 'Sebab / catatan pemulangan',
    'Alamat email': 'Alamat e-mel',
    'Alur utama Sisko Plan': 'Aliran utama Sisko Plan',
    'Ambil foto': 'Ambil gambar',
    'Ambil ulang dengan kamera': 'Ambil semula dengan kamera',
    'Anggota aktif': 'Ahli aktif',
    Arus: 'Aliran',
    'Atau kembali ke': 'Atau kembali ke',
    'Autentikasi dua faktor': 'Pengesahan dua faktor',
    'Autentikasi dua langkah': 'Pengesahan dua langkah',
    Batal: 'Batal',
    Belum: 'Belum',
    'Belum ada data toko': 'Belum ada data kedai',
    'Belum ada paket': 'Belum ada pelan',
    'Belum ada paket yang ditawarkan.': 'Belum ada pelan yang ditawarkan.',
    'Belum ada passkey': 'Tiada passkey lagi',
    'Belum ada penjualan kategori': 'Belum ada jualan kategori',
    'Belum ada produk terjual': 'Belum ada produk terjual',
    'Belum ada riwayat langganan.': 'Belum ada sejarah langganan.',
    'Belum dihitung': 'Belum dikira',
    Berlaku: 'Berkuat kuasa',
    Beranda: 'Laman utama',
    Biaya: 'Perbelanjaan',
    'Buka menu akun': 'Buka menu akaun',
    'Buka tindakan untuk': 'Buka tindakan untuk',
    'Buat Toko': 'Buat Kedai',
    'Buat akun': 'Buat akaun',
    'Buat toko': 'Buat kedai',
    'Cari akun': 'Cari akaun',
    'Cari biaya': 'Cari perbelanjaan',
    'Cari dokumen atau catatan': 'Cari dokumen atau catatan',
    'Cari nama atau email': 'Cari nama atau e-mel',
    'Cari nama produk atau SKU': 'Cari nama produk atau SKU',
    'Cari nama produk atau varian': 'Cari nama produk atau varian',
    'Cari nama toko': 'Cari nama kedai',
    'Cari persediaan': 'Cari inventori',
    'Cari produk': 'Cari produk',
    'Cari produk, SKU, atau barcode': 'Cari produk, SKU atau kod bar',
    'Cari produk, varian, atau SKU': 'Cari produk, varian atau SKU',
    Catatan: 'Catatan',
    'Catatan opsional': 'Catatan pilihan',
    Daftar: 'Daftar',
    'Daftar Persediaan': 'Senarai Inventori',
    'Daftar dengan Google': 'Daftar dengan Google',
    'Data contoh pemindaian produk': 'Data contoh imbasan produk',
    'Data toko': 'Data kedai',
    'Diagram penjualan per kategori': 'Carta jualan mengikut kategori',
    'Dicatat oleh': 'Direkodkan oleh',
    Dibayar: 'Dibayar',
    Dihitung: 'Dikira',
    'Diskon item': 'Diskaun item',
    'Diskon transaksi': 'Diskaun transaksi',
    Dokumen: 'Dokumen',
    'Durasi trial': 'Tempoh percubaan',
    'Edit subscription': 'Edit langganan',
    Email: 'E-mel',
    'Estimasi laba': 'Anggaran keuntungan',
    'Estimasi refund': 'Anggaran bayaran balik',
    'Estimasi rugi': 'Anggaran kerugian',
    Fitur: 'Ciri-ciri',
    'Filter produk opname': 'Tapis produk kiraan stok',
    'Filter status stok': 'Tapis status stok',
    'Foto ulang': 'Ambil gambar semula',
    'Grafik penjualan 14 hari terakhir': 'Carta jualan 14 hari terakhir',
    'Grafik penjualan bersih dan estimasi laba':
        'Carta jualan bersih dan anggaran keuntungan',
    'Harga bulanan': 'Harga bulanan',
    Hapus: 'Padam',
    'Hapus akun': 'Padam akaun',
    'Hapus hasil': 'Padam hasil',
    'Hapus item': 'Padam item',
    'Hapus passkey': 'Padam passkey',
    'Hapus produk': 'Padam produk',
    'Informasi Produk': 'Maklumat Produk',
    Jenis: 'Jenis',
    'Kas & Bank': 'Tunai & Bank',
    'Kas & bank': 'Tunai & bank',
    'Kas & rekening': 'Tunai & akaun bank',
    'Kasir POS': 'Juruwang POS',
    'Kata sandi': 'Kata laluan',
    'Kata sandi baru': 'Kata laluan baharu',
    'Kata sandi saat ini': 'Kata laluan semasa',
    Kategori: 'Kategori',
    'Kategori produk': 'Kategori produk',
    'Keamanan akun': 'Keselamatan akaun',
    'Kelola Pengguna': 'Urus Pengguna',
    'Kelola Toko': 'Urus Kedai',
    'Kelola langganan': 'Urus langganan',
    'Kelola passkey untuk masuk tanpa kata sandi':
        'Urus passkey untuk log masuk tanpa kata laluan',
    Keluar: 'Log keluar',
    Kembalian: 'Baki',
    'Kode autentikasi': 'Kod pengesahan',
    'Kode error': 'Kod ralat',
    'Kode pemulihan': 'Kod pemulihan',
    'Konfirmasi berlangganan': 'Sahkan langganan',
    'Konfirmasi kata sandi': 'Sahkan kata laluan',
    Lainnya: 'Lain-lain',
    'Laporan Usaha': 'Laporan Perniagaan',
    'Login terakhir': 'Log masuk terakhir',
    'Maksimum produk per akun': 'Maksimum produk setiap akaun',
    'Maksimum staf per akun': 'Maksimum kakitangan setiap akaun',
    'Maksimum toko per akun': 'Maksimum kedai setiap akaun',
    Masuk: 'Log masuk',
    'Masuk dengan Google': 'Log masuk dengan Google',
    'Masukkan kode pemulihan': 'Masukkan kod pemulihan',
    Metode: 'Kaedah',
    'Metode pembayaran': 'Kaedah pembayaran',
    'Mode hanya-baca.': 'Mod baca sahaja.',
    'Mode kasir': 'Mod juruwang',
    'Modal Pemilik': 'Modal Pemilik',
    'Muat ulang halaman': 'Muat semula halaman',
    'Mulai Opname': 'Mulakan Kiraan Stok',
    'Nama lengkap': 'Nama penuh',
    'Nama paket': 'Nama pelan',
    'Nama passkey': 'Nama passkey',
    'Nama toko berhasil diperbarui.': 'Nama kedai berjaya dikemas kini.',
    'Navigasi footer': 'Navigasi pengaki',
    'Navigasi halaman': 'Navigasi halaman',
    'Navigasi utama': 'Navigasi utama',
    Nilai: 'Nilai',
    'Nilai persediaan': 'Nilai inventori',
    Nominal: 'Amaun',
    Nonaktif: 'Tidak aktif',
    'Notifikasi stok': 'Pemberitahuan stok',
    Paket: 'Pelan',
    'Paket & Langganan': 'Pelan & Langganan',
    'Paket aktif': 'Pelan aktif',
    'Paket saat ini': 'Pelan semasa',
    Pembayaran: 'Pembayaran',
    'Pembayaran terbaru': 'Pembayaran terkini',
    'Pembayaran utang supplier': 'Bayaran hutang pembekal',
    'Pembelian dan utang supplier': 'Pembelian dan hutang pembekal',
    Pemilik: 'Pemilik',
    Pengaturan: 'Tetapan',
    'Pengaturan Akun': 'Tetapan Akaun',
    'Pengaturan akun & toko': 'Tetapan akaun & kedai',
    'Pengaturan akun dan toko': 'Tetapan akaun dan kedai',
    'Pengaturan keamanan': 'Tetapan keselamatan',
    'Pengaturan subscription akun.': 'Tetapan langganan akaun.',
    Pengguna: 'Pengguna',
    Peran: 'Peranan',
    'Perbandingan Sisko Plan dan pencatatan manual':
        'Perbandingan Sisko Plan dan rekod manual',
    Periode: 'Tempoh',
    'Periode paket': 'Tempoh pelan',
    'Perlu ditangani': 'Perlu ditangani',
    Persediaan: 'Inventori',
    'Pilih bahasa': 'Pilih bahasa',
    'Pilih dari galeri': 'Pilih daripada galeri',
    'Pilih paket': 'Pilih pelan',
    'Pilih periode': 'Pilih tempoh',
    'Posisi kas': 'Kedudukan tunai',
    'Posting pembayaran': 'Rekod pembayaran',
    'Pratinjau kamera': 'Pratonton kamera',
    Produk: 'Produk',
    'Produk mana yang difoto?': 'Produk manakah yang difoto?',
    'Produk seluruh toko': 'Produk seluruh kedai',
    'Profil akun': 'Profil akaun',
    'Recovery codes': 'Kod pemulihan',
    'Referensi eksternal (opsional)': 'Rujukan luaran (pilihan)',
    'Riwayat Pembayaran': 'Sejarah Pembayaran',
    'Riwayat Stok': 'Sejarah Stok',
    'Riwayat langganan': 'Sejarah langganan',
    Role: 'Peranan',
    Saldo: 'Baki',
    'Saldo akun': 'Baki akaun',
    'Saldo awal akun': 'Baki awal akaun',
    'Satuan Penjualan': 'Unit Jualan',
    'Satuan barang': 'Unit barang',
    'Scan barcode': 'Imbas kod bar',
    'Scan produk pembelian': 'Imbas produk pembelian',
    'Scan produk untuk opname': 'Imbas produk untuk kiraan stok',
    'Scan produk untuk penjualan': 'Imbas produk untuk jualan',
    'Scan ulang': 'Imbas semula',
    'Security settings': 'Tetapan keselamatan',
    'Semua kategori': 'Semua kategori',
    'Semua metode': 'Semua kaedah',
    'Semua produk': 'Semua produk',
    'Semua status': 'Semua status',
    'Semua stok': 'Semua stok',
    Simpan: 'Simpan',
    'Simpan recovery code': 'Simpan kod pemulihan',
    'Simpan subscription': 'Simpan langganan',
    'Staf aktif': 'Kakitangan aktif',
    Status: 'Status',
    'Status subscription': 'Status langganan',
    'Stock Opname': 'Kiraan Stok',
    'Stok aman': 'Stok selamat',
    'Stok dalam kondisi aman': 'Stok dalam keadaan selamat',
    Subscription: 'Langganan',
    'Subscription & Paket': 'Langganan & Pelan',
    Subtotal: 'Jumlah kecil',
    Supplier: 'Pembekal',
    'Tampilkan kata sandi': 'Tunjukkan kata laluan',
    'Tambah paket': 'Tambah pelan',
    'Tema tampilan': 'Tema paparan',
    'Tema terang aktif': 'Tema cerah aktif',
    Terapkan: 'Gunakan',
    Terdaftar: 'Berdaftar',
    'Tidak ada subscription pada filter ini':
        'Tiada langganan untuk penapis ini',
    'Tidak ditemukan di katalog': 'Tidak ditemui dalam katalog',
    'Tindakan permanen': 'Tindakan kekal',
    Toko: 'Kedai',
    'Toko & Anggota': 'Kedai & Ahli',
    'Toko berhasil dibuat.': 'Kedai berjaya dicipta.',
    Total: 'Jumlah',
    Trial: 'Percubaan',
    'Trial 30 hari': 'Percubaan 30 hari',
    Tutup: 'Tutup',
    'Tutup kamera': 'Tutup kamera',
    'Tutup pencarian': 'Tutup carian',
    'Tutup scanner barcode': 'Tutup pengimbas kod bar',
    Tunai: 'Tunai',
    'Ubah kata sandi': 'Tukar kata laluan',
    'Utang supplier': 'Hutang pembekal',
    'Verifikasi email': 'Pengesahan e-mel',
    Waktu: 'Masa',
    'Waktu pembayaran': 'Masa pembayaran',
    'Warna aplikasi': 'Warna aplikasi',
    'Yakin ingin menghapus akun?': 'Pasti mahu memadam akaun?',
    'atau Anda dapat': 'atau anda boleh',
    'dan tindakan': 'dan tindakan',
    masuk: 'log masuk',
    'Akses aman dan terkontrol untuk setiap peran.':
        'Akses selamat dan terkawal untuk setiap peranan.',
    'Aktifkan dan konfirmasi autentikasi dua langkah sebelum mengakses panel produksi.':
        'Aktifkan dan sahkan pengesahan dua langkah sebelum mengakses panel produksi.',
    'Belum memiliki akun?': 'Belum mempunyai akaun?',
    'Debit dan kredit kas diposting atomik.':
        'Debit dan kredit tunai direkodkan secara atomik.',
    'Dengan melanjutkan, Anda menyetujui kebijakan penggunaan layanan':
        'Dengan meneruskan, anda bersetuju dengan dasar penggunaan perkhidmatan',
    'Form pengaturan paket subscription.': 'Borang tetapan pelan langganan.',
    'Hanya untuk akun yang belum pernah memiliki transaksi.':
        'Hanya untuk akaun yang belum pernah mempunyai transaksi.',
    'Hapus akun dan seluruh data pribadi secara permanen':
        'Padam akaun dan semua data peribadi secara kekal',
    'Hasil terbaca langsung diperiksa': 'Hasil bacaan diperiksa terus',
    'Kelola pengaturan autentikasi dua faktor':
        'Urus tetapan pengesahan dua faktor',
    'Konfirmasi akses akun dengan memasukkan salah satu kode pemulihan darurat.':
        'Sahkan akses akaun dengan memasukkan salah satu kod pemulihan kecemasan.',
    'Masuk untuk melanjutkan transaksi, memantau stok, dan melihat perkembangan usaha dari satu tempat.':
        'Log masuk untuk meneruskan transaksi, memantau stok dan melihat perkembangan perniagaan dari satu tempat.',
    'Masukkan kode autentikasi dari aplikasi autentikator Anda.':
        'Masukkan kod pengesahan daripada aplikasi pengesah anda.',
    'Pembayaran subscription akun.': 'Pembayaran langganan akaun.',
    'Periode seluruh subscription akan dimulai ulang dari':
        'Tempoh semua langganan akan dimulakan semula dari',
    'Pilih ruang tumbuh untuk toko Anda.':
        'Pilih ruang pertumbuhan untuk kedai anda.',
    'Semua pekerjaan toko, terasa lebih terarah.':
        'Semua kerja kedai terasa lebih tersusun.',
    'Setiap rupiah bergerak melalui cash transaction. Transfer memindahkan posisi antar-akun tanpa mengubah total kas toko.':
        'Setiap ringgit bergerak melalui transaksi tunai. Pindahan mengubah kedudukan antara akaun tanpa mengubah jumlah tunai kedai.',
    'Simpan recovery code untuk akses darurat.':
        'Simpan kod pemulihan untuk akses kecemasan.',
    'Sudah memiliki akun?': 'Sudah mempunyai akaun?',
    'Tautan verifikasi baru telah dikirim ke alamat email yang Anda gunakan saat mendaftar.':
        'Pautan pengesahan baharu telah dihantar ke alamat e-mel yang anda gunakan semasa mendaftar.',
    'Transfer antar-akun': 'Pindahan antara akaun',
    'Ubah password, aktifkan autentikasi dua langkah, dan kelola passkey.':
        'Tukar kata laluan, aktifkan pengesahan dua langkah dan urus passkey.',
    'Tak terbatas': 'Tanpa had',
    'tanpa batas akhir': 'tanpa tarikh akhir',
};

const reviewedMalayOverrides: Record<string, string> = {
    ...malayOverrides,
    ', estimasi laba': ', anggaran keuntungan',
    '· Batas': '· Had',
    'Akses tidak tersedia': 'Akses tidak boleh digunakan',
    'Alur utama': 'Aliran utama',
    'Atau kembali ke': 'Atau pulang ke',
    'Batas stok minimal': 'Had stok minimum',
    'Bayar sekarang': 'Buat pembayaran sekarang',
    Bayar: 'Buat bayaran',
    'Belum ada produk terjual pada periode ini':
        'Belum ada produk terjual dalam tempoh ini',
    'Belum ada transaksi pada periode ini': 'Tiada transaksi dalam tempoh ini',
    'Belum dibaca': 'Belum dibaca',
    'Cari dokumen atau catatan': 'Cari dokumen atau rekod',
    'Cari nama produk atau SKU': 'Cari mengikut nama produk atau SKU',
    'Cari nama produk atau varian': 'Cari mengikut nama produk atau varian',
    'Catat penambahan atau pengambilan modal pemilik.':
        'Rekod penambahan atau pengeluaran modal pemilik.',
    Catatan: 'Rekod',
    'Data ditemukan': 'Data ditemui',
    'Data yang dikirim tidak sesuai dengan yang dibutuhkan halaman ini.':
        'Data yang dihantar tidak sepadan dengan keperluan halaman ini.',
    'Estimasi Laba Usaha': 'Anggaran Keuntungan Perniagaan',
    'Foto otomatis setelah stabil 1,5 detik':
        'Foto automatik selepas stabil selama 1.5 saat',
    'Gunakan tema': 'Gunakan tema',
    'HPP / laba kotor neto': 'HPP / untung kasar bersih',
    'Halaman tidak ditemukan': 'Halaman tidak ditemui',
    'Hapus logo platform?': 'Padam logo platform?',
    'Hitung dan cocokkan stok fisik': 'Kira dan padankan stok fizikal',
    'Hitung stok fisik': 'Kira stok fizikal',
    'Input kulakan': 'Masukkan pembelian stok',
    'Kamera belum tersedia': 'Kamera belum boleh digunakan',
    'Kondisi bisnis dalam satu pandangan.':
        'Keadaan perniagaan dalam satu paparan.',
    'Kritis ·': 'Kritikal ·',
    Kritis: 'Kritikal',
    'Kurangi ukuran data atau file, lalu kirim kembali dari halaman sebelumnya.':
        'Kurangkan saiz data atau fail, kemudian hantar semula dari halaman sebelumnya.',
    'Laba Kotor': 'Untung Kasar',
    'Laba kotor': 'Untung kasar',
    'Layanan sedang tidak tersedia':
        'Perkhidmatan tidak tersedia buat sementara waktu',
    'Metode bayar belum tersedia.': 'Kaedah pembayaran belum tersedia.',
    'Metode bayar': 'Kaedah pembayaran',
    'Operasional Terkini': 'Operasi Terkini',
    'Operasional terhubung': 'Operasi bersepadu',
    Operasional: 'Operasi',
    'PNG, JPG, atau WebP, maksimal 2 MB.': 'PNG, JPG atau WebP, maksimum 2 MB.',
    'Pantau performa': 'Pantau prestasi',
    'Pembayaran tercatat': 'Pembayaran direkodkan',
    'Perbarui katalog': 'Kemas kini katalog',
    'Periksa kembali data yang dimasukkan, lalu perbaiki bagian yang belum sesuai.':
        'Semak semula data yang dimasukkan, kemudian betulkan bahagian yang belum tepat.',
    'Periode aktif': 'Tempoh aktif',
    'Periode langganan': 'Tempoh langganan',
    'Periode selesai': 'Tempoh tamat',
    'Pilih alur kerja. Kamera akan terbuka langsung di halaman tujuan.':
        'Pilih aliran kerja. Kamera akan dibuka terus pada halaman sasaran.',
    'Pilih atau ketik platform': 'Pilih atau masukkan platform',
    'Produk belum dikenali. Ubah posisi, lalu tahan stabil.':
        'Produk belum dikenal pasti. Ubah kedudukan, kemudian tahan stabil.',
    'Produk tidak ditemukan': 'Produk tidak ditemui',
    'Produk tidak ditemukan.': 'Produk tidak ditemui.',
    Sampai: 'Hingga',
    'Sedang dihitung': 'Sedang dikira',
    'Selesai hitung': 'Selesai dikira',
    Siap: 'Sedia',
    'Stok Kritis': 'Stok Kritikal',
    'Semua stok dalam kondisi aman': 'Semua stok dalam keadaan selamat',
    'Stok terpisah': 'Stok berasingan',
    'Tanpa batas': 'Tanpa had',
    'Terjadi kendala pada sistem': 'Berlaku gangguan pada sistem',
    Tersimpan: 'Disimpan',
    'Tidak ada stok kritis.': 'Tiada stok kritikal.',
    'Tidak tersedia': 'Tidak boleh digunakan',
    Tim: 'Pasukan',
    'hasil tersimpan di sesi ini': 'hasil disimpan dalam sesi ini',
    'setelah periode sebelumnya selesai.': 'selepas tempoh sebelumnya tamat.',
    'stok kritis': 'stok kritikal',
};

const malayLexicon: Array<[string, string]> = [
    ['kata sandi', 'kata laluan'],
    ['tidak dapat', 'tidak boleh'],
    ['tidak boleh', 'tidak boleh'],
    ['berhasil diperbarui', 'berjaya dikemas kini'],
    ['berhasil ditambahkan', 'berjaya ditambah'],
    ['berhasil dihapus', 'berjaya dipadam'],
    ['berhasil dibuat', 'berjaya dicipta'],
    ['berhasil disimpan', 'berjaya disimpan'],
    ['berhasil diposting', 'berjaya direkodkan'],
    ['berhasil diaktifkan', 'berjaya diaktifkan'],
    ['berhasil', 'berjaya'],
    ['diperbarui', 'dikemas kini'],
    ['pengaturan', 'tetapan'],
    ['persediaan', 'inventori'],
    ['subscription', 'langganan'],
    ['langganan', 'langganan'],
    ['penjualan', 'jualan'],
    ['pengeluaran', 'perbelanjaan'],
    ['pembelian', 'pembelian'],
    ['supplier', 'pembekal'],
    ['pemasok', 'pembekal'],
    ['pemindaian', 'imbasan'],
    ['pencarian', 'carian'],
    ['pengguna', 'pengguna'],
    ['anggota', 'ahli'],
    ['pekerja', 'pekerja'],
    ['pemilik toko', 'pemilik kedai'],
    ['toko', 'kedai'],
    ['akun', 'akaun'],
    ['rekening', 'akaun bank'],
    ['biaya', 'kos'],
    ['kasir', 'juruwang'],
    ['kas', 'tunai'],
    ['uang', 'wang'],
    ['utang', 'hutang'],
    ['retur', 'pemulangan'],
    ['refund', 'bayaran balik'],
    ['diskon', 'diskaun'],
    ['subtotal', 'jumlah kecil'],
    ['total', 'jumlah'],
    ['nominal', 'amaun'],
    ['saldo', 'baki'],
    ['kuantitas', 'kuantiti'],
    ['jumlah barang', 'kuantiti barang'],
    ['satuan', 'unit'],
    ['waktu', 'masa'],
    ['tanggal', 'tarikh'],
    ['riwayat', 'sejarah'],
    ['paket', 'pelan'],
    ['trial', 'percubaan'],
    ['scanner', 'pengimbas'],
    ['scan', 'imbas'],
    ['barcode', 'kod bar'],
    ['email', 'e-mel'],
    ['password', 'kata laluan'],
    ['invoice', 'invois'],
    ['aktifkan', 'aktifkan'],
    ['nonaktifkan', 'nyahaktifkan'],
    ['dinonaktifkan', 'dinyahaktifkan'],
    ['dihapus', 'dipadam'],
    ['menghapus', 'memadam'],
    ['hapus', 'padam'],
    ['ditambahkan', 'ditambah'],
    ['tambahkan', 'tambah'],
    ['kelola', 'urus'],
    ['mengelola', 'mengurus'],
    ['pengelola', 'pengurus'],
    ['tampilkan', 'paparkan'],
    ['tampilan', 'paparan'],
    ['sebelumnya', 'sebelumnya'],
    ['berikutnya', 'seterusnya'],
    ['kembali', 'kembali'],
    ['lanjutkan', 'teruskan'],
    ['mulai', 'mula'],
    ['coba', 'cuba'],
    ['silakan', 'sila'],
    ['harus', 'mesti'],
    ['dapat', 'boleh'],
    ['bisa', 'boleh'],
    ['hanya', 'hanya'],
    ['dengan', 'dengan'],
    ['untuk', 'untuk'],
    ['karena', 'kerana'],
    ['sudah', 'telah'],
    ['saat', 'semasa'],
    ['sekarang', 'sekarang'],
    ['pilihan', 'pilihan'],
    ['opsional', 'pilihan'],
    ['keamanan', 'keselamatan'],
    ['autentikasi', 'pengesahan'],
    ['kode', 'kod'],
    ['pemulihan', 'pemulihan'],
    ['terdaftar', 'berdaftar'],
    ['terbaru', 'terkini'],
    ['catatan', 'catatan'],
    ['contoh', 'contoh'],
];

function preserveCase(source: string, translated: string): string {
    if (source === source.toUpperCase()) {
        return translated.toUpperCase();
    }

    if (source[0] === source[0]?.toUpperCase()) {
        return translated.charAt(0).toUpperCase() + translated.slice(1);
    }

    return translated;
}

function translateMalayLiteral(text: string): string {
    let result = text.replace(/\bRp(?=\s?\d)/gu, 'RM');

    for (const [source, translated] of malayLexicon) {
        const pattern = new RegExp(
            `(?<![\\p{L}])${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`,
            'giu',
        );
        result = result.replace(pattern, (match) =>
            preserveCase(match, translated),
        );
    }

    return result;
}

export function setActiveLocale(locale: AppLocale): void {
    activeLocale = locale;
}

export function translate(
    text: string,
    locale: AppLocale = activeLocale,
): string {
    const source = text.trim();
    const lookup = source.replace(/\s+/gu, ' ');

    const passkeyRemoval = lookup.match(
        /^Are you sure you want to remove the "(.+)" passkey\? You will no longer be able to use it to sign in\.$/u,
    );

    if (passkeyRemoval) {
        const message =
            locale === 'ms'
                ? `Adakah anda pasti mahu memadam passkey "${passkeyRemoval[1]}"? Anda tidak lagi boleh menggunakannya untuk log masuk.`
                : `Yakin ingin menghapus passkey "${passkeyRemoval[1]}"? Passkey ini tidak dapat digunakan lagi untuk masuk.`;

        return text.replace(source, message);
    }

    const translated =
        locale === 'ms'
            ? (reviewedMalayOverrides[lookup] ?? translations.ms[lookup])
            : (indonesianOverrides[lookup] ?? translations.id[lookup]);

    if (translated !== undefined) {
        return text.replace(source, translated);
    }

    if (locale === 'ms') {
        const dynamicPatterns: Array<[RegExp, string]> = [
            [/^Alur utama (.+)$/u, 'Aliran utama $1'],
            [
                /^Perbandingan (.+) dan pencatatan manual$/u,
                'Perbandingan $1 dan rekod manual',
            ],
            [/^(.+), beranda$/u, '$1, laman utama'],
            [/^(\d+) foto diambil$/u, '$1 gambar diambil'],
            [/^Buka tindakan untuk (.+)$/u, 'Buka tindakan untuk $1'],
            [/^Catat pembayaran (.+)$/u, 'Rekod pembayaran $1'],
            [/^Edit subscription (.+)$/u, 'Edit langganan $1'],
            [
                /^Hapus Produk (.+) dari antrean$/u,
                'Padam Produk $1 daripada baris gilir',
            ],
            [/^Kapasitas (.+)$/u, 'Kapasiti $1'],
            [/^Hapus (.+)$/u, 'Padam $1'],
            [/^Kurangi (.+)$/u, 'Kurangkan $1'],
            [/^Jumlah (.+)$/u, 'Kuantiti $1'],
            [/^Tambah (.+)$/u, 'Tambah $1'],
            [/^Edit (.+)$/u, 'Edit $1'],
            [/^Kode error (.+)$/u, 'Kod ralat $1'],
        ];

        for (const [pattern, replacement] of dynamicPatterns) {
            if (pattern.test(lookup)) {
                return text.replace(
                    source,
                    lookup.replace(pattern, replacement),
                );
            }
        }

        return translateMalayLiteral(text);
    }

    return text;
}

export function useTranslation() {
    const { locale = 'id' } = usePage().props;
    const activeLocale = locale as AppLocale;

    setActiveLocale(activeLocale);

    return {
        locale: activeLocale,
        t: (text: string) => translate(text, activeLocale),
    };
}
