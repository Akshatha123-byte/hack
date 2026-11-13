import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { classifyReport } from "./classification.js";
import { validateReportInput } from "./validation.js";
import { chooseRoute } from "./routing.js";
import { findOpenDuplicate, getReport, listHandlers, listReports, saveReport, updateHandler, updateReport } from "./store.js";

export const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, persistence: process.env.MONGO_URI ? "mongodb" : "memory-development" }));

app.post("/api/reports", async (req, res, next) => {
  try {
    const input = req.body;
    const checked = validateReportInput(input);
    if (!checked.valid) return res.status(400).json({ message: "Report validation failed.", errors: checked.errors, validation: checked.validation });
    const duplicate = await findOpenDuplicate(input.identifier, input.userEmail);
    if (duplicate) return res.status(409).json({ message: "An open report with this identifier already exists.", reportId: duplicate.reportId });
    const classification = classifyReport(input);
    const handlers = await listHandlers();
    const reports = await listReports();
    const priority = input.identifier.at(-1);
    const routeDecision = chooseRoute(classification.category, input.department, handlers, reports.length, priority);
    const now = new Date();
    const report = {
      reportId: `RPT-${now.getTime()}-${randomUUID().slice(0, 6).toUpperCase()}`,
      ...input, category: classification.category, validation: checked.validation,
      route: routeDecision.route, status: routeDecision.status,
      assignedHandler: routeDecision.handlerId ?? null,
      assignedTeam: routeDecision.handlerId ?? null,
      priorityOverride: routeDecision.priorityOverride ?? false,
      history: [{ status: routeDecision.status, at: now, note: routeDecision.reason }], createdAt: now
    };
    await saveReport(report);
    if (routeDecision.handlerId) {
      const handler = handlers.find((item) => item.handlerId === routeDecision.handlerId);
      await updateHandler(routeDecision.handlerId, { openTickets: (handler?.openTickets ?? 0) + 1 });
    }
    return res.status(201).json(report);
  } catch (error) { return next(error); }
});

app.get("/api/reports", async (req, res, next) => {
  try { return res.json(await listReports(req.query)); } catch (error) { return next(error); }
});
app.get("/api/reports/:reportId", async (req, res, next) => {
  try {
    const report = await getReport(req.params.reportId);
    return report ? res.json(report) : res.status(404).json({ message: "Report not found." });
  } catch (error) { return next(error); }
});
app.patch("/api/reports/:reportId/status", async (req, res, next) => {
  try {
    const allowed = ["Pending", "Assigned", "In Progress", "Resolved", "Escalated", "Queued"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Unsupported status." });
    const report = await getReport(req.params.reportId);
    if (!report) return res.status(404).json({ message: "Report not found." });
    const history = [...(report.history ?? []), { status: req.body.status, at: new Date(), note: req.body.note ?? "Status updated." }];
    if (req.body.status === "Resolved" && report.assignedHandler) {
      const handler = (await listHandlers()).find((item) => item.handlerId === report.assignedHandler);
      if (handler) await updateHandler(handler.handlerId, { openTickets: Math.max(0, handler.openTickets - 1) });
    }
    return res.json(await updateReport(req.params.reportId, { status: req.body.status, history }));
  } catch (error) { return next(error); }
});
app.get("/api/handlers", async (_req, res, next) => {
  try { return res.json(await listHandlers()); } catch (error) { return next(error); }
});
app.patch("/api/handlers/:handlerId", async (req, res, next) => {
  try {
    const update = {};
    if (typeof req.body.available === "boolean") update.available = req.body.available;
    if (Number.isInteger(req.body.capacity) && req.body.capacity >= 0) update.capacity = req.body.capacity;
    const handler = await updateHandler(req.params.handlerId, update);
    return handler ? res.json(handler) : res.status(404).json({ message: "Handler not found." });
  } catch (error) { return next(error); }
});
app.get("/api/dashboard/summary", async (req, res, next) => {
  try {
    const reports = await listReports(req.query.userEmail ? { userEmail: req.query.userEmail } : {});
    const handlers = await listHandlers();
    const groupBy = (items, key) => items.reduce((groups, item) => {
      const value = key(item);
      (groups[value] ??= []).push(item);
      return groups;
    }, {});
    const byCategory = groupBy(reports, (report) => report.category);
    const byZone = groupBy(reports, (report) => report.route?.zone ?? "Fallback");
    return res.json({
      counts: {
        total: reports.length,
        pending: reports.filter((r) => r.status === "Pending" || r.status === "Queued").length,
        assigned: reports.filter((r) => r.status === "Assigned" || r.status === "In Progress").length,
        resolved: reports.filter((r) => r.status === "Resolved").length,
        escalated: reports.filter((r) => r.status === "Escalated").length
      },
      categoryDistribution: Object.entries(byCategory).map(([name, values]) => ({ name, value: values.length })),
      zoneDistribution: Object.entries(byZone).map(([name, values]) => ({ name, value: values.length })),
      handlers,
      reports,
      queuedReports: reports.filter((r) => r.status === "Queued").sort((a, b) => priorityRank(a) - priorityRank(b) || new Date(a.createdAt) - new Date(b.createdAt)),
      escalatedReports: reports.filter((r) => r.status === "Escalated")
    });
    function priorityRank(report) {
      return { H: 0, M: 1, L: 2 }[report.identifier?.at(-1)] ?? 3;
    }
  } catch (error) { return next(error); }
});
app.use((error, _req, res, _next) => res.status(500).json({ message: error.message ?? "Internal server error." }));
