import { useDispatch } from "react-redux";
import { Job } from "../types";
import StatusBadge from "./StatusBadge";
import PipelineRail from "./PipelineRail";
import { openScreenshotModal } from "../store/slices/uiSlice";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function AppliedJobRow({ job }: { job: Job }) {
  const dispatch = useDispatch();

  return (
    <div className="grid grid-cols-1 items-center gap-3 border-b border-hairline px-4 py-3.5 last:border-b-0 sm:grid-cols-[1.6fr_1fr_0.9fr_auto]">
      <div className="min-w-0">
        <p className="truncate font-display text-[13.5px] font-semibold text-ink">{job.title}</p>
        <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-wide text-slate">
          {job.company} · {job.location}
        </p>
      </div>

      <div className="min-w-[120px]">
        <PipelineRail status={job.status} />
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={job.status} />
      </div>

      <div className="flex items-center justify-start gap-2 sm:justify-end">
        <span className="whitespace-nowrap font-mono text-[10.5px] text-slate">
          {timeAgo(job.updatedAt)}
        </span>
        {job.screenshotPath && (
          <button
            onClick={() => dispatch(openScreenshotModal(job.id))}
            className="whitespace-nowrap rounded border border-teal/40 px-2 py-1 text-[11px] font-medium text-teal transition hover:bg-teal-light"
          >
            evidence
          </button>
        )}
      </div>
    </div>
  );
}
