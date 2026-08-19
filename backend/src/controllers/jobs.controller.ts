import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { scrapeGreenhouseJobs } from "../services/scraper.service";

export async function listJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query;
    const jobs = await prisma.job.findMany({
      where: search
        ? {
            OR: [
              { title: { contains: String(search) } },
              { location: { contains: String(search) } },
              { description: { contains: String(search) } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json({ count: jobs.length, jobs });
  } catch (err) {
    next(err);
  }
}

export async function getJob(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err) {
    next(err);
  }
}

export async function triggerScrape(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await scrapeGreenhouseJobs();
    res.json({ message: "Scrape complete", ...result });
  } catch (err) {
    next(err);
  }
}
