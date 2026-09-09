# XSISTEN Android TWA — desain final

Status: rancangan untuk ditinjau; belum mengubah aplikasi atau deployment.

## Tujuan

Menerbitkan portal customer XSISTEN ke Google Play secepat mungkin tanpa membuat frontend atau API baru. Aplikasi Android membuka pengalaman web production `https://xsisten.com` sebagai Trusted Web Activity (TWA), dimulai dari `/app`, dan tetap menampilkan halaman bermerek ketika koneksi tidak tersedia.

## Keputusan arsitektur

- Gunakan PWA + TWA, bukan Capacitor remote `server.url`, Flutter, atau WebView kustom.
- Pertahankan Laravel, Inertia, React, session cookie, route, dan business logic yang ada sebagai satu sumber kebenaran.
- Simpan project Android TWA di repo ini agar perubahan manifest web, Digital Asset Links, dan paket Android tetap sinkron.
- Targetkan Android 16 / API 36 untuk submission baru per 10 September 2026.
- Aplikasi online-only. Service worker hanya menyediakan offline fallback; tidak cache halaman autentikasi, data customer, atau mutation.

## Scope pengalaman aplikasi

Entry `/app` melakukan redirect deterministik:

- guest → login;
- user terautentikasi tanpa toko aktif → pemilihan/pembuatan toko;
- user dengan toko aktif dan akses subscription → dashboard customer;
- platform admin tidak memperoleh jalur khusus melalui entry aplikasi.

Yang tersedia di aplikasi:

- login, register, lupa/reset password, verifikasi email, dan Google Login;
- pemilihan/pembuatan toko dan seluruh route customer yang sudah ada;
- logout;
- scanner kamera dan upload yang sudah dimiliki web.

Yang tidak ditampilkan sebagai navigasi aplikasi:

- landing page, konten marketing, dan pricing publik;
- portal `super-admin`.

Website browser biasa tetap membuka landing page `/`; perubahan `/app` tidak mengganti perilaku `/`.

## Komponen

1. **Entry aplikasi Laravel** — named route `GET /app` memilih redirect berdasarkan auth, active store, dan akses yang sudah berlaku. Tidak menduplikasi aturan otorisasi.
2. **Web app manifest** — nama XSISTEN, ikon maskable/regular, warna tema, `display: standalone`, `start_url: /app`, dan scope origin production.
3. **Offline fallback** — satu HTML mandiri yang dicache saat service worker install, berisi status offline dan tombol coba lagi. Semua request navigasi lain tetap network-first; request non-GET dan respons customer tidak dicache.
4. **Registrasi service worker** — hanya production, gagal registrasi tidak memblokir aplikasi.
5. **Android TWA** — project Bubblewrap/Android Browser Helper dengan application ID final, start URL production, API 36, versioning, signing release, dan fallback Custom Tab bila Digital Asset Link belum valid.
6. **Digital Asset Links** — `/.well-known/assetlinks.json` menghubungkan origin dengan package name serta fingerprint upload dan Play App Signing yang benar.

## Navigasi dan keamanan

- TWA hanya mendapat tampilan penuh setelah `xsisten.com` dan aplikasi saling terverifikasi melalui Digital Asset Links.
- URL di luar origin dibuka sebagai Custom Tab/browser dengan identitas origin terlihat.
- Google OAuth tidak dijalankan dalam embedded WebView; alurnya menggunakan browser yang mendukung TWA/Custom Tabs dan callback kembali ke origin terverifikasi.
- CSRF, session cookie, Fortify, middleware auth/verified/active-store/subscription, permission kamera, CSP, dan HTTPS yang ada tetap berlaku.
- Service worker tidak menyimpan HTML customer, token, respons Inertia, form submission, atau data toko.
- Keystore dan secret tidak dikomit. Play App Signing digunakan untuk release production.

## UX koneksi gagal

- Cold start tanpa jaringan menampilkan halaman offline XSISTEN, bukan layar kosong atau error browser mentah.
- Tombol **Coba lagi** menjalankan reload; aplikasi juga dapat mencoba reload saat event `online` diterima.
- Koneksi putus saat mutation menampilkan error jaringan melalui handling web yang ada; tidak mengantre atau mengklaim transaksi berhasil.
- Tidak ada label atau copy yang menjanjikan kemampuan offline.

## Struktur perubahan

- Modify `routes/public.php` untuk entry `/app`.
- Modify layout HTML untuk manifest dan registrasi service worker.
- Create aset manifest, offline fallback, service worker, ikon PWA, dan `.well-known/assetlinks.json`.
- Create project Android TWA dalam `android-twa/` dengan konfigurasi build yang dapat direproduksi.
- Add feature tests route `/app`, static asset tests yang relevan, serta smoke checklist perangkat.

## Verifikasi dan release gate

- Laravel tests untuk redirect guest/customer dan proteksi existing route tetap lulus.
- Lint, formatting, type check, unit tests, dan production build repo lulus.
- Manifest dan service worker lolos pemeriksaan installability; offline cold start menampilkan fallback.
- Digital Asset Links tervalidasi pada debug dan release/Play signing fingerprint.
- Uji perangkat nyata: login/register, Google Login, email verification, logout, back button, kamera, upload, seluruh navigasi customer, link eksternal, koneksi lambat/putus, dan rotasi.
- Build release berupa signed AAB dengan target API 36; install melalui internal testing Play Console sebelum production.
- Privacy policy, Data safety, content rating, app access/reviewer credentials, screenshots, ikon, feature graphic, support contact, dan account-deletion flow/URL disiapkan sebelum submission.

## Di luar scope

Offline transaction, cache data customer, background sync, push notification, Bluetooth printing, API mobile, frontend baru, iOS wrapper, redesign halaman, dan perubahan super-admin.

## Review kesederhanaan

Tidak menambahkan API, data representation, authentication path, atau business service baru. `/app` hanya entry redirect dengan caller aktif dari TWA. Service worker memiliki satu tanggung jawab: offline fallback. Android TWA hanya menjadi boundary distribusi Play Store; web production tetap menjadi implementasi kanonik.

## Referensi primer

- TWA dan Bubblewrap: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start/
- Digital Asset Links: https://developer.chrome.com/docs/android/trusted-web-activity/integration-guide
- Offline fallback: https://web.dev/articles/offline-fallback-page
- Web app manifest: https://web.dev/articles/add-manifest
- Target API Google Play: https://developer.android.com/google/play/requirements/target-sdk
