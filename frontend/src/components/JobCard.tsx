import { useDispatch } from "react-redux";
import { Job } from "../types";
import StatusBadge from "./StatusBadge";
import PipelineRail from "./PipelineRail";
import { useApplyToJobMutation } from "../api/apiSlice";
import { openScreenshotModal } from "../store/slices/uiSlice";

export default function JobCard({ job }: { job: Job }) {
  const dispatch = useDispatch();
  const [applyToJob, { isLoading }] = useApplyToJobMutation();

  const isBusy = job.status === "PROCESSING" || isLoading;
  const hasScreenshot = Boolean(job.screenshotPath);

  return (
    <div className="group relative flex flex-col rounded-lg border border-hairline bg-panel p-5 shadow-[0_1px_0_rgba(18,32,61,0.04)] transition hover:border-ink/20 hover:shadow-[0_4px_16px_rgba(18,32,61,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug text-ink">
            {job.title}
          </h3>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate">
            {job.company} · {job.location}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-3.5">
        <PipelineRail status={job.status} />
      </div>

      <p className="mt-3.5 line-clamp-3 text-[13px] leading-relaxed text-ink/70">
        {job.description}
      </p>

      {job.status === "FAILED" && job.failureReason && (
        <div className="mt-3 border-l-2 border-signal bg-signal-light py-1.5 pl-2.5 pr-2">
          <p className="font-mono text-[11px] leading-relaxed text-signal">{job.failureReason}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
        <a
          href={job.jobUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-hairline px-3 py-1.5 text-xs font-medium text-ink transition hover:border-ink/30 hover:bg-blueprint"
        >
          View job
        </a>

        <button
          onClick={() => applyToJob(job.id)}
          disabled={isBusy}
          className="rounded bg-indigo px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? "Running…" : "Apply"}
        </button>

        {hasScreenshot && (
          <button
            onClick={() => dispatch(openScreenshotModal(job.id))}
            className="rounded border border-teal/40 px-3 py-1.5 text-xs font-medium text-teal transition hover:bg-teal-light"
          >
            View evidence
          </button>
        )}
      </div>
    </div>
  );
}
