// @flow

import sortBy from "lodash.sortby";
import deepEqual from "lodash.isequal";
import {timeWeek} from "d3-time";
import * as NullUtil from "../util/null";
import {Graph, type NodeAddressT, type Edge, type Node} from "../core/graph";
import {PagerankGraph} from "../core/pagerankGraph";
import {type NodeAndEdgeTypes} from "./types";
import {type Weights} from "./weights";
import {type EdgeEvaluator} from "./pagerank";
import {
  weightsToEdgeEvaluator,
  weightsToNodeEvaluator,
} from "./weightsToEdgeEvaluator";
import * as MapUtil from "../util/map";
import {userNodeType} from "../plugins/github/declaration";

export type Interval = {|
  +startTimeMs: number,
  +endTimeMs: number,
|};

export type TimelineScores = {|
  +intervals: $ReadOnlyArray<Interval>,
  +nodeAddressToScores: Map<NodeAddressT, number[]>,
|};

export function derivedInterals(
  graph: Graph
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
  intervalHalfLife: number,
  seedPrefix: NodeAddressT,
  seedStrategy: "TIME" | "PREFIX",
  alpha: number
): Promise<TimelineScores> {
  console.time("computeTimelineScores");
  const intervalsWithNodes = derivedInterals(graph);

  const evaluator = weightsToEdgeEvaluator(weights, types);
  const nodeEvaluator = weightsToNodeEvaluator(weights, types);
  const prg = new PagerankGraph(graph, evaluator);
  const intervals = intervalsWithNodes.map((x) => x.interval);

  const decayedEvaluatorForInterval = decayedEvaluator(
    evaluator,
    intervals,
    intervalHalfLife
  );

  const nodeAddressToScores = new Map();
  for (const {interval, nodesForInterval} of intervalsWithNodes) {
    const decayedEvaluator = decayedEvaluatorForInterval(interval);
    let totalCredForinterval = 0;
    nodesForInterval.forEach(({address}) => {
      totalCredForinterval += nodeEvaluator(address);
    });
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
    let totalUserScore = 0;
    for (const {score} of prg.nodes({prefix: userNodeType.prefix})) {
      totalUserScore += score;
    }

    for (const {node, score} of prg.nodes()) {
      const cred = (score * totalCredForinterval) / totalUserScore;
      MapUtil.pushValue(nodeAddressToScores, node.address, cred);
    }
  }
  console.timeEnd("computeTimelineScores");
  return {intervals, nodeAddressToScores};
}

export function decayedEvaluator(
  baseEvaluator: EdgeEvaluator,
  intervals: Interval[],
  intervalHalfLife: number
): (Interval) => EdgeEvaluator {
  const edgeAddressToIntervalIndex = new Map();
  const edgeAddressToWeight = new Map();
  function getIntervalIndex(e: Edge) {
    const cached = edgeAddressToIntervalIndex.get(e.address);
    if (cached != null) {
      return cached;
    }
    const {timestampMs} = e;
    const index = intervals.findIndex(
      ({startTimeMs, endTimeMs}) =>
        startTimeMs <= timestampMs && timestampMs < endTimeMs
    );
    edgeAddressToIntervalIndex.set(e.address, index);
    return index;
  }
  function getBaseWeight(e: Edge) {
    const cached = edgeAddressToWeight.get(e.address);
    if (cached != null) {
      return cached;
    }
    const weight = baseEvaluator(e);
    edgeAddressToWeight.set(e.address, weight);
    return weight;
  }
  return function evaluatorForInterval(interval: Interval): EdgeEvaluator {
    const intervalIndex = NullUtil.get(
      intervals.findIndex((x) => deepEqual(interval, x))
    );
    return (edge: Edge) => {
      const edgeIndex = getIntervalIndex(edge);
      const intervalsElapsed = intervalIndex - edgeIndex;
      if (intervalsElapsed < 0) {
        return {toWeight: 0, froWeight: 0};
      } else {
        const timeDecay = decayFactor(intervalHalfLife, intervalsElapsed);
        const {toWeight, froWeight} = getBaseWeight(edge);
        return {
          toWeight: toWeight * timeDecay,
          froWeight: froWeight * timeDecay,
        };
      }
    };
  };
}

export function decayFactor(halfLife: number, nPeriods: number): number {
  return Math.pow(0.5, nPeriods / halfLife);
}
