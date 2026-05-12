const form = document.getElementById('scanForm');
const loading = document.getElementById('loading');
const loadText = document.getElementById('loadText');
const result = document.getElementById('result');
const heroSection = document.getElementById('scan');
let latestLead = {};

const loadingSteps = [
  'Normalizing your URL...',
  'Reading public homepage copy...',
  'Checking headlines, buttons, metadata, and forms...',
  'Looking for trust proof and buyer-path friction...',
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
  }, 700);

  const data = {
    url: document.getElementById('url')?.value || '',
    goal: document.getElementById('goal')?.value || 'More leads'
  };
  latestLead = { ...data };

  try {
    const response = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });
    const report = await response.json();
    if (!response.ok) throw new Error(report.error || 'Could not run scan');
    latestLead = { ...latestLead, ...report };
    renderReport(report);
  } catch (error) {
    result.innerHTML = `<div class="card error"><h3>Preview scan hit a snag</h3><p>${escapeHtml(error.message || 'Please try again with your homepage URL.')}</p><p>You can still choose a paid report below. We will carry the URL you entered into checkout.</p></div>`;
    result.classList.add('show');
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } finally {
    clearInterval(timer);
    loading.classList.remove('show');
  }
});

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function list(items = []) {
  return items.filter(Boolean).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderReport(report) {
  const score = Number(report.score || 6);
  const scoreColor = score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--gold)' : 'var(--red)';
  const scoreLabel = report.verdict || (score >= 8 ? 'Strong base — a few leaks left' : score >= 6 ? 'Leaks found — worth fixing' : 'Major leaks found — fix these first');
  const hostname = escapeHtml(report.host || report.url || '');
  const detected = report.detected || {};

  const findings = (report.findings || []).map((finding, index) => `
    <div class="finding" style="animation-delay:${0.12 * index}s">
      <div class="finding-num">${index + 1}</div>
      <div class="finding-body">
        <h4>${escapeHtml(finding.title)}</h4>
        <p>${escapeHtml(finding.detail)}</p>
        <p class="finding-fix"><span class="fix-label">Try this:</span> ${escapeHtml(finding.fix)}</p>
      </div>
    </div>
  `).join('');

  const signals = `
    <div class="signal-grid">
      <div class="signal-card"><b>Headline detected</b><p>${escapeHtml(detected.headline || 'No clear H1 headline detected in the public HTML.')}</p></div>
      <div class="signal-card"><b>SEO description</b><p>${escapeHtml(detected.meta || 'No strong meta description detected.')}</p></div>
      <div class="signal-card"><b>Buttons / links found</b><p>${detected.buttons?.length ? detected.buttons.slice(0, 6).map(escapeHtml).join(', ') : 'No clear CTA buttons detected.'}</p></div>
      <div class="signal-card"><b>Trust signals</b><p>${detected.proofSignals?.length ? detected.proofSignals.slice(0, 5).map(escapeHtml).join(', ') : 'No obvious reviews, guarantees, ratings, or credentials detected near the scanned text.'}</p></div>
    </div>`;

  result.innerHTML = `
    <div class="result-reveal">
      <div class="result-header">
        <div class="result-ding">⚡ Free preview built from public site signals</div>
        <h2 class="result-title">Revenue Leak Preview for <span class="result-domain">${hostname}</span></h2>
        <div class="result-score-wrap">
          <div class="result-score-ring">
            <svg viewBox="0 0 120 120" class="score-svg">
              <circle cx="60" cy="60" r="50" class="score-track"/>
              <circle cx="60" cy="60" r="50" class="score-fill" style="--score-pct:${score * 10}%;stroke:${scoreColor}"/>
            </svg>
            <div class="score-number" style="color:${scoreColor}">${score}<span>/10</span></div>
          </div>
          <div class="result-score-label">
            <div class="score-verdict" style="color:${scoreColor}">${escapeHtml(scoreLabel)}</div>
            <p class="score-sub">This sample uses the actual public copy, metadata, links, forms, and trust signals we can read from the page. The paid report expands this into a full diagnosis and fix plan.</p>
          </div>
        </div>
      </div>

      <div class="card detected-card">
        <h3>Real signals we found</h3>
        ${signals}
      </div>

      <div class="result-findings-section">
        <h3 class="findings-heading">Your first leaks on <em>${hostname}</em></h3>
        <div class="report-findings">${findings}</div>
      </div>

      <div class="card teaser-card">
        <h3>What the full report unlocks</h3>
        <ul class="bullets">${list(report.fullReportPreview || [
          'A deeper scorecard across clarity, trust, CTA strength, offer friction, and buyer path.',
          'More page-specific findings ranked by what to fix first.',
          'Plain-English rewrite ideas for your headline, buttons, proof section, and next-step flow.',
          'Copy-paste instructions you can hand to a web person, freelancer, or AI tool.'
        ])}</ul>
      </div>

      <div class="result-upgrade">
        <div class="upgrade-eyebrow">Want every leak — and exactly how to fix it?</div>
        <h3 class="upgrade-headline">Unlock the full written diagnosis online after checkout.</h3>
        <p class="upgrade-sub">No calls, no implementation, no dashboard. Stripe collects payment, then your report is generated on the success page with copy, fixes, and next-step instructions.</p>
        <div class="upgrade-tiers">
          <div class="upgrade-tier">
            <div class="tier-price">$49</div>
            <div class="tier-name">Quick Leak Scan</div>
            <p class="tier-desc">Top 3 leaks + plain-English fixes. Good for a fast gut-check.</p>
            <button class="btn buy" data-tier="quick">Get My Scan →</button>
          </div>
          <div class="upgrade-tier upgrade-tier--featured">
            <div class="tier-badge">Most Popular</div>
            <div class="tier-price">$149</div>
            <div class="tier-name">Full Revenue Leak Report</div>
            <p class="tier-desc">Top 5 leaks, ranked fixes, and step-by-step instructions for your web person or AI tool.</p>
            <button class="btn buy" data-tier="main">Get My Report →</button>
          </div>
          <div class="upgrade-tier">
            <div class="tier-price">$497</div>
            <div class="tier-name">Deep Revenue Intelligence</div>
            <p class="tier-desc">Full diagnosis + positioning + 30-day fix plan. For serious businesses.</p>
            <button class="btn buy" data-tier="deep">Get the Deep Report →</button>
          </div>
        </div>
        <p class="upgrade-fine">Generated online after checkout. No login. No sales call. No implementation required.</p>
      </div>

      <div class="result-reset"><button class="btn-ghost" id="resetBtn">← Scan a different URL</button></div>
    </div>
  `;

  result.classList.add('show');
  setTimeout(() => result.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  setTimeout(() => result.querySelector('.score-fill')?.classList.add('score-animated'), 350);
  wireBuyButtons(result);
  document.getElementById('resetBtn')?.addEventListener('click', () => {
    result.classList.remove('show');
    result.innerHTML = '';
    form?.reset();
    heroSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function getCurrentUrl() {
  return latestLead.url || document.getElementById('url')?.value || '';
}

function getCurrentGoal() {
  return latestLead.goal || document.getElementById('goal')?.value || 'More leads';
}

function wireBuyButtons(scope = document) {
  scope.querySelectorAll('.buy').forEach((button) => {
    if (button.dataset.wired === '1') return;
    button.dataset.wired = '1';
    button.addEventListener('click', async () => {
      const tier = button.dataset.tier || 'main';
      const url = getCurrentUrl();
      if (!url) {
        document.getElementById('url')?.focus();
        alert('Paste your website URL first so your report knows what to scan.');
        return;
      }
      button.disabled = true;
      const oldText = button.textContent;
      button.textContent = 'Opening checkout...';
      try {
        const payload = { tier, url, goal: getCurrentGoal(), previewId: latestLead.previewId || '' };
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.url) throw new Error(data.error || 'Checkout unavailable');
        window.location.href = data.url;
      } catch (err) {
        button.disabled = false;
        button.textContent = oldText;
        alert(err.message || 'Could not open checkout. Please try again.');
      }
    });
  });
}

wireBuyButtons(document);
