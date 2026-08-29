# External Alpha quick start

1. Point a domain such as `play.example.com` at the server.
2. Run Node on `127.0.0.1:8787` using `deploy/.env.example` and the systemd unit.
3. Put Caddy or nginx in front and expose only TCP 80/443.
4. Set a long random `ADMIN_TOKEN`; do not share it with testers.
5. Open the public URL, create a private room, and use **Copy invite link**. The link contains only `?join=ROOMCODE`, never a seat/profile credential.
6. Quick Match also works through the same central server; players do not need to open ports on their own networks.
7. Before an alpha session run `npm run ops:health` and optionally `npm run ops:backup`.

For a home-PC test instead of a VPS, forward the reverse-proxy port (prefer HTTPS 443) to the host machine. Classic IPv4 forwarding may not work behind CGNAT/DS-Lite; in that case use a VPS or a tunnel/VPN solution rather than exposing additional game ports.
