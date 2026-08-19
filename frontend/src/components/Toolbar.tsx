import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import { setSearchQuery } from "../store/slices/uiSlice";
import {
  useScrapeJobsMutation,
  useApplyToAllMutation,
  useGetApplyAllStatusQuery,
} from "../api/apiSlice";

export default function Toolbar() {
  const dispatch = useDispatch();
  const searchQuery = useSelector((s: RootState) => s.ui.searchQuery);

  const [scrapeJobs, { isLoading: isScraping }] = useScrapeJobsMutation();
  const [applyToAll, { isLoading: isStartingAll }] = useApplyToAllMutation();
  const { data: batchStatus } = useGetApplyAllStatusQuery(undefined, {
    pollingInterval: 2000,
  });

  const progressPct =
    batchStatus && batchStatus.total > 0
      ? Math.round((batchStatus.completed / batchStatus.total) * 100)
      : 0;

  return (
    <div className="mb-6 rounded-lg border border-hairline bg-panel px-4 py-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate">
            /
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            placeholder="search title or keyword"
            className="w-full rounded border border-hairline bg-blueprint py-2 pl-7 pr-3 font-mono text-[13px] text-ink placeholder:text-slate/70 focus:border-indigo focus:outline-none focus:ring-1 focus:ring-indigo"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => scrapeJobs()}
            disabled={isScraping}
            className="rounded border border-hairline px-3.5 py-2 text-xs font-medium text-ink transition hover:border-ink/30 hover:bg-blueprint disabled:opacity-50"
          >
            {isScraping ? "Scraping…" : "Scrape jobs"}
          </button>
          <button
            onClick={() => applyToAll()}
            disabled={isStartingAll || batchStatus?.running}
            className="rounded bg-ink px-3.5 py-2 text-xs font-medium text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {batchStatus?.running ? "Running batch…" : "Apply to all"}
          </button>
        </div>
      </div>

      {batchStatus?.running && (
        <div className="mt-3 flex items-center gap-3 border-t border-hairline pt-3">
          <span className="whitespace-nowrap font-mono text-[11px] text-slate">
            {String(batchStatus.completed).padStart(2, "0")} / {String(batchStatus.total).padStart(2, "0")} processed
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full rounded-full bg-indigo transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {!batchStatus?.running && batchStatus?.lastTopUp && batchStatus.lastTopUp.added > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          <span className="font-mono text-[11px] text-teal">
            queue topped up — {batchStatus.lastTopUp.added} new job
            {batchStatus.lastTopUp.added === 1 ? "" : "s"} pulled in from the board
          </span>
        </div>
      )}
    </div>
  );
}
