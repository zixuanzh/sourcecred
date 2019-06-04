// @flow

import {EdgeAddress, Graph, NodeAddress} from "./graph";

/**
 * Create a new Node from an array of string address parts.
 *
 * Fields on the node will be set with dummy values.
 * Test code should endeavor to use this whenever the code
 * is not testing how specific fields are handled; that way, adding
 * new fields will not require updating unrelated test code across
 * the codebase.
 *
 * The returned node is frozen; as such, it is safe to re-use this exact
 * object across test cases. If any non-primitive field is added to Node,
 * please ensure this function freezes that field explicitly.
 */
export const partsNode = (parts: string[]) =>
  Object.freeze({
    address: NodeAddress.fromParts(parts),
    description: parts.toString(),
  });

/**
 * Create a new Node from a single address part.
 *
 * The same considerations as partsNode apply.
 */
export const node = (name: string) => partsNode([name]);

export function advancedGraph() {
  // The advanced graph has the following features:
  // - Multiple edges of same hom, from `src` to `dst`
  // - An isolated node, `isolated`
  // - A loop
  // - A node and edge with the same toParts representation
  // This function exposes all of the pieces of the advanced graph.
  // It also returns two different versions of the graph, which are
  // logically equivalent but very different history
  // To avoid contamination, every piece is exposed as a function
  // which generates a clean copy of that piece.
  const src = node("src");
  const dst = node("dst");
  const hom1 = Object.freeze({
    src: src.address,
    dst: dst.address,
    address: EdgeAddress.fromParts(["hom", "1"]),
    timestampMs: 0,
  });
  const hom2 = Object.freeze({
    src: src.address,
    dst: dst.address,
    address: EdgeAddress.fromParts(["hom", "2"]),
    timestampMs: 0,
  });
  const loop = node("loop");
  const loop_loop = Object.freeze({
    src: loop.address,
    dst: loop.address,
    address: EdgeAddress.fromParts(["loop"]),
    timestampMs: 0,
  });

  const halfIsolated = node("halfIsolated");
  const phantomNode = node("phantom");
  const halfDanglingEdge = Object.freeze({
    src: halfIsolated.address,
    dst: phantomNode.address,
    address: EdgeAddress.fromParts(["half", "dangling"]),
    timestampMs: 0,
  });
  const fullDanglingEdge = Object.freeze({
    src: phantomNode.address,
    dst: phantomNode.address,
    address: EdgeAddress.fromParts(["full", "dangling"]),
    timestampMs: 0,
  });

  const isolated = node("isolated");
  const graph1 = () =>
    new Graph()
      .addNode(src)
      .addNode(dst)
      .addNode(loop)
      .addNode(isolated)
      .addEdge(hom1)
      .addEdge(hom2)
      .addEdge(loop_loop)
      .addNode(halfIsolated)
      .addEdge(halfDanglingEdge)
      .addEdge(fullDanglingEdge);

  // graph2 is logically equivalent to graph1, but is constructed with very
  // different history.
  // Use this to check that logically equivalent graphs are treated
  // equivalently, regardless of their history.
  const phantomEdge1 = Object.freeze({
    src: src.address,
    dst: phantomNode.address,
    address: EdgeAddress.fromParts(["phantom"]),
    timestampMs: 0,
  });
  const phantomEdge2 = Object.freeze({
    src: src.address,
    dst: isolated.address,
    address: EdgeAddress.fromParts(["not", "so", "isolated"]),
    timestampMs: 0,
  });

  // To verify that the graphs are equivalent, every mutation is preceded
  // by a comment stating what the set of nodes and edges are prior to that mutation
  const graph2 = () =>
    new Graph()
      // N: [], E: []
      .addNode(phantomNode)
      // N: [phantomNode], E: []
      .addNode(src)
      // N: [phantomNode, src], E: []
      .addEdge(phantomEdge1)
      // N: [phantomNode, src], E: [phantomEdge1]
      .addNode(isolated)
      // N: [phantomNode, src, isolated], E: [phantomEdge1]
      .addNode(halfIsolated)
      // N: [phantomNode, src, isolated, halfIsolated]
      // E: [phantomEdge1]
      .addEdge(halfDanglingEdge)
      // N: [phantomNode, src, isolated, halfIsolated]
      // E: [phantomEdge1, halfDanglingEdge]
      .addEdge(fullDanglingEdge)
      // N: [phantomNode, src, isolated, halfIsolated]
      // E: [phantomEdge1, halfDanglingEdge, fullDanglingEdge]
      .removeEdge(phantomEdge1.address)
      // N: [phantomNode, src, isolated, halfIsolated]
      // E: [halfDanglingEdge, fullDanglingEdge]
      .addNode(dst)
      // N: [phantomNode, src, isolated, halfIsolated, dst]
      // E: [halfDanglingEdge, fullDanglingEdge]
      .addEdge(hom1)
      // N: [phantomNode, src, isolated, halfIsolated, dst]
      // E: [halfDanglingEdge, fullDanglingEdge, hom1]
      .addEdge(phantomEdge2)
      // N: [phantomNode, src, isolated, halfIsolated, dst]
      // E: [halfDanglingEdge, fullDanglingEdge, hom1, phantomEdge2]
      .addEdge(hom2)
      // N: [phantomNode, src, isolated, halfIsolated, dst]
      // E: [halfDanglingEdge, fullDanglingEdge, hom1, phantomEdge2, hom2]
      .removeEdge(hom1.address)
      // N: [phantomNode, src, isolated, halfIsolated, dst]
      // E: [halfDanglingEdge, fullDanglingEdge, phantomEdge2, hom2]
      .removeNode(phantomNode.address)
      // N: [src, isolated, halfIsolated, dst]
      // E: [halfDanglingEdge, fullDanglingEdge, phantomEdge2, hom2]
      .removeEdge(phantomEdge2.address)
      // N: [src, isolated, halfIsolated, dst]
      // E: [halfDanglingEdge, fullDanglingEdge, hom2]
      .removeNode(isolated.address)
      // N: [src, halfIsolated, dst]
      // E: [halfDanglingEdge, fullDanglingEdge, hom2]
      .addNode(isolated)
      // N: [src, halfIsolated, dst, isolated]
      // E: [halfDanglingEdge, fullDanglingEdge, hom2]
      .addNode(loop)
      // N: [src, halfIsolated, dst, isolated, loop]
      // E: [halfDanglingEdge, fullDanglingEdge, hom2]
      .addEdge(loop_loop)
      // N: [src, halfIsolated, dst, isolated, loop]
      // E: [halfDanglingEdge, fullDanglingEdge, hom2, loop_loop]
      .addEdge(hom1);
  //     N: [src, halfIsolated, dst, isolated, loop]
  //     E: [halfDanglingEdge, fullDanglingEdge, hom2, loop_loop, hom1]
  const nodes = {src, dst, loop, isolated, phantomNode, halfIsolated};
  const edges = {
    hom1,
    hom2,
    loop_loop,
    phantomEdge1,
    phantomEdge2,
    halfDanglingEdge,
    fullDanglingEdge,
  };
  return {nodes, edges, graph1, graph2};
}
