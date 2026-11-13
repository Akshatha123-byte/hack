import mongoose from "mongoose";
import { defaultHandlers } from "./routing.js";

const reportSchema = new mongoose.Schema({
  reportId: { type: String, unique: true },
  identifier: String, department: String, code: String, description: String, urgency: String,
  userEmail: String, category: String, validation: Object, route: Object, status: String,
  assignedTeam: String, priorityOverride: Boolean,
  assignedHandler: String, history: [{ status: String, at: Date, note: String }],
  createdAt: { type: Date, default: Date.now }
});
const handlerSchema = new mongoose.Schema({
  handlerId: { type: String, unique: true }, name: String, available: Boolean, openTickets: Number, capacity: Number
});
export const Report = mongoose.models.Report ?? mongoose.model("Report", reportSchema);
export const Handler = mongoose.models.Handler ?? mongoose.model("Handler", handlerSchema);

const memory = { reports: [], handlers: structuredClone(defaultHandlers) };
export const isMemoryMode = !process.env.MONGO_URI;

export async function connectStore() {
  if (isMemoryMode) return;
  await mongoose.connect(process.env.MONGO_URI);
  if (await Handler.countDocuments() === 0) await Handler.insertMany(defaultHandlers);
}
export async function listReports(query = {}) {
  if (isMemoryMode) return memory.reports.filter((report) => !query.userEmail || report.userEmail === query.userEmail);
  return Report.find(query).sort({ createdAt: -1 }).lean();
}
export async function getReport(reportId) {
  return isMemoryMode ? memory.reports.find((report) => report.reportId === reportId) : Report.findOne({ reportId }).lean();
}
export async function findOpenDuplicate(identifier, userEmail) {
  const statuses = ["Pending", "Assigned", "In Progress", "Escalated", "Queued"];
  if (isMemoryMode) return memory.reports.find((report) => report.identifier === identifier && report.userEmail === userEmail && statuses.includes(report.status));
  return Report.findOne({ identifier, userEmail, status: { $in: statuses } }).lean();
}
export async function saveReport(report) {
  if (isMemoryMode) { memory.reports.unshift(report); return report; }
  return Report.create(report);
}
export async function updateReport(reportId, update) {
  if (isMemoryMode) {
    const report = memory.reports.find((item) => item.reportId === reportId);
    if (report) Object.assign(report, update);
    return report;
  }
  return Report.findOneAndUpdate({ reportId }, update, { new: true }).lean();
}
export async function listHandlers() {
  return isMemoryMode ? memory.handlers : Handler.find().lean();
}
export async function updateHandler(handlerId, update) {
  if (isMemoryMode) {
    const handler = memory.handlers.find((item) => item.handlerId === handlerId);
    if (handler) Object.assign(handler, update);
    return handler;
  }
  return Handler.findOneAndUpdate({ handlerId }, update, { new: true }).lean();
}
