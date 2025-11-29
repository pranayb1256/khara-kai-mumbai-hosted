// Khara Kai Mumbai - Background Service Worker

const API_BASE_URL = 'http://localhost:4000/api';

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for selected text
  chrome.contextMenus.create({
    id: 'verify-selection',
    title: 'Verify with Khara Kai Mumbai',
    contexts: ['selection']
  });
  
  // Create context menu for links
  chrome.contextMenus.create({
    id: 'verify-link',
    title: 'Verify this link',
    contexts: ['link']
  });
  
  // Create context menu for images
  chrome.contextMenus.create({
    id: 'verify-image',
    title: 'Check image authenticity',
    contexts: ['image']
  });
  
  console.log('Khara Kai Mumbai extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'verify-selection':
      await verifyText(info.selectionText, tab);
      break;
    case 'verify-link':
      await verifyLink(info.linkUrl, tab);
      break;
    case 'verify-image':
      await verifyImage(info.srcUrl, tab);
      break;
  }
});

// Verify selected text
async function verifyText(text, tab) {
  if (!text || text.trim().length === 0) {
    showNotification('Please select some text to verify');
    return;
  }
  
  // Send message to content script to show loading
  chrome.tabs.sendMessage(tab.id, { 
    action: 'showVerificationWidget',
    status: 'loading',
    claim: text
  });
  
  try {
    const response = await fetch(`${API_BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: text,
        source: 'browser_extension',
        platform: 'context_menu',
        sourceUrl: tab.url
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit claim');
    }
    
    const data = await response.json();
    
    // Poll for result
    const result = await pollForResult(data.data.id);
    
    // Send result to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'showVerificationWidget',
      status: 'complete',
      claim: text,
      result: result
    });
    
    // Save to history
    saveVerification(text, result);
    
  } catch (error) {
    console.error('Verification error:', error);
    chrome.tabs.sendMessage(tab.id, {
      action: 'showVerificationWidget',
      status: 'error',
      claim: text,
      error: 'Failed to verify. Please try again.'
    });
  }
}

// Verify link
async function verifyLink(url, tab) {
  // For now, extract title and verify
  chrome.tabs.sendMessage(tab.id, {
    action: 'showVerificationWidget',
    status: 'loading',
    claim: `Link: ${url}`
  });
  
  try {
    const response = await fetch(`${API_BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: `Verify this link: ${url}`,
        source: 'browser_extension',
        platform: 'link_verification',
        sourceUrl: url
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit');
    }
    
    const data = await response.json();
    const result = await pollForResult(data.data.id);
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'showVerificationWidget',
      status: 'complete',
      claim: `Link verification`,
      result: result
    });
    
  } catch (error) {
    console.error('Link verification error:', error);
    chrome.tabs.sendMessage(tab.id, {
      action: 'showVerificationWidget',
      status: 'error',
      claim: `Link: ${url}`,
      error: 'Failed to verify link'
    });
  }
}

// Verify image (deepfake detection)
async function verifyImage(imageUrl, tab) {
  chrome.tabs.sendMessage(tab.id, {
    action: 'showVerificationWidget',
    status: 'loading',
    claim: 'Checking image authenticity...'
  });
  
  try {
    // Call deepfake detection service
    const response = await fetch('http://localhost:8005/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl
      })
    });
    
    if (!response.ok) {
      throw new Error('Image analysis failed');
    }
    
    const result = await response.json();
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'showVerificationWidget',
      status: 'complete',
      claim: 'Image Analysis',
      result: {
        verdict: result.is_authentic ? 'verified' : 'fake',
        confidence: result.confidence,
        analysis: result.analysis || 'Image analysis complete',
        imageAnalysis: true,
        manipulationIndicators: result.manipulation_indicators || []
      }
    });
    
  } catch (error) {
    console.error('Image verification error:', error);
    chrome.tabs.sendMessage(tab.id, {
      action: 'showVerificationWidget',
      status: 'error',
      claim: 'Image Analysis',
      error: 'Image analysis service unavailable'
    });
  }
}

// Poll for verification result
async function pollForResult(claimId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(2000);
    
    try {
      const response = await fetch(`${API_BASE_URL}/claims/${claimId}`);
      const data = await response.json();
      
      if (data.data.status === 'verified' || data.data.status === 'failed') {
        return data.data;
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  }
  
  return {
    verdict: 'unverified',
    confidence: 0,
    analysis: 'Verification timed out'
  };
}

// Save verification to storage
async function saveVerification(claim, result) {
  chrome.storage.local.get(['history', 'stats'], (data) => {
    // Update history
    const history = data.history || [];
    history.unshift({
      id: Date.now(),
      claim: claim.substring(0, 100),
      verdict: result.verdict || 'unverified',
      timestamp: new Date().toISOString()
    });
    
    if (history.length > 20) history.pop();
    
    // Update stats
    const stats = data.stats || { verified: 0, fake: 0, total: 0 };
    stats.total++;
    if (result.verdict === 'verified') stats.verified++;
    if (result.verdict === 'fake' || result.verdict === 'misleading') stats.fake++;
    
    chrome.storage.local.set({ history, stats });
  });
}

// Show notification
function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Khara Kai Mumbai',
    message: message
  });
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'verify':
      verifyText(request.text, sender.tab).then(() => sendResponse({ success: true }));
      return true;
      
    case 'getStats':
      chrome.storage.local.get(['stats'], (data) => {
        sendResponse(data.stats || { verified: 0, fake: 0, total: 0 });
      });
      return true;
      
    case 'checkStatus':
      fetch(`${API_BASE_URL}/health`)
        .then(res => res.ok)
        .then(online => sendResponse({ online }))
        .catch(() => sendResponse({ online: false }));
      return true;
  }
});

// Utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
