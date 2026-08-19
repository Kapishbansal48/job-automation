import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { closeScreenshotModal } from "../store/slices/uiSlice";
import { useGetJobsQuery } from "../api/apiSlice";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function ScreenshotModal() {
  const dispatch = useDispatch();
  const jobId = useSelector((s: RootState) => s.ui.screenshotModalJobId);
  const { data } = useGetJobsQuery();

  if (!jobId) return null;

  const job = data?.jobs.find((j) => j.id === jobId);
  if (!job?.screenshotPath) return null;

  const capturedAt = new Date(job.updatedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-[2px]"
      onClick={() => dispatch(closeScreenshotModal())}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-hairline bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline bg-blueprint px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-teal">
              evidence · final review stage
            </p>
            <h4 className="font-display text-sm font-semibold text-ink">{job.title}</h4>
          </div>
          <button
            onClick={() => dispatch(closeScreenshotModal())}
            aria-label="Close"
            className="rounded px-2.5 py-1 font-mono text-xs text-slate transition hover:bg-hairline/40 hover:text-ink"
          >
            close ✕
          </button>
        </div>

        <div className="p-4">
          <img
            src={`${BASE_URL}/${job.screenshotPath}`}
            alt={`Screenshot proof for ${job.title}`}
            className="w-full rounded border border-hairline"
          />
        </div>

        <div className="flex items-center justify-between border-t border-hairline px-4 py-2.5">
          <span className="font-mono text-[11px] text-slate">
            job_id: {job.id.slice(0, 12)}…
          </span>
          <span className="font-mono text-[11px] text-slate">
            captured {capturedAt.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
