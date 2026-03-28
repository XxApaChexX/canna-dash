# Canna Dash

Storefront + API: customers use **`/`** (menu + cart + checkout). Completed orders are **POST**ed server-side to **delivery-dispatch** on Render.

## End-to-end flow

1. Set **Vercel** env vars (same values as in `../delivery-dispatch-mvp` where noted):
   - **`DELIVERY_API_BASE_URL`** — dispatch origin, e.g. `https://delivery-dispatch-mvp.onrender.com` (no trailing slash)
   - **`DELIVERY_WEBHOOK_SECRET`** — must **match** **`STORE_WEBHOOK_SECRET`** on the Render web service
   - **`PUBLIC_DISPATCH_BOARD_URL`** *(optional)* — link target for “Dispatch board” on the storefront (defaults to the Render URL above)

2. Deploy this project to Vercel. Open your **`*.vercel.app`** URL → add items → **Place order & send to dispatch**.

3. Open **Dispatch** (`DELIVERY_API_BASE_URL`) → the order appears under **New** with source **Store (Canna Dash)**.

## API (for integrations)

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/` | Storefront UI |
| `GET` | `/api/config` | `{ dispatchBoardUrl }` for links (no secrets) |
| `POST` | `/api/checkout` | Browser checkout JSON `{ customerName, customerPhone, customerAddress, notes?, items[] }` |
| `POST` | `/api/orders/dispatch` | Programmatic forward (custom body mapping) |
| `GET` | `/health` | Liveness |

## Local

```bash
cp .env.example .env
# edit .env — same DELIVERY_* as production for a real forward, or leave secret blank to see 503 on checkout
npm run dev
```

Open `http://localhost:5050/`.

Contract details: `../delivery-dispatch-mvp/CANNA_DASH_STOREFRONT_INTEGRATION.md`
