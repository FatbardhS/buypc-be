# buypc-be

Backend for [BYPC](../buypc-fe): parts catalog, compatibility checks and saved builds (orders).
Built with **NestJS + TypeORM + PostgreSQL**.

## Run it

Requirements: Node 20+, Docker Desktop (for PostgreSQL).

```bash
npm install
npm run db:up        # starts PostgreSQL in Docker on port 5432
npm run start:dev    # API on http://localhost:3000/api
```

The tables are created automatically, and the parts catalog (`src/seed/parts.data.ts`) is upserted on every start.
Settings live in `.env` (copy from `.env.example`).

## Build order and compatibility rules

Parts are picked in this order: **case → motherboard → CPU → cooler → GPU → power supply → RAM → storage**.
Each step only offers parts that work with the earlier picks (`src/compatibility/compatibility.ts`):

| Rule | Example |
| --- | --- |
| Motherboard form factor must fit the case | ATX board ✕ Mini-ITX case |
| CPU socket must match the motherboard | B550 (AM4) ✕ Intel LGA1700 |
| Cooler must mount on the socket, handle the CPU's TDP, and fit the case (height / radiator) | 168mm air cooler ✕ 155mm case limit |
| GPU length must fit the case | 358mm RTX 4090 ✕ 330mm limit |
| PSU form factor must fit the case | ATX PSU ✕ SFX-only case |
| PSU wattage ≥ max(GPU maker's recommendation, (CPU peak + GPU + 75W) × 1.4) | 400W ✕ build that draws ~537W |
| RAM type, stick count and capacity must match the motherboard | DDR5 ✕ DDR4 board |
| NVMe needs an M.2 slot, SATA needs a SATA port | |

## API

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/api/parts?category=case` | | All parts in a category |
| POST | `/api/parts/options` | `{ category, selection: { case: 1, … } }` | Parts with `compatible` + `issues`, and a power estimate |
| POST | `/api/builds/check` | `{ selection }` | Issues per category, power estimate, total price |
| POST | `/api/builds` | `{ name?, selection }` (all 8 parts) | Saved build; 400 if incompatible |
| GET | `/api/builds` | | All saved builds, newest first |
| GET | `/api/builds/:id` | | One build |

Categories: `case, motherboard, cpu, cooler, gpu, psu, ram, storage`.

> `synchronize: true` is on for development. Switch to TypeORM migrations before going to production.
