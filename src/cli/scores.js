// @flow
// Implementation of `sourcecred pagerank`.

import fs from "fs-extra";
import path from "path";

import {NodeAddress} from "../core/graph";
import {PagerankGraph, type PagerankGraphJSON} from "../core/pagerankGraph";
import {stringToRepoId, type RepoId} from "../core/repoId";
import dedent from "../util/dedent";
import type {Command} from "./command";
import * as Common from "./common";
import stringify from "json-stable-stringify";
import {Prefix as GithubPrefix} from "../plugins/github/nodes";

function usage(print: (string) => void): void {
  print(
    dedent`\
    usage: sourcecred scores REPO_ID [--help]

    Prints SourceCred user scores for the given REPO_ID.

    The result is a JSON object containing a map from GitHub username to
    normalized cred score. The sum of all users' scores is 1000.

    REPO_ID refers to a GitHub repository in the form OWNER/NAME: for
    example, torvalds/linux. The REPO_ID may be a "combined" repo as
    created by the --output flag to sourcecred load.

    Arguments:
        REPO_ID
            Already-loaded repository for which to load data.

        --help
            Show this help message and exit, as 'sourcecred help pagerank'.

    Environment Variables:
        SOURCECRED_DIRECTORY
            Directory owned by SourceCred, in which data, caches,
            registries, etc. are stored. Optional: defaults to a
            directory 'sourcecred' under your OS's temporary directory;
            namely:
                ${Common.defaultSourcecredDirectory()}
    `.trimRight()
  );
}

function die(std, message) {
  std.err("fatal: " + message);
  std.err("fatal: run 'sourcecred help scores' for help");
  return 1;
}

/**
 * Harness to create a Pagerank CLI command.
 * It's factored so as to make it easy to test the CLI bits, separately
 * from the core logic.
 * It takes a `loader`, which loads the graph corresponding to a RepoId,
 * a `pagerankRunner` which runs pagerank on that graph, and a `saver`
 * which is responsible for saving the resultant PagerankGraph to disk.
 */
export function makeScoresCommand(
  loader: (RepoId) => Promise<PagerankGraph>
): Command {
  return async function pagerank(args, std) {
    let repoId: RepoId | null = null;
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case "--help": {
          usage(std.out);
          return 0;
        }
        default: {
          if (repoId != null)
            return die(std, "multiple repository IDs provided");
          // Should be a repository.
          repoId = stringToRepoId(args[i]);
          break;
        }
      }
    }

    if (repoId == null) {
      return die(std, "no repository ID provided");
    }

    const graph: PagerankGraph = await loader(repoId);
    const userNodes = Array.from(graph.nodes({prefix: GithubPrefix.user}));
    let totalScore = 0;
    for (const {score} of userNodes) {
      totalScore += score;
    }
    const result = {};
    for (const {node, score} of userNodes) {
      const parts = NodeAddress.toParts(node);
      const username = parts[parts.length - 1];
      result[username] = (score / totalScore) * 1000;
    }
    std.out(stringify(result));
    return 0;
  };
}

async function defaultLoader(r: RepoId): Promise<PagerankGraph> {
  const dir = Common.sourcecredDirectory();
  const subdir = path.join(dir, "data", r.owner, r.name);
  const file = path.join(subdir, "pagerankGraph.json");
  const contents = await fs.readFile(file);
  const json: PagerankGraphJSON = JSON.parse(contents.toString());
  const prg = PagerankGraph.fromJSON(json);
  return prg;
}

export const scoresCommand = makeScoresCommand(defaultLoader);

export const help: Command = async (args, std) => {
  if (args.length === 0) {
    usage(std.out);
    return 0;
  } else {
    usage(std.err);
    return 1;
  }
};

export default scoresCommand;
