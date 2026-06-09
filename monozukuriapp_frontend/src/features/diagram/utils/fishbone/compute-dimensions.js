import { processComputeCoordinate } from "./compute-coordinate.js";
import { config, directions } from "./config";
import { computeSmallestNodeDimensions, determineFishboneDirection, handleRootChildHeight } from "./dimensions.util.js";

function computeNodeDimensions(node) {
  if (node.children.length === 0) {
    computeSmallestNodeDimensions(node);
    return;
  }
  let lWidth = 0,
    rWidth = 0,
    tHeight = 0,
    bHeight = 0,
    evenWidth = 0,
    oddWidth = 0,
    oddHeight = 0,
    evenHeight = 0;
  const textAngle = (node?.text?.height || 0) / config.SLOPEANGLE;

  const isDiagonalBone = node.level % 2 !== 0 ? true : false;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    // cross node
    if (isDiagonalBone) {
      switch (node.direction) {
        case directions.SOUTH_EAST:
        case directions.NORTH_EAST:
          // Child facing east
          if (child.direction === directions.EAST) {
            if (node.direction === directions.SOUTH_EAST) {
              evenHeight += child.bHeight + config.BASE_PADDING;
            } else {
              evenHeight += child.tHeight + config.BASE_PADDING;
            }
            evenWidth = child.lWidth + evenHeight / config.SLOPEANGLE;
            lWidth = Math.max(lWidth, evenWidth);
            if (node.direction === directions.SOUTH_EAST) {
              evenHeight += child.tHeight + config.BASE_PADDING;
            } else {
              evenHeight += child.bHeight + config.BASE_PADDING;
            }
          } else {
            oddHeight += child.bHeight + config.BASE_PADDING;
            rWidth = Math.max(rWidth, child.rWidth);
            oddHeight += child.tHeight + config.BASE_PADDING;
          }
          if (node.direction === directions.SOUTH_EAST) {
            tHeight = Math.max(tHeight, Math.max(evenHeight, oddHeight));
          } else {
            bHeight = Math.max(bHeight, Math.max(evenHeight, oddHeight));
          }
          break;
        case directions.SOUTH_WEST:
        case directions.NORTH_WEST:
          // West
          if (child.direction === directions.WEST) {
            oddHeight += child.tHeight + config.BASE_PADDING;
            oddWidth = child.rWidth + oddHeight / config.SLOPEANGLE;
            rWidth = Math.max(rWidth, oddWidth);
            oddHeight += child.bHeight + config.BASE_PADDING;
          } else {
            if (node.direction === directions.SOUTH_WEST) {
              evenHeight += child.bHeight + config.BASE_PADDING;
            } else {
              evenHeight += child.tHeight + config.BASE_PADDING;
            }
            lWidth = Math.max(lWidth, child.lWidth);
            if (node.direction === directions.SOUTH_WEST) {
              evenHeight += child.tHeight + config.BASE_PADDING;
            } else {
              evenHeight += child.bHeight + config.BASE_PADDING;
            }
          }
          if (node.direction === directions.SOUTH_WEST) {
            tHeight = Math.max(tHeight, Math.max(evenHeight, oddHeight));
          } else {
            bHeight = Math.max(bHeight, Math.max(evenHeight, oddHeight));
          }
          break;
        default:
          console.log("========= throw error");
          break;
      }
      // Parallel Node
    }
    // Parallel Node
    else {
      if (node.direction === directions.EAST) {
        // width, height above
        if (child.direction === directions.SOUTH_EAST) {
          evenWidth += child.lWidth + child.rWidth + config.BASE_PADDING * 2;
          tHeight = Math.max(tHeight, child.tHeight);
          if (node.level === 4 && node.parentDirection === directions.SOUTH_WEST) {
            evenWidth += tHeight / config.SLOPEANGLE;
          }
        }
        // width, height below
        else {
          oddWidth += child.lWidth + child.rWidth + config.BASE_PADDING * 2;
          bHeight = Math.max(bHeight, child.bHeight);
          if (node.level === 4 && node.parentDirection === directions.NORTH_WEST) {
            oddWidth += bHeight / config.SLOPEANGLE;
          }
        }
        lWidth = Math.max(lWidth, Math.max(evenWidth, oddWidth));
      } else {
        // width, height above
        if (child.direction === directions.SOUTH_WEST) {
          evenWidth += child.lWidth + child.rWidth + config.BASE_PADDING * 2;
          tHeight = Math.max(tHeight, child.tHeight);
          if (node.level === 4 && node.parentDirection === directions.SOUTH_EAST) {
            evenWidth += tHeight / config.SLOPEANGLE;
          }
        }
        // width, height below
        else {
          oddWidth += child.lWidth + child.rWidth + config.BASE_PADDING * 2;
          bHeight = Math.max(bHeight, child.bHeight);
          if (node.level === 4 && node.parentDirection === directions.NORTH_EAST) {
            oddWidth += bHeight / config.SLOPEANGLE;
          }
        }
        rWidth = Math.max(rWidth, Math.max(evenWidth, oddWidth));
      }
    }
  }

  // Process parameters to balance child bones on their parent bones
  // Cross Node
  if (isDiagonalBone) {
    switch (node.direction) {
      case directions.SOUTH_EAST:
      case directions.NORTH_EAST:
        // Child facing east
        node.isLeft = evenHeight <= oddHeight;
        node.isRight = evenHeight > oddHeight;
        node.addWidth = Math.abs(evenHeight - oddHeight) / config.SLOPEANGLE;
        if (node.isLeft) {
          lWidth += node.addWidth;
        }
        node[node.isLeft ? "spaceWidthEast" : "spaceWidthWest"] =
          node.addWidth / (Math.ceil(node.children.length / 2) + 1);
        node[node.isLeft ? "spaceHeightEast" : "spaceHeightWest"] =
          Math.abs(evenHeight - oddHeight) / (Math.ceil(node.children.length / 2) + 1);
        break;
      case directions.SOUTH_WEST:
      case directions.NORTH_WEST:
        // WEST
        node.isRight = evenHeight >= oddHeight;
        node.isLeft = evenHeight < oddHeight;
        node.addWidth = Math.abs(evenHeight - oddHeight) / config.SLOPEANGLE;
        if (node.isRight) {
          rWidth += node.addWidth;
        }
        node[node.isLeft ? "spaceWidthEast" : "spaceWidthWest"] =
          node.addWidth / (Math.floor(node.children.length / 2) + 1);
        node[node.isLeft ? "spaceHeightEast" : "spaceHeightWest"] =
          Math.abs(evenHeight - oddHeight) / (Math.floor(node.children.length / 2) + 1);
        break;
      default:
        console.log("========= throw error");
        break;
    }
    // Parallel Node
  }
  // Parallel Node
  else {
    node.isAbove = evenWidth < oddWidth; // Above
    const length = node.isAbove ? Math.ceil(node.children.length / 2) : Math.floor(node.children.length / 2);
    node.space = Math.abs(evenWidth - oddWidth) / (length + 1);
  }

  const coordinates = [];

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const preNodeCoordinates = coordinates[i - 2] || 0;
    const preNode = node.children[i - 2] || null;
    let nodeCoordinates = preNodeCoordinates;
    if (child.index === 1) {
      nodeCoordinates += config.STAGGERED_SPACING;
    }
    let dif;

    if (isDiagonalBone) {
      switch (node.direction) {
        case directions.SOUTH_EAST:
          nodeCoordinates += (preNode?.tHeight || 0) + child.bHeight + 2 * config.BASE_PADDING;
          if (node.isLeft && child.index % 2 === 0) {
            nodeCoordinates += node.spaceHeightEast;
          }
          if (node.isRight && child.index % 2 === 1) {
            nodeCoordinates += node.spaceHeightWest;
          }
          dif = coordinates.find((d) => Math.abs(d - nodeCoordinates) < 15);
          if (dif) {
            child.bHeight += 15 - (nodeCoordinates - dif);
            if (child.index % 2 === 0) {
              evenHeight += 15 - (nodeCoordinates - dif);
              lWidth += 15 - (nodeCoordinates - dif) / config.SLOPEANGLE;
            } else {
              oddHeight += 15 - (nodeCoordinates - dif);
            }
            tHeight = Math.max(tHeight, Math.max(evenHeight, oddHeight));
            nodeCoordinates = dif + 15;
          }
          coordinates.push(nodeCoordinates);
          break;
        case directions.NORTH_EAST:
          nodeCoordinates += (preNode?.bHeight || 0) + child.tHeight + 2 * config.BASE_PADDING;
          if (node.isLeft && child.index % 2 === 0) {
            nodeCoordinates += node.spaceHeightEast;
          }
          if (node.isRight && child.index % 2 === 1) {
            nodeCoordinates += node.spaceHeightWest;
          }
          dif = coordinates.find((d) => Math.abs(d - nodeCoordinates) < 15);
          if (dif) {
            child.tHeight += 15 - (nodeCoordinates - dif);
            if (child.index % 2 === 0) {
              evenHeight += 15 - (nodeCoordinates - dif);
              lWidth += 15 - (nodeCoordinates - dif) / config.SLOPEANGLE;
            } else {
              oddHeight += 15 - (nodeCoordinates - dif);
            }
            bHeight = Math.max(bHeight, Math.max(evenHeight, oddHeight));
            nodeCoordinates = dif + 15;
          }
          coordinates.push(nodeCoordinates);
          break;
        case directions.SOUTH_WEST:
          nodeCoordinates += (preNode?.tHeight || 0) + child.bHeight + 2 * config.BASE_PADDING;
          if (node.isLeft && child.index % 2 === 0) {
            nodeCoordinates += node.spaceHeightEast;
          }
          if (node.isRight && child.index % 2 === 1) {
            nodeCoordinates += node.spaceHeightWest;
          }
          dif = coordinates.find((d) => Math.abs(d - nodeCoordinates) < 15);
          if (dif) {
            child.bHeight += 15 - (nodeCoordinates - dif);
            if (child.index % 2 === 0) {
              evenHeight += 15 - (nodeCoordinates - dif);
              rWidth += 15 - (nodeCoordinates - dif) / config.SLOPEANGLE;
            } else {
              oddHeight += 15 - (nodeCoordinates - dif);
            }
            tHeight = Math.max(tHeight, Math.max(evenHeight, oddHeight));
            nodeCoordinates = dif + 15;
          }
          coordinates.push(nodeCoordinates);
          break;
        case directions.NORTH_WEST:
          nodeCoordinates += (preNode?.bHeight || 0) + child.tHeight + 2 * config.BASE_PADDING;
          if (node.isLeft && child.index % 2 === 0) {
            nodeCoordinates += node.spaceHeightEast;
          }
          if (node.isRight && child.index % 2 === 1) {
            nodeCoordinates += node.spaceHeightWest;
          }
          dif = coordinates.find((d) => Math.abs(d - nodeCoordinates) < 15);
          if (dif) {
            child.tHeight += 15 - (nodeCoordinates - dif);
            if (child.index % 2 === 0) {
              evenHeight += 15 - (nodeCoordinates - dif);
              rWidth += 15 - (nodeCoordinates - dif) / config.SLOPEANGLE;
            } else {
              oddHeight += 15 - (nodeCoordinates - dif);
            }
            bHeight = Math.max(bHeight, Math.max(evenHeight, oddHeight));
            nodeCoordinates = dif + 15;
          }
          coordinates.push(nodeCoordinates);
          break;
        default:
          console.log("========= throw error");
          break;
      }
    } else {
      if (node.direction === directions.EAST) {
        nodeCoordinates += child.rWidth + config.BASE_PADDING;
        if (preNode) {
          nodeCoordinates += config.BASE_PADDING + (preNode.lWidth || 0);
        }
        if (node.isAbove && child.index % 2 === 0) {
          nodeCoordinates += node.space;
        }
        if (!node.isAbove && child.index % 2 === 1) {
          nodeCoordinates += node.space;
        }
        dif = coordinates.find((d) => Math.abs(d - nodeCoordinates) < 15);
        if (dif) {
          child.rWidth += 15 - (nodeCoordinates - dif);
          if (child.index % 2 === 0) {
            evenWidth += 15 - (nodeCoordinates - dif);
          } else {
            oddWidth += 15 - (nodeCoordinates - dif);
          }
          lWidth = Math.max(lWidth, Math.max(evenWidth, oddWidth));
          nodeCoordinates = dif + 15;
        }
        coordinates.push(nodeCoordinates);
      } else {
        nodeCoordinates += child.lWidth + config.BASE_PADDING;
        if (preNode) {
          nodeCoordinates += config.BASE_PADDING + (preNode.rWidth || 0);
        }
        if (node.isAbove && child.index % 2 === 0) {
          nodeCoordinates += node.space;
        }
        if (!node.isAbove && child.index % 2 === 1) {
          nodeCoordinates += node.space;
        }
        dif = coordinates.find((d) => Math.abs(d - nodeCoordinates) < 15);
        if (dif) {
          child.lWidth += 15 - (nodeCoordinates - dif);
          if (child.index % 2 === 0) {
            evenWidth += 15 - (nodeCoordinates - dif);
          } else {
            oddWidth += 15 - (nodeCoordinates - dif);
          }
          rWidth = Math.max(rWidth, Math.max(evenWidth, oddWidth));
          nodeCoordinates = dif + 15;
        }
        coordinates.push(nodeCoordinates);
      }
    }
  }

  // Add width height of text and create stagger
  const halfWidthText = Math.floor((node?.text?.width || 0) / 2) + 1;
  const halfHeightText = Math.floor((node?.text?.height || 0) / 2) + 1;
  switch (node.direction) {
    case directions.EAST:
      lWidth += (node?.text?.width || 0) + textAngle + config.BASE_TEXT_PADDING;
      tHeight = Math.max(tHeight, halfHeightText);
      bHeight = Math.max(bHeight, halfHeightText);
      oddWidth += config.STAGGERED_SPACING;
      lWidth += config.STAGGERED_SPACING;
      break;
    case directions.WEST:
      rWidth += (node?.text?.width || 0) + textAngle + config.BASE_TEXT_PADDING;
      tHeight = Math.max(tHeight, halfHeightText);
      bHeight = Math.max(bHeight, halfHeightText);
      oddWidth += config.STAGGERED_SPACING;
      rWidth += config.STAGGERED_SPACING;
      break;
    case directions.SOUTH_EAST:
      lWidth = Math.max(halfWidthText + (tHeight + config.BASE_PADDING) / config.SLOPEANGLE, lWidth);
      rWidth = halfWidthText + textAngle > rWidth ? halfWidthText + textAngle : rWidth;
      tHeight += (node?.text?.height || 0) + config.BASE_TEXT_PADDING + config.BASE_PADDING;
      oddHeight += config.STAGGERED_SPACING;
      tHeight += config.STAGGERED_SPACING;
      lWidth += config.STAGGERED_SPACING;
      break;
    case directions.SOUTH_WEST:
      lWidth = halfWidthText + textAngle > lWidth ? halfWidthText + textAngle : lWidth;
      rWidth = Math.max(halfWidthText, rWidth);
      tHeight += (node?.text?.height || 0) + config.BASE_TEXT_PADDING + config.BASE_PADDING;
      oddHeight += config.STAGGERED_SPACING;
      tHeight += config.STAGGERED_SPACING;
      rWidth += config.STAGGERED_SPACING;
      break;
    case directions.NORTH_EAST:
      lWidth = Math.max(halfWidthText + (bHeight + config.BASE_PADDING) / config.SLOPEANGLE, lWidth);
      rWidth = halfWidthText + textAngle > rWidth ? halfWidthText + textAngle : rWidth;
      bHeight += (node?.text?.height || 0) + config.BASE_TEXT_PADDING + config.BASE_PADDING;
      oddHeight += config.STAGGERED_SPACING;
      bHeight += config.STAGGERED_SPACING;
      lWidth += config.STAGGERED_SPACING;
      break;
    case directions.NORTH_WEST:
      lWidth = halfWidthText + textAngle > lWidth ? halfWidthText + textAngle : lWidth;
      rWidth = Math.max(halfWidthText, rWidth);
      bHeight += (node?.text?.height || 0) + config.BASE_TEXT_PADDING + config.BASE_PADDING;
      oddHeight += config.STAGGERED_SPACING;
      bHeight += config.STAGGERED_SPACING;
      rWidth += config.STAGGERED_SPACING;
      break;
  }

  node.evenWidth = evenWidth;
  node.oddWidth = oddWidth;
  node.oddHeight = oddHeight;
  node.evenHeight = evenHeight;

  node.tHeight = tHeight;
  node.bHeight = bHeight;
  node.rWidth = rWidth;
  node.lWidth = lWidth;
  node.textAngle = textAngle;
}

function processComputeDimensions(node) {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    child.parentDirection = node.direction;
    determineFishboneDirection(node, child);
    processComputeDimensions(child);
  }
  computeNodeDimensions(node);
  return node;
}

export function handleGenerateJsonCoordinates(data) {
  data.direction = directions.EAST;
  processComputeDimensions(data);
  handleRootChildHeight(data);
  processComputeCoordinate(data);
}
