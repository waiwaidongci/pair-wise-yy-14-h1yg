import { useMemo, useState } from "react";
import "./styles.css";
import {
  evaluateArchive,
  type ComponentRecord,
} from "./domain/archive";
import {
  createBlank,
  deleteRecord,
  loadRecords,
  markArchived,
  resetRecords,
  saveRecord,
  unarchive,
} from "./services/store";
import ComponentForm from "./components/ComponentForm";
import ComponentList, { type ListFilters } from "./components/ComponentList";
import DimensionTable from "./components/DimensionTable";
import MarkingMap from "./components/MarkingMap";
import RelationView from "./components/RelationView";

type Tab = "list" | "form" | "dimension" | "map" | "relation";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "list", label: "构件清单" },
  { key: "form", label: "录入核对" },
  { key: "dimension", label: "尺寸记录表" },
  { key: "map", label: "病害标记图" },
  { key: "relation", label: "关系视图" },
];

function cloneRecord(r: ComponentRecord): ComponentRecord {
  return { ...r, damage: r.damage ? { ...r.damage } : null };
}

export default function App() {
  const [records, setRecords] = useState<ComponentRecord[]>(() => loadRecords());
  const [draft, setDraft] = useState<ComponentRecord>(() => createBlank());
  const [tab, setTab] = useState<Tab>("list");
  const [filters, setFilters] = useState<ListFilters>({
    state: "all",
    tenon: "",
    building: "",
    photoQuery: "",
  });
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const buildings = useMemo(
    () =>
      [
        ...new Set(
          [...records.map((r) => r.building), draft.building].filter(Boolean)
        ),
      ].sort() as string[],
    [records, draft.building]
  );

  const stats = useMemo(() => {
    let archived = 0;
    let retake = 0;
    let damage = 0;
    for (const r of records) {
      const e = evaluateArchive(r, records);
      if (e.state === "archived") archived += 1;
      if (e.state === "retake") retake += 1;
      if (r.damage) damage += 1;
    }
    return { total: records.length, archived, retake, damage };
  }, [records]);

  // —— 以下均为页面操作：调用归档判断与保存层，自身不写规则 ——

  const openRecord = (r: ComponentRecord) => {
    setDraft(cloneRecord(r));
    setTab("form");
  };

  const handleSave = () => {
    const result = saveRecord(draft, records);
    if (!result.ok || !result.record) {
      flash(result.error ?? "保存失败");
      return;
    }
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === result.record!.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = result.record!;
        return next;
      }
      return [result.record!, ...prev];
    });
    setDraft(cloneRecord(result.record));
    flash("记录已保存（未归档），继续核对照片编号");
  };

  const handleArchive = () => {
    // 页面层在按钮处再做一次归档判断，规则仍来自 domain
    const e = evaluateArchive(draft, records);
    if (!e.canArchive) {
      flash(e.photoIssues.length > 0 ? "缺照片编号或编号冲突，停在待补拍" : "核对未通过，不能归档");
      return;
    }
    // 先保证记录已落库（保存层），再写归档快照
    const saved = saveRecord(draft, records);
    if (!saved.ok || !saved.record) {
      flash(saved.error ?? "保存失败，无法归档");
      return;
    }
    const base = records.some((r) => r.id === saved.record!.id)
      ? records
      : [saved.record!, ...records];
    const next = markArchived(saved.record.id, base);
    setRecords(next);
    const updated = next.find((r) => r.id === saved.record!.id);
    if (updated) setDraft(cloneRecord(updated));
    flash(
      e.recheck
        ? "重新核对通过：照片编号沿用，已按修正后的截面/病害位置重新归档"
        : "已归档：截面与病害位置快照已固化，照片编号沿用"
    );
  };

  const handleUnarchive = () => {
    const next = unarchive(draft.id, records);
    setRecords(next);
    const updated = next.find((r) => r.id === draft.id);
    if (updated) setDraft(cloneRecord(updated));
    flash("已取消归档");
  };

  const handleDelete = () => {
    if (!draft.code.trim()) {
      setDraft(createBlank());
      return;
    }
    if (!window.confirm(`确认删除构件 ${draft.code}？此操作不可恢复。`)) return;
    setRecords(deleteRecord(draft.id, records));
    setDraft(createBlank());
    flash("记录已删除");
  };

  const handleClear = () => setDraft(createBlank());

  const handleResetDemo = () => {
    if (!window.confirm("恢复为示例数据？当前录入将被覆盖。")) return;
    setRecords(resetRecords());
    setDraft(createBlank());
    flash("已恢复示例数据");
  };

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62013 · 木结构榫卯构件测绘归档台</p>
        <h1>榫卯测绘归档台</h1>
        <span>
          纸单照片号与现场构件一一对应：构件记录建筑、编号、木材、榫型、截面与病害位置；
          病害必须登记近景与整体照片编号，缺一项停在待补拍，同一照片编号只归一个病害。
          截面或病害位置修正后照片沿用、归档重新核对，关系视图只收录已归档构件。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>构件数量</small>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <small>已归档</small>
          <strong className="metric-ok">{stats.archived}</strong>
        </article>
        <article>
          <small>待补拍</small>
          <strong className="metric-retake">{stats.retake}</strong>
        </article>
        <article>
          <small>病害点</small>
          <strong>{stats.damage}</strong>
        </article>
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "tab-on" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <button className="tab-reset" onClick={handleResetDemo}>
          恢复示例数据
        </button>
      </nav>

      {tab === "list" && (
        <ComponentList
          records={records}
          filters={filters}
          selectedId={draft.code ? draft.id : null}
          onFiltersChange={setFilters}
          onSelect={openRecord}
        />
      )}

      {tab === "form" && (
        <ComponentForm
          draft={draft}
          records={records}
          buildings={buildings}
          onChange={setDraft}
          onSave={handleSave}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          onDelete={handleDelete}
          onClear={handleClear}
        />
      )}

      {tab === "dimension" && (
        <DimensionTable records={records} onSelect={openRecord} />
      )}

      {tab === "map" && <MarkingMap records={records} onSelect={openRecord} />}

      {tab === "relation" && (
        <RelationView records={records} onSelect={openRecord} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
