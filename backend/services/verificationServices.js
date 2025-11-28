// backend/services/verificationService.js
import axios from 'axios';
import { generateText, embedTexts } from './geminiClient.js';
import { buildNliPrompt, buildExplanationPrompt, buildDirectAnalysisPrompt } from './geminiPrompts.js';
import dotenv from 'dotenv';
dotenv.config();

const SCRAPER_URL = process.env.SCRAPER_URL;
const IMAGE_CHECKER_URL = process.env.IMAGE_CHECKER_URL;
const EXPLAINER_URL = process.env.EXPLAINER_URL;

const GEMINI_MAX_EVIDENCE = parseInt(process.env.GEMINI_MAX_EVIDENCE || '5', 10);

/**
 * Analyze the recency of evidence and claim
 * Returns { isCurrentEvent, isOldNews, evidenceAge, recencyWarning }
 */
function analyzeRecency(claimText, evidence, claimCreatedAt) {
  const now = new Date();
  const text = claimText.toLowerCase();
  
  // Time indicators in claim text
  const currentIndicators = ['today', 'now', 'right now', 'just now', 'happening', 'live', 
    'breaking', 'current', 'ongoing', 'at the moment', 'abhi', 'aaj', 'आज', 'अभी', 'सध्या'];
  const pastIndicators = ['yesterday', 'last week', 'last month', 'ago', 'earlier', 
    'previous', 'kal', 'पिछले', 'कल', 'काल'];
  
  const claimSuggestsCurrent = currentIndicators.some(ind => text.includes(ind));
  const claimSuggestsPast = pastIndicators.some(ind => text.includes(ind));
  
  // Analyze evidence dates
  const evidenceDates = evidence
    .map(e => e.date ? new Date(e.date) : null)
    .filter(d => d && !isNaN(d.getTime()));
  
  let latestEvidenceDate = null;
  let oldestEvidenceDate = null;
  let avgEvidenceAgeDays = null;
  
  if (evidenceDates.length > 0) {
    latestEvidenceDate = new Date(Math.max(...evidenceDates));
    oldestEvidenceDate = new Date(Math.min(...evidenceDates));
    const totalAgeDays = evidenceDates.reduce((sum, d) => sum + (now - d) / (1000 * 60 * 60 * 24), 0);
    avgEvidenceAgeDays = Math.round(totalAgeDays / evidenceDates.length);
  }
  
  // Calculate days since latest evidence
  const daysSinceLatestEvidence = latestEvidenceDate 
    ? Math.round((now - latestEvidenceDate) / (1000 * 60 * 60 * 24))
    : null;
  
  // Determine if this is current or old news
  const isRecentEvidence = daysSinceLatestEvidence !== null && daysSinceLatestEvidence <= 3;
  const isModeratelyOld = daysSinceLatestEvidence !== null && daysSinceLatestEvidence > 3 && daysSinceLatestEvidence <= 30;
  const isOldEvidence = daysSinceLatestEvidence !== null && daysSinceLatestEvidence > 30;
  
  let isCurrentEvent = false;
  let isOldNews = false;
  let recencyWarning = null;
  let recencyStatus = 'unknown';
  
  if (claimSuggestsCurrent && isOldEvidence) {
    // Claim says "today/now" but evidence is old - likely reshared old news
    isOldNews = true;
    recencyStatus = 'old_reshared';
    recencyWarning = `⚠️ This appears to be OLD NEWS being reshared. The most recent evidence is from ${daysSinceLatestEvidence} days ago (${latestEvidenceDate?.toLocaleDateString('en-IN')}).`;
  } else if (claimSuggestsCurrent && isRecentEvidence) {
    // Claim says current and evidence is recent - likely current event
    isCurrentEvent = true;
    recencyStatus = 'current';
  } else if (isRecentEvidence) {
    // Recent evidence without explicit time markers
    isCurrentEvent = true;
    recencyStatus = 'recent';
  } else if (isModeratelyOld) {
    recencyStatus = 'moderately_old';
    recencyWarning = `ℹ️ The related news is from ${daysSinceLatestEvidence} days ago. This may not reflect current conditions.`;
  } else if (isOldEvidence) {
    isOldNews = true;
    recencyStatus = 'old';
    recencyWarning = `⚠️ This appears to be about a past incident. Latest related news is from ${latestEvidenceDate?.toLocaleDateString('en-IN')} (${daysSinceLatestEvidence} days ago).`;
  }
  
  return {
    isCurrentEvent,
    isOldNews,
    recencyStatus,
    daysSinceLatestEvidence,
    latestEvidenceDate,
    avgEvidenceAgeDays,
    recencyWarning,
    claimSuggestsCurrent,
    claimSuggestsPast
  };
}

