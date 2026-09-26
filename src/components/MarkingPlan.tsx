import { memberKind } from "../domain/archive";
import type { Member } from "../domain/types";
import { StatusBadge } from "./StatusBadge";

interface MarkingPlanProps {
  members: Member[];
  building: string;
  onSelect: (member: Member) => void;
}

interface Spot {
  x: number;
  y: number;
  members: Member[];
}

const W = 760;
const H = 420;

/** 各类构件在木构架示意图上的基准落位 */
const BASE_SPOTS: Record<string, { x: number; y: number }> = {
  column: { x: 130, y: 250 },
  beam: { x: 380, y: 175 },
  purlin: { x: 380, y: 95 },
  bracket: { x: 130, y: 145 },
  other: { x: 380, y: 320 },
};

/** 同位置多条记录时的错位排布 */
const FAN = [
  { dx: 0, dy: 0 },
  { dx: 26, dy: 0 },
  { dx: -26, dy: 0 },
  { dx: 0, dy: -28 },
  { dx: 0, dy: 28 },
  { dx: 26, dy: -28 },
  { dx: -26, dy: 28 },
];

const DOT_FILL: Record<string, string> = {
  pending_photo: "#b45309",
  recheck: "#b45309",
  ready: "#0369a1",
  archived: "#0f766e",
};

export function MarkingPlan({ members, building, onSelect }: MarkingPlanProps) {
  if (members.length === 0) {
    return <p className="empty">该筛选下没有需要标记的病害点。</p>;
  }

  // 归类聚点
  const spots = new Map<string, Spot>();
  for (const member of members) {
    const kind = memberKind(member);
    const base = BASE_SPOTS[kind];
    const key = kind;
    if (!spots.has(key)) spots.set(key, { x: base.x, y: base.y, members: [] });
    spots.get(key)!.members.push(member);
  }

  return (
    <div className="plan-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="plan-svg" role="img" aria-label="病害标记图">
        {/* 台基 */}
        <rect x="60" y="346" width="640" height="18" rx="3" className="frame-stone" />
        <rect x="60" y="364" width="640" height="10" rx="2" className="frame-stone-dark" />

        {/* 柱 */}
        {[130, 630].map((x) => (
          <g key={x}>
            <rect x={x - 13} y="140" width="26" height="210" rx="9" className="frame-wood" />
            <rect x={x - 22} y="330" width="44" height="18" rx="3" className="frame-stone" />
          </g>
        ))}

        {/* 梁（抬梁式，两道） */}
        <rect x="104" y="176" width="552" height="26" rx="6" className="frame-wood" />
        <rect x="180" y="120" width="400" height="22" rx="6" className="frame-wood-light" />

        {/* 脊檩与檐檩 */}
        <rect x="80" y="72" width="600" height="14" rx="6" className="frame-wood-light" />
        <circle cx="380" cy="60" r="9" className="frame-wood" />

        {/* 斗拱示意 */}
        {[130, 630].map((x) => (
          <g key={`bracket-${x}`} className="frame-bracket">
            <rect x={x - 24} y="150" width="48" height="8" rx="2" />
            <rect x={x - 17} y="159" width="34" height="7" rx="2" />
            <rect x={x - 10} y="167" width="20" height="7" rx="2" />
          </g>
        ))}

        {/* 椽子线 */}
        {[180, 260, 340, 420, 500, 580].map((x) => (
          <line key={x} x1={x} y1="72" x2={x - 40} y2="120" className="frame-line" />
        ))}

        {/* 病害标记点 */}
        {[...spots.values()].map((spot) =>
          spot.members.map((member, index) => {
            const fan = FAN[index % FAN.length];
            const cx = spot.x + fan.dx;
            const cy = spot.y + fan.dy;
            return (
              <g
                key={member.id}
                className="marker"
                onClick={() => onSelect(member)}
                role="button"
                aria-label={`${member.code} ${member.damageLocation}`}
              >
                <circle cx={cx} cy={cy} r="13" fill={DOT_FILL[member.status]} />
                <text x={cx} y={cy + 4} textAnchor="middle" className="marker-text">
                  {member.code.slice(-2)}
                </text>
                <title>{`${member.code}｜${member.damageLocation}｜${member.damageNote || "无说明"}`}</title>
              </g>
            );
          }),
        )}
      </svg>

      <div className="plan-side">
        <p className="plan-building">{building || "全部建筑"} · 病害标记图</p>
        <ul className="legend">
          <li><i className="dot ok" /> 已归档</li>
          <li><i className="dot info" /> 可归档</li>
          <li><i className="dot warn" /> 待补拍 / 复核中</li>
        </ul>
        <ul className="plan-legend-list">
          {members.map((member) => (
            <li key={member.id} onClick={() => onSelect(member)}>
              <i className="sq" style={{ background: DOT_FILL[member.status] }} />
              <span className="mono">{member.code}</span>
              <span>{member.damageLocation || "位置待确认"}</span>
              <StatusBadge status={member.status} />
            </li>
          ))}
        </ul>
        <p className="plan-tip">圆点按病害位置落到柱、梁、檩、斗拱示意处，点击可跳转修正。</p>
      </div>
    </div>
  );
}
