// @flow

import {EdgeAddress} from "../core/graph";
import {node} from "../core/graphTestUtil";
import {decayedEvaluator} from "./computeTimelineCred";

describe("src/analysis/computeTimelineCred", () => {
  const interval0 = Object.freeze({startTimeMs: 0, endTimeMs: 100});
  const interval1 = Object.freeze({startTimeMs: 100, endTimeMs: 200});
  const intervals = Object.freeze([interval0, interval1]);

  const edge = (ms: number) =>
    Object.freeze({
      address: EdgeAddress.fromParts([ms.toString()]),
      src: node("foo").address,
      dst: node("bar").address,
      timestampMs: ms,
    });

  describe("decayedEvaluatorFactory", () => {
    // TODO(before merging): Check edge cases, etc.
    // Also test the decay factor logic.
    it("works on a very simple evaluator", () => {
      const baseEvaluator = (_unused_edge) => ({toWeight: 1, froWeight: 2});
      const evaluatorForInterval = decayedEvaluator(
        baseEvaluator,
        intervals,
        1
      );
      const evaluator0 = evaluatorForInterval(interval0);
      expect(evaluator0(edge(0))).toEqual({toWeight: 1, froWeight: 2});
      expect(evaluator0(edge(99))).toEqual({toWeight: 1, froWeight: 2});
      expect(evaluator0(edge(150))).toEqual({toWeight: 0, froWeight: 0});
      const evaluator1 = evaluatorForInterval(interval1);
      expect(evaluator1(edge(50))).toEqual({toWeight: 0.5, froWeight: 1});
      expect(evaluator1(edge(150))).toEqual({toWeight: 1, froWeight: 2});
    });
  });
});
