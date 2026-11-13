export const routingTable = [
  { category: "Hardware", department: "IT", zone: "Z1", team: "IT Support Team", teamIds: ["t1", "t2", "t3", "t4"] },
  { category: "Software", department: "IT", zone: "Z1", team: "IT Support Team", teamIds: ["t1", "t2", "t3", "t4"] },
  { category: "Network", department: "Infrastructure", zone: "Z2", team: "Network Team", teamIds: ["t2", "t1", "t3", "t4"] },
  { category: "Access", department: "Security", zone: "Z3", team: "Access and Security Team", teamIds: ["t3", "t1", "t2", "t4"] },
  { category: "Other", department: "General", zone: "Z4", team: "General Support Team", teamIds: ["t4", "t1", "t2", "t3"] }
];

export const defaultHandlers = [
  { handlerId: "t1", name: "IT Support Team", available: true, openTickets: 0, capacity: 8 },
  { handlerId: "t2", name: "Network Team", available: true, openTickets: 0, capacity: 8 },
  { handlerId: "t3", name: "Access and Security Team", available: true, openTickets: 0, capacity: 8 },
  { handlerId: "t4", name: "General Support Team", available: true, openTickets: 0, capacity: 8 }
];

export function chooseRoute(category, department, handlers, sequence = 0, priority = "L") {
  const route = routingTable.find((item) => item.category === category && item.department === department);
  if (!route) return { status: "Queued", reason: "Unknown category or department; sent to central fallback queue.", route: null };
  const eligible = route.teamIds
    .map((id) => handlers.find((handler) => handler.handlerId === id))
    .filter((handler) => handler?.available && handler.openTickets < handler.capacity);
  if (!eligible.length) {
    return { status: "Escalated", reason: "All primary handlers are unavailable or at capacity; escalated to Level-2.", route };
  }
  const preferred = eligible.find((handler) => handler.handlerId === route.teamIds[0]);
  const handler = priority === "H" && preferred ? preferred : eligible[sequence % eligible.length];
  return {
    status: "Assigned",
    reason: priority === "H"
      ? "High-priority report received the preferred available team."
      : "Assigned by deterministic round-robin routing.",
    route,
    handlerId: handler.handlerId,
    priorityOverride: priority === "H" && handler.handlerId === route.teamIds[0]
  };
}
