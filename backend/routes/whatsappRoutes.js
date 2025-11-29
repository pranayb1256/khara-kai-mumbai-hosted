// backend/routes/whatsappRoutes.js
import { Router } from 'express';
import { processWhatsAppMessage } from '../services/whatsappBot.js';

const router = Router();
router.post('/webhook', async (req, res) => {
  try {
    const { From, Body, MediaUrl0 } = req.body;
    
    console.log(`[WhatsApp Webhook] Received from ${From}: ${Body?.slice(0, 50)}...`);

    if (!From || !Body) {
      return res.status(400).send('Missing required fields');
    }

    const response = await processWhatsAppMessage(From, Body, MediaUrl0);

    // Send TwiML response
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(response)}</Message>
</Response>`);

  } catch (err) {
    console.error('[WhatsApp Webhook] Error:', err);
    res.status(500).send('Internal server error');
  }
});


router.post('/status', async (req, res) => {
  const { MessageSid, MessageStatus, To } = req.body;
  console.log(`[WhatsApp Status] ${MessageSid} to ${To}: ${MessageStatus}`);
  res.status(200).send('OK');
});


router.get('/health', (req, res) => {
  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  
  res.json({
    status: 'ok',
    twilioConfigured,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Not configured'
  });
});

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default router;
