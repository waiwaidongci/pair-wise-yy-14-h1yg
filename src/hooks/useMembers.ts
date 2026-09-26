// 页面操作层：把归档判断（domain/archive）与保存（data/repository）编排成页面动作。
// 组件只调用这里暴露的操作，不直接碰判断规则与存储细节。

import { useEffect, useMemo, useReducer } from "react";
import {
  checkArchivable,
  deriveStatus,
  fingerprintOf,
  isDuplicateCode,
  type ArchiveCheck,
} from "../domain/archive";
import type { Member, MemberDraft } from "../domain/types";
import { loadMembers, resetMembers, saveMembers } from "../data/repository";

export interface SaveResult {
  ok: boolean;
  member?: Member;
  check?: ArchiveCheck;
  error?: string;
}

type Action =
  | { type: "upsert"; member: Member }
  | { type: "remove"; id: string }
  | { type: "replaceAll"; members: Member[] };

function reducer(members: Member[], action: Action): Member[] {
  switch (action.type) {
    case "upsert": {
      const exists = members.some((member) => member.id === action.member.id);
      return exists
        ? members.map((member) =>
            member.id === action.member.id ? action.member : member,
          )
        : [...members, action.member];
    }
    case "remove":
      return members.filter((member) => member.id !== action.id);
    case "replaceAll":
      return action.members;
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface MemberOps {
  members: Member[];
  saveDraft: (draft: MemberDraft, id?: string) => SaveResult;
  archive: (id: string) => SaveResult;
  remove: (id: string) => void;
  reset: () => void;
}

export function useMemberOps(): MemberOps {
  const [members, dispatch] = useReducer(reducer, undefined, loadMembers);

  // 任何变更立即落盘，页面刷新不丢记录
  useEffect(() => {
    saveMembers(members);
  }, [members]);

  return useMemo<MemberOps>(
    () => ({
      members,

      // 保存：同一编号只归一个病害；已归档构件被修正后照片沿用、转入复核
      saveDraft(draft, id) {
        const code = draft.code.trim();
        if (code === "") {
          return { ok: false, error: "构件编号不能为空" };
        }
        if (isDuplicateCode(members, code, id)) {
          return { ok: false, error: `编号「${code}」已登记病害，同一编号只归一个病害` };
        }
        const existing = id ? members.find((member) => member.id === id) : undefined;
        const member: Member = {
          ...draft,
          id: existing?.id ?? newId(),
          status: "pending_photo",
          fingerprint: existing?.fingerprint ?? null,
          createdAt: existing?.createdAt ?? Date.now(),
        };
        const next: Member = { ...member, status: deriveStatus(member) };
        dispatch({ type: "upsert", member: next });
        return { ok: true, member: next, check: checkArchivable(next) };
      },

      // 归档：先核对，缺项即停在待补拍；通过后留存快照
      archive(id) {
        const member = members.find((item) => item.id === id);
        if (!member) return { ok: false, error: "记录不存在" };
        const check = checkArchivable(member);
        if (!check.ok) {
          return { ok: false, member, check, error: "缺项未补齐，停在待补拍" };
        }
        const archived: Member = {
          ...member,
          fingerprint: fingerprintOf(member),
          status: "archived",
        };
        dispatch({ type: "upsert", member: archived });
        return { ok: true, member: archived, check };
      },

      remove(id) {
        dispatch({ type: "remove", id });
      },

      reset() {
        dispatch({ type: "replaceAll", members: resetMembers() });
      },
    }),
    [members],
  );
}
