// @flow

/**
 * A distribution over the integers `0` through `n - 1`, where `n` is
 * the length of the array. The value at index `i` is the probability of
 * `i` in the distribution. The values should sum to 1.
 */
export type Distribution = Float64Array;

export function uniformDistribution(n: number): Distribution {
  if (isNaN(n) || !isFinite(n) || n !== Math.floor(n) || n <= 0) {
    throw new Error("expected positive integer, but got: " + n);
  }
  return new Float64Array(n).fill(1 / n);
}

/**
 * Compute the maximum difference (in absolute value) between components in two
 * distributions.
 *
 * Equivalent to $\norm{pi0 - pi1}_\infty$.
 */
export function computeDelta(pi0: Distribution, pi1: Distribution) {
  if (pi0.length === 0 || pi0.length !== pi1.length) {
    throw new Error("invalid input");
  }
  let maxDelta = -Infinity;
  // Here, we assume that `pi0.nodeOrder` and `pi1.nodeOrder` are the
  // same (i.e., there has been no permutation).
  pi0.forEach((x, i) => {
    const delta = Math.abs(x - pi1[i]);
    maxDelta = Math.max(delta, maxDelta);
  });
  return maxDelta;
}

/**
 * Compute whether the delta is less than a target value.
 *
 * This is a performance optimization over using computeDelta. When running PageRank,
 * we often don't need the actual maximum delta, we just need to know if the convergence
 * target is ever exceeded. If so, we can immediately return and start the next iteration.
 */
export function deltaLessThan(
  pi0: Distribution,
  pi1: Distribution,
  target: number
) {
  if (pi0.length === 0 || pi0.length !== pi1.length) {
    throw new Error("invalid input");
  }
  for (let i = 0; i < pi0.length; i++) {
    const delta = Math.abs(pi0[i] - pi1[i]);
    if (delta >= target) {
      return false;
    }
  }
  return true;
}
