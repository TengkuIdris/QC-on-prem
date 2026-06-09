import { computeRootCoordinates, setBaseFishBone, computeChildCoordinates } from "./coordinate.util.js";

export function computeCoordinates(parent, node) {
  if (node.level === 0) return;

  // process separately for root's child nodes
  if (parent.level === 0) {
    computeRootCoordinates(parent, node);
    return;
  }
  computeChildCoordinates(parent, node);
}

export function processComputeCoordinate(root) {
  setBaseFishBone(root);

  const queue = [{ node: root, index: 0 }];
  while (queue.length > 0) {
    const { node } = queue.shift();
    if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        computeCoordinates(node, child);
        child.parent = {
          id: node.id,
          line: {
            x1: node.line.x1,
            y1: node.line.y1,
            x2: node.line.x2,
            y2: node.line.y2,
          },
        };
        queue.push({ node: child });
      }
    }
  }
}
