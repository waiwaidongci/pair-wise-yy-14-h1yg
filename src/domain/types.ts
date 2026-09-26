// 测绘归档台的数据类型定义（领域层）

/** 构件归档状态 */
export type MemberStatus =
  | "pending_photo" // 待补拍：基础信息或近景/整体照片编号有缺项
  | "ready" // 可归档：核对项齐全，等待执行归档
  | "archived" // 已归档：收录关系视图
  | "recheck"; // 复核中：归档后截面/病害位置等被修正，照片沿用，需重新归档

/** 构件记录（持久化结构） */
export interface Member {
  id: string;
  /** 建筑（单体）名称 */
  building: string;
  /** 构件编号，同一编号只能登记一个病害 */
  code: string;
  /** 木材种类 */
  wood: string;
  /** 榫卯类型（榫型） */
  tenon: string;
  /** 截面尺寸，原始记录文本，如 180×240 mm / φ300 */
  section: string;
  /** 病害位置，无病害时填“无病害”（免登照片） */
  damageLocation: string;
  /** 病害说明（选填） */
  damageNote: string;
  /** 近景照片编号（纸单编号） */
  closePhoto: string;
  /** 整体照片编号（纸单编号） */
  overallPhoto: string;
  status: MemberStatus;
  /** 归档时留存的核对快照；现状与快照不一致即需复核 */
  fingerprint: string | null;
  createdAt: number;
}

/** 表单可编辑字段，编号以外都可修正，照片编号不会因修正被清空 */
export interface MemberDraft {
  building: string;
  code: string;
  wood: string;
  tenon: string;
  section: string;
  damageLocation: string;
  damageNote: string;
  closePhoto: string;
  overallPhoto: string;
}

export type DraftKey = keyof MemberDraft;
