const form = document.getElementById('scanForm');
const loading = document.getElementById('loading');
const loadText = document.getElementById('loadText');
const result = document.getElementById('result');
let latestLead = {};

const loadingSteps = [
  'Scanning your homepage...',
  'Checking your headline clarity...',
  'Reviewing your CTA path...',
  'Looking for trust gaps...',
  'Building your preview report...'
];

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  result.classList.remove('show');
  result.innerHTML = '';
  loading.classList.add('show');

  let i = 0;
  loadText.textContent = loadingSteps[0];
  const timer = setInterval(() => {
    i = Math.min(i + 1, loadingSteps.length - 1);
    loadText.textContent = loadingSteps[i];
  }, 650);

  const data = Object.fromEntries(new FormData(form).entries());
  latestLead = data;

  try {
    const response = await fetch('/api/scan-preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });
    const report = await response.json();
    if (!response.ok) throw new Error(report.error || 'Could not run scan');
    latestLead = { ...latestLead, ...report };
    renderReport(report);
  } catch (error) {
    result.innerHTML = `<div class="card error"><h3>Preview scan hit a snag</h3><p>${error.message || 'Please try again with your homepage URL.'}</p><p>Your paid report links still work below.</p></div>`;
    result.classList.add('show');
  } finally {
    clearInterval(timer);
    loading.classList.remove('show');
  }
});

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderReport(report) {
  const findings = (report.findings || []).map((finding, index) => `
    <div class="finding">
      <h3>${index + 1}. ${escapeHtml(finding.title)}</h3>
      <p>${escapeHtml(finding.detail)}</p>
      <p><b>Try this:</b> ${escapeHtml(finding.fix)}</p>
    </div>
  `).join('');

  result.innerHTML = `
    <div class="card">
      <div class="pill">Ding — your preview is ready</div>
      <h3>Revenue Leak Preview for ${escapeHtml(report.host || report.url)}</h3>
      <div class="score">${escapeHtml(report.scoreLabel || `${report.score}/10`)}</div>
      <p class="muted">${escapeHtml(report.deliveredMessage || 'Your free preview is also being sent to your inbox. Paid reports are delivered within minutes.')}</p>
      <div class="report-findings">${findings}</div>
      <div class="banner">
        <h3>Want the full diagnosis?</h3>
        <p>The paid report expands this into a complete written diagnosis of what to fix, why it matters, and step-by-step instructions you can use yourself, hand to your web person, or paste into any AI tool. Delivered within minutes.</p>
        <a class="btn" href="#pricing">See Paid Reports</a>
      </div>
    </div>
  `;
  result.classList.add('show');
}

document.querySelectorAll('.buy').forEach((button) => {
  button.addEventListener('click', async () => {
    const tier = button.dataset.tier || 'main';
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = 'Opening checkout...';
    try {
      const payload = {
        tier,
        email: latestLead.email || document.getElementById('email')?.value || '',
        url: latestLead.url || document.getElementById('url')?.value || '',
        goal: latestLead.goal || document.getElementById('goal')?.value || '',
        previewId: latestLead.previewId || ''
      };
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (error) {
      alert(error.message || 'Could not open checkout. Please try again.');
      button.disabled = false;
      button.textContent = oldText;
    }
  });
});
