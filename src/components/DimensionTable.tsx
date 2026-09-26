import type { Member } from "../domain/types";
import { StatusBadge } from "./StatusBadge";

interface DimensionTableProps {
  members: Member[];
  onSelect: (member: Member) => void;
}

interface ParsedSection {
  a: number | null;
  b: number | null;
  round: boolean;
}

/** 解析截面文本：180×240 / 180x240 / φ320 / 320（mm） */
function parseSection(text: string): ParsedSection {
  const round = /φ|Φ|直径|径/.test(text);
  const nums = text.replace(/φ|Φ|直径|径|mm|毫米/gi, "").match(/\d+(?:\.\d+)?/g);
  if (!nums) return { a: null, b: null, round };
  const [a, b] = nums.map(Number);
  return { a: a ?? null, b: b ?? null, round };
}

export function DimensionTable({ members, onSelect }: DimensionTableProps) {
  if (members.length === 0) {
    return <p className="empty">没有符合筛选条件的尺寸记录。</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>建筑</th>
            <th>榫型</th>
            <th>截面（原始）</th>
            <th>宽/直径(mm)</th>
            <th>高(mm)</th>
            <th>病害位置</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const parsed = parseSection(member.section);
            return (
              <tr
                key={member.id}
                className={member.status === "pending_photo" || member.status === "recheck" ? "row-pending" : ""}
                onClick={() => onSelect(member)}
              >
                <td className="mono">{member.code}</td>
                <td>{member.building}</td>
                <td>{member.tenon}</td>
                <td className="mono">{member.section}</td>
                <td className="num">{parsed.a ?? "—"}</td>
                <td className="num">{parsed.round ? "—" : (parsed.b ?? "—")}</td>
                <td>{member.damageLocation || "待确认"}</td>
                <td>
                  <StatusBadge status={member.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
