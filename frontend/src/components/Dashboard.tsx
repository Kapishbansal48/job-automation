import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useGetJobsQuery } from "../api/apiSlice";
import JobCard from "./JobCard";
import Toolbar from "./Toolbar";
import ScreenshotModal from "./ScreenshotModal";

function countByStatus(jobs: { status: string }[] | undefined) {
  const counts: Record<string, number> = {};
  jobs?.forEach((j) => {
    counts[j.status] = (counts[j.status] || 0) + 1;
  });
  return counts;
}

export default function Dashboard() {
  const searchQuery = useSelector((s: RootState) => s.ui.searchQuery);
  const { data, isLoading, isError } = useGetJobsQuery(searchQuery || undefined, {
    pollingInterval: 4000,
  });

  const counts = countByStatus(data?.jobs);
  const verified = counts["SCREENSHOT_CAPTURED"] || 0;
  const failed = counts["FAILED"] || 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-indigo">
            application automation · control room
          </p>
          <h1 className="mt-1 font-display text-[26px] font-semibold leading-tight text-ink">
            Job Application Dashboard
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-slate">
            Jobs sourced from a public Greenhouse board. Every run fills the form, reaches the final
            review stage, captures proof — and stops before submission.
          </p>
        </div>

        {data && data.jobs.length > 0 && (
          <div className="flex shrink-0 gap-4 font-mono text-xs">
            <div>
              <div className="text-2xl font-medium text-ink">{data.jobs.length}</div>
              <div className="text-slate">total</div>
            </div>
            <div>
              <div className="text-2xl font-medium text-teal">{verified}</div>
              <div className="text-slate">verified</div>
            </div>
            <div>
              <div className="text-2xl font-medium text-signal">{failed}</div>
              <div className="text-slate">failed</div>
            </div>
          </div>
        )}
      </header>

      <Toolbar />

      {isLoading && (
        <p className="py-8 text-center font-mono text-xs text-slate">loading jobs…</p>
      )}

      {isError && (
        <div className="rounded-lg border border-signal/30 bg-signal-light px-4 py-3">
          <p className="font-mono text-xs text-signal">
            connection error — could not reach the backend. confirm the API server is running on
            the configured port.
          </p>
        </div>
      )}

      {!isLoading && !isError && data?.jobs.length === 0 && (
        <div className="rounded-lg border border-dashed border-hairline py-14 text-center">
          <p className="font-mono text-xs text-slate">no jobs in the queue</p>
          <p className="mt-1 text-sm text-ink">
            Run <span className="font-mono text-indigo">Scrape jobs</span> to pull openings from
            Greenhouse.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      <ScreenshotModal />
    </div>
  );
}
