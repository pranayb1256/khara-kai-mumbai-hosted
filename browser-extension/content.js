// Khara Kai Mumbai - Content Script
// Injects verification widget into web pages

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.kharaKaiMumbaiInjected) return;
  window.kharaKaiMumbaiInjected = true;
  
  // Widget container
  let widgetContainer = null;
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showVerificationWidget') {
      showWidget(request);
    }
    sendResponse({ received: true });
  });
  
  // Create and show the verification widget
  function showWidget(data) {
    // Remove existing widget
    if (widgetContainer) {
      widgetContainer.remove();
    }
    
    // Create widget container
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'kkm-verification-widget';
    widgetContainer.className = 'kkm-widget';
    
    // Set widget content based on status
    if (data.status === 'loading') {
      widgetContainer.innerHTML = createLoadingContent(data.claim);
    } else if (data.status === 'complete') {
      widgetContainer.innerHTML = createResultContent(data.claim, data.result);
    } else if (data.status === 'error') {
      widgetContainer.innerHTML = createErrorContent(data.claim, data.error);
    }
    
    // Add to page
    document.body.appendChild(widgetContainer);
    
    // Animate in
    requestAnimationFrame(() => {
      widgetContainer.classList.add('kkm-widget-visible');
    });
    
    // Setup close button
    const closeBtn = widgetContainer.querySelector('.kkm-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideWidget);
    }
    
    // Auto-hide after 30 seconds for results
    if (data.status === 'complete' || data.status === 'error') {
      setTimeout(hideWidget, 30000);
    }
  }
  
  // Hide widget
  function hideWidget() {
    if (widgetContainer) {
      widgetContainer.classList.remove('kkm-widget-visible');
      setTimeout(() => {
        widgetContainer?.remove();
        widgetContainer = null;
      }, 300);
    }
  }
  
  // Create loading content
  function createLoadingContent(claim) {
    return `
      <div class="kkm-header">
        <div class="kkm-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="#FF6B00"/>
            <path d="M12 6l5.5 3v6L12 18l-5.5-3V9L12 6z" fill="white"/>
            <path d="M10 11l2 2 4-4" stroke="#FF6B00" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Khara Kai Mumbai</span>
        </div>
        <button class="kkm-close">×</button>
      </div>
      <div class="kkm-body">
        <div class="kkm-loader">
          <div class="kkm-spinner"></div>
        </div>
        <p class="kkm-status-text">Verifying claim...</p>
        <p class="kkm-claim-preview">${escapeHtml(claim?.substring(0, 100))}${claim?.length > 100 ? '...' : ''}</p>
      </div>
    `;
  }
  
  // Create result content
  function createResultContent(claim, result) {
    const verdict = result.verdict || 'unverified';
    const confidence = result.confidence || 0;
    const analysis = result.analysis || result.explanation || 'No analysis available';
    
    const verdictConfig = {
      verified: { label: 'Verified', icon: '✓', class: 'kkm-verified' },
      fake: { label: 'Likely False', icon: '✕', class: 'kkm-fake' },
      misleading: { label: 'Misleading', icon: '⚠', class: 'kkm-fake' },
      unverified: { label: 'Unverified', icon: '?', class: 'kkm-unverified' }
    };
    
    const config = verdictConfig[verdict] || verdictConfig.unverified;
    
    // Special handling for image analysis
    if (result.imageAnalysis) {
      return createImageResultContent(result, config);
    }
    
    return `
      <div class="kkm-header">
        <div class="kkm-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="#FF6B00"/>
            <path d="M12 6l5.5 3v6L12 18l-5.5-3V9L12 6z" fill="white"/>
            <path d="M10 11l2 2 4-4" stroke="#FF6B00" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Khara Kai Mumbai</span>
        </div>
        <button class="kkm-close">×</button>
      </div>
      <div class="kkm-body">
        <div class="kkm-verdict ${config.class}">
          <span class="kkm-verdict-icon">${config.icon}</span>
          <span class="kkm-verdict-label">${config.label}</span>
        </div>
        <div class="kkm-confidence">
          <div class="kkm-confidence-bar">
            <div class="kkm-confidence-fill" style="width: ${confidence}%"></div>
          </div>
          <span class="kkm-confidence-text">${confidence}% confidence</span>
        </div>
        <p class="kkm-analysis">${escapeHtml(analysis)}</p>
        <div class="kkm-actions">
          <a href="http://localhost:3000" target="_blank" class="kkm-btn-secondary">View Details</a>
          <button class="kkm-btn-primary kkm-share-btn">Share</button>
        </div>
      </div>
    `;
  }
  
  // Create image analysis result content
  function createImageResultContent(result, config) {
    const indicators = result.manipulationIndicators || [];
    
    return `
      <div class="kkm-header">
        <div class="kkm-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="#FF6B00"/>
            <path d="M12 6l5.5 3v6L12 18l-5.5-3V9L12 6z" fill="white"/>
            <path d="M10 11l2 2 4-4" stroke="#FF6B00" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Image Analysis</span>
        </div>
        <button class="kkm-close">×</button>
      </div>
      <div class="kkm-body">
        <div class="kkm-verdict ${config.class}">
          <span class="kkm-verdict-icon">${config.icon}</span>
          <span class="kkm-verdict-label">${result.verdict === 'verified' ? 'Authentic Image' : 'Potentially Manipulated'}</span>
        </div>
        <div class="kkm-confidence">
          <div class="kkm-confidence-bar">
            <div class="kkm-confidence-fill" style="width: ${result.confidence}%"></div>
          </div>
          <span class="kkm-confidence-text">${result.confidence}% confidence</span>
        </div>
        ${indicators.length > 0 ? `
          <div class="kkm-indicators">
            <p class="kkm-indicators-title">Manipulation Indicators:</p>
            <ul class="kkm-indicators-list">
              ${indicators.map(ind => `<li>${escapeHtml(ind)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        <p class="kkm-analysis">${escapeHtml(result.analysis)}</p>
      </div>
    `;
  }
  
  // Create error content
  function createErrorContent(claim, error) {
    return `
      <div class="kkm-header">
        <div class="kkm-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="#FF6B00"/>
            <path d="M12 6l5.5 3v6L12 18l-5.5-3V9L12 6z" fill="white"/>
            <path d="M10 11l2 2 4-4" stroke="#FF6B00" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Khara Kai Mumbai</span>
        </div>
        <button class="kkm-close">×</button>
      </div>
      <div class="kkm-body">
        <div class="kkm-error">
          <span class="kkm-error-icon">⚠</span>
          <p>${escapeHtml(error)}</p>
        </div>
        <button class="kkm-btn-primary kkm-retry-btn">Try Again</button>
      </div>
    `;
  }
  
  // Utility: Escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Add keyboard shortcut (Ctrl+Shift+V) to verify selected text
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
      const selection = window.getSelection().toString().trim();
      if (selection) {
        chrome.runtime.sendMessage({ action: 'verify', text: selection });
      }
    }
  });
  
  console.log('Khara Kai Mumbai content script loaded');
})();
