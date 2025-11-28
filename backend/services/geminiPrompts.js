// backend/prompts/geminiPrompts.js
// Small helper to build prompts. Keep prompts short but include schema instructions.

export function buildNormalizationPrompt(rawText) {
  return `You are a concise assistant that extracts and normalizes claims from social media text.
Input: """${rawText}"""
Output JSON with array "claims", each claim has fields:
{text, type, location, time, confidence}
Be conservative. Do not invent facts. Example:
{ "claims":[ { "text":"Bandra station platforms flooded; local trains suspended","type":"event","location":"Bandra","time":null,"confidence":0.9 } ] }
Return only JSON.`;
}

export function buildNliPrompt(claimText, evidenceList) {
  // evidenceList: [{url, snippet, date}]
  const evidenceBlock = evidenceList.map((e, i) => `${i+1}) ${e.url} | ${e.date || 'unknown'} | ${e.snippet}`).join('\n');
  return `You are a fact-check assistant. Decide whether the CLAIM is ENTailed (confirmed), Contradicted, or Insufficient given the evidence.
Claim: """${claimText}"""
Evidence:
${evidenceBlock}

Return JSON exactly with fields:
{ "verdict": "confirmed|contradicted|insufficient",
  "confidence": 0-1,
  "rationale": "short paragraph citing urls and quotes where possible",
  "evidence_used": [ { "url":"", "excerpt":"" } ]
}
Be conservative: if official sources are silent or ambiguous prefer "insufficient".`;
}

export function buildExplanationPrompt(claimText, verdict, evidenceUsed, language = 'en') {
  // evidenceUsed: [{url, excerpt}]
  // produce short social-friendly message with citation and action.
  const evidenceText = evidenceUsed.map(e => `${e.url} — "${(e.excerpt||'').slice(0,120)}"`).join('\n');
  return `Generate a short fact-check message in language ${language}. Start with a one-line verdict like "False — ...", then one sentence explaining why (cite one URL with short excerpt), then one action line "Do not share; check ...".
Claim: """${claimText}"""
Verdict: ${verdict}
Evidence:
${evidenceText}
Return ONLY the message string (no JSON). Keep under 280 characters if language is 'en'.`;
}
