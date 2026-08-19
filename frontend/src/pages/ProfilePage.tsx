import { useGetCandidateQuery, useGetJobsQuery } from "../api/apiSlice";
import AppliedJobRow from "../components/AppliedJobRow";
import ScreenshotModal from "../components/ScreenshotModal";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function initials(first?: string, last?: string) {
  return `${(first || "?").charAt(0)}${(last || "").charAt(0)}`.toUpperCase();
}

export default function ProfilePage() {
  const { data: candidate, isLoading: candidateLoading } = useGetCandidateQuery();
  const { data: jobsData, isLoading: jobsLoading } = useGetJobsQuery(undefined, {
    pollingInterval: 4000,
  });

  const appliedJobs = (jobsData?.jobs || [])
    .filter((j) => j.status !== "NOT_STARTED")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const verified = appliedJobs.filter((j) => j.status === "SCREENSHOT_CAPTURED").length;
  const failed = appliedJobs.filter((j) => j.status === "FAILED").length;
  const inProgress = appliedJobs.length - verified - failed;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-indigo">
        candidate record
      </p>
      <h1 className="mt-1 font-display text-[26px] font-semibold leading-tight text-ink">
        Profile
      </h1>

      {candidateLoading && (
        <p className="mt-6 font-mono text-xs text-slate">loading candidate profile…</p>
      )}

      {candidate && (
        <div className="mt-6 rounded-lg border border-hairline bg-panel p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo font-mono text-lg font-medium text-white">
                {initials(candidate.firstName, candidate.lastName)}
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">
                  {candidate.firstName} {candidate.lastName}
                </h2>
                <p className="mt-0.5 text-[13px] text-slate">
                  {candidate.education || "Candidate"} · {candidate.experience || "—"}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px] text-slate">
                  <span>{candidate.email}</span>
                  <span>{candidate.phone}</span>
                  <span>{candidate.location}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11.5px]">
                  {candidate.linkedin && (
                    <a href={candidate.linkedin} target="_blank" rel="noreferrer" className="text-indigo hover:underline">
                      linkedin ↗
                    </a>
                  )}
                  {candidate.github && (
                    <a href={candidate.github} target="_blank" rel="noreferrer" className="text-indigo hover:underline">
                      github ↗
                    </a>
                  )}
                  <a
                    href={`${BASE_URL}/api/candidate/resume`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo hover:underline"
                  >
                    resume.pdf ↗
                  </a>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-5 font-mono text-xs sm:pl-4">
              <div>
                <div className="text-2xl font-medium text-ink">{appliedJobs.length}</div>
                <div className="text-slate">applied</div>
              </div>
              <div>
                <div className="text-2xl font-medium text-teal">{verified}</div>
                <div className="text-slate">verified</div>
              </div>
              <div>
                <div className="text-2xl font-medium text-amber">{inProgress}</div>
                <div className="text-slate">in progress</div>
              </div>
              <div>
                <div className="text-2xl font-medium text-signal">{failed}</div>
                <div className="text-slate">failed</div>
              </div>
            </div>
          </div>

          {candidate.skills && candidate.skills.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5 border-t border-hairline pt-4">
              {candidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded border border-hairline bg-blueprint px-2 py-1 font-mono text-[10.5px] text-ink"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-display text-sm font-semibold text-ink">Applied jobs</h3>
        <p className="mt-1 text-[13px] text-slate">
          Every job this candidate's automation has attempted, most recent first.
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border border-hairline bg-panel">
          {jobsLoading && (
            <p className="px-4 py-8 text-center font-mono text-xs text-slate">loading…</p>
          )}

          {!jobsLoading && appliedJobs.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="font-mono text-xs text-slate">no applications yet</p>
              <p className="mt-1 text-sm text-ink">
                Head to the Dashboard and run <span className="font-mono text-indigo">Apply</span>{" "}
                or <span className="font-mono text-indigo">Apply to all</span> to get started.
              </p>
            </div>
          )}

          {appliedJobs.map((job) => (
            <AppliedJobRow key={job.id} job={job} />
          ))}
        </div>
      </div>

      <ScreenshotModal />
    </div>
  );
}
