import { useMemo, useState } from "react";
import {
  evaluateArchive,
  parseSection,
  sectionArea,
  type ComponentRecord,
} from "../domain/archive";

interface Props {
  records: ComponentRecord[];
  onSelect: (record: ComponentRecord) => void;
}

export default function DimensionTable({ records, onSelect }: Props) {
  const [building, setBuilding] = useState("");
  const [onlyRetake, setOnlyRetake] = useState(false);
  const [tenon, setTenon] = useState("");

  const buildings = useMemo(
    () => [...new Set(records.map((r) => r.building).filter(Boolean))].sort(),
    [records]
  );
  const tenons = useMemo(
    () => [...new Set(records.map((r) => r.tenon).filter(Boolean))].sort(),
    [records]
  );

  const rows = records
    .map((r) => {
      const evalResult = evaluateArchive(r, records);
      const dims = parseSection(r.section);
      return { r, evalResult, dims, area: sectionArea(r.section) };
    })
    .filter(({ r, evalResult }) => {
      if (building && r.building !== building) return false;
      if (tenon && r.tenon !== tenon) return false;
      if (onlyRetake && evalResult.state !== "retake") return false;
      return true;
    })
    .sort((a, b) => (b.area ?? -1) - (a.area ?? -1));

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>尺寸记录表</p>
          <h2>截面尺寸台账</h2>
        </div>
        <label className="check-inline">
          <input
            type="checkbox"
            checked={onlyRetake}
            onChange={(e) => setOnlyRetake(e.target.checked)}
          />
          只看待补拍
        </label>
      </div>

      <div className="filter-bar">
        <select value={building} onChange={(e) => setBuilding(e.target.value)}>
          <option value="">全部建筑</option>
          {buildings.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select value={tenon} onChange={(e) => setTenon(e.target.value)}>
          <option value="">全部榫型</option>
          {tenons.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="filter-note">按截面积从大到小排列；截面修正后照片沿用、需重新核对归档。</span>
      </div>

      <div className="table-wrap">
        <table className="grid-table">
          <thead>
            <tr>
              <th>建筑</th>
              <th>编号</th>
              <th>榫型</th>
              <th>截面记录</th>
              <th>宽/径(mm)</th>
              <th>高(mm)</th>
              <th>估算面积(mm²)</th>
              <th>核对状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-row">
                  暂无尺寸记录
                </td>
              </tr>
            )}
            {rows.map(({ r, evalResult, dims, area }) => (
              <tr key={r.id} onClick={() => onSelect(r)}>
                <td>{r.building || "—"}</td>
                <td className="mono">{r.code || "—"}</td>
                <td>{r.tenon || "—"}</td>
                <td className={r.section.trim() ? "mono" : "photo-missing"}>
                  {r.section.trim() || "缺截面"}
                </td>
                <td className="mono">{dims.a ?? "—"}</td>
                <td className="mono">{dims.b ?? "—"}</td>
                <td className="mono">{area !== null ? area.toLocaleString() : "—"}</td>
                <td>
                  <span className={`badge badge-${evalResult.state}`}>
                    {evalResult.state === "archived"
                      ? "已归档"
                      : evalResult.state === "retake"
                        ? "待补拍"
                        : evalResult.recheck
                          ? "待重核"
                          : "待核对"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
