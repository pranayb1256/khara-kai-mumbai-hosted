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
  const evidenceBlock = evidenceList.length > 0 
    ? evidenceList.map((e, i) => `${i+1}) Source: ${e.source || 'unknown'} | URL: ${e.url || 'N/A'} | Date: ${e.date || 'unknown'} | Content: ${e.snippet || 'N/A'}`).join('\n')
    : 'No external evidence available. Analyze based on claim plausibility and common knowledge about Mumbai.';
  
  return `You are an expert fact-checker specializing in Mumbai news and events. Your job is to verify claims about Mumbai (local trains, traffic, floods, accidents, etc.).

CLAIM TO VERIFY: """${claimText}"""

AVAILABLE EVIDENCE:
${evidenceBlock}

INSTRUCTIONS:
1. If evidence supports the claim, verdict is "confirmed"
2. If evidence contradicts the claim, verdict is "contradicted"  
3. If no clear evidence or ambiguous, verdict is "insufficient"
4. Always provide a clear rationale explaining your reasoning
5. Be specific about Mumbai locations, train lines, and local context

Return ONLY valid JSON in this exact format:
{
  "verdict": "confirmed" | "contradicted" | "insufficient",
  "confidence": <number between 0.0 and 1.0>,
  "rationale": "<2-3 sentences explaining your verdict with specific details>",
  "evidence_used": [{"url": "<source url>", "excerpt": "<relevant quote>"}],
  "key_facts": ["<fact 1>", "<fact 2>"]
}`;
}

export function buildExplanationPrompt(claimText, verdict, evidenceUsed, language = 'en') {
  const langName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';
  const evidenceText = evidenceUsed && evidenceUsed.length > 0
    ? evidenceUsed.map(e => `- ${e.url || 'Source'}: "${(e.excerpt || e.snippet || '').slice(0, 150)}"`).join('\n')
    : 'Based on analysis of the claim content.';
  
  const verdictEmoji = verdict === 'confirmed' ? '✅' : verdict === 'contradicted' ? '❌' : '⚠️';
  const verdictLabel = verdict === 'confirmed' ? 'TRUE' : verdict === 'contradicted' ? 'FALSE' : 'UNVERIFIED';
  
  return `Generate a helpful fact-check explanation in ${langName} for sharing on social media.

CLAIM: """${claimText}"""
VERDICT: ${verdictLabel}
EVIDENCE:
${evidenceText}

FORMAT YOUR RESPONSE AS:
${verdictEmoji} ${verdictLabel}: [One clear sentence about what the claim states]

[2-3 sentences explaining WHY this verdict was reached, citing specific evidence or reasoning]

[One action recommendation - what should people do with this information]

RULES:
- Write in ${langName} language
- Keep total response under 300 characters for ${langName === 'English' ? 'Twitter' : 'WhatsApp'} sharing
- Be clear, factual, and helpful
- Do not include JSON, just the formatted text message`;
}

export function buildDirectAnalysisPrompt(claimText) {
  return `You are a Mumbai fact-checker AI. Analyze this claim and provide insights even without external evidence.

CLAIM: """${claimText}"""

Analyze this claim about Mumbai considering:
1. Is this claim plausible based on Mumbai's geography, infrastructure, and common events?
2. Does it contain any red flags for misinformation (sensationalism, vague details, urgency)?
3. What would be needed to verify this claim?
4. What is the potential impact if this is false?

Return JSON:
{
  "verdict": "likely_true" | "likely_false" | "needs_verification",
  "confidence": <0.0 to 1.0>,
  "analysis": "<detailed analysis in 3-4 sentences>",
  "red_flags": ["<flag 1>", "<flag 2>"],
  "verification_steps": ["<step 1>", "<step 2>"],
  "impact_if_false": "<potential harm>"
}`;
}
