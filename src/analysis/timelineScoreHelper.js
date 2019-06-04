// @flow

import sortBy from "lodash.sortby";
import {Graph, NodeAddress, type NodeAddressT} from "../core/graph";
import {type ScoredNode} from "../core/pagerankGraph";
import {type TimelineScores, type Interval} from "./computeTimelineCred";
import * as NullUtil from "../util/null";

/**
 * Helper for accessing timeline cred
 */
export class TimelineScoreHelper {
  _scores: TimelineScores;
  _graph: Graph;
  constructor(graph: Graph, timelineScores: TimelineScores) {
    this._scores = timelineScores;
    this._graph = graph;
  }

  /**
   * Return all the nodes matching the prefix, along with their cred,
   * sorted by cred (descending).
   */
  credSortedNodes(prefix: NodeAddressT): $ReadOnlyArray<ScoredNode> {
    const results = [];
    for (const node of this._graph.nodes({prefix})) {
      const score = this.aggregateCred(node.address);
      results.push({node, score});
    }
    return sortBy(results, (x) => -x.score);
  }

  /**
   * Gets the aggregate cred for an individual node.
   *
   * The resultant cred is aggregated across intervals.
   *
   * Throws an error if the node address is not in the view.
   */
  aggregateCred(n: NodeAddressT): number {
    let aggregate = 0;
    for (const {cred} of this.timeseriesCred(n)) {
      aggregate += cred;
    }
    return aggregate;
  }

  /**
   * Gets the timeseries history of cred for a node.
   *
   * The timeseries is a sequence of {interval, cred} objects,
   * showing how much cred the node accumulated in each interval.
   *
   * Throws an error if the node address is not in the view.
   */
  timeseriesCred(
    n: NodeAddressT
  ): Iterator<{|+interval: Interval, +cred: number|}> {
    if (!this._scores.nodeAddressToScores.has(n)) {
      throw new Error(`Missing node address: ${NodeAddress.toString(n)}`);
    }
    return this._timeseriesCred(n);
  }

  *_timeseriesCred(
    n: NodeAddressT
  ): Iterator<{|+interval: Interval, +cred: number|}> {
    const {nodeAddressToScores, intervals} = this._scores;
    const scores = NullUtil.get(nodeAddressToScores.get(n));
    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];
      const score = scores[i];
      yield {interval, cred: score};
    }
  }
}
