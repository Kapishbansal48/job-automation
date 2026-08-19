import fs from "fs";
import path from "path";
import { CandidateProfile } from "../types";

const CANDIDATE_PATH = path.resolve(
  __dirname,
  "../../",
  process.env.CANDIDATE_PROFILE_PATH || "../data/candidate.json"
);

/**
 * Candidate data is intentionally kept out of the database and out of the
 * automation logic itself, per the assessment spec. It lives in a plain
 * JSON file that a non-developer could edit.
 */
export function loadCandidateProfile(): CandidateProfile {
  const raw = fs.readFileSync(CANDIDATE_PATH, "utf-8");
  const profile = JSON.parse(raw) as CandidateProfile;

  // Resume path in the JSON is relative to the data/ folder.
  const resumeAbsolutePath = path.resolve(
    path.dirname(CANDIDATE_PATH),
    path.basename(profile.resumePath)
  );

  return { ...profile, resumePath: resumeAbsolutePath };
}
