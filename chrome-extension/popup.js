// CareerOS Job Clipper - Popup Controller

const DEFAULT_BACKEND_URL = 'http://localhost:5001';
const DEFAULT_FRONTEND_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('status-badge');
  const authWarning = document.getElementById('auth-warning');
  const clipperPanel = document.getElementById('clipper-panel');
  const urlNotice = document.getElementById('url-notice');
  
  const btnOpenApp = document.getElementById('btn-open-app');
  const btnSubmit = document.getElementById('btn-submit');
  const selectBoard = document.getElementById('select-board');
  const clipForm = document.getElementById('clip-form');

  // Form Inputs
  const inputCompany = document.getElementById('input-company');
  const inputRole = document.getElementById('input-role');
  const inputLocation = document.getElementById('input-location');
  const inputSalary = document.getElementById('input-salary');
  const textareaNotes = document.getElementById('textarea-notes');

  let activeTabUrl = '';
  let apiBase = DEFAULT_BACKEND_URL;
  let webBase = DEFAULT_FRONTEND_URL;

  // 1. Fetch credentials from extension storage
  chrome.storage.local.get(['token', 'user', 'origin'], async (result) => {
    const token = result.token;
    if (result.origin) {
      webBase = result.origin;
      if (result.origin.includes('vercel.app')) {
        apiBase = result.origin; // Vercel routes are single origin serverless functions
      } else {
        apiBase = DEFAULT_BACKEND_URL;
      }
    }

    if (!token) {
      // Show login required state
      statusBadge.innerText = 'Disconnected';
      statusBadge.className = 'badge badge-disconnected';
      authWarning.classList.remove('hidden');
      clipperPanel.classList.add('hidden');
      return;
    }

    // Set connection status
    statusBadge.innerText = 'Connected';
    statusBadge.className = 'badge badge-connected';
    authWarning.classList.add('hidden');
    clipperPanel.classList.remove('hidden');

    // 2. Fetch target job boards from CareerOS backend
    try {
      const response = await fetch(`${apiBase}/api/jobs`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const boards = await response.json();
        boards.forEach(board => {
          const opt = document.createElement('option');
          opt.value = board.id;
          opt.innerText = `💼 ${board.company} - ${board.title}`;
          selectBoard.appendChild(opt);
        });
      } else {
        console.warn('Failed to load target boards from CareerOS.');
      }
    } catch (err) {
      console.error('Error fetching tracker boards:', err);
    }

    // 3. Query active tab and check if it's a supported job board
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      const activeTab = tabs[0];
      activeTabUrl = activeTab.url || '';

      const isSupported = activeTabUrl.includes('linkedin.com') || activeTabUrl.includes('naukri.com');
      if (!isSupported) {
        urlNotice.classList.remove('hidden');
        return;
      }

      urlNotice.classList.add('hidden');

      // 4. Trigger scraping via content script messaging
      chrome.tabs.sendMessage(activeTab.id, { action: 'scrapeJob' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Content script not loaded or active on this page:', chrome.runtime.lastError.message);
          return;
        }

        if (response && response.success && response.data) {
          const job = response.data;
          inputCompany.value = job.company || '';
          inputRole.value = job.role || '';
          inputLocation.value = job.location || '';
          inputSalary.value = job.salary || '';
          
          let notesText = '';
          if (job.url) notesText += `Job URL: ${job.url}\n`;
          if (job.location) notesText += `Location: ${job.location}\n`;
          if (job.salary) notesText += `Salary Offer: ${job.salary}\n`;
          if (job.description) {
            notesText += `\n--- Job Description ---\n${job.description}`;
          }
          textareaNotes.value = notesText;
        }
      });
    });
  });

  // Handle open frontend app button click
  btnOpenApp.addEventListener('click', () => {
    chrome.tabs.create({ url: webBase });
  });

  // Handle Form Submission
  clipForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Clipping...';

    chrome.storage.local.get(['token', 'origin'], async (result) => {
      const token = result.token;
      if (!token) {
        showToast('Authentication token missing. Please log in.', 'error');
        btnSubmit.disabled = false;
        btnSubmit.innerText = '🚀 Clip to Kanban Board';
        return;
      }

      let submissionApiBase = DEFAULT_BACKEND_URL;
      if (result.origin && result.origin.includes('vercel.app')) {
        submissionApiBase = result.origin;
      }

      const boardVal = selectBoard.value;
      const jobId = boardVal === 'general' ? null : boardVal;

      const payload = {
        company: inputCompany.value.trim(),
        role: inputRole.value.trim(),
        salary: inputSalary.value.trim(),
        jobId: jobId,
        status: 'applied', // Default column for clipped jobs
        notes: textareaNotes.value.trim()
      };

      try {
        const response = await fetch(`${submissionApiBase}/api/applications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          showToast('Job successfully added to Kanban board! 🎉', 'success');
          // Clear inputs after success
          inputCompany.value = '';
          inputRole.value = '';
          inputLocation.value = '';
          inputSalary.value = '';
          textareaNotes.value = '';
          btnSubmit.innerText = 'Clipped!';
        } else {
          const errData = await response.json();
          showToast(errData.error || 'Failed to save job application.', 'error');
          btnSubmit.disabled = false;
          btnSubmit.innerText = '🚀 Clip to Kanban Board';
        }
      } catch (err) {
        console.error('Clipping error:', err);
        showToast('Network error connecting to CareerOS.', 'error');
        btnSubmit.disabled = false;
        btnSubmit.innerText = '🚀 Clip to Kanban Board';
      }
    });
  });
});

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.className = `toast toast-${type}`;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}
