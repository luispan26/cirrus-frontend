import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5175';
const SHOTS = '/private/tmp/claude-501/-Users-amirasagitkhan-Desktop-cirrus-cirrus-frontend/15ba531a-a200-4c3e-bdc4-3b39f6fd64ce/scratchpad';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage();
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

async function report(label) {
  console.log(`--- ${label} ---`);
  console.log('url:', page.url());
  console.log('errors so far:', JSON.stringify(errors, null, 2));
}

// 1. Register (or login) a throwaway user to get a session
await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
await report('register page loaded');

const uniq = Date.now();
const email = `smoketest+${uniq}@example.com`;

try {
  await page.fill('input[type="email"], input[name="email"]', email);
} catch (e) { console.log('email fill failed', e.message); }
try {
  await page.fill('input[name="name"]', 'Smoke Test');
} catch (e) { console.log('name fill failed (may not exist)', e.message); }
try {
  await page.fill('input[type="password"]', 'SmokeTest123!');
} catch (e) { console.log('password fill failed', e.message); }

await page.screenshot({ path: `${SHOTS}/01-register-filled.png` });

await Promise.all([
  page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => null),
  page.click('button[type="submit"], button:has-text("Register"), button:has-text("Sign up"), button:has-text("Create account")').catch(() => null),
]);

await page.waitForTimeout(1000);
await report('after register submit');
await page.screenshot({ path: `${SHOTS}/02-post-register.png` });

// 2. Dashboard
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await report('dashboard');
await page.screenshot({ path: `${SHOTS}/03-dashboard.png`, fullPage: true });

const bodyText = await page.textContent('body');
console.log('Contains "Pricing"?', bodyText.includes('Pricing'));
console.log('Contains "Design history"?', bodyText.includes('Design history'));

// 3. History page
await page.goto(`${BASE}/history`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await report('history');
await page.screenshot({ path: `${SHOTS}/04-history.png`, fullPage: true });

// 4. Questions page
await page.goto(`${BASE}/questions`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await report('questions - Q1');
await page.screenshot({ path: `${SHOTS}/05-questions-q1.png` });

// advance through questions to reach automation (Q3) and staff (Q6)
// Q1: bsl radio - click first option
await page.click('.opt-card').catch((e) => console.log('q1 click fail', e.message));
await page.waitForTimeout(200);
await page.click('button:has-text("Next")');
await page.waitForTimeout(300);

// Q2: operations multi - select bca_assay and miniprep to make automation relevant
await page.click('text=BCA assay').catch((e) => console.log('bca click fail', e.message));
await page.click('text=Plasmid miniprep').catch((e) => console.log('miniprep click fail', e.message));
await page.waitForTimeout(200);
await page.click('button:has-text("Next")');
await page.waitForTimeout(300);

// Q3: automation
await report('automation question');
await page.screenshot({ path: `${SHOTS}/06-automation.png` });

await page.click('button:has-text("Next")');
await page.waitForTimeout(300);
// Q4 space
await page.click('button:has-text("Next")');
await page.waitForTimeout(300);
// Q5 budget
await page.click('button:has-text("Next")');
await page.waitForTimeout(300);

// Q6: staff
await report('staff question');
await page.screenshot({ path: `${SHOTS}/07-staff.png` });

// click technician role chip then + a couple times
await page.click('text=Technician').catch((e) => console.log('technician chip click fail', e.message));
await page.waitForTimeout(200);
await page.screenshot({ path: `${SHOTS}/08-staff-technician-selected.png` });

console.log('FINAL ERRORS:', JSON.stringify(errors, null, 2));

await browser.close();
