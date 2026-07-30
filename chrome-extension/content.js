// CareerOS Job Clipper - Content Script

// 1. If running on CareerOS App, sync auth credentials automatically
if (window.location.hostname === 'localhost' || window.location.hostname.includes('career-copilot') || window.location.hostname.includes('vercel.app')) {
  const syncAuth = () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token) {
      chrome.storage.local.set({ token, user: userStr ? JSON.parse(userStr) : null }, () => {
        console.log('[CareerOS Clipper] Auth token synchronized to extension storage.');
      });
    } else {
      chrome.storage.local.remove(['token', 'user'], () => {
        console.log('[CareerOS Clipper] Auth token cleared from extension storage.');
      });
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
  let company = '';
  let role = '';
  let location = '';
  let description = '';
  let salary = '';

  if (url.includes('linkedin.com')) {
    // Selectors for LinkedIn job page / split-view
    const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1, h2.t-24');
    if (titleEl) role = titleEl.innerText.trim();

    const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name');
    if (companyEl) company = companyEl.innerText.trim().replace(/\s*•\s*$/, ''); // Clean bullet dots

    const locationEl = document.querySelector('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet');
    if (locationEl) location = locationEl.innerText.trim();

    const descEl = document.querySelector('.jobs-description__content, #job-details, .jobs-box__html-content');
    if (descEl) description = descEl.innerText.trim();

  } else if (url.includes('naukri.com')) {
    // Selectors for Naukri job page
    const titleEl = document.querySelector('h1.jd-header-title, .jd-header-title, h1');
    if (titleEl) role = titleEl.innerText.trim();

    const companyEl = document.querySelector('.jd-header-comp-name a, .jd-header-comp-name, .about-company .comp-name');
    if (companyEl) {
      // Naukri sometimes includes reviews counts or ratings, extract only first text node or trim ratings
      company = companyEl.innerText.split('\n')[0].trim();
    }

    const locationEl = document.querySelector('.location span, .loc, .loc-icon + span');
    if (locationEl) location = locationEl.innerText.trim();

    const descEl = document.querySelector('.job-desc, .jd-description, #jobDescription');
    if (descEl) description = descEl.innerText.trim();

    const salaryEl = document.querySelector('.salary span, .salary');
    if (salaryEl) salary = salaryEl.innerText.trim();
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
