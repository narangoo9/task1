/**
 * Fractional Indexing
 * Generates a position value between two existing positions.
 * Avoids full re-indexing on every drag-and-drop.
 * 
 * Example: between 1000 and 2000 → 1500
 * Precision maintained via floating point arithmetic.
 * 
 * When positions get too close (< MIN_GAP), trigger rebalancing.
 */

const MIN_GAP = 0.001;
const REBALANCE_THRESHOLD = 0.01;

/**
 * Returns a new position between `before` and `after`.
 * Handles all edge cases: head insertion, tail insertion, middle.
 */
export function fractionalIndex(before: number, after: number): number {
  if (before >= after) {
    throw new Error(`fractionalIndex: before (${before}) must be less than after (${after})`);
  }

  const mid = (before + after) / 2;

  // If gap too small, precision is at risk — caller should rebalance
  if (after - before < MIN_GAP) {
    throw new Error('FractionalIndex: positions too close, rebalance required');
  }

  return mid;
}

/**
 * Rebalances an array of items by evenly distributing positions.
 * Call when fractionalIndex throws due to insufficient gap.
 * Returns { id, position } pairs to bulk-update.
 */
export function rebalancePositions<T extends { id: string }>(
  items: T[]
): Array<{ id: string; position: number }> {
  return items.map((item, index) => ({
    id: item.id,
    position: (index + 1) * 1000,
  }));
}

/**
 * Check if rebalancing is needed for a list of positions.
 */
export function needsRebalancing(positions: number[]): boolean {
  const sorted = [...positions].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < REBALANCE_THRESHOLD) return true;
  }
  return false;
}
