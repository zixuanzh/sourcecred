// @flow

import React from "react";
import Markdown from "react-markdown";
import {Graph, type NodeAddressT} from "../core/graph";
import {type TimelineScores} from "../analysis/computeTimelineCred.js";
import {TimelineScoreHelper} from "../analysis/timelineScoreHelper.js";
import {TimelineCredChart} from "./TimelineCredChart";
import {format} from "d3-format";

export type Props = {|
  +timelineScores: TimelineScores,
  +selectedNodeFilter: NodeAddressT,
  +graph: Graph,
|};

const MAX_ENTRIES_PER_LIST = 100;
const DEFAULT_ENTRIES_PER_CHART = 10;

export class TimelineCredView extends React.Component<Props> {
  render() {
    const {selectedNodeFilter, timelineScores, graph} = this.props;
    const credView = new TimelineScoreHelper(graph, timelineScores);
    const nodes = credView.credSortedNodes(selectedNodeFilter);
    const tableNodes = nodes.slice(0, MAX_ENTRIES_PER_LIST);
    const chartNodes = nodes
      .slice(0, DEFAULT_ENTRIES_PER_CHART)
      .map((x) => x.node.address);
    let totalScore = 0;
    for (const {score} of nodes) {
      totalScore += score;
    }
    return (
      <div style={{width: 1000, margin: "0 auto"}}>
        <TimelineCredChart
          graph={graph}
          timelineScores={timelineScores}
          displayedNodes={chartNodes}
        />
        <table style={{width: 600, margin: "0 auto", padding: "0 10px"}}>
          <thead>
            <tr>
              <th>Node</th>
              <th style={{textAlign: "right"}}>Cred</th>
              <th style={{textAlign: "right"}}>% Total</th>
            </tr>
          </thead>
          <tbody>
            {tableNodes.map(({node, score}) => {
              return (
                <tr key={node.address}>
                  <td>
                    <Markdown
                      renderers={{paragraph: "span"}}
                      source={node.description}
                    />
                  </td>
                  <td style={{textAlign: "right"}}>{format(".1d")(score)}</td>
                  <td style={{textAlign: "right"}}>
                    {format(".1%")(score / totalScore)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
