import path from "path";
import fs from "fs";
import { chromium, Page } from "playwright";
import { prisma } from "../utils/prisma";
import { loadCandidateProfile } from "../utils/candidate";
import { JobStatus, AutomationResult } from "../types";

const HEADLESS = (process.env.HEADLESS ?? "true") !== "false";
const TIMEOUT_MS = Number(process.env.AUTOMATION_TIMEOUT_MS || 45000);
const SCREENSHOTS_DIR = path.resolve(
  __dirname,
  "../../",
  process.env.SCREENSHOTS_DIR || "../screenshots"
);

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Heuristic map from common Greenhouse field name/id/label fragments to the
 * matching candidate profile value. Greenhouse embeds vary field names
 * across accounts (job_application[first_name], first_name, etc.), so we
 * match on substrings rather than exact selectors.
 */
function buildFieldMap(candidate: ReturnType<typeof loadCandidateProfile>) {
  return [
    { patterns: ["first_name", "firstname"], value: candidate.firstName },
    { patterns: ["last_name", "lastname"], value: candidate.lastName },
    { patterns: ["email"], value: candidate.email },
    { patterns: ["phone"], value: candidate.phone },
    { patterns: ["location", "city"], value: candidate.location },
    { patterns: ["linkedin"], value: candidate.linkedin || "" },
    { patterns: ["github", "portfolio", "website"], value: candidate.github || "" },
  ].filter((f) => f.value);
}

/** Fills every visible text/email/tel/url input whose name/id/aria-label
 * matches a known pattern. Best-effort — unmatched fields are left blank
 * rather than guessed, per the "safely determined" requirement in the brief. */
async function fillKnownTextFields(page: Page, candidate: ReturnType<typeof loadCandidateProfile>) {
  const fieldMap = buildFieldMap(candidate);
  const inputs = await page.locator("input[type='text'], input[type='email'], input[type='tel'], input[type='url'], input:not([type])").all();

  for (const input of inputs) {
    try {
      const [name, id, ariaLabel, placeholder] = await Promise.all([
        input.getAttribute("name"),
        input.getAttribute("id"),
        input.getAttribute("aria-label"),
        input.getAttribute("placeholder"),
      ]);
      const haystack = `${name} ${id} ${ariaLabel} ${placeholder}`.toLowerCase();

      const match = fieldMap.find((f) => f.patterns.some((p) => haystack.includes(p)));
      if (match && (await input.isVisible())) {
        await input.fill(match.value, { timeout: 3000 });
      }
    } catch {
      // Individual field failures should not abort the whole run.
      continue;
    }
  }

  // Cover letter / free-text textareas that clearly ask for a cover letter.
  if (candidate.coverLetter) {
    const textareas = await page.locator("textarea").all();
    for (const ta of textareas) {
      const name = ((await ta.getAttribute("name")) || "").toLowerCase();
      const id = ((await ta.getAttribute("id")) || "").toLowerCase();
      if (`${name} ${id}`.includes("cover")) {
        await ta.fill(candidate.coverLetter, { timeout: 3000 }).catch(() => {});
      }
    }
  }
}

/** Uploads the resume, handling both the classic <input type="file"> pattern
 * and newer Greenhouse boards that use a custom "Attach" button which opens
 * the OS file picker via a filechooser event. */
async function uploadResume(page: Page, resumePath: string): Promise<boolean> {
  // Let Greenhouse's React widgets finish hydrating before interacting —
  // clicking too early is a likely cause of "Cannot read properties of
  // undefined" errors thrown by their own JS.
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

  // Scope to the Resume/CV section specifically so we never accidentally
  // click the Cover Letter section's identical "Attach" button.
  const resumeSection = page.locator("text=Resume/CV").locator("xpath=ancestor::*[self::div][1]");
  const attachButton = (await resumeSection.count()) > 0
    ? resumeSection.locator("button:has-text('Attach')").first()
    : page.locator("button:has-text('Attach')").first();

  if ((await attachButton.count()) > 0) {
    try {
      await attachButton.scrollIntoViewIfNeeded();
      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 8000 }),
        attachButton.click(),
      ]);
      await fileChooser.setFiles(resumePath);

      // Don't declare success immediately — wait until the UI actually
      // shows the attached filename (avoids screenshotting mid-upload).
      await page.waitForSelector("text=/resume\\.pdf|\\.docx?$/i", { timeout: 15000 }).catch(() => {});
      return true;
    } catch {
      // fall through to legacy path
    }
  }

  const fileInputs = await page.locator("input[type='file']").all();
  for (const input of fileInputs) {
    const name = ((await input.getAttribute("name")) || "").toLowerCase();
    const id = ((await input.getAttribute("id")) || "").toLowerCase();
    if (`${name} ${id}`.includes("resume") || fileInputs.length === 1) {
      await input.setInputFiles(resumePath);
      return true;
    }
  }
  return false;
}

