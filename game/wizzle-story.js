/* Completed encounters, not starts or debug previews, unlock Wizzle's tricks. */
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SparkyWizzleStory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  const variants = ["first", "returning", "dodgeSurprised", "dodgeAnnoyed"];
  function normalize(value) {
    return { completed: variants.filter(v => Array.isArray(value?.completed) && value.completed.includes(v)),
      last: variants.includes(value?.last) ? value.last : null };
  }
  function choices(value, phase = 0) {
    const s = normalize(value);
    if (!s.completed.includes("first")) return ["first"];
    if (!s.completed.includes("returning")) return ["returning"];
    if (phase < 3) return ["first", "returning"].filter(v => v !== s.last);
    if (!s.completed.includes("dodgeSurprised")) return ["dodgeSurprised"];
    if (!s.completed.includes("dodgeAnnoyed")) return ["dodgeAnnoyed"];
    // A normal encounter separates later dodge reprises; no endless dodge trope.
    return variants.filter(v => v !== s.last && (!s.last?.startsWith("dodge") || !v.startsWith("dodge")));
  }
  function complete(value, variant) {
    const s = normalize(value);
    if (!variants.includes(variant)) return s;
    return { completed: [...new Set([...s.completed, variant])], last: variant };
  }
  return Object.freeze({ normalize, choices, complete });
});