/**
 * Combine signals: scrapers -> image-checker -> Gemini NLI -> Gemini explanation
 * Returns { status, confidence, evidence, priority, explanations: {en, hi, mr}, recency }
 */
export async function verifyClaim(claim) {
  const text = claim.text || '';
  let status = 'unconfirmed';
  let confidence = 0.3;
  let priority = 1;
  const evidence = [];
  let nli = null;

  console.log(`[Verification] Starting verification for claim: "${text.slice(0, 100)}..."`);

  // 1) Call scrapers for evidence
  if (SCRAPER_URL) {
    try {
      console.log(`[Verification] Calling scraper: ${SCRAPER_URL}`);
      const resp = await axios.get(SCRAPER_URL, { params: { q: text }, timeout: 10_000 });
      if (resp.data && resp.data.results) {
        resp.data.results.slice(0, GEMINI_MAX_EVIDENCE).forEach(r => {
          evidence.push({ 
            source: r.source || 'official', 
            url: r.url, 
            snippet: r.snippet || r.title, 
            date: r.published_at || null 
          });
        });
        console.log(`[Verification] Scraper returned ${evidence.length} results`);
      }
    } catch (e) {
      console.warn('[Verification] Scraper call failed:', e.message);
    }
  }

  // 2) Image-checker if media present
  if (IMAGE_CHECKER_URL && claim.media && claim.media.length) {
    try {
      console.log(`[Verification] Calling image-checker for ${claim.media.length} images`);
      const imgResp = await axios.post(IMAGE_CHECKER_URL, { urls: claim.media }, { timeout: 15_000 });
      if (imgResp.data && imgResp.data.matches && imgResp.data.matches.length) {
        imgResp.data.matches.forEach(m => {
          evidence.unshift({ 
            source: 'image-match', 
            url: m.url || m.id || null, 
            snippet: m.meta?.desc || 'Matched known image from database', 
            date: m.meta?.date || null 
          });
        });
        console.log(`[Verification] Image-checker found ${imgResp.data.matches.length} matches`);
      }
    } catch (e) {
      console.warn('[Verification] Image-checker failed:', e.message);
    }
  }

  // 3) Call Gemini for NLI verdict (works with or without evidence)
  try {
    console.log(`[Verification] Calling Gemini NLI with ${evidence.length} evidence items`);
    const topEvidence = evidence.slice(0, GEMINI_MAX_EVIDENCE);
    const prompt = buildNliPrompt(text, topEvidence);
    const gen = await generateText(prompt, { temperature: 0.1, max_tokens: 1200 });  // Increased tokens
    
    // Check for errors first
    if (!gen || !gen.text) {
      console.warn('[Verification] Gemini returned empty response');
    } else {
      // Parse JSON response
      let parsed = null;
      try {
        // Try direct parse first
        parsed = JSON.parse(gen.text);
        
        // Check if it's an error response
        if (parsed.error) {
          console.warn(`[Verification] Gemini error: ${parsed.error} - ${parsed.reason || ''}`);
          parsed = null;
        }
      } catch (err) {
        // Extract JSON from response if wrapped in text
        const jsonMatch = gen.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error) {
              console.warn(`[Verification] Gemini error in extracted JSON: ${parsed.error}`);
              parsed = null;
            }
          } catch (e) {
            console.warn('[Verification] Could not parse JSON from Gemini response:', gen.text.slice(0, 200));
          }
        }
      }
      
      if (parsed && parsed.verdict) {
        nli = parsed;
        // Map verdict to status
        if (parsed.verdict === 'confirmed' || parsed.verdict === 'likely_true') {
          status = 'confirmed';
        } else if (parsed.verdict === 'contradicted' || parsed.verdict === 'likely_false') {
          status = 'contradicted';
        } else {
          status = 'unconfirmed';
        }
        confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
        console.log(`[Verification] Gemini verdict: ${status} (confidence: ${confidence})`);
        
        // Add any evidence from Gemini's analysis
        if (parsed.evidence_used && Array.isArray(parsed.evidence_used)) {
          parsed.evidence_used.forEach(eu => {
            if (eu.url && !evidence.find(x => x.url === eu.url)) {
              evidence.push({ source: 'ai-analysis', url: eu.url, snippet: eu.excerpt || '', date: null });
            }
          });
        }
      } else {
        console.warn('[Verification] Gemini NLI returned invalid result, using fallback');
      }
    }
  } catch (err) {
    console.warn('[Verification] Gemini NLI error:', err?.message || err);
  }

  // 4) If no NLI result, try direct analysis for AI insights
  if (!nli) {
    try {
      console.log('[Verification] Trying direct AI analysis...');
      const directPrompt = buildDirectAnalysisPrompt(text);
      const directGen = await generateText(directPrompt, { temperature: 0.2, max_tokens: 500 });
      
      let directParsed = null;
      try {
        directParsed = JSON.parse(directGen.text);
      } catch (e) {
        const jsonMatch = directGen.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) directParsed = JSON.parse(jsonMatch[0]);
      }
      
      if (directParsed && directParsed.verdict) {
        nli = directParsed;
        if (directParsed.verdict === 'likely_true') {
          status = 'confirmed';
          confidence = Math.min(directParsed.confidence || 0.7, 0.85);
        } else if (directParsed.verdict === 'likely_false') {
          status = 'contradicted';
          confidence = Math.min(directParsed.confidence || 0.6, 0.8);
        } else {
          status = 'unconfirmed';
          confidence = directParsed.confidence || 0.5;
        }
        console.log(`[Verification] Direct analysis: ${directParsed.verdict} -> ${status}`);
      }
    } catch (e) {
      console.warn('[Verification] Direct analysis failed:', e.message);
    }
  }

  // 5) Smart local fallback when AI fails - analyze claim vs evidence
  if (!nli) {
    console.log('[Verification] Using smart local analysis fallback...');
    const localAnalysis = analyzeClaimLocally(text, evidence);
    status = localAnalysis.status;
    confidence = localAnalysis.confidence;
    nli = {
      verdict: status,
      rationale: localAnalysis.rationale,
      analysis: localAnalysis.analysis
    };
    console.log(`[Verification] Local analysis: ${status} (${confidence})`);
  }

  // 5.5) Analyze recency of evidence vs claim
  const recency = analyzeRecency(text, evidence, claim.created_at);
  console.log(`[Verification] Recency analysis: ${recency.recencyStatus}, days since latest evidence: ${recency.daysSinceLatestEvidence}`);
  
  // Adjust confidence and status based on recency
  if (recency.isOldNews && recency.claimSuggestsCurrent) {
    // Claim says "today/now" but evidence is old - this is likely misinformation (reshared old news)
    if (status === 'confirmed') {
      status = 'contradicted';
      confidence = Math.max(0.7, confidence);
      nli.recencyIssue = 'old_news_reshared';
      nli.rationale = (nli.rationale || '') + ' However, this appears to be OLD NEWS being reshared as current. The evidence is from ' + recency.daysSinceLatestEvidence + ' days ago.';
    }
    priority = Math.max(priority, 7); // High priority - potential misinformation
  } else if (recency.isOldNews && status === 'confirmed') {
    // Old but confirmed - reduce confidence slightly
    confidence = Math.max(0.5, confidence - 0.15);
    nli.recencyNote = 'past_event';
  }

  // 6) Heuristic fallback: if image evidence exists strongly
  if (evidence.some(e => e.source === 'image-match')) {
    status = 'contradicted';
    confidence = Math.max(confidence, 0.85);
    priority = Math.max(priority, 8);
  }

  // 7) Compute priority based on keywords
  const harmKeywords = ['flood', 'collapsed', 'evacuate', 'fire', 'derail', 'riot', 'death', 'injured', 'bleeding', 'emergency', 'accident'];
  const containsHarm = harmKeywords.some(k => text.toLowerCase().includes(k));
  priority = Math.max(priority, containsHarm ? 8 : 3);
  if (confidence > 0.8) priority = Math.max(priority, 7);

  // 8) Generate multilingual explanations
  const explanations = {};
  try {
    // Build context-aware explanation based on NLI results
    const analysisContext = nli?.analysis || nli?.rationale || '';
    const evidenceSummary = evidence.slice(0, 3).map(e => e.snippet || e.url).filter(Boolean).join('; ');
    
    // Generate contextual explanations
    explanations.en = generateContextualExplanation(text, status, confidence, analysisContext, evidenceSummary, 'en');
    explanations.hi = generateContextualExplanation(text, status, confidence, analysisContext, evidenceSummary, 'hi');
    explanations.mr = generateContextualExplanation(text, status, confidence, analysisContext, evidenceSummary, 'mr');
    
    console.log('[Verification] Generated contextual explanations');
  } catch (langErr) {
    console.warn(`[Verification] Failed to generate explanation:`, langErr.message);
    // Provide fallback explanations
    explanations.en = getDefaultExplanation(status, 'en');
    explanations.hi = getDefaultExplanation(status, 'hi');
    explanations.mr = getDefaultExplanation(status, 'mr');
  }

  console.log(`[Verification] Complete. Status: ${status}, Confidence: ${confidence}, Priority: ${priority}, Recency: ${recency.recencyStatus}`);

  return {
    status,
    confidence,
    evidence,
    priority,
    explanations,
    nli,
    recency: {
      status: recency.recencyStatus,
      isCurrentEvent: recency.isCurrentEvent,
      isOldNews: recency.isOldNews,
      daysSinceLatestEvidence: recency.daysSinceLatestEvidence,
      latestEvidenceDate: recency.latestEvidenceDate,
      warning: recency.recencyWarning
    }
  };
}

