import { Router } from "express";
import {
  applyToJob,
  applyToAll,
  applyToAllStatus,
  getStatus,
  getScreenshot,
} from "../controllers/applications.controller";

const router = Router();

router.post("/apply-all", applyToAll);
router.get("/apply-all/status", applyToAllStatus);
router.post("/:jobId/apply", applyToJob);
router.get("/:jobId/status", getStatus);
router.get("/:jobId/screenshot", getScreenshot);

export default router;
