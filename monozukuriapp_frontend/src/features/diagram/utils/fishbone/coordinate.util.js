import { config, directions } from "./config";

export function computeRootCoordinates(parent, node) {
  // All lv1 bones have the same height
  node.height = parent.maxHeightChildren;
  let yMultiplier = 1;
  if (node.direction === directions.SOUTH_EAST || node.direction === directions.SOUTH_WEST) {
    yMultiplier = -1;
  }
  const preNode = parent.children[node.index - 2] || null;
  let x1 = 0;
  if (parent.isAbove && node.index % 2 === 0) {
    x1 += parent.space || 0;
  }
  if (!parent.isAbove && node.index % 2 === 1) {
    x1 += parent.space || 0;
  }
  if (!preNode) {
    x1 += parent.line.x1 + node.lWidth + config.BASE_PADDING;
  } else {
    x1 += preNode.line.x1 + preNode.rWidth + node.lWidth + config.BASE_PADDING * 2;
  }
  node.line = {
    x1,
    y1: parent.line.y1,
    x2: x1 - node.height / config.SLOPEANGLE,
    y2: parent.line.y1 + yMultiplier * node.height,
  };
  // compute text coordinate
  computeTextCoordinate(node);
}

export function computeChildCoordinates(parent, node) {
  // If the parent is a complete bone, then the node will be a cross bone, and the cross bones will follow the parent bone.
  const preNode = parent.children[node.index - 2] || null;

  if (parent.level % 2 === 0) {
    // multiplier to adjust whether the node's bone will be above or below the parent
    let yMultiplier = 1,
      xMultiplier = 1;
    let x1 = 0;

    /*
      If there is no node slibing before -> point x1 needs to be 1 lWidth or rWidth of the node + base padding away from the parent bone on the y axis.
      If the node is oriented to the east then gapNodeWidth = node.rWidth
      If the node is oriented to the west then gapNodeWidth = node.lWidth
    */
    let gapNodeWidth = node.lWidth;

    if (node.direction === directions.SOUTH_EAST || node.direction === directions.SOUTH_WEST) {
      yMultiplier = -1;
    }
    if (node.direction === directions.SOUTH_EAST || node.direction === directions.NORTH_EAST) {
      xMultiplier = -1;
      gapNodeWidth = node.rWidth;
    }
    if (!preNode) {
      x1 = parent.line.x1 + xMultiplier * (gapNodeWidth + config.BASE_PADDING);
    } else {
      /*
        gapPreWidth is the distance between the previous node on the same side
        If the node is oriented to the east, the distance x1 between the 2 nodes will be: preNode.lWidth + config.BASE_PADDING * 2
        If the node is oriented to the west, the distance x1 between the 2 nodes will be: preNode.rWidth + config.BASE_PADDING * 2
      */
      let gapPreWidth = preNode.rWidth;
      if (node.direction === directions.SOUTH_EAST || node.direction === directions.NORTH_EAST) {
        gapPreWidth = preNode.lWidth;
      }
      x1 = preNode.line.x1 + xMultiplier * (gapPreWidth + gapNodeWidth + config.BASE_PADDING * 2);
    }
    node.height = node.tHeight + node.bHeight;
    if (node.index === 1) {
      x1 += config.STAGGERED_SPACING * xMultiplier;
    }
    // Add space so the bones are balanced with each other.
    if (parent.isAbove && node.index % 2 === 0) {
      x1 += (parent.space || 0) * xMultiplier;
    }
    if (!parent.isAbove && node.index % 2 === 1) {
      x1 += (parent.space || 0) * xMultiplier;
    }
    node.line = {
      x1,
      y1: parent.line.y1,
      x2: x1 + xMultiplier * ((node.height - node.text.height - config.BASE_TEXT_PADDING) / config.SLOPEANGLE),
      y2: parent.line.y1 + yMultiplier * (node.height - node.text.height - config.BASE_TEXT_PADDING),
    };
    computeTextCoordinate(node);
  }
  // If parent is a cross bone then node will be a cross bone, and node.index %2 !== 0 will follow parent bone
  else {
    // To make it faster, the first node always points in the direction of the parent PhucNV
    // Processing gapX gapY is better because: Projecting up -> + Y, projecting down - Y, projecting east -X, projecting west + x
    // Processing gapX gapY is better because: Projecting up -> + Y, projecting down - Y, projecting east -X, projecting west + x
    // Processing gapX gapY is better because: Projecting up -> + Y, projecting down - Y, projecting east -X, projecting west + x
    // Processing gapX gapY is better because: Projecting up -> + Y, projecting down - Y, projecting east -X, projecting west + x
    // Processing gapX gapY is better because: Projecting up -> + Y, projecting down - Y, projecting east -X, projecting west + x

    let x1 = 0,
      y1 = 0,
      xGap = 0,
      yGap = 0;
    let multiplier = 1;
    if (node.direction === directions.EAST) multiplier = -1; // For east direction, x2 = x1 - lWidth, for west direction x2 = x1 + RWidth
    switch (parent.direction) {
      case directions.SOUTH_EAST:
        if (preNode) {
          yGap = (preNode.tHeight + 2 * config.BASE_PADDING + node.bHeight) * -1; // - height will push that point up
        } else {
          yGap = (2 * config.BASE_PADDING + node.bHeight) * -1;
        }
        if (node.index === 1) {
          yGap += config.STAGGERED_SPACING * -1;
        }
        xGap = (-1 * Math.abs(yGap)) / config.SLOPEANGLE; // Because the direction is east, x of the next node will < x of the previous node
        // Add spacing so the bones are balanced
        if (parent.isLeft && node.index % 2 === 0) {
          xGap -= parent.spaceWidthEast || 0;
          yGap -= parent.spaceHeightEast || 0;
        }
        if (parent.isRight && node.index % 2 === 1) {
          xGap -= parent.spaceWidthWest || 0;
          yGap -= parent.spaceHeightWest || 0;
        }
        break;
      case directions.SOUTH_WEST:
        if (preNode) {
          yGap = (preNode.tHeight + 2 * config.BASE_PADDING + node.bHeight) * -1;
        } else {
          yGap = (2 * config.BASE_PADDING + node.bHeight) * -1;
        }
        if (node.index === 1) {
          yGap += config.STAGGERED_SPACING * -1;
        }
        xGap = Math.abs(yGap) / config.SLOPEANGLE; // Because the direction is west, the x of the next node will > x of the previous node
        // Add spacing so the bones are balanced
        if (parent.isRight && node.index % 2 === 1) {
          xGap += parent.spaceWidthWest || 0;
          yGap -= parent.spaceHeightWest || 0;
        }
        if (parent.isLeft && node.index % 2 === 0) {
          xGap += parent.spaceWidthEast || 0;
          yGap -= parent.spaceHeightEast || 0;
        }
        break;
      case directions.NORTH_EAST:
        if (preNode) {
          /*
            yGap increases to push the fishbone downwards (south)
            Since it is downwards the distance will be the bHeight of the previous node + the tHeight of the current node
          */
          yGap = preNode.bHeight + 2 * config.BASE_PADDING + node.tHeight;
        } else {
          yGap = 2 * config.BASE_PADDING + node.tHeight;
        }
        if (node.index === 1) {
          yGap += config.STAGGERED_SPACING;
        }
        xGap = (-1 * Math.abs(yGap)) / config.SLOPEANGLE; // Because going east, x nodes later will < x nodes earlier

        // Add spacing so the bones are balanced
        if (parent.isLeft && node.index % 2 === 0) {
          xGap -= parent.spaceWidthEast || 0;
          yGap += parent.spaceHeightEast || 0;
        }
        if (parent.isRight && node.index % 2 === 1) {
          xGap -= parent.spaceWidthWest || 0;
          yGap += parent.spaceHeightWest || 0;
        }
        break;
      case directions.NORTH_WEST:
        if (preNode) {
          yGap = preNode.bHeight + 2 * config.BASE_PADDING + node.tHeight;
        } else {
          yGap = 2 * config.BASE_PADDING + node.tHeight;
        }
        if (node.index === 1) {
          yGap += config.STAGGERED_SPACING;
        }
        xGap = Math.abs(yGap) / config.SLOPEANGLE;

        // Add spacing so the bones are balanced
        if (parent.isRight && node.index % 2 === 1) {
          xGap += parent.spaceWidthWest || 0;
          yGap += parent.spaceHeightWest || 0;
        }
        if (parent.isLeft && node.index % 2 === 0) {
          xGap += parent.spaceWidthEast || 0;
          yGap += parent.spaceHeightEast || 0;
        }

        break;
      default:
        console.log("============= throw error here");
        break;
    }

    x1 = preNode ? preNode.line.x1 + xGap : parent.line.x1 + xGap;
    y1 = preNode ? preNode.line.y1 + yGap : parent.line.y1 + yGap;

    node.line = {
      x1,
      y1,
      x2: x1 + (node.lWidth + node.rWidth - node.text.width - node.textAngle) * multiplier, // because finished node can only have lWidth or rWidth
      y2: y1,
    };
    computeTextCoordinate(node);
  }
}

