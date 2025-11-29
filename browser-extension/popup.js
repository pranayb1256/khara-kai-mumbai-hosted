// Khara Kai Mumbai - Browser Extension Popup Script

const API_BASE_URL = 'http://localhost:4000/api';

// DOM Elements
const elements = {
  claimInput: document.getElementById('claimInput'),
  verifyBtn: document.getElementById('verifyBtn'),
  resultSection: document.getElementById('resultSection'),
  resultContent: document.getElementById('resultContent'),
  closeResult: document.getElementById('closeResult'),
  recentList: document.getElementById('recentList'),
  clearHistory: document.getElementById('clearHistory'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  statusBadge: document.getElementById('statusBadge'),
  totalVerified: document.getElementById('totalVerified'),
  fakeDetected: document.getElementById('fakeDetected'),
  accuracy: document.getElementById('accuracy'),
  openDashboard: document.getElementById('openDashboard'),
  settings: document.getElementById('settings')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadRecentChecks();
  loadStats();
  checkAPIStatus();
  setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
  elements.verifyBtn.addEventListener('click', handleVerify);
  elements.closeResult.addEventListener('click', hideResult);
  elements.clearHistory.addEventListener('click', clearHistory);
  elements.openDashboard.addEventListener('click', openDashboard);
  elements.settings.addEventListener('click', openSettings);
  
  elements.claimInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleVerify();
    }
  });
}

// Verify Claim
async function handleVerify() {
  const claim = elements.claimInput.value.trim();
  
  if (!claim) {
    showNotification('Please enter a claim to verify', 'warning');
    return;
  }
  
  showLoading(true);
  
  try {
    const response = await fetch(`${API_BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: claim,
        source: 'browser_extension',
        platform: 'extension'
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit claim');
    }
    
    const data = await response.json();
    
    // Poll for verification result
    const result = await pollForResult(data.data.id);
    
    displayResult(result);
    saveToHistory(claim, result);
    updateStats(result.verdict);
    
  } catch (error) {
    console.error('Verification error:', error);
    showNotification('Failed to verify. Please try again.', 'error');
  } finally {
    showLoading(false);
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
  
  // Return unverified if timeout
  return {
    verdict: 'unverified',
    confidence: 0,
    analysis: 'Verification timed out. The claim is still being processed.',
    sources: []
  };
}

// Display Result
function displayResult(result) {
  const verdict = result.verdict || 'unverified';
  const confidence = result.confidence || 0;
  const analysis = result.analysis || result.explanation || 'No analysis available';
  const sources = result.sources || [];
  
  const verdictConfig = {
    verified: { label: 'Verified', icon: '✓', color: 'verified' },
    fake: { label: 'Likely False', icon: '✕', color: 'fake' },
    misleading: { label: 'Misleading', icon: '⚠', color: 'fake' },
    unverified: { label: 'Unverified', icon: '?', color: 'unverified' }
  };
  
  const config = verdictConfig[verdict] || verdictConfig.unverified;
  const confidenceColor = confidence >= 70 ? '#22C55E' : confidence >= 40 ? '#F59E0B' : '#EF4444';
  
  elements.resultContent.innerHTML = `
    <div class="verdict">
      <div class="verdict-icon ${config.color}">
        <span style="font-size: 24px;">${config.icon}</span>
      </div>
      <div class="verdict-text">
        <h3 style="color: ${config.color === 'verified' ? '#22C55E' : config.color === 'fake' ? '#EF4444' : '#F59E0B'}">${config.label}</h3>
        <p>${verdict === 'verified' ? 'This claim appears to be accurate' : verdict === 'fake' ? 'This claim appears to be false' : 'Unable to verify this claim'}</p>
      </div>
    </div>
    
    <div class="confidence-bar">
      <div class="confidence-label">
        <span>Confidence</span>
        <span>${confidence}%</span>
      </div>
      <div class="confidence-track">
        <div class="confidence-fill" style="width: ${confidence}%; background: ${confidenceColor};"></div>
      </div>
    </div>
    
    <div class="analysis-summary">
      ${analysis}
    </div>
    
    ${sources.length > 0 ? `
      <div class="sources-list">
        <h4>Sources</h4>
        ${sources.map(source => `
          <a href="${source.url}" target="_blank" class="source-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15,3 21,3 21,9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            ${source.title || source.url}
          </a>
        `).join('')}
      </div>
    ` : ''}
  `;
  
  elements.resultSection.classList.remove('hidden');
}

// Hide Result
function hideResult() {
  elements.resultSection.classList.add('hidden');
}

// Save to History
async function saveToHistory(claim, result) {
  const history = await getFromStorage('history') || [];
  
  history.unshift({
    id: Date.now(),
    claim: claim.substring(0, 100),
    verdict: result.verdict || 'unverified',
    timestamp: new Date().toISOString()
  });
  
  // Keep only last 20 items
  if (history.length > 20) {
    history.pop();
  }
  
  await saveToStorage('history', history);
  loadRecentChecks();
}

// Load Recent Checks
async function loadRecentChecks() {
  const history = await getFromStorage('history') || [];
  
  if (history.length === 0) {
    elements.recentList.innerHTML = `
      <div class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5">
          <path d="M12 8v4l3 3"/>
          <circle cx="12" cy="12" r="9"/>
        </svg>
        <p>No recent checks</p>
      </div>
    `;
    return;
  }
  
  elements.recentList.innerHTML = history.map(item => `
    <div class="recent-item" data-claim="${escapeHtml(item.claim)}">
      <div class="recent-status ${item.verdict}"></div>
      <div class="recent-content">
        <div class="recent-text">${escapeHtml(item.claim)}</div>
        <div class="recent-time">${formatTime(item.timestamp)}</div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', () => {
      elements.claimInput.value = item.dataset.claim;
    });
  });
}

