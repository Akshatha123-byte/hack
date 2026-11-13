const IDENTIFIER_PATTERN = /^DEPT[A-Z]{2}-ISSUE\d{3}-PRIORITY[HML]$/;

export const identifierRegex = IDENTIFIER_PATTERN;

export function validateWithDfa(identifier) {
  const input = typeof identifier === "string" ? identifier : "";
  let state = 0;
  for (const char of input) {
    if (state === 0) state = char === "D" ? 1 : -1;
    else if (state === 1) state = char === "E" ? 2 : -1;
    else if (state === 2) state = char === "P" ? 3 : -1;
    else if (state === 3) state = char === "T" ? 4 : -1;
    else if (state === 4) state = /[A-Z]/.test(char) ? 5 : -1;
    else if (state === 5) state = /[A-Z]/.test(char) ? 6 : -1;
    else if (state === 6) state = char === "-" ? 7 : -1;
    else if (state === 7) state = char === "I" ? 8 : -1;
    else if (state === 8) state = char === "S" ? 9 : -1;
    else if (state === 9) state = char === "S" ? 10 : -1;
    else if (state === 10) state = char === "U" ? 11 : -1;
    else if (state === 11) state = char === "E" ? 12 : -1;
    else if (state >= 12 && state <= 14) state = /\d/.test(char) ? state + 1 : -1;
    else if (state === 15) state = char === "-" ? 16 : -1;
    else if (state === 16) state = char === "P" ? 17 : -1;
    else if (state === 17) state = char === "R" ? 18 : -1;
    else if (state === 18) state = char === "I" ? 19 : -1;
    else if (state === 19) state = char === "O" ? 20 : -1;
    else if (state === 20) state = char === "R" ? 21 : -1;
    else if (state === 21) state = char === "I" ? 22 : -1;
    else if (state === 22) state = char === "T" ? 23 : -1;
    else if (state === 23) state = char === "Y" ? 24 : -1;
    else if (state === 24) state = /[HML]/.test(char) ? 25 : -1;
    else state = -1;
    if (state === -1) break;
  }
  return state === 25;
}

export function validateIdentifier(identifier) {
  const dfaValid = validateWithDfa(identifier);
  const regexValid = typeof identifier === "string" && IDENTIFIER_PATTERN.test(identifier);
  return {
    valid: dfaValid && regexValid,
    dfaValid,
    regexValid,
    reason: dfaValid && regexValid
      ? "Identifier matches the DFA and regular expression."
      : "Use the format DEPT[2 uppercase letters]-ISSUE[3 digits]-PRIORITY[H/M/L], for example DEPTIT-ISSUE123-PRIORITYH."
  };
}

export function validateReportInput(input) {
  const errors = [];
  if (!input || typeof input !== "object") errors.push("Report body is required.");
  const identifier = input?.identifier;
  const validation = validateIdentifier(identifier);
  if (!validation.valid) errors.push(validation.reason);
  if (!input?.department?.trim()) errors.push("Department is required.");
  if (!input?.description?.trim()) errors.push("Description is required.");
  if (!input?.userEmail?.trim() || !input.userEmail.includes("@")) errors.push("A valid user email is required.");
  if (!/^\d{3}$/.test(input?.code ?? "")) errors.push("Issue code must contain exactly 3 digits.");
  if (!["H", "M", "L"].includes(identifier?.at(-1))) errors.push("Priority must be H, M, or L.");
  return { valid: errors.length === 0, errors, validation };
}
