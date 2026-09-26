// 归档判断层：全部为纯函数，不触碰存储与界面。
// 规则来源：病害须同时登记近景与整体照片编号，缺一项即停在待补拍；
// 同一编号只归一个病害；截面或病害位置修正后照片沿用，归档需重新核对。

import type { DraftKey, Member, MemberDraft, MemberStatus } from "./types";

/** 病害位置填此值时视为无病害，免登照片编号 */
export const NO_DAMAGE = "无病害";

/** 归档核对字段：这些字段被修正后，归档快照即失效，需要重新核对 */
export const SNAPSHOT_KEYS: DraftKey[] = [
  "building",
  "wood",
  "tenon",
  "section",
  "damageLocation",
  "closePhoto",
  "overallPhoto",
];

export const FIELD_LABELS: Record<DraftKey, string> = {
  building: "建筑名称",
  code: "构件编号",
  wood: "木材种类",
  tenon: "榫卯类型",
  section: "截面尺寸",
  damageLocation: "病害位置",
  damageNote: "病害说明",
  closePhoto: "近景照片编号",
  overallPhoto: "整体照片编号",
};

/** 归档前必填的基础字段 */
const REQUIRED_KEYS: DraftKey[] = [
  "building",
  "code",
  "wood",
  "tenon",
  "section",
  "damageLocation",
];

export interface FieldIssue {
  key: DraftKey;
  label: string;
  reason: string;
}

export interface ArchiveCheck {
  ok: boolean;
  issues: FieldIssue[];
}

const norm = (value: string | null | undefined): string => (value ?? "").trim();

/** 病害是否需要登记照片：未填病害位置视为待现场确认，按需要照片处理 */
export function needsPhotos(damageLocation: string): boolean {
  const location = norm(damageLocation);
  return location === "" || location !== NO_DAMAGE;
}

/** 逐项核对缺项：基础字段 + 近景/整体照片编号 */
export function missingFields(draft: MemberDraft): FieldIssue[] {
  const issues: FieldIssue[] = [];
  for (const key of REQUIRED_KEYS) {
    if (norm(draft[key]) === "") {
      issues.push({ key, label: FIELD_LABELS[key], reason: "未填写" });
    }
  }
  if (needsPhotos(draft.damageLocation)) {
    if (norm(draft.closePhoto) === "") {
      issues.push({ key: "closePhoto", label: FIELD_LABELS.closePhoto, reason: "缺近景照片编号" });
    }
    if (norm(draft.overallPhoto) === "") {
      issues.push({ key: "overallPhoto", label: FIELD_LABELS.overallPhoto, reason: "缺整体照片编号" });
    }
  }
  return issues;
}

/** 归档核对快照：只取核对字段，编号与说明不参与 */
export function fingerprintOf(draft: MemberDraft): string {
  return SNAPSHOT_KEYS.map((key) => norm(draft[key])).join("|");
}

/** 已归档构件被修正后，快照是否失效（照片沿用但需重新归档） */
export function isSnapshotStale(member: Member): boolean {
  return member.fingerprint !== null && fingerprintOf(member) !== member.fingerprint;
}

/** 由记录内容推导归档状态；归档快照失效时强制回到复核中 */
export function deriveStatus(member: Member): MemberStatus {
  if (member.fingerprint !== null) {
    return isSnapshotStale(member) ? "recheck" : "archived";
  }
  return missingFields(member).length > 0 ? "pending_photo" : "ready";
}

/** 归档前核对：缺项即停在待补拍，返回缺项清单供页面提示 */
export function checkArchivable(draft: MemberDraft): ArchiveCheck {
  const issues = missingFields(draft);
  return { ok: issues.length === 0, issues };
}

/** 同一编号只归一个病害：排除自身后编号不得重复 */
export function isDuplicateCode(
  members: Member[],
  code: string,
  excludeId?: string,
): boolean {
  const target = norm(code);
  if (target === "") return false;
  return members.some(
    (member) => member.id !== excludeId && norm(member.code) === target,
  );
}

export const STATUS_META: Record<MemberStatus, { label: string; tone: string }> = {
  pending_photo: { label: "待补拍", tone: "warn" },
  ready: { label: "可归档", tone: "info" },
  archived: { label: "已归档", tone: "ok" },
  recheck: { label: "复核中", tone: "warn" },
};

export const STATUS_ORDER: MemberStatus[] = [
  "pending_photo",
  "ready",
  "archived",
  "recheck",
];

export type MemberKind = "column" | "beam" | "purlin" | "bracket" | "other";

/** 依病害位置粗分构件类别，供标记图与关系视图落位 */
export function memberKind(member: Pick<Member, "damageLocation">): MemberKind {
  const location = norm(member.damageLocation);
  if (/柱|础/.test(location)) return "column";
  if (/梁|枋|额/.test(location)) return "beam";
  if (/檩|椽|脊/.test(location)) return "purlin";
  if (/斗拱|斗栱|铺作/.test(location)) return "bracket";
  return "other";
}
