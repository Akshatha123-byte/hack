import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { classifyReport } from "../src/classification.js";
import { chooseRoute, defaultHandlers } from "../src/routing.js";
import { validateIdentifier, validateWithDfa } from "../src/validation.js";

const valid = (overrides = {}) => ({
  identifier: "DEPTIT-ISSUE123-H", department: "IT", code: "APP-01",
  description: "The application crashes on launch.", urgency: "High",
  userEmail: "student@example.com", ...overrides
});

test("DFA accepts a valid high-priority identifier", () => assert.equal(validateWithDfa("DEPTIT-ISSUE123-H"), true));
test("DFA accepts medium and low priorities", () => assert.equal(validateWithDfa("DEPTAB-ISSUE999-M") && validateWithDfa("DEPTXY-ISSUE000-L"), true));
test("DFA rejects incomplete prefixes", () => assert.equal(validateWithDfa("DEPIT-ISSUE123-H"), false));
test("DFA rejects malformed issue numbers", () => assert.equal(validateWithDfa("DEPTIT-ISSUE12-H"), false));
test("DFA rejects unsupported priority", () => assert.equal(validateWithDfa("DEPTIT-ISSUE123-X"), false));
test("regex and DFA agree for valid input", () => { const result = validateIdentifier("DEPTIT-ISSUE123-H"); assert.equal(result.dfaValid, result.regexValid); assert.equal(result.valid, true); });
test("regex and DFA agree for invalid input", () => { const result = validateIdentifier("DEPTIT-ISSUE123-X"); assert.equal(result.dfaValid, result.regexValid); assert.equal(result.valid, false); });
test("classification maps hardware", () => assert.equal(classifyReport({ description: "broken laptop screen" }).category, "Hardware"));
test("classification maps software", () => assert.equal(classifyReport({ description: "software install failed" }).category, "Software"));
test("classification maps network", () => assert.equal(classifyReport({ description: "wifi outage in office" }).category, "Network"));
test("classification maps access", () => assert.equal(classifyReport({ description: "password account locked" }).category, "Access"));
test("classification maps unmatched text to Other", () => assert.equal(classifyReport({ description: "need advice about a process" }).category, "Other"));
test("routing uses the category and department table", () => { const result = chooseRoute("Network", "Infrastructure", defaultHandlers, 0); assert.equal(result.route.zone, "Z2"); assert.equal(result.status, "Assigned"); });
test("routing assigns to the correct one of four helpdesk teams", () => { const result = chooseRoute("Hardware", "IT", defaultHandlers, 0); assert.equal(result.handlerId, "t1"); assert.equal(defaultHandlers.length, 4); });
test("high priority uses the preferred available team", () => { const result = chooseRoute("Network", "Infrastructure", defaultHandlers, 3, "H"); assert.equal(result.handlerId, "t2"); assert.equal(result.priorityOverride, true); });
test("normal priority follows deterministic team round robin", () => { const result = chooseRoute("Hardware", "IT", defaultHandlers, 1, "M"); assert.equal(result.handlerId, "t2"); assert.equal(result.priorityOverride, false); });
test("routing uses a backup team when the preferred team reaches its cap", () => { const full = defaultHandlers.map((handler) => handler.handlerId === "t1" ? { ...handler, openTickets: 8 } : handler); const result = chooseRoute("Hardware", "IT", full); assert.equal(result.status, "Assigned"); assert.equal(result.handlerId, "t2"); });
test("routing escalates when all four teams reach their caps", () => { const full = defaultHandlers.map((handler) => ({ ...handler, openTickets: 8 })); assert.equal(chooseRoute("Hardware", "IT", full).status, "Escalated"); });
test("routing queues an unknown category and department key", () => { const result = chooseRoute("Hardware", "Security", defaultHandlers, 0); assert.equal(result.status, "Queued"); assert.equal(result.route, null); });
test("API rejects malformed reports before dispatch", async () => { const response = await request(app).post("/api/reports").send(valid({ identifier: "wrong" })); assert.equal(response.status, 400); assert.match(response.body.errors[0], /format/); });
test("API rejects missing required fields", async () => { const response = await request(app).post("/api/reports").send({ identifier: "DEPTIT-ISSUE123-H" }); assert.equal(response.status, 400); assert.ok(response.body.errors.length >= 2); });
test("API persists a valid report with validation and route decision", async () => { const response = await request(app).post("/api/reports").send(valid()); assert.equal(response.status, 201); assert.equal(response.body.validation.valid, true); assert.equal(response.body.category, "Software"); assert.equal(response.body.route.zone, "Z1"); });
test("API prevents duplicate open assignments", async () => { const input = valid({ identifier: "DEPTIT-ISSUE127-H" }); const first = await request(app).post("/api/reports").send(input); const second = await request(app).post("/api/reports").send(input); assert.equal(first.status, 201); assert.equal(second.status, 409); assert.equal(second.body.reportId, first.body.reportId); });
test("API can retrieve a submitted report", async () => { const created = await request(app).post("/api/reports").send(valid({ identifier: "DEPTIT-ISSUE124-M" })); const response = await request(app).get(`/api/reports/${created.body.reportId}`); assert.equal(response.status, 200); assert.equal(response.body.reportId, created.body.reportId); });
test("API records status history updates", async () => { const created = await request(app).post("/api/reports").send(valid({ identifier: "DEPTIT-ISSUE125-L" })); const response = await request(app).patch(`/api/reports/${created.body.reportId}/status`).send({ status: "In Progress" }); assert.equal(response.status, 200); assert.equal(response.body.status, "In Progress"); assert.equal(response.body.history.length, 2); });
test("API rejects unsupported statuses", async () => { const created = await request(app).post("/api/reports").send(valid({ identifier: "DEPTIT-ISSUE126-L" })); const response = await request(app).patch(`/api/reports/${created.body.reportId}/status`).send({ status: "Unknown" }); assert.equal(response.status, 400); });
test("API provides dashboard analytics", async () => { const response = await request(app).get("/api/dashboard/summary"); assert.equal(response.status, 200); assert.ok(Array.isArray(response.body.categoryDistribution)); assert.ok(response.body.counts.total >= 1); });
