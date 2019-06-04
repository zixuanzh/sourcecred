// @flow
// TODO: Remove this file

import * as R from "./relationalView";
export type MsSinceEpoch = number;

export function createdAt(e: R.Entity): MsSinceEpoch | null {
  return e.timestampMs();
}
