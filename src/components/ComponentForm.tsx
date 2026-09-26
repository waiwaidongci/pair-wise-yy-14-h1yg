import { useMemo } from "react";
import {
  DAMAGE_KINDS,
  TENON_TYPES,
  evaluateArchive,
  type ComponentRecord,
  type DamageInfo,
} from "../domain/archive";

interface Props {
  draft: ComponentRecord;
  records: ComponentRecord[];
  buildings: string[];
  onChange: (next: ComponentRecord) => void;
  onSave: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onClear: () => void;
}

const STATE_BADGE: Record<string, { text: string; cls: string }> = {
  archived: { text: "已归档", cls: "badge-ok" },
  retake: { text: "待补拍", cls: "badge-retake" },
  pending: { text: "待核对", cls: "badge-pending" },
};

export default function ComponentForm({
  draft,
  records,
  buildings,
  onChange,
  onSave,
  onArchive,
  onUnarchive,
  onDelete,
  onClear,
}: Props) {
  // 页面层调用归档判断：输入即核对，不触碰保存
  const evalResult = useMemo(
    () => evaluateArchive(draft, records),
    [draft, records]
  );

  const badge =
    evalResult.state === "pending" && evalResult.canArchive
      ? { text: draft.archived ? "待重新核对" : "可归档", cls: "badge-pending" }
      : STATE_BADGE[evalResult.state];

  const patch = (p: Partial<ComponentRecord>) => onChange({ ...draft, ...p });

  const patchDamage = (p: Partial<DamageInfo>) =>
    onChange({
      ...draft,
      damage: { ...(draft.damage ?? emptyDamage()), ...p },
    });

  const hasDamage = draft.damage !== null;

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>测绘归档台</p>
          <h2>{draft.code ? draft.code : "新增构件"}</h2>
        </div>
        <span className={`badge ${badge.cls}`}>{badge.text}</span>
      </div>

      <div className="field-grid">
        <label>
          <span>建筑名称 *</span>
          <input
            list="building-options"
            value={draft.building}
            placeholder="如 大成殿"
            onChange={(e) => patch({ building: e.target.value })}
          />
          <datalist id="building-options">
            {buildings.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </label>

        <label>
          <span>构件编号 *</span>
          <input
            value={draft.code}
            placeholder="如 L-03（L梁 C柱 D斗拱）"
            onChange={(e) => patch({ code: e.target.value })}
          />
        </label>

        <label>
          <span>木材种类 *</span>
          <input
            value={draft.wood}
            placeholder="如 楠木 / 松木"
            onChange={(e) => patch({ wood: e.target.value })}
          />
        </label>

        <label>
          <span>榫卯类型 *</span>
          <select
            value={draft.tenon}
            onChange={(e) => patch({ tenon: e.target.value })}
          >
            <option value="">请选择榫型</option>
            {TENON_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="span-2">
          <span>截面尺寸 *（修正后照片沿用，需重新核对归档）</span>
          <input
            value={draft.section}
            placeholder="如 180x240 或 直径320（mm）"
            onChange={(e) => patch({ section: e.target.value })}
          />
        </label>
      </div>

      <div className="damage-box">
        <label className="check-line">
          <input
            type="checkbox"
            checked={hasDamage}
            onChange={(e) =>
              patch({ damage: e.target.checked ? emptyDamage() : null })
            }
          />
          <span>登记病害（近景 + 整体照片编号齐全才能归档）</span>
        </label>

        {hasDamage && draft.damage && (
          <div className="field-grid damage-grid">
            <label>
              <span>病害位置 *（修正后需重新核对）</span>
              <input
                value={draft.damage.position}
                placeholder="如 东端榫头"
                onChange={(e) => patchDamage({ position: e.target.value })}
              />
            </label>
            <label>
              <span>病害类型</span>
              <select
                value={draft.damage.kind}
                onChange={(e) => patchDamage({ kind: e.target.value })}
              >
                {DAMAGE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className={photoMissing(evalResult, "closePhoto")}>
              <span>近景照片编号 *</span>
              <input
                value={draft.damage.closePhoto}
                placeholder="纸单照片号，如 P-0217"
                onChange={(e) => patchDamage({ closePhoto: e.target.value })}
              />
            </label>
            <label className={photoMissing(evalResult, "overallPhoto")}>
              <span>整体照片编号 *</span>
              <input
                value={draft.damage.overallPhoto}
                placeholder="纸单照片号，如 P-0210"
                onChange={(e) => patchDamage({ overallPhoto: e.target.value })}
              />
            </label>
            <p className="rule-note span-2">
              同一照片编号只能归属一个病害；缺任一项照片号，记录停在「待补拍」。
            </p>
          </div>
        )}
      </div>

      {evalResult.recheck && (
        <div className="alert alert-recheck">
          ⚠ {evalResult.recheckHint}
        </div>
      )}

      {evalResult.issues.length > 0 && (
        <ul className="issue-list">
          {evalResult.issues.map((issue, i) => (
            <li
              key={i}
              className={
                issue.kind === "photoMissing" || issue.kind === "photoConflict"
                  ? "issue-retake"
                  : "issue-plain"
              }
            >
              {issue.kind === "photoMissing" || issue.kind === "photoConflict"
                ? "📷 "
                : "• "}
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      <div className="form-actions">
        <button className="primary" onClick={onSave}>
          保存记录
        </button>
        <button
          className="accent"
          onClick={onArchive}
          disabled={!evalResult.canArchive}
          title={
            evalResult.canArchive
              ? evalResult.recheck
                ? "截面/病害位置已修正，确认照片沿用后重新归档"
                : "核对通过，执行归档"
              : "尚有缺项或照片问题，不能归档"
          }
        >
          {evalResult.recheck ? "重新核对并归档" : "核对归档"}
        </button>
        {draft.archived && (
          <button onClick={onUnarchive}>取消归档</button>
        )}
        <button onClick={onClear}>清空表单</button>
        <button className="danger" onClick={onDelete}>
          删除
        </button>
      </div>
      <p className="save-hint">
        归档判断与保存分开：「保存记录」只落库；「核对归档」在判断通过后才写入归档快照。
      </p>
    </section>
  );
}

function emptyDamage(): DamageInfo {
  return { position: "", kind: DAMAGE_KINDS[0], closePhoto: "", overallPhoto: "" };
}

function photoMissing(
  evalResult: ReturnType<typeof evaluateArchive>,
  field: string
): string {
  return evalResult.issues.some((i) => i.field === field) ? "field-missing" : "";
}
