import { NavLink } from "react-router-dom";
import { useGetCandidateQuery } from "../api/apiSlice";

function initials(first?: string, last?: string) {
  return `${(first || "?").charAt(0)}${(last || "").charAt(0)}`.toUpperCase();
}

export default function NavBar() {
  const { data: candidate } = useGetCandidateQuery();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded px-3 py-1.5 text-[13px] font-medium transition ${
      isActive ? "bg-indigo-light text-indigo" : "text-slate hover:text-ink"
    }`;

  return (
    <div className="border-b border-hairline bg-panel">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-display text-sm font-semibold tracking-tight text-ink">
            ⌁ automation console
          </span>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              Profile
            </NavLink>
          </nav>
        </div>

        {candidate && (
          <NavLink
            to="/profile"
            className="flex items-center gap-2.5 rounded-full border border-hairline py-1 pl-1 pr-3 transition hover:border-ink/20"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo font-mono text-[11px] font-medium text-white">
              {initials(candidate.firstName, candidate.lastName)}
            </span>
            <span className="text-[13px] font-medium text-ink">
              {candidate.firstName} {candidate.lastName}
            </span>
          </NavLink>
        )}
      </div>
    </div>
  );
}
