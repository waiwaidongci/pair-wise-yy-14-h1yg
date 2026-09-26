// 保存层：负责数据的读取、写入与持久化，不包含归档规则判断，也不处理页面交互。

import type { ComponentRecord, DamageInfo } from "../domain/archive";

const STORAGE_KEY = "sunmao-archive-records-v1";

export interface SaveResult {
  ok: boolean;
  record?: ComponentRecord;
  error?: string;
}

export function uid(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function now(): string {
  return new Date().toISOString();
}

/** 新建空白构件 */
export function createBlank(): ComponentRecord {
  const ts = now();
  return {
    id: uid(),
    building: "",
    code: "",
    wood: "",
    tenon: "",
    section: "",
    damage: null,
    archived: false,
    archivedSection: "",
    archivedDamagePosition: "",
    archivedAt: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

/** 保存（新建或更新）：仅做基础落库，不改变归档状态 */
export function saveRecord(
  draft: ComponentRecord,
  records: ComponentRecord[]
): SaveResult {
  if (!draft.code.trim()) {
    return { ok: false, error: "构件编号不能为空" };
  }
  const stamped: ComponentRecord = { ...draft, updatedAt: now() };
  const idx = records.findIndex((r) => r.id === stamped.id);
  if (idx >= 0) {
    const next = records.slice();
    next[idx] = stamped;
    persist(next);
    return { ok: true, record: stamped };
  }
  const next = [stamped, ...records];
  persist(next);
  return { ok: true, record: stamped };
}

/** 删除构件 */
export function deleteRecord(id: string, records: ComponentRecord[]): ComponentRecord[] {
  const next = records.filter((r) => r.id !== id);
  persist(next);
  return next;
}

/**
 * 执行归档：归档规则由调用方（页面层借助 domain 的 evaluateArchive）判定，
 * 保存层只负责把归档快照写入——截面与病害位置在此时固化，供日后比对修正。
 */
export function markArchived(
  id: string,
  records: ComponentRecord[]
): ComponentRecord[] {
  const next = records.map((r) => {
    if (r.id !== id) return r;
    return {
      ...r,
      archived: true,
      archivedAt: now(),
      archivedSection: r.section,
      archivedDamagePosition: r.damage ? r.damage.position : "",
      updatedAt: now(),
    };
  });
  persist(next);
  return next;
}

/** 退回待核对（照片沿用，仅清归档标记，截面/病害位置快照保留到下次成功归档时覆盖） */
export function unarchive(
  id: string,
  records: ComponentRecord[]
): ComponentRecord[] {
  const next = records.map((r) =>
    r.id === id ? { ...r, archived: false, updatedAt: now() } : r
  );
  persist(next);
  return next;
}

function persist(records: ComponentRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 存储不可用时仅保留内存数据，页面仍可操作
  }
}

export function loadRecords(): ComponentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedRecords();
    const parsed = JSON.parse(raw) as ComponentRecord[];
    if (!Array.isArray(parsed)) return seedRecords();
    return parsed;
  } catch {
    return seedRecords();
  }
}

export function resetRecords(): ComponentRecord[] {
  const seed = seedRecords();
  persist(seed);
  return seed;
}

function dmg(
  position: string,
  kind: string,
  closePhoto: string,
  overallPhoto: string
): DamageInfo {
  return { position, kind, closePhoto, overallPhoto };
}

function seed(): ComponentRecord[] {
  const ts = now();
  return [
    {
      id: uid(),
      building: "大成殿",
      code: "L-03",
      wood: "楠木",
      tenon: "透榫",
      section: "180x240",
      damage: dmg("东端榫头", "开裂", "P-0217", "P-0210"),
      archived: false,
      archivedSection: "",
      archivedDamagePosition: "",
      archivedAt: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: uid(),
      building: "大成殿",
      code: "C-12",
      wood: "松木",
      tenon: "半榫",
      section: "直径320",
      damage: dmg("柱脚南侧", "糟朽", "P-0332", ""),
      archived: false,
      archivedSection: "",
      archivedDamagePosition: "",
      archivedAt: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: uid(),
      building: "大成殿",
      code: "D-07",
      wood: "榆木",
      tenon: "燕尾榫",
      section: "90x120",
      damage: dmg("拱臂中部", "变形", "P-0405", "P-0400"),
      archived: false,
      archivedSection: "",
      archivedDamagePosition: "",
      archivedAt: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: uid(),
      building: "大成殿",
      code: "L-11",
      wood: "楠木",
      tenon: "箍头榫",
      section: "200x260",
      damage: null,
      archived: false,
      archivedSection: "",
      archivedDamagePosition: "",
      archivedAt: null,
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

let cachedSeed: ComponentRecord[] | null = null;
function seedRecords(): ComponentRecord[] {
  if (!cachedSeed) cachedSeed = seed();
  // 返回深拷贝，避免不同会话间互相污染缓存
  return cachedSeed.map((r) => ({ ...r, damage: r.damage ? { ...r.damage } : null }));
}
