// @flow

import React from "react";
import sortBy from "lodash.sortby";
import {userNodeType, repoNodeType} from "../plugins/github/declaration";
import {type RepoId} from "../core/repoId";
import {Graph, type NodeAddressT, NodeAddress} from "../core/graph";
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
import {ProjectDetail} from "./App";
import {WeightConfig} from "./weights/WeightConfig";
import {WeightsFileManager} from "./weights/WeightsFileManager";

export type Props = {
  repoId: RepoId,
  graph: Graph,
  declarations: $ReadOnlyArray<PluginDeclaration>,
};

export type State = {
  selectedNodeTypePrefix: NodeAddressT,
  timelineScores: TimelineScores | null,
  weights: Weights,
  loading: boolean,
  showWeightConfig: boolean,
};

const ALPHA = 0.05;

export class TimelineExplorer extends React.Component<Props, State> {
  state = {
    selectedNodeTypePrefix: userNodeType.prefix,
    timelineScores: null,
    weights: defaultWeights(),
    loading: false,
    showWeightConfig: false,
  };

  async analyzeCred() {
    this.setState({loading: true});
    const types = combineTypes(this.props.declarations);
    const timelineScores = await computeTimelineScores(
      this.props.graph,
      types,
      this.state.weights,
      1,
      repoNodeType.prefix,
      "TIME",
      ALPHA
    );
    this.setState({timelineScores, loading: false});
  }

  renderFilterSelect() {
    const {declarations} = this.props;

    function optionGroup(declaration: PluginDeclaration) {
      const header = (
        <option
          key={declaration.nodePrefix}
          value={declaration.nodePrefix}
          style={{fontWeight: "bold"}}
        >
          {declaration.name}
        </option>
      );
      const entries = declaration.nodeTypes.map((type) => (
        <option key={type.prefix} value={type.prefix}>
          {"\u2003" + type.name}
        </option>
      ));
      return [header, ...entries];
    }
    return (
      <label>
        <span>Filter by node type: </span>
        <select
          value={this.state.selectedNodeTypePrefix}
          onChange={(e) =>
            this.setState({selectedNodeTypePrefix: e.target.value})
          }
        >
          <option value={NodeAddress.empty}>Show all</option>
          {sortBy(declarations, (d) => d.name).map(optionGroup)}
        </select>
      </label>
    );
  }

  renderConfigurationRow() {
    const {showWeightConfig} = this.state;
    const weightFileManager = (
      <WeightsFileManager
        weights={this.state.weights}
        onWeightsChange={(weights: Weights) => {
          this.setState({weights});
        }}
      />
    );
    const weightConfig = (
      <WeightConfig
        declarations={this.props.declarations}
        nodeTypeWeights={this.state.weights.nodeTypeWeights}
        edgeTypeWeights={this.state.weights.edgeTypeWeights}
        onNodeWeightChange={(prefix, weight) => {
          this.setState(({weights}) => {
            weights.nodeTypeWeights.set(prefix, weight);
            return {weights};
          });
        }}
        onEdgeWeightChange={(prefix, weight) => {
          this.setState(({weights}) => {
            weights.edgeTypeWeights.set(prefix, weight);
            return {weights};
          });
        }}
      />
    );
    return (
      <div>
        <div style={{marginTop: 10, display: "flex"}}>
          {this.renderFilterSelect()}
          <span style={{flexGrow: 1}} />
          {weightFileManager}
          <button
            onClick={() => {
              this.setState(({showWeightConfig}) => ({
                showWeightConfig: !showWeightConfig,
              }));
            }}
          >
            {showWeightConfig
              ? "Hide weight configuration"
              : "Show weight configuration"}
          </button>
        </div>
        {showWeightConfig && <div style={{marginTop: 10}}>{weightConfig}</div>}
      </div>
    );
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
        selectedNodeFilter={this.state.selectedNodeTypePrefix}
        graph={this.props.graph}
      />
    );
    return (
      <div style={{width: 900, margin: "0 auto"}}>
        <ProjectDetail repoId={this.props.repoId} />
        {analyzeButton}
        {this.renderConfigurationRow()}
        {timelineCredView}
      </div>
    );
  }
}
