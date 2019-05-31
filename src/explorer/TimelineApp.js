// @flow

import React from "react";
import type {Assets} from "../webutil/assets";
import type {RepoId} from "../core/repoId";
import {Graph} from "../core/graph";
import {TimelineExplorer} from "./TimelineExplorer";
import {declaration as gitDeclaration} from "../plugins/git/declaration";
import {declaration as githubDeclaration} from "../plugins/github/declaration";

export type Props = {|
  +assets: Assets,
  +repoId: RepoId,
  +loader: Loader,
|};

export type Loader = (assets: Assets, repoId: RepoId) => Promise<LoadResult>;

export type LoadResult = Loading | LoadSuccess | LoadError;
export type Loading = {|+type: "LOADING"|};
export type LoadSuccess = {|
  +type: "SUCCESS",
  +graph: Graph,
|};
export type LoadError = {|+type: "ERROR", +error: Error|};

export type State = {|
  loadResult: LoadResult,
|};
export class TimelineApp extends React.Component<Props, State> {
  state = {loadResult: {type: "LOADING"}};

  componentDidMount() {
    this.load();
  }

  async load() {
    const loadResult = await this.props.loader(
      this.props.assets,
      this.props.repoId
    );
    this.setState({loadResult});
  }

  render() {
    const {loadResult} = this.state;
    switch (loadResult.type) {
      case "LOADING": {
        return <h1>Loading...</h1>;
      }
      case "ERROR": {
        return (
          <div>
            <h1>Load Error:</h1>
            <p>{String(loadResult.error)}</p>
          </div>
        );
      }
      case "SUCCESS": {
        const {graph} = loadResult;
        return (
          <TimelineExplorer
            graph={graph}
            repoId={this.props.repoId}
            declarations={[gitDeclaration, githubDeclaration]}
          />
        );
      }
      default:
        throw new Error(`Unexpected load state: ${(loadResult.type: empty)}`);
    }
  }
}

export async function defaultLoader(
  assets: Assets,
  repoId: RepoId
): Promise<LoadResult> {
  async function fetchGraph(): Promise<Graph> {
    const url = assets.resolve(
      `api/v1/data/data/${repoId.owner}/${repoId.name}/graph.json`
    );
    const response = await fetch(url);
    if (!response.ok) {
      return Promise.reject(response);
    }
    return Graph.fromJSON(await response.json());
  }

  try {
    const graph = await fetchGraph();
    return {type: "SUCCESS", graph};
  } catch (e) {
    console.error(e);
    return {type: "ERROR", error: e};
  }
}
