export const routingTable = [
  { zone: "Z1", issueTypes: ["Hardware", "Software"], team: "Zone 1 Support", teamIds: ["z1"] },
  { zone: "Z2", issueTypes: ["Software", "Password"], team: "Zone 2 Support", teamIds: ["z2"] },
  { zone: "Z3", issueTypes: ["Password", "Network"], team: "Zone 3 Support", teamIds: ["z3"] },
  { zone: "Z4", issueTypes: ["Network", "Other"], team: "Zone 4 Support", teamIds: ["z4"] },
  { zone: "Z5", issueTypes: ["Hardware", "Software", "Password", "Network", "Other"], team: "Level-2 Escalation", teamIds: ["z5"], level2: true }
];

export const defaultHandlers = [
  { handlerId: "z1", name: "Zone 1 Support", available: true, openTickets: 0, capacity: 8 },
  { handlerId: "z2", name: "Zone 2 Support", available: true, openTickets: 0, capacity: 8 },
  { handlerId: "z3", name: "Zone 3 Support", available: true, openTickets: 0, capacity: 8 },
  { handlerId: "z4", name: "Zone 4 Support", available: true, openTickets: 0, capacity: 8 },
  { handlerId: "z5", name: "Level-2 Escalation", available: true, openTickets: 0, capacity: 8 }
];

export function chooseRoute(category, department, handlers, sequence = 0, priority = "L") {
  const issueType = category === "Access" ? "Password" : category;
  const routes = routingTable.filter((item) => item.issueTypes.includes(issueType) && !item.level2);
  if (!routes.length) return { status: "Queued", reason: "Unknown issue type; sent to central fallback queue.", route: null };
  const route = routes[sequence % routes.length];
  const eligible = route.teamIds
    .map((id) => handlers.find((handler) => handler.handlerId === id))
    .filter((handler) => handler?.available && handler.openTickets < handler.capacity);
  if (!eligible.length) {
    const level2 = routingTable.find((item) => item.level2);
    const level2Handler = handlers.find((handler) => level2.teamIds.includes(handler.handlerId) && handler.available && handler.openTickets < handler.capacity);
    if (level2Handler) {
      return { status: "Escalated", reason: "Primary zone unavailable or at capacity; dispatched to Zone 5 Level-2.", route: level2, handlerId: level2Handler.handlerId, priorityOverride: true };
    }
    return { status: "Queued", reason: "Primary zone and Zone 5 Level-2 are unavailable or at capacity.", route: level2 };
  }
  const handler = eligible[0];
  return {
    status: "Assigned",
    reason: priority === "H" ? "High-priority report received deterministic zone priority." : "Assigned by deterministic zone routing.",
    route,
    handlerId: handler.handlerId,
    priorityOverride: false
  };
}