function getDefaultExplanation(status, lang) {
  const messages = {
    en: {
      confirmed: '✅ This claim appears to be TRUE based on our analysis. Please verify with official sources before sharing.',
      contradicted: '❌ This claim appears to be FALSE. Please do not share unverified information.',
      unconfirmed: '⚠️ This claim could not be verified. We recommend checking official sources before sharing.'
    },
    hi: {
      confirmed: '✅ यह दावा हमारे विश्लेषण के आधार पर सही प्रतीत होता है। साझा करने से पहले आधिकारिक स्रोतों से सत्यापित करें।',
      contradicted: '❌ यह दावा गलत प्रतीत होता है। कृपया असत्यापित जानकारी साझा न करें।',
      unconfirmed: '⚠️ इस दावे की पुष्टि नहीं हो सकी। साझा करने से पहले आधिकारिक स्रोतों की जाँच करें।'
    },
    mr: {
      confirmed: '✅ हा दावा आमच्या विश्लेषणानुसार खरा दिसतो. शेअर करण्यापूर्वी अधिकृत स्रोतांकडून खात्री करा.',
      contradicted: '❌ हा दावा खोटा दिसतो. कृपया असत्यापित माहिती शेअर करू नका.',
      unconfirmed: '⚠️ या दाव्याची पुष्टी होऊ शकली नाही. शेअर करण्यापूर्वी अधिकृत स्रोत तपासा.'
    }
  };
  return messages[lang]?.[status] || messages.en[status] || messages.en.unconfirmed;
}

