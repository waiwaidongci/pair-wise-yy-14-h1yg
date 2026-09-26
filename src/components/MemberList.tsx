import { needsPhotos } from "../domain/archive";
import type { Member } from "../domain/types";
import { StatusBadge } from "./StatusBadge";

interface MemberListProps {
  members: Member[];
  selectedId?: string;
  onSelect: (member: Member) => void;
  onArchive: (id: string) => void;
  onRemove: (id: string) => void;
}

export function MemberList({
  members,
  selectedId,
  onSelect,
  onArchive,
  onRemove,
}: MemberListProps) {
  if (members.length === 0) {
    return <p className="empty">没有符合筛选条件的构件记录。</p>;
  }

  return (
    <div className="record-list">
      {members.map((member) => {
        const photos = needsPhotos(member.damageLocation);
        return (
          <article
            key={member.id}
            className={member.id === selectedId ? "record selected" : "record"}
          >
            <div className="record-main" onClick={() => onSelect(member)}>
              <div className="record-head">
                <h3>{member.code}</h3>
                <StatusBadge status={member.status} />
              </div>
              <p className="record-meta">
                {member.building} · {member.wood} · {member.tenon} · 截面 {member.section}
              </p>
              <p className="record-damage">
                病害：{member.damageLocation || "位置待现场确认"}
                {member.damageNote ? `（${member.damageNote}）` : ""}
              </p>
              <p className={`record-photos ${photos ? "" : "no-damage"}`}>
                {photos ? (
                  <>
                    近景 <b className={member.closePhoto ? "ok-text" : "miss-text"}>
                      {member.closePhoto || "缺"}
                    </b>
                    {"　"}整体 <b className={member.overallPhoto ? "ok-text" : "miss-text"}>
                      {member.overallPhoto || "缺"}
                    </b>
                  </>
                ) : (
                  "无病害，免登照片"
                )}
              </p>
            </div>
            <div className="record-ops">
              <button onClick={() => onSelect(member)}>修正</button>
              <button
                disabled={member.status === "archived"}
                title={member.status === "archived" ? "已归档" : "核对齐全后归档"}
                onClick={() => onArchive(member.id)}
              >
                归档
              </button>
              <button className="danger" onClick={() => onRemove(member.id)}>
                删除
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
