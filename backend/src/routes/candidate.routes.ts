import { Router } from "express";
import { getCandidate, getResume } from "../controllers/candidate.controller";

const router = Router();

router.get("/", getCandidate);
router.get("/resume", getResume);

export default router;