/**
 * Generate contextual multilingual explanations
 */
function generateContextualExplanation(claimText, status, confidence, analysisContext, evidenceSummary, lang) {
  const confidencePct = Math.round(confidence * 100);
  const shortClaim = claimText.length > 80 ? claimText.slice(0, 80) + '...' : claimText;
  
  const templates = {
    en: {
      confirmed: `✅ VERIFIED (${confidencePct}% confidence)

📝 Claim: "${shortClaim}"

✓ This claim appears to be ACCURATE based on our analysis.
${analysisContext ? `\n💡 Analysis: ${analysisContext}` : ''}
${evidenceSummary ? `\n📰 Sources: ${evidenceSummary.slice(0, 150)}...` : ''}

✅ This information can be shared with caution. Always cross-verify with official sources like BMC, Mumbai Police, or Indian Railways.`,

      contradicted: `❌ FALSE/MISLEADING (${confidencePct}% confidence)

📝 Claim: "${shortClaim}"

⚠️ This claim appears to be FALSE or MISLEADING.
${analysisContext ? `\n💡 Analysis: ${analysisContext}` : ''}
${evidenceSummary ? `\n📰 Counter-evidence: ${evidenceSummary.slice(0, 150)}...` : ''}

🚫 DO NOT SHARE this misinformation. Report similar posts to prevent panic.
📞 For emergencies, contact: BMC 1916 | Police 100`,

      unconfirmed: `⚠️ UNVERIFIED (${confidencePct}% confidence)

📝 Claim: "${shortClaim}"

🔍 This claim could NOT be verified from official sources.
${analysisContext ? `\n💡 Analysis: ${analysisContext}` : ''}

⏳ Wait for official confirmation before sharing.
📱 Check: @mybmc | @MumbaiPolice | @WesternRly | @Central_Railway`
    },
    hi: {
      confirmed: `✅ सत्यापित (${confidencePct}% विश्वास)

📝 दावा: "${shortClaim}"

✓ यह दावा हमारे विश्लेषण के आधार पर सही प्रतीत होता है।
${analysisContext ? `\n💡 विश्लेषण: ${analysisContext}` : ''}

✅ यह जानकारी सावधानी से साझा की जा सकती है। बीएमसी, मुंबई पुलिस से हमेशा जाँच करें।`,

      contradicted: `❌ झूठा/भ्रामक (${confidencePct}% विश्वास)

📝 दावा: "${shortClaim}"

⚠️ यह दावा झूठा या भ्रामक प्रतीत होता है।
${analysisContext ? `\n💡 विश्लेषण: ${analysisContext}` : ''}

🚫 यह गलत सूचना साझा न करें। ऐसी पोस्ट की रिपोर्ट करें।
📞 आपातकाल: BMC 1916 | पुलिस 100`,

      unconfirmed: `⚠️ असत्यापित (${confidencePct}% विश्वास)

📝 दावा: "${shortClaim}"

🔍 इस दावे की आधिकारिक स्रोतों से पुष्टि नहीं हो सकी।
${analysisContext ? `\n💡 विश्लेषण: ${analysisContext}` : ''}

⏳ साझा करने से पहले आधिकारिक पुष्टि की प्रतीक्षा करें।`
    },
    mr: {
      confirmed: `✅ सत्यापित (${confidencePct}% विश्वास)

📝 दावा: "${shortClaim}"

✓ हा दावा आमच्या विश्लेषणानुसार बरोबर दिसतो.
${analysisContext ? `\n💡 विश्लेषण: ${analysisContext}` : ''}

✅ ही माहिती सावधगिरीने शेअर करता येईल. बीएमसी, मुंबई पोलिसांकडून खात्री करा.`,

      contradicted: `❌ खोटे/दिशाभूल करणारे (${confidencePct}% विश्वास)

📝 दावा: "${shortClaim}"

⚠️ हा दावा खोटा किंवा दिशाभूल करणारा दिसतो.
${analysisContext ? `\n💡 विश्लेषण: ${analysisContext}` : ''}

🚫 ही चुकीची माहिती शेअर करू नका. अशा पोस्टची तक्रार करा.
📞 आणीबाणी: BMC 1916 | पोलीस 100`,

      unconfirmed: `⚠️ असत्यापित (${confidencePct}% विश्वास)

📝 दावा: "${shortClaim}"

🔍 या दाव्याची अधिकृत स्रोतांकडून पुष्टी होऊ शकली नाही.
${analysisContext ? `\n💡 विश्लेषण: ${analysisContext}` : ''}

⏳ शेअर करण्यापूर्वी अधिकृत पुष्टीची वाट पहा.`
    }
  };
  
  return templates[lang]?.[status] || templates.en[status] || templates.en.unconfirmed;
}

