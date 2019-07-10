// @flow

import tmp from "tmp";
import {localGit} from "./gitUtils";
import type {Repository} from "./types";
import {loadRepository} from "./loadRepository";
import type {RepoId} from "../../core/repoId";
import { booleanLiteral } from "@babel/types";

/**
 * Load Git repository data from a fresh clone of a GitHub repo. Loads
 * commits only.
 *
 * @param {RepoId} repoId
 *   the GitHub repository to be cloned
 * @param {boolean} sshFlag
 *   a flag to denote ssh usage over HTTPS
 * @return {Repository}
 *   the parsed Repository from the cloned repo
 */
export default function cloneAndLoadRepository(sshFlag: boolean, repoId: RepoId): Repository {
  const cloneUrl = (sshFlag ? 'git@github.com:' : 'https://github.com/') + `${repoId.owner}/${repoId.name}.git`;
  const tmpdir = tmp.dirSync({unsafeCleanup: true});
  const git = localGit(tmpdir.name);
  git(["clone", cloneUrl, ".", "--quiet"]);
  const result = loadRepository(tmpdir.name, "HEAD", repoId);
  tmpdir.removeCallback();
  return result;
}
