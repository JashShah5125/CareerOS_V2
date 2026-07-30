// CareerOS Job Clipper - Content Script



// 2. Universal Scraper engine for job boards and career sites
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
    // Try to find the company name near the job title element in the DOM
    const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1, h2.t-24, [class*="job-title"], [class*="jobTitle"]');
    if (titleEl) {
      let sibling = titleEl.nextElementSibling;
      while (sibling && !company) {
        const text = sibling.innerText ? sibling.innerText.trim() : '';
        if (text && text !== role && !text.includes('Reviews') && text.length < 50) {
          company = text.split('\n')[0].split('•')[0].split('·')[0].trim();
        }
        // If the sibling is a container, look for a link child inside it
        const link = sibling.querySelector('a');
        if (!company && link && link.innerText.trim() && link.innerText.trim() !== role) {
          company = link.innerText.trim();
        }
        sibling = sibling.nextElementSibling;
      }
    }
    
    // If still not found, guess from hostname as last resort
    if (!company) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const candidate = parts[parts.length - 2];
        company = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      } else {
        company = hostname;
      }
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
