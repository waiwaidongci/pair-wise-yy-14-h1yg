// 归档判断层：只负责测绘归档规则，不涉及保存方式，也不涉及页面操作。

export const TENON_TYPES = ["燕尾榫", "透榫", "半榫", "箍头榫"] as const;

export const DAMAGE_KINDS = ["开裂", "糟朽", "变形", "拔榫", "虫蛀", "其他"] as const;

export interface DamageInfo {
  /** 病害位置 */
  position: string;
  /** 病害类型 */
  kind: string;
  /** 近景照片编号（纸单上的照片号） */
  closePhoto: string;
  /** 整体照片编号 */
  overallPhoto: string;
}

/** 构件记录：建筑、编号、木材、榫型、截面、病害（含照片编号） */
export interface ComponentRecord {
  id: string;
  building: string;
  code: string;
  wood: string;
  tenon: string;
  /** 截面尺寸，自由文本，如 180x240、直径300 */
  section: string;
  damage: DamageInfo | null;
  /** 是否已归档 */
  archived: boolean;
  /** 归档时的截面快照，用于判断“截面修正后重新核对” */
  archivedSection: string;
  /** 归档时的病害位置快照 */
  archivedDamagePosition: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type IssueKind =
  | "missingField"
  | "damageIncomplete"
  | "photoMissing"
  | "photoConflict";

export interface ArchiveIssue {
  kind: IssueKind;
  field: string;
  message: string;
  /** 照片冲突时，占用该编号的构件 */
  ownerCode?: string;
  ownerBuilding?: string;
}

/** archived 已归档 / retake 待补拍 / pending 待核对（含“可归档”） */
export type RecordState = "archived" | "retake" | "pending";

export interface ArchiveEval {
  state: RecordState;
  /**
   * 是否允许执行归档：基础项与照片均无硬性问题即可。
   * 注意 recheck（截面/病害位置修正）只要求人工重新确认，不阻断归档按钮。
   */
  canArchive: boolean;
  issues: ArchiveIssue[];
  /** 与照片相关的问题（缺照片号、照片号冲突），命中即停在待补拍 */
  photoIssues: ArchiveIssue[];
  /** 截面或病害位置相对归档快照发生修正：照片沿用、归档需重新核对 */
  recheck: boolean;
  recheckHint: string | null;
}

const str = (value: string | null | undefined): string =>
  (value ?? "").trim();

/**
 * 归档判断核心规则：
 * 1. 建筑、编号、木材、榫型、截面缺一不可；
 * 2. 病害登记必须带近景与整体照片编号，缺一项停在“待补拍”；
 * 3. 同一照片编号只能归属一个病害（近景、整体合并查重）；
 * 4. 截面或病害位置相对归档快照被修正时，照片沿用但归档需重新核对；
 * 5. 只有已归档构件才进入关系视图（由页面层依据 state 过滤）。
 */
export function evaluateArchive(
  target: ComponentRecord,
  all: ComponentRecord[]
): ArchiveEval {
  const issues: ArchiveIssue[] = [];

  const required: Array<[keyof ComponentRecord, string]> = [
    ["building", "建筑"],
    ["code", "构件编号"],
    ["wood", "木材种类"],
    ["tenon", "榫卯类型"],
    ["section", "截面尺寸"],
  ];
  for (const [field, label] of required) {
    if (!str(target[field] as string)) {
      issues.push({ kind: "missingField", field, message: `缺少${label}` });
    }
  }

  if (target.damage) {
    const d = target.damage;
    if (!str(d.position)) {
      issues.push({
        kind: "damageIncomplete",
        field: "damagePosition",
        message: "已登记病害，但缺少病害位置",
      });
    }
    if (!str(d.closePhoto)) {
      issues.push({
        kind: "photoMissing",
        field: "closePhoto",
        message: "缺少近景照片编号，停在待补拍",
      });
    }
    if (!str(d.overallPhoto)) {
      issues.push({
        kind: "photoMissing",
        field: "overallPhoto",
        message: "缺少整体照片编号，停在待补拍",
      });
    }
    if (
      str(d.closePhoto) &&
      str(d.overallPhoto) &&
      str(d.closePhoto) === str(d.overallPhoto)
    ) {
      issues.push({
        kind: "photoConflict",
        field: "overallPhoto",
        message: "近景与整体不能共用同一照片编号",
      });
    }

    // 同一照片编号只能归一个病害：与其它构件的病害照片逐一比对
    const ownPhotos: Array<[string, string]> = [
      [str(d.closePhoto), "closePhoto"],
      [str(d.overallPhoto), "overallPhoto"],
    ];
    for (const other of all) {
      if (other.id === target.id || !other.damage) continue;
      const foreign: Array<[string, string]> = [
        [str(other.damage.closePhoto), "近景"],
        [str(other.damage.overallPhoto), "整体"],
      ];
      for (const [photoNo, field] of ownPhotos) {
        if (!photoNo) continue;
        const hit = foreign.find(([no]) => no === photoNo);
        if (hit) {
          issues.push({
            kind: "photoConflict",
            field,
            message: `照片编号 ${photoNo} 已归「${other.building} · ${other.code}」的病害${hit[1]}，一个编号只能归一个病害`,
            ownerCode: other.code,
            ownerBuilding: other.building,
          });
        }
      }
    }
  }

  const photoIssues = issues.filter(
    (i) => i.kind === "photoMissing" || i.kind === "photoConflict"
  );

  // 截面或病害位置修正：相对最近一次归档快照比对，照片沿用、归档重新核对
  const hasSnapshot = target.archivedAt !== null;
  const currentPosition = target.damage ? str(target.damage.position) : "";
  const sectionChanged =
    hasSnapshot && str(target.section) !== str(target.archivedSection);
  const positionChanged =
    hasSnapshot &&
    currentPosition !== str(target.archivedDamagePosition) &&
    // 仅在仍有病害登记时才算位置修正（病害整条删除走正常重新核对即可）
    currentPosition !== "";
  const recheck = sectionChanged || positionChanged;

  const changed: string[] = [];
  if (sectionChanged) changed.push("截面尺寸");
  if (positionChanged) changed.push("病害位置");
  const recheckHint = recheck
    ? `${changed.join("、")}已修正，原照片编号沿用，请重新核对后再归档`
    : null;

  let state: RecordState;
  if (photoIssues.length > 0) {
    state = "retake";
  } else if (issues.length > 0 || recheck) {
    state = "pending";
  } else if (target.archived) {
    state = "archived";
  } else {
    state = "pending";
  }

  return {
    state,
    // 硬性问题（缺项/缺照片/照片冲突）为 0 即可归档；recheck 仅提示重新确认
    canArchive: issues.length === 0,
    issues,
    photoIssues,
    recheck,
    recheckHint,
  };
}

/** 从截面文本中提取数值，如 180x240mm → 180/240，直径300 → 300 */
export function parseSection(raw: string): { a: number | null; b: number | null } {
  const nums = [...raw.matchAll(/\d+(?:\.\d+)?/g)].map((m) =>
    Number.parseFloat(m[0])
  );
  return { a: nums[0] ?? null, b: nums[1] ?? null };
}

/** 估算截面积（mm²），只有一个数值时按方形/直径自乘估算 */
export function sectionArea(raw: string): number | null {
  const { a, b } = parseSection(raw);
  if (a === null) return null;
  return b === null ? a * a : a * b;
}

/** 构件编号前缀推断构件类别，用于标记图与关系视图 */
export function componentKind(code: string): "beam" | "column" | "bracket" | "other" {
  const head = code.trim().charAt(0).toUpperCase();
  if (head === "L") return "beam";
  if (head === "C") return "column";
  if (head === "D") return "bracket";
  return "other";
}

export const KIND_LABEL: Record<string, string> = {
  beam: "梁",
  column: "柱",
  bracket: "斗拱",
  other: "其他",
};
