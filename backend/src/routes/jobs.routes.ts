import { Router } from "express";
import { listJobs, getJob, triggerScrape } from "../controllers/jobs.controller";

const router = Router();

router.get("/", listJobs);
router.get("/:id", getJob);
router.post("/scrape", triggerScrape);

export default router;
