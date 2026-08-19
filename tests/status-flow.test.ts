import test from "node:test";
import assert from "node:assert/strict";
import { JobStatus } from "../backend/src/types";

test("JobStatus enum contains the full expected progression", () => {
  const expected = [
    "NOT_STARTED",
    "PROCESSING",
    "FORM_FILLED",
    "READY_FOR_SUBMISSION",
    "SCREENSHOT_CAPTURED",
    "FAILED",
  ];
  assert.deepEqual(Object.values(JobStatus).sort(), expected.sort());
});

test("a failed job status is a valid terminal state distinct from success", () => {
  assert.notEqual(JobStatus.FAILED, JobStatus.SCREENSHOT_CAPTURED);
});
