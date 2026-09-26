// 归档判断规则的快速验证（tsx 执行，不进构建产物）
import {
  evaluateArchive,
  type ComponentRecord,
  type DamageInfo,
} from "../src/domain/archive";

let n = 0;
function assert(name: string, cond: boolean, extra = "") {
  n += 1;
  if (!cond) {
    console.error(`❌ ${name} ${extra}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ ${name}`);
  }
}

function rec(p: Partial<ComponentRecord> = {}): ComponentRecord {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    building: p.building ?? "大成殿",
    code: p.code ?? "L-01",
    wood: p.wood ?? "楠木",
    tenon: p.tenon ?? "透榫",
    section: p.section ?? "180x240",
    damage: p.damage === undefined ? null : p.damage,
    archived: p.archived ?? false,
    archivedSection: p.archivedSection ?? "",
    archivedDamagePosition: p.archivedDamagePosition ?? "",
    archivedAt: p.archivedAt ?? null,
    createdAt: "",
    updatedAt: "",
  };
}

function dmg(p: Partial<DamageInfo> = {}): DamageInfo {
  return {
    position: p.position ?? "东端榫头",
    kind: "开裂",
    closePhoto: p.closePhoto ?? "P-0001",
    overallPhoto: p.overallPhoto ?? "P-0002",
  };
}

// 1. 完整无病害 → 可归档、待核对（未归档）
const ok = rec();
assert("完整记录可归档", evaluateArchive(ok, [ok]).canArchive);
assert("未归档时为 pending", evaluateArchive(ok, [ok]).state === "pending");

// 2. 缺基础字段
const miss = rec({ wood: "" });
const e2 = evaluateArchive(miss, [miss]);
assert("缺木材不可归档", !e2.canArchive);
assert("缺基础字段不停在待补拍（在待核对）", e2.state === "pending");

// 3. 病害缺近景 → 待补拍
const noClose = rec({ code: "C-02", damage: dmg({ closePhoto: "" }) });
const e3 = evaluateArchive(noClose, [noClose]);
assert("缺近景照片 → 待补拍", e3.state === "retake");
assert("缺近景不可归档", !e3.canArchive);

// 4. 病害缺整体 → 待补拍
const noOverall = rec({ code: "C-03", damage: dmg({ overallPhoto: "" }) });
assert("缺整体照片 → 待补拍", evaluateArchive(noOverall, [noOverall]).state === "retake");

// 5. 照片齐全 → 可归档
const full = rec({ code: "C-04", damage: dmg() });
assert("照片齐全可归档", evaluateArchive(full, [full]).canArchive);

// 6. 同一照片编号归两个病害 → 冲突、待补拍
const a = rec({ id: "a", code: "L-05", damage: dmg({ closePhoto: "P-0100", overallPhoto: "P-0101" }) });
const b = rec({ id: "b", code: "L-06", damage: dmg({ closePhoto: "P-0100", overallPhoto: "P-0102" }) });
const e6a = evaluateArchive(a, [a, b]);
const e6b = evaluateArchive(b, [a, b]);
assert("照片编号重复 → 冲突问题", e6a.issues.some((i) => i.kind === "photoConflict"));
assert("照片冲突 → 双方待补拍", e6a.state === "retake" && e6b.state === "retake");
assert("冲突信息指向占用方", e6b.issues.some((i) => i.ownerCode === "L-05"));

// 7. 近景与整体填了同一个号 → 冲突
const same = rec({ code: "L-07", damage: dmg({ closePhoto: "P-0200", overallPhoto: "P-0200" }) });
assert("近景整体同号 → 冲突", evaluateArchive(same, [same]).issues.some((i) => i.kind === "photoConflict"));

// 8. 已归档 + 截面修正 → recheck，照片沿用、可重新归档
const arc = rec({
  code: "L-08",
  section: "180x240",
  archivedSection: "180x240",
  archivedDamagePosition: "东端榫头",
  damage: dmg(),
  archived: true,
  archivedAt: "2026-09-01T00:00:00.000Z",
});
const changedSec = { ...arc, section: "190x245" };
const e8 = evaluateArchive(changedSec, [changedSec]);
assert("截面修正触发 recheck", e8.recheck);
assert("截面修正不改变照片号即可重新归档", e8.canArchive);
assert("截面修正后状态为 pending（待重核，退出关系视图）", e8.state === "pending");
assert("提示照片沿用", e8.recheckHint!.includes("照片编号沿用"));

// 9. 已归档 + 病害位置修正 → recheck
const changedPos = { ...arc, damage: dmg({ position: "西端榫头" }) };
const e9 = evaluateArchive(changedPos, [changedPos]);
assert("病害位置修正触发 recheck", e9.recheck);

// 10. 未修正的已归档记录 → archived（关系视图收录）
const e10 = evaluateArchive(arc, [arc]);
assert("已归档且无修动 → archived", e10.state === "archived");

// 11. 改木材（非截面/位置）不触发 recheck
const changedWood = { ...arc, wood: "松木" };
assert("改木材不触发 recheck", !evaluateArchive(changedWood, [changedWood]).recheck);
assert("改木材的已归档件仍为 archived", evaluateArchive(changedWood, [changedWood]).state === "archived");

// 12. 缺病害位置但照片齐全 → pending（非 retake）
const noPos = rec({ code: "L-09", damage: dmg({ position: "" }) });
const e12 = evaluateArchive(noPos, [noPos]);
assert("缺病害位置不可归档", !e12.canArchive);
assert("缺位置不属于待补拍", e12.state === "pending");

console.log(`\n${n} 项检查完成`);
