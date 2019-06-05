// @flow

import sortBy from "lodash.sortby";
import {timeWeek} from "d3-time";
import {Graph, type NodeAddressT, type Edge, type Node} from "../core/graph";
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
): {|+interval: Interval, +nodesForInterval: Node[]|}[] {
  const nodesWithTimestamps = Array.from(graph.nodes()).filter(
    (x) => x.timestampMs != null
  );
  const sortedNodes = sortBy(nodesWithTimestamps, (x) => x.timestampMs);
  const boundaries = timeWeek.range(
    sortedNodes[0].timestampMs,
    sortedNodes[sortedNodes.length - 1].timestampMs
  );
  const intervals = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    intervals.push({
      startTimeMs: +boundaries[i],
      endTimeMs: +boundaries[i + 1],
    });
  }

  let index = 0;

  return intervals.map((interval) => {
    const nodesForInterval = [];
    while (
      index < sortedNodes.length &&
      sortedNodes[index].timestampMs < interval.endTimeMs
    ) {
      nodesForInterval.push(sortedNodes[index++]);
    }
    return {interval, nodesForInterval};
  });
}

export async function computeTimelineScores(
  graph: Graph,
  types: NodeAndEdgeTypes,
  weights: Weights,
  intervalLengthMs: number,
  weightHalfLifeInIntervals: number,
  seedPrefix: NodeAddressT,
  seedStrategy: "TIME" | "PREFIX",
  alpha: number
): Promise<TimelineScores> {
  console.time("computeTimelineScores");
  const intervalsWithNodes = derivedInterals(graph, intervalLengthMs);

  const evaluator = weightsToEdgeEvaluator(weights, types);
  const prg = new PagerankGraph(graph, evaluator);

  const nodeAddressToScores = new Map();
  for (const {interval, nodesForInterval} of intervalsWithNodes) {
    const {endTimeMs} = interval;
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
    const seed = new Map();
    switch (seedStrategy) {
      case "TIME": {
        for (const {address} of nodesForInterval) {
          seed.set(address, 1);
        }
        break;
      }
      case "PREFIX": {
        for (const {address} of graph.nodes({prefix: seedPrefix})) {
          seed.set(address, 1);
        }
        break;
      }
      default:
        throw new Error("wtf");
    }
    prg.setEdgeEvaluator(decayedEvaluator);
    await prg.runPagerank({alpha, seed});
    for (const {node, score} of prg.nodes()) {
      MapUtil.pushValue(nodeAddressToScores, node.address, score);
    }
  }
  const intervals = intervalsWithNodes.map((x) => x.interval);
  console.timeEnd("computeTimelineScores");
  return {intervals, nodeAddressToScores};
}
