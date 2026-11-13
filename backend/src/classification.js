const categories = ["Hardware", "Software", "Network", "Access", "Other"];
const patterns = [
  ["Hardware", /\b(laptop|desktop|monitor|keyboard|mouse|printer|hardware|screen)\b/i],
  ["Network", /\b(network|wifi|wi-fi|internet|vpn|router|outage|connection)\b/i],
  ["Access", /\b(password|login|access|permission|account|credential|locked)\b/i],
  ["Software", /\b(app|application|software|install|bug|crash|update|license)\b/i]
];

export function classifyReport({ description = "", code = "", department = "" }) {
  const text = `${description} ${code} ${department}`;
  const match = patterns.find(([, pattern]) => pattern.test(text));
  return { category: match?.[0] ?? "Other", matchedPattern: match?.[1].source ?? null, categories };
}