export function computeTextCoordinate(node) {
  switch (node.direction) {
    case directions.SOUTH_EAST:
      node.text.x = node.line.x2 - node.text.width / 2;
      node.text.y = node.line.y2 - node.text.height - config.BASE_TEXT_PADDING; // subtract will push up
      break;
    case directions.SOUTH_WEST:
      node.text.x = node.line.x2 - node.text.width / 2;
      node.text.y = node.line.y2 - node.text.height - config.BASE_TEXT_PADDING;
      break;
    case directions.NORTH_EAST:
      node.text.x = node.line.x2 - node.text.width / 2;
      node.text.y = node.line.y2 + config.BASE_TEXT_PADDING;
      break;
    case directions.NORTH_WEST:
      node.text.x = node.line.x2 - node.text.width / 2;
      node.text.y = node.line.y2 + config.BASE_TEXT_PADDING;
      break;
    case directions.EAST:
      node.text.x = node.line.x2 - node.text.width - config.BASE_TEXT_PADDING;
      node.text.y = node.line.y2 - node.text.height / 2;
      break;
    case directions.WEST:
      node.text.x = node.line.x2 + config.BASE_TEXT_PADDING;
      node.text.y = node.line.y2 - node.text.height / 2;
      break;
    default:
      console.log("=========== throw error");
  }
}

export function setBaseFishBone(root) {
  // start from root
  root.line = {
    x1: 150,
    y1: root.height / 2 + 50,
    x2: 0 + root.lWidth,
    y2: root.height / 2 + 50,
  };
}
