import { STATUS_META } from "../domain/archive";
import type { MemberStatus } from "../domain/types";

export function StatusBadge({ status }: { status: MemberStatus }) {
  const meta = STATUS_META[status];
  return <span className={`badge badge-${meta.tone}`}>{meta.label}</span>;
}
