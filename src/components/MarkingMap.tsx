import { useMemo, useState } from "react";
import {
  KIND_LABEL,
  componentKind,
  evaluateArchive,
  type ComponentRecord,
} from "../domain/archive";

interface Props {
  records: ComponentRecord[];
  onSelect: (record: ComponentRecord) => void;
}

export default function MarkingMap({ records, onSelect }: Props) {
  const buildings = useMemo(
    () => [...new Set(records.map((r) => r.building).filter(Boolean))].sort(),
    [records]
  );
  const [building, setBuilding] = useState(buildings[0] ?? "");
  const [onlyRetake, setOnlyRetake] = useState(true);

  const activeBuilding = buildings.includes(building) ? building : buildings[0] ?? "";

  const items = records
    .filter((r) => r.building === activeBuilding)
    .map((r) => ({ r, evalResult: evaluateArchive(r, records) }))
    .filter(({ evalResult }) => !onlyRetake || evalResult.state === "retake");

  const W = 920;
  const colW = 170;
  const height = 360;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>病害标记图</p>
          <h2>{activeBuilding || "暂无建筑"} · 病害与照片标记</h2>
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
        <select
          value={activeBuilding}
          onChange={(e) => setBuilding(e.target.value)}
        >
          {buildings.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <span className="legend">
          <i className="dot dot-archived" /> 已归档
          <i className="dot dot-pending" /> 待核对
          <i className="dot dot-retake" /> 待补拍（照片号缺失/冲突）
        </span>
      </div>

      <div className="map-wrap">
        {items.length === 0 ? (
          <p className="empty-row map-empty">该建筑下没有待补拍构件，取消勾选可查看全部。</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${height}`} className="marking-svg" role="img">
            <line x1="0" y1="250" x2={W} y2="250" className="ground-line" />
            {items.map(({ r, evalResult }, idx) => {
              const x = 30 + idx * colW;
              const kind = componentKind(r.code);
              const retake = evalResult.state === "retake";
              const archived = evalResult.state === "archived";
              const fillClass = archived
                ? "shape-archived"
                : retake
                  ? "shape-retake"
                  : "shape-pending";
              const photosComplete =
                r.damage &&
                r.damage.closePhoto.trim() &&
                r.damage.overallPhoto.trim() &&
                !evalResult.photoIssues.some((i) => i.kind === "photoConflict");

              return (
                <g
                  key={r.id}
                  transform={`translate(${x},0)`}
                  className="shape-group"
                  onClick={() => onSelect(r)}
                >
                  {kind === "beam" && (
                    <rect x="20" y="140" width="130" height="34" rx="6" className={fillClass} />
                  )}
                  {kind === "column" && (
                    <rect x="62" y="100" width="46" height="150" rx="8" className={fillClass} />
                  )}
                  {kind === "bracket" && (
                    <>
                      <rect x="38" y="150" width="94" height="22" rx="4" className={fillClass} />
                      <rect x="55" y="120" width="60" height="22" rx="4" className={fillClass} />
                      <rect x="62" y="100" width="46" height="16" rx="4" className={fillClass} />
                    </>
                  )}
                  {kind === "other" && (
                    <rect x="40" y="130" width="90" height="60" rx="6" className={fillClass} />
                  )}

                  <text x="85" y="300" textAnchor="middle" className="svg-code">
                    {r.code}
                  </text>
                  <text x="85" y="318" textAnchor="middle" className="svg-sub">
                    {KIND_LABEL[kind]} · {r.tenon || "未定榫型"}
                  </text>

                  {r.damage && (
                    <g>
                      <circle
                        cx="85"
                        cy={kind === "column" ? 118 : 130}
                        r="9"
                        className={photosComplete ? "marker-ok" : "marker-bad"}
                      />
                      <text x="85" y="60" textAnchor="middle" className="svg-photo">
                        {r.damage.position || "缺位置"}
                      </text>
                      <text x="85" y="78" textAnchor="middle" className="svg-photo-sub">
                        近 {r.damage.closePhoto.trim() || "缺号"}
                      </text>
                      <text x="85" y="94" textAnchor="middle" className="svg-photo-sub">
                        整 {r.damage.overallPhoto.trim() || "缺号"}
                      </text>
                      <line x1="85" y1="100" x2="85" y2="121" className={photosComplete ? "leader-ok" : "leader-bad"} />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <p className="table-hint">点击构件可直接载入表单补录照片编号；红圈表示该病害缺照片或照片编号冲突。</p>
    </section>
  );
}
