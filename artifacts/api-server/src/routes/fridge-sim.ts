import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  sensorReadingsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, desc, and, isNull, isNotNull } from "drizzle-orm";
import type { Product, SensorReading } from "@workspace/db";

const router = Router();

const LOW_COUNT = 3;
const LOW_WEIGHT = 200;

async function ensureSeeded() {
  const rows = await db.select().from(productsTable);
  if (rows.length > 0) return;
  await db.insert(productsTable).values([
    { shelf: 1, name: "Milk Bottles", measureType: "count", count: 8, totalCount: 8, weightG: 0, lowCount: LOW_COUNT, lowWeightG: 0 },
    { shelf: 2, name: "Mangoes", measureType: "weight", count: 0, totalCount: 0, weightG: 1000, lowCount: 0, lowWeightG: LOW_WEIGHT },
  ]);
}

function buildAlerts(products: Product[]) {
  const alerts: Array<{ level: string; type: string; shelf?: number; message: string }> = [];
  for (const p of products) {
    if (p.measureType === "count") {
      if (p.count === 0) alerts.push({ level: "critical", type: "stock", shelf: p.shelf, message: `Shelf ${p.shelf}: ${p.name} is OUT OF STOCK!` });
      else if (p.count <= p.lowCount) alerts.push({ level: "warning", type: "stock", shelf: p.shelf, message: `Shelf ${p.shelf}: ${p.name} is LOW — only ${p.count} left!` });
    } else {
      if (p.weightG === 0) alerts.push({ level: "critical", type: "stock", shelf: p.shelf, message: `Shelf ${p.shelf}: ${p.name} — nothing on shelf!` });
      else if (p.weightG <= p.lowWeightG) alerts.push({ level: "warning", type: "stock", shelf: p.shelf, message: `Shelf ${p.shelf}: ${p.name} is LOW — only ${p.weightG}g remaining!` });
    }
  }
  return alerts;
}

function buildSensorAlerts(reading: SensorReading | undefined) {
  const alerts: Array<{ level: string; type: string; message: string }> = [];
  if (!reading) return alerts;
  const t = reading.temperature;
  if (t != null) {
    if (t > 8) alerts.push({ level: "critical", type: "temp", message: `Temperature is ${t.toFixed(1)}°C — CRITICAL! (above 8°C is unsafe)` });
    else if (t > 6) alerts.push({ level: "warning", type: "temp", message: `Temperature is ${t.toFixed(1)}°C — getting warm.` });
  }
  if (reading.doorOpen) alerts.push({ level: "warning", type: "door", message: "Fridge door is OPEN!" });
  return alerts;
}

async function addNotificationIfNew(ntype: string, message: string, shelf: number | null, level: string) {
  const existing = await db
    .select()
    .from(notificationsTable)
    .where(
      shelf != null
        ? and(eq(notificationsTable.ntype, ntype), eq(notificationsTable.shelf, shelf))
        : and(eq(notificationsTable.ntype, ntype), isNull(notificationsTable.shelf))
    )
    .orderBy(desc(notificationsTable.id))
    .limit(1);
  if (existing.length > 0 && existing[0].message === message) return;
  await db.insert(notificationsTable).values({ ntype, message, shelf: shelf ?? undefined, level });
}

async function unreadCount() {
  const rows = await db.select().from(notificationsTable).where(eq(notificationsTable.isRead, false));
  return rows.length;
}

router.get("/status", async (req, res) => {
  try {
    await ensureSeeded();
    const products = await db.select().from(productsTable).orderBy(productsTable.shelf);
    const [reading] = await db.select().from(sensorReadingsTable).orderBy(desc(sensorReadingsTable.id)).limit(1);
    const shelf1 = products.find(p => p.shelf === 1);
    const shelf2 = products.find(p => p.shelf === 2);
    const alerts = [...buildAlerts(products), ...buildSensorAlerts(reading)];
    const unread = await unreadCount();
    res.json({ sensor: reading ?? null, shelf1: shelf1 ?? null, shelf2: shelf2 ?? null, alerts, unread });
  } catch (err) {
    req.log.error({ err }, "Failed to get status");
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/sensor", async (req, res) => {
  try {
    await ensureSeeded();
    const data = req.body as {
      temperature?: number;
      door_open?: boolean;
      shelf1_button_pressed?: boolean;
      shelf2_weight_g?: number;
    };

    if (data.shelf1_button_pressed) {
      const [p] = await db.select().from(productsTable).where(eq(productsTable.shelf, 1));
      if (p && p.count > 0) {
        await db.update(productsTable).set({ count: p.count - 1 }).where(eq(productsTable.shelf, 1));
      }
    }

    if (data.shelf2_weight_g !== undefined) {
      await db.update(productsTable).set({ weightG: Math.round(data.shelf2_weight_g) }).where(eq(productsTable.shelf, 2));
    }

    const [shelf1] = await db.select().from(productsTable).where(eq(productsTable.shelf, 1));
    await db.insert(sensorReadingsTable).values({
      temperature: data.temperature ?? null,
      doorOpen: data.door_open ?? false,
      shelf1Count: shelf1?.count ?? 0,
      shelf2WeightG: Math.round(data.shelf2_weight_g ?? 0),
    });

    const products = await db.select().from(productsTable);
    const [reading] = await db.select().from(sensorReadingsTable).orderBy(desc(sensorReadingsTable.id)).limit(1);
    const allAlerts = [...buildAlerts(products), ...buildSensorAlerts(reading)];

    for (const alert of allAlerts) {
      await addNotificationIfNew(alert.type, alert.message, alert.shelf ?? null, alert.level);
    }

    res.json({ ok: true, alerts: allAlerts.length });
  } catch (err) {
    req.log.error({ err }, "Failed to process sensor data");
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/shelf1/deduct", async (req, res) => {
  try {
    const [p] = await db.select().from(productsTable).where(eq(productsTable.shelf, 1));
    if (p && p.count > 0) {
      await db.update(productsTable).set({ count: p.count - 1 }).where(eq(productsTable.shelf, 1));
    }
    const [updated] = await db.select().from(productsTable).where(eq(productsTable.shelf, 1));
    res.json({ ok: true, new_count: updated?.count ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to deduct shelf1");
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/shelf1/restock", async (req, res) => {
  try {
    const { count = 8 } = req.body as { count?: number };
    const n = Math.max(1, Math.min(50, Number(count)));
    await db.update(productsTable).set({ count: n, totalCount: n }).where(eq(productsTable.shelf, 1));
    res.json({ ok: true, count: n });
  } catch (err) {
    req.log.error({ err }, "Failed to restock shelf1");
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/shelf2/weight", async (req, res) => {
  try {
    const { weight_g = 0 } = req.body as { weight_g?: number };
    const w = Math.max(0, Math.round(Number(weight_g)));
    await db.update(productsTable).set({ weightG: w }).where(eq(productsTable.shelf, 2));
    res.json({ ok: true, weight_g: w });
  } catch (err) {
    req.log.error({ err }, "Failed to update shelf2 weight");
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const notifications = await db
      .select()
      .from(notificationsTable)
      .orderBy(desc(notificationsTable.id))
      .limit(40);
    const unread = await unreadCount();
    res.json({ notifications, unread });
  } catch (err) {
    req.log.error({ err }, "Failed to get notifications");
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/notifications/read", async (req, res) => {
  try {
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.isRead, false));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark notifications read");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
