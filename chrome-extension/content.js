// CareerOS Job Clipper - Content Script

// 1. If running on CareerOS App, sync auth credentials automatically
if (window.location.hostname === 'localhost' || window.location.hostname.includes('career-copilot') || window.location.hostname.includes('vercel.app')) {
  const syncAuth = () => {
    try {
      // Prevent errors if the extension was updated/reloaded in the background
      if (!chrome.runtime || !chrome.runtime.id) {
        return;
      }
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token) {
        chrome.storage.local.set({ 
          token, 
          user: userStr ? JSON.parse(userStr) : null, 
          origin: window.location.origin 
        }, () => {
          if (chrome.runtime.lastError) return;
          console.log('[CareerOS Clipper] Auth token and origin synchronized to extension storage.');
        });
      } else {
        chrome.storage.local.remove(['token', 'user', 'origin'], () => {
          if (chrome.runtime.lastError) return;
          console.log('[CareerOS Clipper] Auth token and origin cleared from extension storage.');
        });
      }
    } catch (err) {
      console.warn('[CareerOS Clipper] Storage sync skipped due to context reload:', err.message);
    }
  };

  // Sync initially
  syncAuth();

  // Watch for logins / logouts
  window.addEventListener('storage', (e) => {
    if (e.key === 'token' || e.key === 'user') {
      syncAuth();
    }
  });

  // Periodically check local storage as backup
  setInterval(syncAuth, 5000);
}

// 2. Scraper engine for Job boards (LinkedIn, Naukri)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeJob') {
    try {
      const data = scrapeJobPage();
      sendResponse({ success: true, data });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
  return true; // Keep message channel open
});

function scrapeJobPage() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  let company = '';
  let role = '';
  let location = '';
  let description = '';
  let salary = '';

  // Get user highlighted text as description fallback
  const selectedText = window.getSelection ? window.getSelection().toString().trim() : '';

  if (url.includes('linkedin.com')) {
    // 1. Role / Title
    const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1, h2.t-24');
    if (titleEl) role = titleEl.innerText.trim();

    // 2. Company Name (Systematic check)
    let companyEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container a[href*="/company/"]');
    if (!companyEl) companyEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description a[href*="/company/"]');
    if (!companyEl) companyEl = document.querySelector('.jobs-unified-top-card__primary-description a[href*="/company/"]');
    if (!companyEl) companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name a');
    if (!companyEl) companyEl = document.querySelector('.jobs-unified-top-card__company-name');
    if (!companyEl) companyEl = document.querySelector('a[href*="/company/"]');
    
    if (companyEl) {
      company = companyEl.innerText.trim().replace(/\s*•\s*$/, '').replace(/\s*·\s*$/, '');
    }

    // 3. Location (Systematic check)
    const locationEl = document.querySelector('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet');
    if (locationEl) {
      location = locationEl.innerText.trim();
    } else {
      const primaryDescEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container, .job-details-jobs-unified-top-card__primary-description, .jobs-unified-top-card__primary-description');
      if (primaryDescEl) {
        const parts = primaryDescEl.innerText.split('·');
        if (parts.length > 1) {
          location = parts[1].trim();
        }
      }
    }

    // 4. Description
    const descEl = document.querySelector('.jobs-description__content, #job-details, .jobs-box__html-content');
    if (descEl) description = descEl.innerText.trim();

  } else if (url.includes('naukri.com')) {
    // Selectors for Naukri and Naukri Campus job pages
    const titleEl = document.querySelector('h1.jd-header-title, .jd-header-title, h1, [class*="job-title"], [class*="jobTitle"]');
    if (titleEl) role = titleEl.innerText.trim();

    const companyEl = document.querySelector('.jd-header-comp-name a, .jd-header-comp-name, .about-company .comp-name, [class*="companyName"], [class*="company-name"], [class*="company"]');
    if (companyEl) {
      // Naukri sometimes includes reviews counts or ratings, extract only first text node or trim ratings
      company = companyEl.innerText.split('\n')[0].trim();
    }

    const locationEl = document.querySelector('.location span, .loc, .loc-icon + span, [class*="location"], [class*="job-location"]');
    if (locationEl) location = locationEl.innerText.trim();

    const descEl = document.querySelector('.job-desc, .jd-description, #jobDescription, .description, [class*="job-description"], [class*="description"]');
    if (descEl) description = descEl.innerText.trim();

    const salaryEl = document.querySelector('.salary span, .salary');
    if (salaryEl) salary = salaryEl.innerText.trim();

  } else {
    // Universal Scraper Fallback
    // 1. Guess Role from page h1 or document title
    const titleEl = document.querySelector('h1');
    if (titleEl && titleEl.innerText.trim().length > 3) {
      role = titleEl.innerText.trim();
    } else {
      role = document.title.split(' - ')[0].split(' | ')[0].trim();
    }

    // 2. Guess Company from hostname (e.g. "jobs.stripe.com" -> "Stripe")
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const candidate = parts[parts.length - 2];
      company = candidate.charAt(0).toUpperCase() + candidate.slice(1);
    } else {
      company = hostname;
    }

    // 3. Fallback Description
    description = selectedText;
  }

  // Universal Fallbacks for empty fields (in case specialized scrapers above failed)
  // 1. Role Fallback
  if (!role) {
    const titleEl = document.querySelector('h1');
    if (titleEl && titleEl.innerText.trim().length > 3) {
      role = titleEl.innerText.trim();
    } else {
      role = document.title.split(' - ')[0].split(' | ')[0].trim();
    }
  }

  // 2. Company Fallback
  if (!company) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const candidate = parts[parts.length - 2];
      company = candidate.charAt(0).toUpperCase() + candidate.slice(1);
    } else {
      company = hostname;
    }
  }

  // 3. Description Fallback
  if (!description && selectedText) {
    description = selectedText;
  }

  return {
    company,
    role,
    location,
    description,
    salary,
    url
  };
}
