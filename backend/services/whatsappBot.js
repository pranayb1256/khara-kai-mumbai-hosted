// backend/services/whatsappBot.js
import twilio from 'twilio';
import { supabase } from '../config/supabaseClient.js';
import { addToQueue } from '../queue/claimqueue.js';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

let twilioClient = null;

if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
  console.log('[WhatsApp] Twilio client initialized');
} else {
  console.warn('[WhatsApp] Twilio credentials not configured. WhatsApp bot disabled.');
}

// Store user sessions for tracking submissions
const userSessions = new Map();

// Keywords that trigger fact-check requests
const TRIGGER_KEYWORDS = [
  'verify', 'check', 'true', 'fake', 'real', 'rumor', 'rumour',
  'सच', 'झूठ', 'जांच', 'पता', 'खबर',
  'खरं', 'खोटं', 'तपासा', 'बातमी'
];

// Welcome message template
const WELCOME_MESSAGE = `🛡️ *Khara Kai Mumbai* - Truth Guardian

Welcome! I help verify Mumbai news and rumors.

*How to use:*
📝 Send any claim/rumor you want verified
📸 Send image with text to check if it's old/fake
🔍 I'll search news sources and verify

*Example:*
"Is it true there's flooding at Dadar station?"

*Commands:*
• "status" - Check your last submission
• "help" - Show this message

Reply with a claim to verify! 🔎`;

// Response templates
const RESPONSES = {
  received: (claimId) => `✅ *Received!*

Your claim has been submitted for verification.
🔍 Claim ID: \`${claimId.slice(0, 8)}\`

I'm checking multiple news sources and will update you soon (usually within 2 minutes).

Reply "status" to check progress.`,

  verified_confirmed: (claim) => `✅ *VERIFIED - TRUE*

${claim.text.slice(0, 200)}${claim.text.length > 200 ? '...' : ''}

📊 *Confidence:* ${Math.round(claim.confidence * 100)}%
📰 *Sources:* ${claim.evidence?.length || 0} found

${claim.explanations?.en?.slice(0, 300) || 'Claim appears to be accurate based on news sources.'}

${claim.extracted?.recency?.isOldNews ? '⚠️ Note: This is old news being reshared.' : ''}`,

  verified_contradicted: (claim) => `❌ *LIKELY FALSE / MISLEADING*

${claim.text.slice(0, 200)}${claim.text.length > 200 ? '...' : ''}

📊 *Confidence:* ${Math.round(claim.confidence * 100)}%
📰 *Sources checked:* ${claim.evidence?.length || 0}

${claim.explanations?.en?.slice(0, 300) || 'This claim appears to contradict verified news sources.'}

⚠️ *Please do not share misinformation!*`,

  verified_unconfirmed: (claim) => `❓ *UNVERIFIED*

${claim.text.slice(0, 200)}${claim.text.length > 200 ? '...' : ''}

📊 We couldn't find enough evidence to confirm or deny this claim.

💡 *Recommendation:* Wait for official sources before sharing.`,

  pending: (claim) => `⏳ *Still Checking...*

Your claim is being verified.
🔍 Claim ID: \`${claim.id.slice(0, 8)}\`

Please wait a moment and reply "status" again.`,

  error: `❌ Sorry, something went wrong. Please try again later.`,

  help: WELCOME_MESSAGE,

  rate_limited: `⚠️ *Too many requests!*

Please wait a few minutes before submitting another claim.
This helps us serve everyone fairly.`,
};

/**
 * Process incoming WhatsApp message
 */
