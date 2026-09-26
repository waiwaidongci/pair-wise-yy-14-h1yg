import { STATUS_META } from "../domain/archive";
import type { MemberStatus } from "../domain/types";

export interface FilterState {
  building: string;
  tenon: string;
  pendingOnly: boolean;
}

interface FiltersProps {
  buildings: string[];
  tenons: string[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  pendingCount: number;
}

export function Filters({
  buildings,
  tenons,
  value,
  onChange,
  pendingCount,
}: FiltersProps) {
  return (
    <div className="filters">
      <select
        value={value.building}
        onChange={(event) => onChange({ ...value, building: event.target.value })}
        aria-label="按建筑筛选"
      >
        <option value="">全部建筑</option>
        {buildings.map((building) => (
          <option key={building} value={building}>
            {building}
          </option>
        ))}
      </select>

      <select
        value={value.tenon}
        onChange={(event) => onChange({ ...value, tenon: event.target.value })}
        aria-label="按榫型筛选"
      >
        <option value="">全部榫型</option>
        {tenons.map((tenon) => (
          <option key={tenon} value={tenon}>
            {tenon}
          </option>
        ))}
      </select>

      <button
        className={value.pendingOnly ? "filter-on" : ""}
        onClick={() => onChange({ ...value, pendingOnly: !value.pendingOnly })}
        title="只看缺照片编号、需要回现场补拍的记录"
      >
        {STATUS_META.pending_photo.label} / {STATUS_META.recheck.label}
        <b>{pendingCount}</b>
      </button>
    </div>
  );
}

/** 按筛选条件过滤；待补拍档同时包含复核中（照片沿用、等待重新核对） */
export function applyFilters<T extends { building: string; tenon: string; status: MemberStatus }>(
  rows: T[],
  filter: FilterState,
): T[] {
  return rows.filter((row) => {
    if (filter.building && row.building !== filter.building) return false;
    if (filter.tenon && row.tenon !== filter.tenon) return false;
    if (filter.pendingOnly && !["pending_photo", "recheck"].includes(row.status)) {
      return false;
    }
    return true;
  });
}
