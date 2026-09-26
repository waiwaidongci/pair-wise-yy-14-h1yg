import {
  evaluateArchive,
  type ComponentRecord,
  type RecordState,
} from "../domain/archive";

export interface ListFilters {
  state: RecordState | "all";
  tenon: string;
  building: string;
  photoQuery: string;
}

interface Props {
  records: ComponentRecord[];
  filters: ListFilters;
  selectedId: string | null;
  onFiltersChange: (next: ListFilters) => void;
  onSelect: (record: ComponentRecord) => void;
}

const STATE_TEXT: Record<string, string> = {
  archived: "已归档",
  retake: "待补拍",
  pending: "待核对",
};

export default function ComponentList({
  records,
  filters,
  selectedId,
  onFiltersChange,
  onSelect,
}: Props) {
  const tenons = [...new Set(records.map((r) => r.tenon).filter(Boolean))].sort();
  const buildings = [...new Set(records.map((r) => r.building).filter(Boolean))].sort();

  const rows = records
    .map((r) => ({ record: r, ev: evaluateArchive(r, records) }))
    .filter(({ record: r, ev }) => {
      if (filters.state !== "all" && ev.state !== filters.state) return false;
      if (filters.tenon && r.tenon !== filters.tenon) return false;
      if (filters.building && r.building !== filters.building) return false;
      if (filters.photoQuery.trim()) {
        const q = filters.photoQuery.trim().toLowerCase();
        const photos = r.damage
          ? [r.damage.closePhoto, r.damage.overallPhoto].join(" ")
          : "";
        if (!photos.toLowerCase().includes(q)) return false;
      }
      return true;
    });

  const retakeCount = records.filter(
    (r) => evaluateArchive(r, records).state === "retake"
  ).length;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>构件清单</p>
          <h2>
            测绘记录 <small>（{rows.length} 条，{retakeCount} 条待补拍）</small>
          </h2>
        </div>
      </div>

      <div className="filter-bar">
        <div className="seg">
          {(["all", "retake", "pending", "archived"] as const).map((s) => (
            <button
              key={s}
              className={filters.state === s ? "seg-on" : ""}
              onClick={() => onFiltersChange({ ...filters, state: s })}
            >
              {s === "all" ? "全部" : STATE_TEXT[s]}
            </button>
          ))}
        </div>
        <select
          value={filters.building}
          onChange={(e) => onFiltersChange({ ...filters, building: e.target.value })}
        >
          <option value="">全部建筑</option>
          {buildings.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={filters.tenon}
          onChange={(e) => onFiltersChange({ ...filters, tenon: e.target.value })}
        >
          <option value="">全部榫型</option>
          {tenons.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          className="photo-search"
          value={filters.photoQuery}
          placeholder="按照片编号检索，如 P-0217"
          onChange={(e) =>
            onFiltersChange({ ...filters, photoQuery: e.target.value })
          }
        />
      </div>

      <div className="table-wrap">
        <table className="grid-table">
          <thead>
            <tr>
              <th>状态</th>
              <th>建筑</th>
              <th>构件编号</th>
              <th>木材</th>
              <th>榫型</th>
              <th>截面(mm)</th>
              <th>病害位置</th>
              <th>近景/整体照片</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-row">
                  没有符合筛选条件的记录
                </td>
              </tr>
            )}
            {rows.map(({ record: r, ev }) => (
              <tr
                key={r.id}
                className={r.id === selectedId ? "row-selected" : ""}
                onClick={() => onSelect(r)}
              >
                <td>
                  <span className={`badge badge-${ev.state}`}>
                    {STATE_TEXT[ev.state]}
                    {ev.recheck ? "·重核" : ""}
                    {ev.state === "pending" && ev.canArchive ? "·可归档" : ""}
                  </span>
                </td>
                <td>{r.building || "—"}</td>
                <td className="mono">{r.code || "—"}</td>
                <td>{r.wood || "—"}</td>
                <td>{r.tenon || "—"}</td>
                <td className="mono">{r.section || "—"}</td>
                <td>{r.damage ? `${r.damage.position || "缺位置"}（${r.damage.kind}）` : "无"}</td>
                <td className="mono photo-cell">
                  {r.damage ? (
                    <>
                      <span className={r.damage.closePhoto ? "" : "photo-missing"}>
                        近 {r.damage.closePhoto || "缺"}
                      </span>
                      <span className={r.damage.overallPhoto ? "" : "photo-missing"}>
                        整 {r.damage.overallPhoto || "缺"}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-hint">点选行可载入表单编辑；缺照片号的记录标红并归入「待补拍」。</p>
    </section>
  );
}