export async function processWhatsAppMessage(from, body, mediaUrl = null) {
  const userId = from.replace('whatsapp:', '');
  const message = body?.trim().toLowerCase() || '';
  
  console.log(`[WhatsApp] Message from ${userId}: ${body?.slice(0, 50)}...`);

  // Check for commands
  if (message === 'help' || message === 'hi' || message === 'hello' || message === 'start') {
    return RESPONSES.help;
  }

  if (message === 'status') {
    return await getLastClaimStatus(userId);
  }

  // Rate limiting (max 5 claims per hour)
  const session = userSessions.get(userId) || { claims: [], lastActivity: Date.now() };
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  session.claims = session.claims.filter(t => t > oneHourAgo);
  
  if (session.claims.length >= 5) {
    return RESPONSES.rate_limited;
  }

  // Check if message looks like a claim
  if (body && body.length > 10) {
    try {
      // Create claim in database
      const claimData = {
        text: body.trim(),
        source: 'whatsapp',
        source_id: userId,
        status: 'pending',
        media: mediaUrl ? [mediaUrl] : [],
        extracted: {
          whatsapp_user: userId,
          submitted_at: new Date().toISOString()
        }
      };

      const { data: claim, error } = await supabase
        .from('claims')
        .insert(claimData)
        .select()
        .single();

      if (error) {
        console.error('[WhatsApp] Supabase error:', error);
        return RESPONSES.error;
      }

      // Add to verification queue
      await addToQueue({ claimId: claim.id });

      // Update session
      session.claims.push(Date.now());
      session.lastClaimId = claim.id;
      userSessions.set(userId, session);

      console.log(`[WhatsApp] Created claim ${claim.id} from ${userId}`);
      return RESPONSES.received(claim.id);

    } catch (err) {
      console.error('[WhatsApp] Error processing claim:', err);
      return RESPONSES.error;
    }
  }

  // Message too short
  return `Please send a complete claim or rumor to verify.\n\nExample: "Is it true that trains are delayed at Dadar due to flooding?"`;
}

/**
 * Get status of user's last claim
 */
async function getLastClaimStatus(userId) {
  const session = userSessions.get(userId);
  
  if (!session?.lastClaimId) {
    return `You haven't submitted any claims yet.\n\nSend a claim to verify!`;
  }

  try {
    const { data: claim, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', session.lastClaimId)
      .single();

    if (error || !claim) {
      return RESPONSES.error;
    }

    switch (claim.status) {
      case 'confirmed':
        return RESPONSES.verified_confirmed(claim);
      case 'contradicted':
        return RESPONSES.verified_contradicted(claim);
      case 'unconfirmed':
        return RESPONSES.verified_unconfirmed(claim);
      case 'pending':
      case 'in_progress':
        return RESPONSES.pending(claim);
      default:
        return RESPONSES.pending(claim);
    }
  } catch (err) {
    console.error('[WhatsApp] Error getting claim status:', err);
    return RESPONSES.error;
  }
}

/**
 * Send WhatsApp message via Twilio
 */
export async function sendWhatsAppMessage(to, message) {
  if (!twilioClient) {
    console.warn('[WhatsApp] Twilio not configured, cannot send message');
    return false;
  }

  try {
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    await twilioClient.messages.create({
      body: message,
      from: whatsappNumber,
      to: toNumber
    });

    console.log(`[WhatsApp] Sent message to ${to}`);
    return true;
  } catch (err) {
    console.error('[WhatsApp] Error sending message:', err);
    return false;
  }
}

/**
 * Send verification result to user
 */
export async function notifyVerificationComplete(claimId) {
  try {
    const { data: claim, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (error || !claim) return;

    // Only notify WhatsApp users
    if (claim.source !== 'whatsapp' || !claim.extracted?.whatsapp_user) return;

    const userId = claim.extracted.whatsapp_user;
    let message;

    switch (claim.status) {
      case 'confirmed':
        message = RESPONSES.verified_confirmed(claim);
        break;
      case 'contradicted':
        message = RESPONSES.verified_contradicted(claim);
        break;
      default:
        message = RESPONSES.verified_unconfirmed(claim);
    }

    await sendWhatsAppMessage(userId, message);
    console.log(`[WhatsApp] Notified ${userId} about claim ${claimId}`);

  } catch (err) {
    console.error('[WhatsApp] Error notifying user:', err);
  }
}

export default {
  processWhatsAppMessage,
  sendWhatsAppMessage,
  notifyVerificationComplete
};
