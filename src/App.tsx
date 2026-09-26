import { useMemo, useRef, useState } from "react";
import "./styles.css";
import { EntryForm } from "./components/EntryForm";
import { Filters, applyFilters, type FilterState } from "./components/Filters";
import { MemberList } from "./components/MemberList";
import { DimensionTable } from "./components/DimensionTable";
import { MarkingPlan } from "./components/MarkingPlan";
import { RelationView } from "./components/RelationView";
import { useMemberOps } from "./hooks/useMembers";
import type { Member, MemberDraft } from "./domain/types";

type TabKey = "list" | "dimensions" | "plan" | "relation";

const TABS: { key: TabKey; label: string }[] = [
  { key: "list", label: "构件清单" },
  { key: "dimensions", label: "尺寸记录表" },
  { key: "plan", label: "病害标记图" },
  { key: "relation", label: "构件关系视图" },
];

function App() {
  const ops = useMemberOps();
  const { members } = ops;

  const [editing, setEditing] = useState<Member | null>(null);
  const [tab, setTab] = useState<TabKey>("list");
  const [filter, setFilter] = useState<FilterState>({
    building: "",
    tenon: "",
    pendingOnly: false,
  });
  const [relationBuilding, setRelationBuilding] = useState("");
  const [flash, setFlash] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const buildings = useMemo(
    () => [...new Set(members.map((member) => member.building).filter(Boolean))].sort(),
    [members],
  );
  const tenons = useMemo(
    () => [...new Set(members.map((member) => member.tenon).filter(Boolean))].sort(),
    [members],
  );

  const pendingCount = members.filter(
    (member) => member.status === "pending_photo" || member.status === "recheck",
  ).length;
  const archivedCount = members.filter((member) => member.status === "archived").length;
  const damageCount = members.filter(
    (member) => member.damageLocation && member.damageLocation !== "无病害",
  ).length;

  const filtered = useMemo(() => applyFilters(members, filter), [members, filter]);

  const showPendingFilter = () => {
    setFilter({ building: "", tenon: "", pendingOnly: true });
    setTab("list");
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelect = (member: Member) => {
    setEditing(member);
    scrollToForm();
  };

  const handleSubmit = (draft: MemberDraft, id?: string) => {
    const result = ops.saveDraft(draft, id);
    if (!result.ok) {
      setFlash({ tone: "warn", text: result.error ?? "保存失败" });
      return;
    }
    if (result.member) {
      setEditing(result.member);
      if (result.member.status === "pending_photo") {
        setFlash({
          tone: "warn",
          text: `已保存 ${result.member.code}：照片编号有缺项，停在待补拍。`,
        });
      } else if (result.member.status === "recheck") {
        setFlash({ tone: "warn", text: `${result.member.code} 已修正，照片沿用，请重新核对归档。` });
      } else {
        setFlash({ tone: "ok", text: `${result.member.code} 已保存，核对项齐全，可归档。` });
      }
    }
  };

  const handleArchive = (id: string) => {
    const result = ops.archive(id);
    if (!result.ok) {
      const missing = result.check?.issues.map((issue) => issue.label).join("、") ?? "";
      setFlash({
        tone: "warn",
        text: `未归档：${result.member?.code ?? ""} 缺 ${missing}，停在待补拍。`,
      });
      if (result.member) setEditing(result.member);
      return;
    }
    setFlash({ tone: "ok", text: `${result.member?.code} 已归档，收录构件关系视图。` });
    if (result.member) setEditing(result.member);
  };

  const handleRemove = (id: string) => {
    const target = members.find((member) => member.id === id);
    ops.remove(id);
    if (editing?.id === id) setEditing(null);
    if (target) setFlash({ tone: "warn", text: `已删除 ${target.code}。` });
  };

  const handleReset = () => {
    ops.reset();
    setEditing(null);
    setFlash({ tone: "ok", text: "已恢复演示数据。" });
  };

  return (
    <main className="app">
      <section className="hero">
        <p>榫卯测绘归档台 · 编号随纸单走，现场对得上构件</p>
        <h1>木结构榫卯构件测绘</h1>
        <span>
          每条记录登记建筑、编号、木材、榫型、截面与病害位置；病害须同时登记近景与整体照片编号，
          缺一项即停在待补拍，同一编号只归一个病害。清单、尺寸表、标记图都能筛出待补拍记录；
          截面或病害位置修正后照片沿用、归档重新核对。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>构件数量</small>
          <strong>{members.length}</strong>
        </article>
        <article className={pendingCount > 0 ? "metric-warn" : ""}>
          <small>待补拍 / 复核中</small>
          <strong>{pendingCount}</strong>
          {pendingCount > 0 && (
            <button className="link-btn" onClick={showPendingFilter}>
              看待补拍
            </button>
          )}
        </article>
        <article>
          <small>病害点</small>
          <strong>{damageCount}</strong>
        </article>
        <article>
          <small>已归档</small>
          <strong>{archivedCount}</strong>
        </article>
      </section>

      {flash && (
        <div className={`flash flash-${flash.tone}`} onClick={() => setFlash(null)}>
          {flash.text}
          <i>×</i>
        </div>
      )}

      <div ref={formRef} className="form-anchor">
        {/* key 随编辑目标变化，切换记录时表单整体重置 */}
        <EntryForm
          key={editing?.id ?? "new"}
          editing={editing}
          onSubmit={handleSubmit}
          onArchive={handleArchive}
          onCancel={() => setEditing(null)}
        />
      </div>

      <section className="panel views">
        <div className="heading">
          <div>
            <p>测绘成果</p>
            <h2>清单 · 尺寸表 · 标记图 · 关系视图</h2>
          </div>
          <button onClick={handleReset} title="清空本地修改，恢复演示数据">
            恢复演示数据
          </button>
        </div>

        <div className="tabs">
          {TABS.map((item) => (
            <button
              key={item.key}
              className={tab === item.key ? "tab active" : "tab"}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab !== "relation" && (
          <Filters
            buildings={buildings}
            tenons={tenons}
            value={filter}
            pendingCount={pendingCount}
            onChange={setFilter}
          />
        )}

        {tab === "list" && (
          <MemberList
            members={filtered}
            selectedId={editing?.id}
            onSelect={handleSelect}
            onArchive={handleArchive}
            onRemove={handleRemove}
          />
        )}

        {tab === "dimensions" && (
          <DimensionTable members={filtered} onSelect={handleSelect} />
        )}

        {tab === "plan" && (
          <MarkingPlan members={filtered} building={filter.building} onSelect={handleSelect} />
        )}

        {tab === "relation" && (
          <RelationView
            members={members}
            buildings={buildings}
            building={buildings.includes(relationBuilding) ? relationBuilding : buildings[0] ?? ""}
            onBuildingChange={setRelationBuilding}
            onSelect={handleSelect}
          />
        )}
      </section>
    </main>
  );
}

export default App;
