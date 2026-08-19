import axios from "axios";
import { prisma } from "../utils/prisma";
import { GreenhouseJob } from "../types";

const BOARD_TOKEN = process.env.GREENHOUSE_BOARD_TOKEN || "gitlab";
const MAX_JOBS = Number(process.env.MAX_JOBS || 15);

/**
 * Decodes the common HTML entities Greenhouse embeds in raw job content
 * (e.g. "&lt;div&gt;" representing "<div>"). Must run BEFORE tag-stripping
 * — decoding after stripping leaves the now-real tags sitting in the
 * output as visible text, since the stripper never saw them as tags.
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&amp;": "&",
  };
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.split(entity).join(char);
  }
  return result;
}

// DELETE this second, duplicate declaration entirely (keep only the first one above it):

/**
 * Strips HTML tags from Greenhouse's job description content and trims it
 * down to a readable summary for the dashboard card.
 */
function toPlainSummary(html: string | undefined, maxLen = 400): string {
  if (!html) return "No description provided.";
  const decoded = decodeHtmlEntities(html);
  const withoutTags = decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const text = decodeHtmlEntities(withoutTags);
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}
/**
 * Greenhouse's public Job Board API (no auth required for reads):
 *   GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
 * This is the officially supported, publicly accessible way to retrieve
 * structured job data for any company that hosts its careers page on
 * Greenhouse, so no HTML scraping/hardcoding is required.
 */
export async function scrapeGreenhouseJobs(): Promise<{
  fetched: number;
  created: number;
  updated: number;
}> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${BOARD_TOKEN}/jobs`;
  const { data } = await axios.get(url, {
    params: { content: true },
    timeout: 15000,
  });

  const jobs: GreenhouseJob[] = (data.jobs || []).slice(0, MAX_JOBS);

  let created = 0;
  let updated = 0;

  for (const job of jobs) {
    const applicationUrl = job.absolute_url.includes("#app")
      ? job.absolute_url
      : `${job.absolute_url}#app`;

    const existing = await prisma.job.findUnique({
      where: { externalId: String(job.id) },
    });

    const record = {
      title: job.title,
      company: BOARD_TOKEN,
      location: job.location?.name || "Not specified",
      description: toPlainSummary(job.content),
      jobUrl: job.absolute_url,
      applicationUrl,
      source: "greenhouse",
    };

    if (existing) {
      await prisma.job.update({
        where: { externalId: String(job.id) },
        data: record,
      });
      updated += 1;
    } else {
      await prisma.job.create({
        data: { externalId: String(job.id), status: "NOT_STARTED", ...record },
      });
      created += 1;
    }
  }

  return { fetched: jobs.length, created, updated };
}

/**
 * Greenhouse's public API returns a board's full job list in one response
 * (no true pagination), so "getting more jobs" after a batch finishes
 * means asking the same board again and keeping only the jobs we haven't
 * stored yet — a self-managed pagination over jobs already seen, capped at
 * MAX_JOBS per top-up so the queue grows in controlled batches rather than
 * all at once. Intended to run automatically after an Apply to All batch
 * completes, and only ever on a board that has already been scraped once.
 */
export async function scrapeMoreGreenhouseJobs(): Promise<{
  fetchedTotal: number;
  newlyAdded: number;
}> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${BOARD_TOKEN}/jobs`;
  const { data } = await axios.get(url, {
    params: { content: true },
    timeout: 15000,
  });

  const allJobs: GreenhouseJob[] = data.jobs || [];

  const existing = await prisma.job.findMany({ select: { externalId: true } });
  const existingIds = new Set(existing.map((j: { externalId: string }) => j.externalId));

  const unseen = allJobs.filter((j) => !existingIds.has(String(j.id)));
  const nextBatch = unseen.slice(0, MAX_JOBS);

  for (const job of nextBatch) {
    const applicationUrl = job.absolute_url.includes("#app")
      ? job.absolute_url
      : `${job.absolute_url}#app`;

    await prisma.job.create({
      data: {
        externalId: String(job.id),
        title: job.title,
        company: BOARD_TOKEN,
        location: job.location?.name || "Not specified",
        description: toPlainSummary(job.content),
        jobUrl: job.absolute_url,
        applicationUrl,
        source: "greenhouse",
        status: "NOT_STARTED",
      },
    });
  }

  return { fetchedTotal: allJobs.length, newlyAdded: nextBatch.length };
}