/** Best-effort fill of simple required free-text questions using default
 * answers from the candidate profile, matched by nearby label text. Selects,
 * radios, and checkboxes are left untouched — those require semantic
 * judgement the automation cannot safely make automatically. */
async function fillAdditionalQuestions(page: Page, defaultAnswers: Record<string, string> = {}) {
  const labels = await page.locator("label").all();
  for (const label of labels) {
    const text = ((await label.innerText().catch(() => "")) || "").toLowerCase().trim();
    if (!text) continue;

    const matchedKey = Object.keys(defaultAnswers).find((k) => text.includes(k.toLowerCase()));
    if (!matchedKey) continue;

    const forId = await label.getAttribute("for");
    if (!forId) continue;

    const field = page.locator(`#${forId}`);
    const tag = await field.evaluate((el) => el.tagName.toLowerCase()).catch(() => "");
    if (tag === "input" || tag === "textarea") {
      await field.fill(defaultAnswers[matchedKey], { timeout: 3000 }).catch(() => {});
    }
  }
}

/** Best-effort fill of simple yes/no <select> dropdowns using
 * defaultAnswers, matched by nearby label text. Intentionally restricted
 * to a small allow-list of safe, unambiguous boolean questions — never
 * touches EEO/demographic/self-identification dropdowns (gender, race,
 * veteran status, disability), which must always stay blank. */
async function fillSafeDropdowns(page: Page, defaultAnswers: Record<string, string> = {}) {
  const neverTouch = [
    "gender",
    "hispanic",
    "latino",
    "race",
    "ethnicity",
    "veteran",
    "disability",
    "disabilities",
    "sexual orientation",
    "pronoun",
  ];

  const labels = await page.locator("label").all();
  for (const label of labels) {
    const text = ((await label.innerText().catch(() => "")) || "").toLowerCase().trim();
    if (!text) continue;
    if (neverTouch.some((banned) => text.includes(banned))) continue;

    const matchedKey = Object.keys(defaultAnswers).find((k) => text.includes(k.toLowerCase()));
    if (!matchedKey) continue;

    const forId = await label.getAttribute("for");
    if (!forId) continue;

    const select = page.locator(`#${forId}`);
    const tag = await select.evaluate((el) => el.tagName.toLowerCase()).catch(() => "");
    if (tag !== "select") continue;

    const desiredValue = defaultAnswers[matchedKey];
    try {
      const options = await select.locator("option").allTextContents();
      const matchIndex = options.findIndex(
        (opt) => opt.trim().toLowerCase() === desiredValue.toLowerCase()
      );
      if (matchIndex >= 0) {
        await select.selectOption({ index: matchIndex });
      }
    } catch {
      continue;
    }
  }
}

async function detectCaptchaOrBlocker(page: Page): Promise<string | null> {
  const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  const explicitChallengeText = [
    "verify you are human",
    "i'm not a robot",
    "select all images",
    "complete the security check",
    "please complete the captcha",
  ];
  if (explicitChallengeText.some((t) => bodyText.includes(t))) {
    return "CAPTCHA / bot-protection challenge detected";
  }

  // Only the reCAPTCHA "bframe" (the actual challenge popup) counts — the
  // small corner "badge" iframe most sites embed by default is passive and
  // never requires interaction, so it must never block automation. Beyond
  // matching the right iframe, we check its REAL on-screen position via
  // getBoundingClientRect + computed style, not just Playwright's looser
  // isVisible(), since a badge can be technically "visible" while sitting
  // off-screen or fully transparent.
  const challengeFrames = await page.locator("iframe[src*='bframe']").all();

  for (const frame of challengeFrames) {
    const isActuallyOnScreen = await frame
      .evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const inViewport =
          rect.top < window.innerHeight &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.right > 0;
        const visibleStyle =
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          parseFloat(style.opacity || "1") > 0;
        return inViewport && visibleStyle && rect.width > 100 && rect.height > 100;
      })
      .catch(() => false);

    if (isActuallyOnScreen) {
      return "CAPTCHA challenge widget detected and visible";
    }
  }

  return null;
}

async function updateJob(jobId: string, data: Partial<AutomationResult>) {
  await prisma.job.update({ where: { id: jobId }, data });
}

/**
 * Runs the full automation flow for a single job:
 * navigate -> fill fields -> upload resume -> fill extra questions ->
 * detect final stage -> screenshot -> STOP (never submits).
 */
