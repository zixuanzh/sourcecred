// @flow

import React from "react";
import removeMd from "remove-markdown";
import {schemeCategory10} from "d3-scale-chromatic";
import {timeFormat} from "d3-time-format";
import {scaleOrdinal} from "d3-scale";
import {timeMonth, timeYear} from "d3-time";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import * as NullUtil from "../util/null";
import {Graph, type NodeAddressT} from "../core/graph";
import {
  type TimelineScores,
  type Interval,
} from "../analysis/computeTimelineCred.js";

export type Props = {
  graph: Graph,
  timelineScores: TimelineScores,
  displayedNodes: $ReadOnlyArray<NodeAddressT>,
};

type LineChartDatum = {
  interval: Interval,
  // May be null if the node score was filtered out (effectively bc.
  // that node did not exist yet)
  score: Map<NodeAddressT, ?number>,
};
export class TimelineCredChart extends React.Component<Props> {
  render() {
    const {graph, timelineScores, displayedNodes} = this.props;
    const {intervals, nodeAddressToScores} = timelineScores;
    const timeDomain = [
      intervals[0].startTimeMs,
      intervals[intervals.length - 1].endTimeMs,
    ];
    const data: LineChartDatum[] = intervals.map((interval, index) => {
      const score = new Map();
      for (const node of displayedNodes) {
        const myScores = NullUtil.get(nodeAddressToScores.get(node));
        const lastScore = index === 0 ? 0 : myScores[index - 1];
        const nextScore =
          index === intervals.length - 1 ? 0 : myScores[index + 1];
        const thisScore = myScores[index];
        // Filter a score out if it's on the zero line and not going anywhere.
        const filteredScore =
          Math.max(lastScore, nextScore, thisScore) < 0.001 ? null : thisScore;
        score.set(node, filteredScore);
      }
      return {score, interval};
    });
    const scale = scaleOrdinal(displayedNodes, schemeCategory10);
    const Lines = displayedNodes.map((n: NodeAddressT) => {
      const description = NullUtil.get(graph.node(n)).description;
      const plainDescription = removeMd(description);
      return (
        <Line
          type="monotone"
          key={n}
          stroke={scale(n)}
          dataKey={(x) => x.score.get(n)}
          name={plainDescription}
        />
      );
    });

    const formatMonth = timeFormat("%b");
    const formatYear = timeFormat("%Y");

    function multiFormat(dateMs) {
      const date = new Date(dateMs);
      return timeYear(date) < date ? formatMonth(date) : formatYear(date);
    }

    const ticks = timeMonth.range(...timeDomain);

    return (
      <LineChart width={1000} height={500} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey={(x) => x.interval.startTimeMs}
          type="number"
          domain={timeDomain}
          tickFormatter={multiFormat}
          ticks={ticks}
        />
        <YAxis />
        {Lines}
        <Tooltip />
        <Legend />
      </LineChart>
    );
  }
}
