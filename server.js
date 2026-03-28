/**
 * Canna Dash — storefront + API.
 * Confirmed checkouts forward to delivery-dispatch (CANNA_DASH_STOREFRONT_INTEGRATION.md).
 *
 * Deploy: Vercel. Set DELIVERY_API_BASE_URL and DELIVERY_WEBHOOK_SECRET (same as Render STORE_WEBHOOK_SECRET).
 */
import { randomBytes } from "crypto";
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const port = Number(process.env.PORT || 5050);
const deliveryBase = (process.env.DELIVERY_API_BASE_URL || "").replace(/\/+$/, "");
const webhookSecret = (process.env.DELIVERY_WEBHOOK_SECRET || "").trim();
const publicDispatchBoard =
  (process.env.PUBLIC_DISPATCH_BOARD_URL || "https://delivery-dispatch-mvp.onrender.com").replace(/\/+$/, "");

async function forwardToDispatch(body) {
  if (!deliveryBase || !webhookSecret) {
    throw new Error("Set DELIVERY_API_BASE_URL and DELIVERY_WEBHOOK_SECRET on this server (Vercel env).");
  }
  const url = `${deliveryBase}/api/integrations/store/orders`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${webhookSecret}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || data.message || JSON.stringify(data);
    throw new Error(`Dispatch ${res.status}: ${msg}`);
  }
  return data;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "canna-dash" });
});

/** Public config for storefront (no secrets). */
app.get("/api/config", (_req, res) => {
  res.json({ dispatchBoardUrl: publicDispatchBoard });
});

/**
 * Browser / app checkout: creates a store order id and forwards to dispatch.
 */
app.post("/api/checkout", async (req, res) => {
  try {
    const o = req.body || {};
    const customerName = String(o.customerName || "").trim();
    const customerPhone = String(o.customerPhone || "").trim();
    const customerAddress = String(o.customerAddress || "").trim();
    const extraNotes = o.notes != null ? String(o.notes).trim() : "";
    const items = Array.isArray(o.items) ? o.items : [];

    if (!customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({
        error: "customerName, customerPhone, and customerAddress are required",
      });
    }
    if (!items.length) {
      return res.status(400).json({ error: "Add at least one line item (cart)." });
    }

    const storeOrderId = `cd-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const lines = items
      .map((it) => `${Number(it.qty) || 0}× ${String(it.name || it.id || "item")}`)
      .join("; ");
    const notes = [lines && `Items: ${lines}`, extraNotes].filter(Boolean).join(" · ") || null;

    const payload = {
      storeOrderId,
      customerName,
      customerPhone,
      customerAddress,
      customerLat: o.customerLat ?? null,
      customerLng: o.customerLng ?? null,
      notes,
    };

    const result = await forwardToDispatch(payload);
    return res.status(201).json({ ok: true, storeOrderId, dispatch: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "checkout failed";
    const code = msg.includes("Set DELIVERY") ? 503 : 500;
    return res.status(code).json({ error: msg });
  }
});

/**
 * Programmatic / ERP hook: map your own body shape to the dispatch contract.
 */
app.post("/api/orders/dispatch", async (req, res) => {
  try {
    const o = req.body || {};
    const storeOrderId = o.id ?? o.orderId ?? o.storeOrderId;
    const customerName = o.customerName ?? o.name;
    const customerPhone = o.customerPhone ?? o.phone;
    const customerAddress = o.customerAddress ?? o.address;
    const notes = o.notes ?? null;
    const customerLat = o.customerLat ?? o.lat ?? null;
    const customerLng = o.customerLng ?? o.lng ?? null;

    if (!storeOrderId || !customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({
        error: "Required: id (or orderId), customerName, customerPhone, customerAddress",
      });
    }

    const payload = {
      storeOrderId: String(storeOrderId),
      customerName: String(customerName),
      customerPhone: String(customerPhone),
      customerAddress: String(customerAddress),
      customerLat,
      customerLng,
      notes,
    };

    const result = await forwardToDispatch(payload);
    return res.status(201).json({ ok: true, dispatch: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "forward failed";
    const code = msg.includes("Set DELIVERY") ? 503 : 500;
    return res.status(code).json({ error: msg });
  }
});

app.use(express.static(path.join(__dirname, "public"), { index: "index.html" }));

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Canna Dash → http://localhost:${port}`);
    console.log(`Storefront: GET /  ·  Checkout: POST /api/checkout  ·  Dispatch forward: POST /api/orders/dispatch`);
  });
}

export default app;