export async function runApplicationAutomation(jobId: string): Promise<AutomationResult> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { status: JobStatus.FAILED, failureReason: "Job not found" };
  }

  const candidate = loadCandidateProfile();
  await updateJob(jobId, { status: JobStatus.PROCESSING });

  if (!fs.existsSync(candidate.resumePath)) {
    const reason = `Resume file not found at ${candidate.resumePath}`;
    await updateJob(jobId, { status: JobStatus.FAILED, failureReason: reason });
    return { status: JobStatus.FAILED, failureReason: reason };
  }

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT_MS);

  try {
    await page.goto(job.applicationUrl, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });

    const blocker = await detectCaptchaOrBlocker(page);
    if (blocker) {
      throw new Error(blocker);
    }

    // Greenhouse embeds application forms inside an iframe on some boards;
    // fall back to the top-level page if no iframe is present.
    const frame = page.frames().find((f) => f.url().includes("job-boards.greenhouse.io") || f.url().includes("boards.greenhouse.io")) || page.mainFrame();

    await fillKnownTextFields(page, candidate);
    await updateJob(jobId, { status: JobStatus.FORM_FILLED });

    const uploaded = await uploadResume(page, candidate.resumePath);
    if (!uploaded) {
      // Not fatal — some boards don't require a resume field, or expose it
      // as a drag-and-drop widget we can't detect reliably. Record and continue.
      console.warn(`[automation] No resume file input found for job ${jobId}`);
    }

    await fillAdditionalQuestions(page, candidate.defaultAnswers);
    await fillSafeDropdowns(page, candidate.defaultAnswers);

    // Give any client-side validation/JS a moment to settle before
    // attempting to locate the submit stage.
    await page.waitForTimeout(1000);

    const blockerAfterFill = await detectCaptchaOrBlocker(page);
    if (blockerAfterFill) {
      throw new Error(blockerAfterFill);
    }

    // Scroll to the submit button region so the screenshot shows the final
    // review stage, WITHOUT clicking it.
    const submitButton = page.locator(
      "button:has-text('Submit Application'), input[type='submit'], button[type='submit']"
    ).first();

    const submitVisible = await submitButton.count().then((c) => c > 0);
    if (submitVisible) {
      await submitButton.scrollIntoViewIfNeeded().catch(() => {});
    }

    await updateJob(jobId, { status: JobStatus.READY_FOR_SUBMISSION });

    const screenshotPath = path.join(SCREENSHOTS_DIR, `job_${job.id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const relativePath = `screenshots/job_${job.id}.png`;
    await updateJob(jobId, {
      status: JobStatus.SCREENSHOT_CAPTURED,
      screenshotPath: relativePath,
      failureReason: null as unknown as string,
    });

    return { status: JobStatus.SCREENSHOT_CAPTURED, screenshotPath: relativePath };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown automation error";

    // Best-effort failure screenshot for debugging/evidence, ignored if it fails too.
    let failureScreenshot: string | undefined;
    try {
      const failPath = path.join(SCREENSHOTS_DIR, `job_${job.id}_failed.png`);
      await page.screenshot({ path: failPath, fullPage: true });
      failureScreenshot = `screenshots/job_${job.id}_failed.png`;
    } catch {
      // ignore
    }

    await updateJob(jobId, {
      status: JobStatus.FAILED,
      failureReason: reason,
      ...(failureScreenshot ? { screenshotPath: failureScreenshot } : {}),
    });

    return { status: JobStatus.FAILED, failureReason: reason };
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * Runs automation for every job sequentially, per the "controlled manner"
 * requirement. A failure on one job never stops the batch.
 */
export async function runApplyToAll(onProgress?: (jobId: string, result: AutomationResult) => void) {
  const jobs = await prisma.job.findMany();
  const results: { jobId: string; result: AutomationResult }[] = [];

  for (const job of jobs) {
    const result = await runApplicationAutomationWithRetry(job.id);
    results.push({ jobId: job.id, result });
    onProgress?.(job.id, result);
  }

  return results;
}

async function runApplicationAutomationWithRetry(jobId: string): Promise<AutomationResult> {
  const maxRetries = Number(process.env.MAX_RETRIES || 2);
  let lastResult: AutomationResult = { status: JobStatus.FAILED, failureReason: "Not attempted" };

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    lastResult = await runApplicationAutomation(jobId);
    if (lastResult.status !== JobStatus.FAILED) return lastResult;
    // Don't retry on CAPTCHA/bot-protection — retrying won't help and we
    // must never attempt to bypass it.
    if (lastResult.failureReason?.toLowerCase().includes("captcha")) break;
  }
  return lastResult;
}

export { runApplicationAutomationWithRetry };
