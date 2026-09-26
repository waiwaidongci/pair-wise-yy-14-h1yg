import { useState } from "react";
import { FIELD_LABELS, NO_DAMAGE, checkArchivable, needsPhotos } from "../domain/archive";
import type { DraftKey, Member, MemberDraft } from "../domain/types";
import { StatusBadge } from "./StatusBadge";

export const EMPTY_DRAFT: MemberDraft = {
  building: "",
  code: "",
  wood: "",
  tenon: "",
  section: "",
  damageLocation: "",
  damageNote: "",
  closePhoto: "",
  overallPhoto: "",
};

const TENON_OPTIONS = ["燕尾榫", "透榫", "半榫", "箍头榫", "馒头榫", "管脚榫", "平榫"];
const WOOD_OPTIONS = ["杉木", "楠木", "落叶松", "硬杂木", "柏木"];
const LOCATION_OPTIONS = ["柱身", "柱脚", "梁端榫头", "梁身", "檩条", "斗拱", NO_DAMAGE];

interface EntryFormProps {
  editing: Member | null;
  onSubmit: (draft: MemberDraft, id?: string) => void;
  onArchive: (id: string) => void;
  onCancel: () => void;
}

export function EntryForm({ editing, onSubmit, onArchive, onCancel }: EntryFormProps) {
  const [draft, setDraft] = useState<MemberDraft>(
    editing ? stripMember(editing) : EMPTY_DRAFT,
  );

  const photosRequired = needsPhotos(draft.damageLocation);
  const check = checkArchivable(draft);
  const issueKeys = new Set(check.issues.map((issue) => issue.key));

  const update = (key: DraftKey, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleCancel = () => onCancel();

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>构件记录</p>
          <h2>{editing ? "修正构件" : "新增记录"}</h2>
        </div>
        {editing && <StatusBadge status={editing.status} />}
      </div>

      {editing && (
        <p className="form-hint">
          截面或病害位置修正后照片沿用；核对字段一变，归档即失效并转入复核。
        </p>
      )}

      <div className="field-grid">
        <label className={issueKeys.has("building") ? "field-warn" : ""}>
          <span>{FIELD_LABELS.building} *</span>
          <input
            value={draft.building}
            placeholder="如 大殿"
            onChange={(event) => update("building", event.target.value)}
          />
        </label>

        <label className={issueKeys.has("code") ? "field-warn" : ""}>
          <span>{FIELD_LABELS.code} *</span>
          <input
            value={draft.code}
            placeholder="如 ZD-L5"
            disabled={Boolean(editing)}
            title={editing ? "编号为记录标识，不可修改" : "同一编号只归一个病害"}
            onChange={(event) => update("code", event.target.value)}
          />
        </label>

        <label className={issueKeys.has("wood") ? "field-warn" : ""}>
          <span>{FIELD_LABELS.wood} *</span>
          <FieldInput
            value={draft.wood}
            options={WOOD_OPTIONS}
            placeholder="选择或手填木材"
            onChange={(value) => update("wood", value)}
          />
        </label>

        <label className={issueKeys.has("tenon") ? "field-warn" : ""}>
          <span>{FIELD_LABELS.tenon} *</span>
          <FieldInput
            value={draft.tenon}
            options={TENON_OPTIONS}
            placeholder="选择或手填榫型"
            onChange={(value) => update("tenon", value)}
          />
        </label>

        <label className={`field-wide ${issueKeys.has("section") ? "field-warn" : ""}`}>
          <span>{FIELD_LABELS.section} *</span>
          <input
            value={draft.section}
            placeholder="如 180×240 mm 或 φ320"
            onChange={(event) => update("section", event.target.value)}
          />
        </label>

        <label className={issueKeys.has("damageLocation") ? "field-warn" : ""}>
          <span>{FIELD_LABELS.damageLocation} *</span>
          <FieldInput
            value={draft.damageLocation}
            options={LOCATION_OPTIONS}
            placeholder="选择或手填位置"
            onChange={(value) => update("damageLocation", value)}
          />
        </label>

        <label className="field-wide">
          <span>{FIELD_LABELS.damageNote}（选填）</span>
          <input
            value={draft.damageNote}
            placeholder="变形、开裂程度等现场描述"
            onChange={(event) => update("damageNote", event.target.value)}
          />
        </label>

        <label className={issueKeys.has("closePhoto") ? "field-warn" : ""}>
          <span>
            {FIELD_LABELS.closePhoto}
            {photosRequired ? " *" : "（无病害免登）"}
          </span>
          <input
            value={draft.closePhoto}
            disabled={!photosRequired}
            placeholder="纸单近景编号，如 C-0118"
            onChange={(event) => update("closePhoto", event.target.value.toUpperCase())}
          />
        </label>

        <label className={issueKeys.has("overallPhoto") ? "field-warn" : ""}>
          <span>
            {FIELD_LABELS.overallPhoto}
            {photosRequired ? " *" : "（无病害免登）"}
          </span>
          <input
            value={draft.overallPhoto}
            disabled={!photosRequired}
            placeholder="纸单整体编号，如 O-0036"
            onChange={(event) => update("overallPhoto", event.target.value.toUpperCase())}
          />
        </label>
      </div>

      {check.issues.length > 0 && (
        <p className="check-line">
          缺项（停在待补拍）：{check.issues.map((issue) => issue.label).join("、")}
        </p>
      )}
      {check.ok && <p className="check-line ok">核对项齐全，可执行归档。</p>}

      <div className="form-actions">
        <button className="primary" onClick={() => onSubmit(draft, editing?.id)}>
          {editing ? "保存修正" : "保存记录"}
        </button>
        {editing && (
          <button
            className="accent"
            disabled={!check.ok}
            title={check.ok ? "归档并收录关系视图" : "缺项未补齐，无法归档"}
            onClick={() => onArchive(editing.id)}
          >
            归档核对
          </button>
        )}
        {editing && <button onClick={handleCancel}>返回新增</button>}
      </div>
    </section>
  );
}

/** 可选择可手填的字段 */
function FieldInput({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <span className="combo">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <select
        value={options.includes(value) ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        aria-label="快速选择"
      >
        <option value="">选择…</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </span>
  );
}

function stripMember(member: Member): MemberDraft {
  return {
    building: member.building,
    code: member.code,
    wood: member.wood,
    tenon: member.tenon,
    section: member.section,
    damageLocation: member.damageLocation,
    damageNote: member.damageNote,
    closePhoto: member.closePhoto,
    overallPhoto: member.overallPhoto,
  };
}
