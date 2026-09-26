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

interface Placed {
  r: ComponentRecord;
  x: number;
  y: number;
  kind: ReturnType<typeof componentKind>;
}

export default function RelationView({ records, onSelect }: Props) {
  // 关系视图只收录已归档构件：逐条过归档判断
  const evaluated = useMemo(
    () =>
      records.map((r) => ({ r, evalResult: evaluateArchive(r, records) })),
    [records]
  );
  const archived = evaluated
    .filter(({ evalResult }) => evalResult.state === "archived")
    .map(({ r }) => r);

  const excludedCount = records.length - archived.length;

  const buildings = useMemo(
    () => [...new Set(archived.map((r) => r.building))].sort(),
    [archived]
  );
  const [building, setBuilding] = useState(buildings[0] ?? "");
  const activeBuilding = buildings.includes(building) ? building : buildings[0] ?? "";

  const members = archived.filter((r) => r.building === activeBuilding);

  const W = 920;
  const H = 400;
  const step = 150;
  const placed: Placed[] = [];
  const cols = members.filter((r) => componentKind(r.code) === "column");
  const brackets = members.filter((r) => componentKind(r.code) === "bracket");
  const beams = members.filter((r) => componentKind(r.code) === "beam");
  const others = members.filter(
    (r) => !["column", "bracket", "beam"].includes(componentKind(r.code))
  );

  const placeRow = (list: ComponentRecord[], y: number, startX = 60) =>
    list.forEach((r, i) =>
      placed.push({ r, x: startX + i * step, y, kind: componentKind(r.code) })
    );

  placeRow(cols, 250);
  placeRow(brackets, 170);
  placeRow(beams, 90);
  placeRow(others, 330);

  const byKind = (kind: string) => placed.filter((p) => p.kind === kind);
  const nearest = (p: Placed, list: Placed[]) => {
    let best: Placed | null = null;
    let bestD = Infinity;
    for (const q of list) {
      const d = Math.abs(q.x - p.x);
      if (d < bestD) {
        bestD = d;
        best = q;
      }
    }
    return best;
  };

  // 梁—斗拱—柱的连接关系（就近搭接），边上标注榫型
  const links: Array<{ a: Placed; b: Placed; label: string }> = [];
  const seen = new Set<string>();
  const addLink = (a: Placed | null, b: Placed | null) => {
    if (!a || !b) return;
    const key = [a.r.id, b.r.id].sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ a, b, label: b.r.tenon });
  };

  for (const br of byKind("bracket")) {
    addLink(br, nearest(br, byKind("column")));
    addLink(br, nearest(br, byKind("beam")));
  }
  // 没有斗拱时梁直接搭柱
  if (brackets.length === 0) {
    for (const bm of byKind("beam")) addLink(bm, nearest(bm, byKind("column")));
  }

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>单栋建筑构件关系视图</p>
          <h2>{activeBuilding || "暂无可展示建筑"} · 已归档构件</h2>
        </div>
        <select
          value={activeBuilding}
          onChange={(e) => setBuilding(e.target.value)}
          disabled={buildings.length === 0}
        >
          {buildings.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <p className="rule-note">
        关系视图仅收录已归档构件（当前 {archived.length} 件）；
        待补拍、待核对及截面/病害位置修正后待重核的 {excludedCount} 件不进入本图。
      </p>

      {members.length === 0 ? (
        <p className="empty-row map-empty">
          该建筑还没有已归档构件。请先在清单中完成照片编号核对并归档。
        </p>
      ) : (
        <div className="map-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="marking-svg" role="img">
            <line x1="0" y1="320" x2={W} y2="320" className="ground-line" />
            {links.map((link, i) => {
              const { a, b, label } = link;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                <g key={i}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="link-line" />
                  <text x={mx} y={my - 6} textAnchor="middle" className="svg-link-label">
                    {label}
                  </text>
                </g>
              );
            })}
            {placed.map((p) => (
              <g
                key={p.r.id}
                transform={`translate(${p.x - 55},${p.y - 20})`}
                className="shape-group"
                onClick={() => onSelect(p.r)}
              >
                <rect width="110" height="40" rx="7" className="shape-archived" />
                <text x="55" y="18" textAnchor="middle" className="svg-node-code">
                  {p.r.code}
                </text>
                <text x="55" y="33" textAnchor="middle" className="svg-node-sub">
                  {KIND_LABEL[p.kind]} · {p.r.wood}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}
