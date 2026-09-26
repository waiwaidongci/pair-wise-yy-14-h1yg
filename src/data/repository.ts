// 保存层：只负责读写与初始数据，不做归档判断（判断在 domain/archive.ts）。

import { deriveStatus, fingerprintOf } from "../domain/archive";
import type { Member, MemberDraft } from "../domain/types";

const STORAGE_KEY = "sunmao-archive-v1";

const seedDrafts: MemberDraft[] = [
  {
    building: "大殿",
    code: "ZD-B2",
    wood: "落叶松",
    tenon: "馒头榫",
    section: "φ320",
    damageLocation: "柱身",
    damageNote: "柱身中部斜裂一道",
    closePhoto: "C-0112",
    overallPhoto: "O-0034",
  },
  {
    building: "大殿",
    code: "ZD-L5",
    wood: "杉木",
    tenon: "燕尾榫",
    section: "180×240",
    damageLocation: "梁端榫头",
    damageNote: "榫头压溃，端部开裂",
    closePhoto: "C-0118",
    overallPhoto: "O-0036",
  },
  {
    building: "大殿",
    code: "ZD-G3",
    wood: "杉木",
    tenon: "平榫",
    section: "φ160",
    damageLocation: "檩条",
    damageNote: "轻微下挠",
    closePhoto: "C-0121",
    overallPhoto: "O-0037",
  },
  {
    building: "大殿",
    code: "ZD-D1",
    wood: "硬杂木",
    tenon: "半榫",
    section: "120×90",
    damageLocation: "斗拱",
    damageNote: "外拽拱松动",
    closePhoto: "C-0125",
    overallPhoto: "O-0038",
  },
  {
    building: "后殿",
    code: "HD-Z4",
    wood: "楠木",
    tenon: "管脚榫",
    section: "φ280",
    damageLocation: "柱脚",
    damageNote: "柱脚糟朽约三分之一周长",
    closePhoto: "C-0203",
    overallPhoto: "O-0051",
  },
  {
    building: "后殿",
    code: "HD-L2",
    wood: "杉木",
    tenon: "透榫",
    section: "160×220",
    damageLocation: "梁端榫头",
    damageNote: "纸单上只抄到近景号，整体照待补",
    closePhoto: "C-0207",
    overallPhoto: "",
  },
  {
    building: "后殿",
    code: "HD-G1",
    wood: "杉木",
    tenon: "平榫",
    section: "φ150",
    damageLocation: "",
    damageNote: "病害位置待现场确认",
    closePhoto: "",
    overallPhoto: "",
  },
];

function seedMembers(): Member[] {
  const now = Date.now();
  return seedDrafts.map((draft, index) => {
    const archivable =
      draft.damageLocation.trim() !== "" &&
      draft.closePhoto.trim() !== "" &&
      draft.overallPhoto.trim() !== "";
    const member: Member = {
      ...draft,
      id: `seed-${index + 1}`,
      status: "pending_photo",
      fingerprint: archivable ? fingerprintOf(draft) : null,
      createdAt: now - (seedDrafts.length - index) * 60_000,
    };
    return { ...member, status: deriveStatus(member) };
  });
}

/** 读取全部构件记录；无存档或数据损坏时回退到演示数据 */
export function loadMembers(): Member[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedMembers();
    const parsed = JSON.parse(raw) as Member[];
    if (!Array.isArray(parsed)) return seedMembers();
    return parsed.map((member) => ({ ...member, status: deriveStatus(member) }));
  } catch {
    return seedMembers();
  }
}

/** 全量保存构件记录 */
export function saveMembers(members: Member[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch {
    // 存储不可用（如隐私模式）时静默失败，页面状态仍然有效
  }
}

/** 清空存档并恢复演示数据 */
export function resetMembers(): Member[] {
  const seeded = seedMembers();
  saveMembers(seeded);
  return seeded;
}
