import { Request, Response, NextFunction } from "express";
import fs from "fs";
import { loadCandidateProfile } from "../utils/candidate";

export async function getCandidate(_req: Request, res: Response, next: NextFunction) {
  try {
    const profile = loadCandidateProfile();
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function getResume(_req: Request, res: Response, next: NextFunction) {
  try {
    const profile = loadCandidateProfile();
    if (!fs.existsSync(profile.resumePath)) {
      return res.status(404).json({ error: "Resume file not found on disk" });
    }
    res.sendFile(profile.resumePath);
  } catch (err) {
    next(err);
  }
}
