import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { classifyReport } from "../src/classification.js";
import { chooseRoute, defaultHandlers } from "../src/routing.js";
import { validateIdentifier, validateWithDfa } from "../src/validation.js";

const valid = (overrides = {}) => ({
  identifier: "DEPTIT-ISSUE123-PRIORITYH", department: "IT", code: "001",
  description: "The application crashes on launch.", urgency: "High",
  userEmail: "student@example.com", ...overrides
});

test("DFA accepts a valid high-priority identifier", () => assert.equal(validateWithDfa("DEPTIT-ISSUE123-PRIORITYH"), true));
test("DFA accepts medium and low priorities", () => assert.equal(validateWithDfa("DEPTAB-ISSUE999-PRIORITYM") && validateWithDfa("DEPTXY-ISSUE000-PRIORITYL"), true));
test("DFA rejects incomplete prefixes", () => assert.equal(validateWithDfa("DEPIT-ISSUE123-PRIORITYH"), false));
test("DFA rejects malformed issue numbers", () => assert.equal(validateWithDfa("DEPTIT-ISSUE12-PRIORITYH"), false));
test("DFA rejects unsupported priority", () => assert.equal(validateWithDfa("DEPTIT-ISSUE123-PRIORITYX"), false));
test("regex and DFA agree for valid input", () => { const result = validateIdentifier("DEPTIT-ISSUE123-PRIORITYH"); assert.equal(result.dfaValid, result.regexValid); assert.equal(result.valid, true); });
test("regex and DFA agree for invalid input", () => { const result = validateIdentifier("DEPTIT-ISSUE123-H"); assert.equal(result.dfaValid, result.regexValid); assert.equal(result.valid, false); });
test("classification maps hardware", () => assert.equal(classifyReport({ description: "broken laptop screen" }).category, "Hardware"));
test("classification maps software", () => assert.equal(classifyReport({ description: "software install failed" }).category, "Software"));
test("classification maps network", () => assert.equal(classifyReport({ description: "wifi outage in office" }).category, "Network"));
test("classification maps access", () => assert.equal(classifyReport({ description: "password account locked" }).category, "Access"));
test("classification maps unmatched text to Other", () => assert.equal(classifyReport({ description: "need advice about a process" }).category, "Other"));
test("routing uses the zone issue-type table", () => { const result = chooseRoute("Network", "Infrastructure", defaultHandlers, 0); assert.equal(result.route.zone, "Z3"); assert.equal(result.status, "Assigned"); });
test("routing assigns hardware to Zone 1", () => { const result = chooseRoute("Hardware", "IT", defaultHandlers, 0); assert.equal(result.handlerId, "z1"); assert.equal(result.route.zone, "Z1"); });
test("software deterministically rotates between Zones 1 and 2", () => { assert.equal(chooseRoute("Software", "IT", defaultHandlers, 0).route.zone, "Z1"); assert.equal(chooseRoute("Software", "IT", defaultHandlers, 1).route.zone, "Z2"); });
test("password maps Access reports to Zone 2 or Zone 3", () => { assert.equal(chooseRoute("Access", "Security", defaultHandlers, 0).route.zone, "Z2"); assert.equal(chooseRoute("Access", "Security", defaultHandlers, 1).route.zone, "Z3"); });
test("network rotates between Zones 3 and 4", () => { assert.equal(chooseRoute("Network", "Infrastructure", defaultHandlers, 0).route.zone, "Z3"); assert.equal(chooseRoute("Network", "Infrastructure", defaultHandlers, 1).route.zone, "Z4"); });
test("routing escalates to Zone 5 when the primary zone is full", () => { const full = defaultHandlers.map((handler) => handler.handlerId === "z1" ? { ...handler, openTickets: 8 } : handler); const result = chooseRoute("Hardware", "IT", full); assert.equal(result.status, "Escalated"); assert.equal(result.route.zone, "Z5"); });
test("routing queues when the primary and Level-2 zones are full", () => { const full = defaultHandlers.map((handler) => ({ ...handler, openTickets: 8 })); assert.equal(chooseRoute("Hardware", "IT", full).status, "Queued"); });
test("routing queues an unknown issue type", () => { const result = chooseRoute("Unknown", "Security", defaultHandlers, 0); assert.equal(result.status, "Queued"); assert.equal(result.route, null); });
test("API rejects malformed reports before dispatch", async () => { const response = await request(app).post("/api/reports").send(valid({ identifier: "wrong" })); assert.equal(response.status, 400); assert.match(response.body.errors[0], /format/); });
test("API rejects missing required fields", async () => { const response = await request(app).post("/api/reports").send({ identifier: "DEPTIT-ISSUE123-PRIORITYH" }); assert.equal(response.status, 400); assert.ok(response.body.errors.length >= 2); });
test("API persists a valid report with validation and route decision", async () => { const response = await request(app).post("/api/reports").send(valid()); assert.equal(response.status, 201); assert.equal(response.body.validation.valid, true); assert.equal(response.body.category, "Software"); assert.ok(["Z1", "Z2"].includes(response.body.route.zone)); });
test("API prevents duplicate open assignments", async () => { const input = valid({ identifier: "DEPTIT-ISSUE127-PRIORITYH" }); const first = await request(app).post("/api/reports").send(input); const second = await request(app).post("/api/reports").send(input); assert.equal(first.status, 201); assert.equal(second.status, 409); assert.equal(second.body.reportId, first.body.reportId); });
test("API can retrieve a submitted report", async () => { const created = await request(app).post("/api/reports").send(valid({ identifier: "DEPTIT-ISSUE124-PRIORITYM" })); const response = await request(app).get(`/api/reports/${created.body.reportId}`); assert.equal(response.status, 200); assert.equal(response.body.reportId, created.body.reportId); });
test("API records status history updates", async () => { const created = await request(app).post("/api/reports").send(valid({ identifier: "DEPTIT-ISSUE125-PRIORITYL" })); const response = await request(app).patch(`/api/reports/${created.body.reportId}/status`).send({ status: "In Progress" }); assert.equal(response.status, 200); assert.equal(response.body.status, "In Progress"); assert.equal(response.body.history.length, 2); });
test("API rejects unsupported statuses", async () => { const created = await request(app).post("/api/reports").send(valid({ identifier: "DEPTIT-ISSUE126-PRIORITYL" })); const response = await request(app).patch(`/api/reports/${created.body.reportId}/status`).send({ status: "Unknown" }); assert.equal(response.status, 400); });
test("API provides dashboard analytics", async () => { const response = await request(app).get("/api/dashboard/summary"); assert.equal(response.status, 200); assert.ok(Array.isArray(response.body.categoryDistribution)); assert.ok(response.body.counts.total >= 1); });
