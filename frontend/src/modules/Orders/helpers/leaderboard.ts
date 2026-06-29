import type { Leader } from '../hooks/useOrders';

/** Huy chương theo thứ hạng (0-based). Hạng 4 trở đi hiển thị số. */
const MEDALS = ['🥇', '🥈', '🥉'];

export function rankLabel(rank: number): string {
  return MEDALS[rank] ?? String(rank + 1);
}

export interface LeaderRow extends Leader {
  id: number;
  _rank: number;
}

/** Gắn id + rank cho danh sách leader để DataTable render được. */
export function withRanks(leaders: Leader[]): LeaderRow[] {
  return leaders.map((l, i) => ({ ...l, id: l.user_id, _rank: i }));
}
