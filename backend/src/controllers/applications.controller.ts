import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../utils/prisma";
import {
  runApplicationAutomationWithRetry,
  runApplyToAll,
} from "../services/automation.service";
import { scrapeMoreGreenhouseJobs } from "../services/scraper.service";

// Simple in-memory tracker for the currently running apply-to-all batch so
// the frontend can poll aggregate progress without a websocket.
let currentBatch: {
  total: number;
  completed: number;
  running: boolean;
  lastTopUp: { added: number; fetchedTotal: number; at: string } | null;
} = {
  total: 0,
  completed: 0,
  running: false,
  lastTopUp: null,
};

export async function applyToJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { jobId } = req.params;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Fire-and-poll: respond immediately, run automation in background,
    // client polls GET /status. Keeps the API responsive for long-running
    // browser automation.
    res.json({ message: "Automation started", jobId });
    runApplicationAutomationWithRetry(jobId).catch((err) =>
      console.error(`[applications] automation crashed for ${jobId}:`, err)
    );
  } catch (err) {
    next(err);
  }
}

export async function applyToAll(req: Request, res: Response, next: NextFunction) {
  try {
    if (currentBatch.running) {
      return res.status(409).json({ error: "Apply-to-all is already running" });
    }
    const jobs = await prisma.job.findMany();

    if (jobs.length === 0) {
      return res.status(400).json({
        error: "No jobs in the queue yet. Run a scrape before starting Apply to All.",
      });
    }

    currentBatch = { total: jobs.length, completed: 0, running: true, lastTopUp: null };

    res.json({ message: "Apply-to-all started", total: jobs.length });

    runApplyToAll(() => {
      currentBatch.completed += 1;
    })
      .catch((err) => console.error("[applications] apply-to-all crashed:", err))
      .then(async () => {
        // Bonus behavior: once a batch that had real jobs finishes, top up
        // the queue with the next page of previously-unseen jobs from the
        // same board, so there's always more work queued after a run —
        // but only ever on a board that has already been scraped at least
        // once (guaranteed here, since `jobs.length > 0` above).
        try {
          const topUp = await scrapeMoreGreenhouseJobs();
          currentBatch.lastTopUp = {
            added: topUp.newlyAdded,
            fetchedTotal: topUp.fetchedTotal,
            at: new Date().toISOString(),
          };
        } catch (err) {
          console.error("[applications] auto top-up scrape failed:", err);
        }
      })
      .finally(() => {
        currentBatch.running = false;
      });
  } catch (err) {
    next(err);
  }
}

export async function applyToAllStatus(_req: Request, res: Response) {
  res.json(currentBatch);
}

export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({
      jobId: job.id,
      status: job.status,
      failureReason: job.failureReason,
      screenshotPath: job.screenshotPath,
    });
  } catch (err) {
    next(err);
  }
}

export async function getScreenshot(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job || !job.screenshotPath) {
      return res.status(404).json({ error: "Screenshot not available" });
    }
    const absolutePath = path.resolve(__dirname, "../../../", job.screenshotPath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Screenshot file missing on disk" });
    }
    res.sendFile(absolutePath);
  } catch (err) {
    next(err);
  }
}