// Clear History
async function clearHistory() {
  await saveToStorage('history', []);
  loadRecentChecks();
  showNotification('History cleared', 'success');
}

// Load Stats
async function loadStats() {
  const stats = await getFromStorage('stats') || {
    verified: 0,
    fake: 0,
    total: 0
  };
  
  elements.totalVerified.textContent = stats.total;
  elements.fakeDetected.textContent = stats.fake;
  elements.accuracy.textContent = stats.total > 0 
    ? `${Math.round((stats.verified / stats.total) * 100)}%` 
    : '--';
}

// Update Stats
async function updateStats(verdict) {
  const stats = await getFromStorage('stats') || {
    verified: 0,
    fake: 0,
    total: 0
  };
  
  stats.total++;
  if (verdict === 'verified') stats.verified++;
  if (verdict === 'fake' || verdict === 'misleading') stats.fake++;
  
  await saveToStorage('stats', stats);
  loadStats();
}

// Check API Status
async function checkAPIStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      elements.statusBadge.innerHTML = `
        <span class="status-dot"></span>
        <span>Live</span>
      `;
      elements.statusBadge.style.background = 'rgba(34, 197, 94, 0.15)';
      elements.statusBadge.style.borderColor = 'rgba(34, 197, 94, 0.3)';
      elements.statusBadge.style.color = '#22C55E';
    }
  } catch (error) {
    elements.statusBadge.innerHTML = `
      <span class="status-dot" style="background: #EF4444; animation: none;"></span>
      <span>Offline</span>
    `;
    elements.statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
    elements.statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    elements.statusBadge.style.color = '#EF4444';
  }
}

// Open Dashboard
function openDashboard(e) {
  e.preventDefault();
  chrome.tabs.create({ url: 'http://localhost:3000' });
}

// Open Settings
function openSettings(e) {
  e.preventDefault();
  // For now, just show notification
  showNotification('Settings coming soon!', 'info');
}

// Show Loading
function showLoading(show) {
  if (show) {
    elements.loadingOverlay.classList.remove('hidden');
    elements.verifyBtn.disabled = true;
  } else {
    elements.loadingOverlay.classList.add('hidden');
    elements.verifyBtn.disabled = false;
  }
}

// Show Notification
function showNotification(message, type = 'info') {
  // Use Chrome notifications API
  chrome.notifications?.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Khara Kai Mumbai',
    message: message
  });
}

// Storage Helpers
async function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

async function saveToStorage(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

// Utility Functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}
