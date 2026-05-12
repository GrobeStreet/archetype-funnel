const form = document.getElementById('scanForm');
const loading = document.getElementById('loading');
const loadText = document.getElementById('loadText');
const result = document.getElementById('result');
const heroSection = document.getElementById('heroSection');
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
    }, 900);

                         const data = {
                               url: document.getElementById('url')?.value || '',
                               email: document.getElementById('email')?.value || '',
                               goal: document.getElementById('goal')?.value || ''
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
                               result.innerHTML = `<div class="card error"><h3>Preview scan hit a snag</h3><p>${error.message || 'Please try again with your homepage URL.'}</p><p>Your paid report links still work below.</p></div>`;
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

function renderReport(report) {
    const findings = (report.findings || []).map((finding, index) => `
        <div class="finding" style="animation-delay:${0.15 * index}s">
              <div class="finding-num">${index + 1}</div>
                    <div class="finding-body">
                            <h4>${escapeHtml(finding.title)}</h4>
                                    <p>${escapeHtml(finding.detail)}</p>
                                            <p class="finding-fix"><span class="fix-label">Fix this:</span> ${escapeHtml(finding.fix)}</p>
                                                  </div>
                                                      </div>
                                                        `).join('');

  const score = report.score || 7;
    const scoreColor = score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--gold)' : 'var(--red)';
    const scoreLabel = score >= 8 ? 'Looking good — a few quick wins left' : score >= 6 ? 'Room to grow — leaks found' : 'Critical leaks found — fix these first';
    const hostname = escapeHtml(report.host || report.url || '');

  // Collapse the hero to a slim bar so the result feels like a full takeover
  if (heroSection) {
        heroSection.classList.add('hero-collapsed');
  }

  result.innerHTML = `
      <div class="result-reveal">
            <div class="result-header">
                    <div class="result-ding">⚡ Your free preview is ready</div>
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
                                                                                                                                              <div class="score-verdict" style="color:${scoreColor}">${scoreLabel}</div>
                                                                                                                                                          <p class="score-sub">This is a sample of what we found. The paid report goes deeper — every leak, every fix, step by step.</p>
                                                                                                                                                                    </div>
                                                                                                                                                                            </div>
                                                                                                                                                                                  </div>
                                                                                                                                                                                  
                                                                                                                                                                                        <div class="result-findings-section">
                                                                                                                                                                                                <h3 class="findings-heading">What we found on <em>${hostname}</em></h3>
                                                                                                                                                                                                        <div class="report-findings">
                                                                                                                                                                                                                  ${findings}
                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                
                                                                                                                                                                                                                                      <div class="result-upgrade">
                                                                                                                                                                                                                                              <div class="upgrade-eyebrow">Want every leak — and exactly how to fix it?</div>
                                                                                                                                                                                                                                                      <h3 class="upgrade-headline">Get the full written diagnosis, delivered in minutes.</h3>
                                                                                                                                                                                                                                                              <p class="upgrade-sub">The paid report covers every conversion killer on your page — plain-English fixes you can use yourself, hand to your web person, or paste into ChatGPT. No calls. No fluff. Just fixes.</p>
                                                                                                                                                                                                                                                                      <div class="upgrade-tiers">
                                                                                                                                                                                                                                                                                <div class="upgrade-tier">
                                                                                                                                                                                                                                                                                            <div class="tier-price">$49</div>
                                                                                                                                                                                                                                                                                                        <div class="tier-name">Quick Leak Scan</div>
                                                                                                                                                                                                                                                                                                                    <p class="tier-desc">Top 3 leaks + plain-English fixes. Good for a fast gut-check.</p>
                                                                                                                                                                                                                                                                                                                                <button class="btn buy" data-tier="basic">Get My Scan →</button>
                                                                                                                                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                                                                                                                                                    <div class="upgrade-tier upgrade-tier--featured">
                                                                                                                                                                                                                                                                                                                                                                <div class="tier-badge">Most Popular</div>
                                                                                                                                                                                                                                                                                                                                                                            <div class="tier-price">$149</div>
                                                                                                                                                                                                                                                                                                                                                                                        <div class="tier-name">Full Revenue Leak Report</div>
                                                                                                                                                                                                                                                                                                                                                                                                    <p class="tier-desc">Top 5 leaks, ranked fixes, step-by-step instructions for your web person or AI tool.</p>
                                                                                                                                                                                                                                                                                                                                                                                                                <button class="btn buy" data-tier="main">Get My Report →</button>
                                                                                                                                                                                                                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                    <div class="upgrade-tier">
                                                                                                                                                                                                                                                                                                                                                                                                                                                <div class="tier-price">$497</div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                            <div class="tier-name">Deep Revenue Intelligence</div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                        <p class="tier-desc">Full diagnosis + positioning + 30-day fix plan. For serious businesses.</p>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    <button class="btn buy" data-tier="deep">Get the Deep Report →</button>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              <p class="upgrade-fine">Delivered within minutes. No login. No sales call. No implementation required.</p>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          <div class="result-reset">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <button class="btn-ghost" id="resetBtn">← Scan a different URL</button>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              `;

  result.classList.add('show');

  // Smooth scroll to result
  setTimeout(() => {
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);

  // Animate score ring
  setTimeout(() => {
        result.querySelector('.score-fill')?.classList.add('score-animated');
  }, 400);

  // Wire up buy buttons
  result.querySelectorAll('.buy').forEach((button) => {
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
                                      goal: latestLead.goal || document.getElementById('goal')?.value || ''
                          };
                          const res = await fetch('/api/checkout', {
                                      method: 'POST',
                                      headers: { 'content-type': 'application/json' },
                                      body: JSON.stringify(payload)
                          });
                          const data = await res.json();
                          if (data.url) {
                                      window.location.href = data.url;
                          } else {
                                      throw new Error(data.error || 'Checkout unavailable');
                          }
                } catch (err) {
                          button.disabled = false;
                          button.textContent = oldText;
                          alert(err.message || 'Could not open checkout. Please try again.');
                }
        });
  });

  // Reset button
  document.getElementById('resetBtn')?.addEventListener('click', () => {
        result.classList.remove('show');
        result.innerHTML = '';
        if (heroSection) heroSection.classList.remove('hero-collapsed');
        form?.reset();
        heroSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// Original buy buttons outside result (pricing section)
document.querySelectorAll('.buy:not(#result .buy)').forEach((button) => {
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
                            goal: latestLead.goal || document.getElementById('goal')?.value || ''
                  };
                  const res = await fetch('/api/checkout', {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify(payload)
                  });
                  const data = await res.json();
                  if (data.url) {
                            window.location.href = data.url;
                  } else {
                            throw new Error(data.error || 'Checkout unavailable');
                  }
          } catch (err) {
                  button.disabled = false;
                  button.textContent = oldText;
                  alert(err.message || 'Could not open checkout. Please try again.');
          }
    });
});
