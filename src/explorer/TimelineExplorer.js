// @flow

import React from "react";
import {userNodeType, repoNodeType} from "../plugins/github/declaration";
import {type RepoId} from "../core/repoId";
import {Graph, type NodeAddressT} from "../core/graph";
import {
  type PluginDeclaration,
  combineTypes,
} from "../analysis/pluginDeclaration";
import {type Weights, defaultWeights} from "../analysis/weights";
import {
  type TimelineScores,
  computeTimelineScores,
} from "../analysis/computeTimelineCred.js";
import {TimelineCredView} from "./TimelineCredView";

export type Props = {
  repoId: RepoId,
  graph: Graph,
  declarations: $ReadOnlyArray<PluginDeclaration>,
};

export type State = {
  filteredNodePrefix: NodeAddressT,
  timelineScores: TimelineScores | null,
  weights: Weights,
  loading: boolean,
};

const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;
const ALPHA = 0.05;

export class TimelineExplorer extends React.Component<Props, State> {
  state = {
    filteredNodePrefix: userNodeType.prefix,
    timelineScores: null,
    weights: defaultWeights(),
    loading: false,
  };

  async analyzeCred() {
    this.setState({loading: true});
    const types = combineTypes(this.props.declarations);
    const timelineScores = await computeTimelineScores(
      this.props.graph,
      types,
      this.state.weights,
      ONE_WEEK,
      1,
      repoNodeType.prefix,
      "PREFIX",
      ALPHA
    );
    this.setState({timelineScores, loading: false});
  }

  render() {
    const analyzeButton = (
      <button disabled={this.state.loading} onClick={() => this.analyzeCred()}>
        Analyze
      </button>
    );
    const timelineCredView = this.state.timelineScores != null && (
      <TimelineCredView
        timelineScores={this.state.timelineScores}
        selectedNodeFilter={this.state.filteredNodePrefix}
        graph={this.props.graph}
      />
    );
    return (
      <div>
        {timelineCredView}
        {analyzeButton}
      </div>
    );
  }
}
