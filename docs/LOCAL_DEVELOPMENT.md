# Local development: Herd, Artisan, and phone camera

## Laptop only

Keep `DEV_LAN=false`. Run `php artisan serve` and `npm run dev`, then open
`http://localhost:8000`. For Herd, set `APP_URL=https://sisko-plan.test`, secure
that site in Herd, and run `npm run dev`. Laravel's Vite plugin detects Herd TLS.
If the secured Herd domain differs from the directory name, set `DEV_TLS_HOST`
to that domain (without scheme or port). No shared config edits are needed.

## Phone on the same Wi-Fi: camera and hot reload

Install [mkcert](https://github.com/FiloSottile/mkcert#installation) and
[Caddy](https://caddyserver.com/docs/install) on the laptop once.
Run from the project directory, replacing `192.168.68.80` with your laptop's LAN IP:

```sh
mkcert -install
mkdir -p .certs
mkcert -cert-file .certs/lan.pem -key-file .certs/lan-key.pem 192.168.68.80 localhost 127.0.0.1
mkcert -CAROOT
```

Transfer only `rootCA.pem` from that CA directory to the phone and trust it:

- iOS: install the certificate profile, then enable full trust under Settings >
  General > About > Certificate Trust Settings.
- Android: install it as a CA certificate in the device security settings
  (the menu varies by manufacturer). Use the browser, not an embedded app webview.

Never transfer `rootCA-key.pem` or `lan-key.pem`. `.certs/` is gitignored.
Set these values in your local `.env`:

```dotenv
APP_URL=https://192.168.68.80:8443
DEV_LAN=true
VITE_DEV_PORT=5175
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=true
```

Start all three processes from the project folder with one command:

```sh
npm run dev
```

The command starts missing services and reuses occupied development ports without stopping existing processes. Keep the terminal open for services it starts; Ctrl+C stops those services only. Run it again after restarting the laptop. It does not install a login or boot service. Without DEV_LAN=true it starts Vite only.

Laptop access at `http://localhost:8000` also remains allowed while LAN mode is
active. The laptop browser must trust the mkcert CA because Vite assets use HTTPS;
restart the browser after installing the CA. For consistent HTTPS/session behavior,
you can use the same HTTPS LAN URL on both devices.

Open `https://192.168.68.80:8443` on the phone and allow camera access. React/CSS
changes arrive through Vite HMR without a build. Vite binds to the LAN address;
Caddy serves port 8443. Allow these ports only on your trusted Wi-Fi/LAN firewall
profile; do not configure router port forwarding. Artisan stays on loopback.

Open `https://192.168.68.80:5175/@vite/client` on the phone if assets fail: it must
load without certificate errors. `public/hot` must contain that same Vite origin.
The app uses HTTPS while its local upstream uses HTTP; the existing Laravel
trusted-proxy configuration handles Caddy's forwarded scheme.

Reserve the laptop's IP in the router if possible. If the IP changes, update
`APP_URL`, regenerate the leaf certificate with mkcert, and restart Vite/Caddy.
You do not need a new phone CA installation when using the same mkcert CA.

To return to laptop HTTP, stop Caddy/Vite, restore `APP_URL=http://localhost:8000`,
`DEV_LAN=false`, and `SESSION_SECURE_COOKIE=false`, clear config, then restart Vite.
For Herd, restore its HTTPS URL and keep secure cookies enabled.

## Verification

Check phone camera permission granted/denied, login, Inertia navigation, React
and CSS hot updates, and absence of TLS/mixed-content/WebSocket errors. Also check
Herd HTTPS and laptop HTTP. Camera requires a real phone/browser check; automated
builds cannot validate the phone's certificate trust or camera permission.