/**
 * Smart local analysis when AI is unavailable
 * Analyzes claim text against evidence and known patterns
 */
function analyzeClaimLocally(claimText, evidence) {
  const text = claimText.toLowerCase();
  let status = 'unconfirmed';
  let confidence = 0.5;
  let rationale = '';
  let analysis = '';
  
  // Mumbai locations for context
  const mumbaiLocations = ['mumbai', 'bandra', 'andheri', 'dadar', 'kurla', 'thane', 'borivali', 
    'malad', 'goregaon', 'kandivali', 'jogeshwari', 'vile parle', 'santacruz', 'khar',
    'mahim', 'matunga', 'sion', 'wadala', 'chembur', 'ghatkopar', 'vikhroli', 'mulund',
    'powai', 'colaba', 'churchgate', 'cst', 'local train', 'western line', 'central line'];
  
  // Crisis keywords (stems for flexible matching)
  const crisisKeywords = ['flood', 'rain', 'waterlog', 'accident', 'fire', 'collapse', 
    'derail', 'delay', 'suspend', 'block', 'traffic', 'jam', 'emergency', 'disrupt',
    'cancel', 'halt', 'stuck', 'strand', 'chaos', 'crowd', 'rush', 'congest'];
  
  // Misinformation indicators
  const misinfoIndicators = ['breaking', 'urgent', 'share this', 'forward', 'just now',
    'confirmed by sources', 'viral', 'shocking', 'must see', 'don\'t ignore'];
  
  // Helper function for flexible keyword matching (handles word stems)
  const matchesKeyword = (text, keyword) => {
    const regex = new RegExp(keyword, 'i');
    return regex.test(text);
  };
  
  // Check if claim is about Mumbai
  const isMumbaiRelated = mumbaiLocations.some(loc => text.includes(loc));
  const isCrisisRelated = crisisKeywords.some(kw => matchesKeyword(text, kw));
  const hasMisinfoIndicators = misinfoIndicators.some(ind => text.includes(ind));
  
  // Check evidence relevance - more flexible matching
  const hasRelevantEvidence = evidence.some(e => {
    if (!e.snippet) return false;
    const snippet = e.snippet.toLowerCase();
    const title = (e.title || '').toLowerCase();
    const combined = snippet + ' ' + title;
    
    // Check if evidence mentions similar topics (flexible matching)
    const keywordMatch = crisisKeywords.some(kw => 
      matchesKeyword(text, kw) && matchesKeyword(combined, kw)
    );
    const locationMatch = mumbaiLocations.some(loc => 
      text.includes(loc) && combined.includes(loc)
    );
    
    return keywordMatch || locationMatch;
  });
  
  // Skip placeholder evidence
  const hasRealEvidence = evidence.some(e => 
    e.snippet && !e.snippet.includes('BMC issues alert for ...') && e.snippet.length > 30
  );
  
  // Determine verdict based on analysis
  if (hasRealEvidence && hasRelevantEvidence) {
    // Evidence found that's relevant
    status = 'confirmed';
    confidence = 0.75;
    rationale = 'Found relevant news reports that support this claim.';
    analysis = `This claim about ${isMumbaiRelated ? 'Mumbai' : 'the area'} has been cross-referenced with recent news sources.`;
  } else if (hasMisinfoIndicators) {
    // High misinformation signals
    status = 'contradicted';
    confidence = 0.65;
    rationale = 'This claim shows patterns commonly associated with misinformation.';
    analysis = 'The claim uses sensational language and urgency tactics often found in viral misinformation.';
  } else if (isCrisisRelated && !hasRealEvidence) {
    // Crisis claim without evidence
    status = 'unconfirmed';
    confidence = 0.4;
    rationale = 'No official sources could confirm this crisis-related claim.';
    analysis = `This ${isCrisisRelated ? 'emergency/crisis' : ''} claim could not be verified. Check official sources like BMC (@mybaboromlvbmobmc) or Mumbai Police (@MumbaiPolice).`;
  } else if (isMumbaiRelated && hasRealEvidence) {
    // Mumbai-related with some evidence
    status = 'unconfirmed';
    confidence = 0.55;
    rationale = 'Some related news found but cannot fully confirm the specific claim.';
    analysis = 'Related news coverage exists but the specific details in this claim need verification.';
  } else {
    // Default case
    status = 'unconfirmed';
    confidence = 0.3;
    rationale = 'Insufficient information to verify this claim.';
    analysis = 'We recommend waiting for official confirmation before sharing this claim.';
  }
  
  return { status, confidence, rationale, analysis };
}
