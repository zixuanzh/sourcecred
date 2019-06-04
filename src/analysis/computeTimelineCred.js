// @flow

import {Graph, type NodeAddressT, type Edge} from "../core/graph";
import {PagerankGraph} from "../core/pagerankGraph";
import {type NodeAndEdgeTypes} from "./types";
import {type Weights} from "./weights";
import {weightsToEdgeEvaluator} from "./weightsToEdgeEvaluator";
import * as MapUtil from "../util/map";

export type Interval = {|
  +startTimeMs: number,
  +endTimeMs: number,
|};

export type TimelineScores = {|
  +intervals: $ReadOnlyArray<Interval>,
  +nodeAddressToScores: Map<NodeAddressT, number[]>,
|};

export function derivedInterals(
  graph: Graph,
  intervalLengthMs: number
): $ReadOnlyArray<Interval> {
  let startTimeMs = Infinity;
  let endTimeMs = -Infinity;
  for (const {timestampMs} of graph.edges({showDangling: false})) {
    startTimeMs = Math.min(startTimeMs, timestampMs);
    endTimeMs = Math.max(endTimeMs, timestampMs);
  }
  const numIntervals = Math.ceil((endTimeMs - startTimeMs) / intervalLengthMs);
  const result = [];
  for (let i = 0; i < numIntervals; i++) {
    const offset = i * intervalLengthMs;
    result.push({
      startTimeMs: startTimeMs + offset,
      endTimeMs: startTimeMs + offset + intervalLengthMs,
    });
  }
  return result;
}

export async function computeTimelineScores(
  graph: Graph,
  types: NodeAndEdgeTypes,
  weights: Weights,
  intervalLengthMs: number,
  weightHalfLifeInIntervals: number,
  seedPrefix: NodeAddressT,
  alpha: number
): Promise<TimelineScores> {
  const intervals = derivedInterals(graph, intervalLengthMs);

  const evaluator = weightsToEdgeEvaluator(weights, types);
  const prg = new PagerankGraph(graph, evaluator);
  const seed = new Map();
  for (const {address} of graph.nodes({prefix: seedPrefix})) {
    seed.set(address, 1);
  }

  const nodeAddressToScores = new Map();
  for (const {endTimeMs} of intervals) {
    // TODO(@decentralion): Factor this out into tested helper method :)
    const decayedEvaluator = (edge: Edge) => {
      const {timestampMs} = edge;
      // Count from the end of the interval and then take floor division by interval length
      // If the value is between 0 and 1 (i.e. it was created in this interval) give it full
      // weight.
      const ageMs = endTimeMs - timestampMs;
      const ageIntervals = Math.floor(ageMs / intervalLengthMs);
      if (ageIntervals < 0) {
        // Edge not created yet.
        return {toWeight: 0, froWeight: 0};
      }
      const decayFactor = Math.pow(
        0.5,
        ageIntervals / weightHalfLifeInIntervals
      );
      const {toWeight, froWeight} = evaluator(edge);
      return {
        toWeight: toWeight * decayFactor,
        froWeight: froWeight * decayFactor,
      };
    };
    prg.setEdgeEvaluator(decayedEvaluator);
    await prg.runPagerank({alpha, seed});
    for (const {node, score} of prg.nodes()) {
      MapUtil.pushValue(nodeAddressToScores, node.address, score);
    }
  }
  return {intervals, nodeAddressToScores};
}
