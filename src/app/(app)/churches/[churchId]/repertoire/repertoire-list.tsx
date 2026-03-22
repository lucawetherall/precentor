"use client";

import { useState, useMemo } from "react";
import { Music, Search, ArrowUpDown } from "lucide-react";
import { format, parseISO } from "date-fns";

interface PieceData {
  name: string;
  count: number;
  lastDate: string;
}

interface LogEntry {
  id: string;
  date: string;
  freeText: string | null;
}

type SortField = "count" | "lastDate" | "name";

export function RepertoireList({
  pieces,
  logs,
}: {
  pieces: PieceData[];
  logs: LogEntry[];
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("count");
  const [showCount, setShowCount] = useState(30);

  const filteredPieces = useMemo(() => {
    let result = pieces;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "count") return b.count - a.count;
      if (sortBy === "lastDate") return b.lastDate.localeCompare(a.lastDate);
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [pieces, search, sortBy]);

  const filteredLogs = useMemo(() => {
    if (!search) return logs.slice(0, showCount);
    const q = search.toLowerCase();
    return logs.filter((l) => (l.freeText || "").toLowerCase().includes(q)).slice(0, showCount);
  }, [logs, search, showCount]);

  if (pieces.length === 0) {
    return (
      <div className="border border-border bg-card p-8 text-center">
        <Music className="h-10 w-10 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
        <p className="text-muted-foreground">
          No performance history yet. Music will be logged automatically after services are marked as archived.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Search and sort controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pieces..."
            aria-label="Search pieces"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border bg-background focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            aria-label="Sort by"
            className="text-sm border border-border px-2 py-2 bg-background focus:border-primary focus:outline-none"
          >
            <option value="count">Most performed</option>
            <option value="lastDate">Most recent</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Most Performed */}
      <div className="mb-8">
        <h2 className="text-xl font-heading font-semibold mb-4">Most Performed</h2>
        {filteredPieces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pieces match your search.</p>
        ) : (
          <div className="border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-foreground text-background">
                  <th className="px-3 py-2 text-left font-body font-normal">Piece</th>
                  <th className="px-3 py-2 text-right font-body font-normal">Times</th>
                  <th className="px-3 py-2 text-right font-body font-normal hidden sm:table-cell">Last Performed</th>
                </tr>
              </thead>
              <tbody>
                {filteredPieces.slice(0, showCount).map((piece, i) => (
                  <tr key={piece.name} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                    <td className="px-3 py-2">
                      {piece.name}
                      <span className="text-xs text-muted-foreground sm:hidden block">
                        {format(parseISO(piece.lastDate), "d MMM yyyy")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{piece.count}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs hidden sm:table-cell">
                      {format(parseISO(piece.lastDate), "d MMM yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPieces.length > showCount && (
              <div className="border-t border-border p-3 text-center">
                <button
                  onClick={() => setShowCount((c) => c + 30)}
                  className="text-sm text-primary hover:underline"
                >
                  Show more ({filteredPieces.length - showCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Performances */}
      <div>
        <h2 className="text-xl font-heading font-semibold mb-4">Recent Performances</h2>
        <div className="space-y-1">
          {filteredLogs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 text-sm border-b border-border py-1">
              <span className="font-mono text-xs text-muted-foreground w-24 flex-shrink-0">
                {format(parseISO(log.date), "d MMM yyyy")}
              </span>
              <span>{log.freeText || "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
