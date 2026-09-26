import { memberKind, type MemberKind } from "../domain/archive";
import type { Member } from "../domain/types";
import { StatusBadge } from "./StatusBadge";

interface RelationViewProps {
  members: Member[];
  building: string;
  onBuildingChange: (building: string) => void;
  buildings: string[];
  onSelect: (member: Member) => void;
}

/** 关系图中的构件分层落位 */
const KIND_LANE: Record<MemberKind, { x: number; y: number }> = {
  purlin: { x: 300, y: 70 },
  bracket: { x: 90, y: 150 },
  beam: { x: 300, y: 175 },
  column: { x: 90, y: 280 },
  other: { x: 510, y: 175 },
};

const KIND_LABEL: Record<MemberKind, string> = {
  column: "柱",
  beam: "梁枋",
  purlin: "檩椽",
  bracket: "斗拱",
  other: "其他",
};

export function RelationView({
  members,
  building,
  onBuildingChange,
  buildings,
  onSelect,
}: RelationViewProps) {
  // 关系视图只收录已归档构件
  const archived = members.filter(
    (member) => member.status === "archived" && (!building || member.building === building),
  );
  const excluded = members.filter(
    (member) =>
      member.status !== "archived" && (!building || member.building === building),
  );

  // 同类构件在同一层横向排开
  const lanes = new Map<MemberKind, Member[]>();
  for (const member of archived) {
    const kind = memberKind(member);
    if (!lanes.has(kind)) lanes.set(kind, []);
    lanes.get(kind)!.push(member);
  }

  const nodes = new Map<string, { x: number; y: number; member: Member }>();
  for (const [kind, laneMembers] of lanes) {
    laneMembers.forEach((member, index) => {
      const lane = KIND_LANE[kind];
      nodes.set(member.id, {
        x: lane.x + (index - (laneMembers.length - 1) / 2) * 120,
        y: lane.y,
        member,
      });
    });
  }

  return (
    <div className="relation-wrap">
      <div className="relation-toolbar">
        <select
          value={building}
          onChange={(event) => onBuildingChange(event.target.value)}
          aria-label="选择建筑"
        >
          {buildings.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <span className="relation-note">关系视图仅收录已归档构件，当前 {archived.length} 件</span>
      </div>

      <div className="relation-body">
        <svg viewBox="0 0 600 360" className="relation-svg" role="img" aria-label="构件关系视图">
          {/* 连接关系：柱→斗拱→梁→檩 */}
          {archived.some((m) => memberKind(m) === "column") &&
            archived.some((m) => memberKind(m) === "beam") && (
              <line className="edge edge-load" x1="90" y1="260" x2="240" y2="192" />
            )}
          {archived.some((m) => memberKind(m) === "column") &&
            archived.some((m) => memberKind(m) === "bracket") && (
              <line className="edge" x1="105" y1="258" x2="105" y2="172" />
            )}
          {archived.some((m) => memberKind(m) === "bracket") &&
            archived.some((m) => memberKind(m) === "beam") && (
              <line className="edge" x1="115" y1="150" x2="240" y2="175" />
            )}
          {archived.some((m) => memberKind(m) === "beam") &&
            archived.some((m) => memberKind(m) === "purlin") && (
              <line className="edge" x1="300" y1="158" x2="300" y2="92" />
            )}

          {[...nodes.values()].map(({ x, y, member }) => (
            <g key={member.id} className="relation-node" onClick={() => onSelect(member)}>
              <rect x={x - 52} y={y - 20} width="104" height="40" rx="8" className="node-box" />
              <text x={x} y={y - 3} textAnchor="middle" className="node-code">
                {member.code}
              </text>
              <text x={x} y={y + 13} textAnchor="middle" className="node-sub">
                {KIND_LABEL[memberKind(member)]} · {member.tenon}
              </text>
              <title>{`${member.code}｜${member.wood}｜截面 ${member.section}｜${member.damageLocation}`}</title>
            </g>
          ))}
        </svg>

        <aside className="relation-side">
          <h3>未收录（{excluded.length}）</h3>
          {excluded.length === 0 && <p className="empty small">本栋构件均已归档。</p>}
          <ul>
            {excluded.map((member) => (
              <li key={member.id} onClick={() => onSelect(member)}>
                <span className="mono">{member.code}</span>
                <StatusBadge status={member.status} />
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
