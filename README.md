<p align="center">
  <img src="apps/web/public/icon.svg" alt="OpenSlaq" width="80" height="80" />
</p>

<h1 align="center">OpenSlaq</h1>

<p align="center">Open-source team messaging — web, desktop, iOS, and CLI.</p>

## Get Started

| Platform | |
| --- | --- |
| **Web** | [openslaq.com](https://openslaq.com) |
| **Desktop** | [openslaq.com/install](https://openslaq.com/install) (macOS) |
| **iOS** | [TestFlight](https://testflight.apple.com/join/BUHUUBzA) |
| **CLI** | `curl -fsSL https://openslaq.com/install.sh \| sh` |
| **Docs** | [docs.openslaq.com](https://docs.openslaq.com) |

## Why OpenSlaq

- **Open source** — MIT licensed, read every line of code
- **Fast and lightweight** — no bloat, no lag
- **No tracking** — zero analytics, no telemetry, your data stays yours
- **Multi-platform** — native apps for desktop, iOS, and a full CLI
- **Easy to leave** — self-host anytime, export your data, no lock-in

## Self-Host

### Prerequisites

- [Git](https://git-scm.com/)
- [Bun](https://bun.sh/)
- [Docker](https://docs.docker.com/get-docker/)

```bash
git clone https://github.com/BilalG1/openslaq.git && cd openslaq
bun install
cp .env.example .env
docker compose up -d
bun run --filter @openslaq/api db:migrate
bun run dev
```

Open [localhost:3000](http://localhost:3000).

## License

[MIT](LICENSE)
