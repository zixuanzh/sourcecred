// @flow

import React from "react";
import Markdown from "react-markdown";
import {Graph, type NodeAddressT} from "../core/graph";
import {type TimelineScores} from "../analysis/computeTimelineCred.js";
import {TimelineScoreHelper} from "../analysis/timelineScoreHelper.js";

export type Props = {|
  +timelineScores: TimelineScores,
  +selectedNodeFilter: NodeAddressT,
  +graph: Graph,
|};

const MAX_ENTRIES_PER_LIST = 100;

export class TimelineCredView extends React.Component<Props> {
  render() {
    const {selectedNodeFilter, timelineScores, graph} = this.props;
    const credView = new TimelineScoreHelper(graph, timelineScores);
    const nodes = credView
      .credSortedNodes(selectedNodeFilter)
      .slice(0, MAX_ENTRIES_PER_LIST);
    return (
      <div>
        {nodes.map(({node, score}) => {
          return (
            <div>
              <span>
                <Markdown source={node.description} />
              </span>
              <span>{score}</span>
            </div>
          );
        })}
      </div>
    );
  }
}
