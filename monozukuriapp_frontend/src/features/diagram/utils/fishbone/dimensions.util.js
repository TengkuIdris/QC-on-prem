import { config, directions } from "./config";
import { checkHeightRootText } from "./renderFishBone";

export function computeSmallestNodeDimensions(node) {
  let lWidth = 0,
    rWidth = 0,
    tHeight = 0,
    bHeight = 0;

  const baseWidth = config.SMALLEST_BONE_WIDTH * Math.cos(config.ANGLERADIANS);
  const baseHeight = config.SMALLEST_BONE_WIDTH * Math.sin(config.ANGLERADIANS);
  const halfWidthText = Math.floor((node?.text?.width || 0) / 2) + 1; // round up, better to have more than less
  const halfHeightText = Math.floor((node?.text?.height || 0) / 2) + 1;
  const textAngle = (node?.text?.height || 0) / config.SLOPEANGLE + config.BASE_PADDING;

  switch (node.direction) {
    case directions.EAST:
      lWidth = config.SMALLEST_BONE_WIDTH + (node?.text?.width || 0) + textAngle;
      bHeight = tHeight = halfHeightText; // Because the fishbone is only 1.2 pixels, the height is mostly the height of the text
      break;
    case directions.WEST:
      rWidth = config.SMALLEST_BONE_WIDTH + (node?.text?.width || 0) + textAngle;
      bHeight = tHeight = halfHeightText;
      break;
    case directions.NORTH_EAST:
      bHeight = baseHeight + (node?.text?.height || 0);
      lWidth = baseWidth + halfWidthText;
      rWidth = halfWidthText + textAngle;
      break;
    case directions.SOUTH_EAST:
      tHeight = baseHeight + (node?.text?.height || 0);
      lWidth = baseWidth + halfWidthText;
      rWidth = halfWidthText + textAngle;
      break;
    case directions.NORTH_WEST:
      bHeight = baseHeight + (node?.text?.height || 0);
      rWidth = baseWidth + halfWidthText;
      lWidth = halfWidthText + textAngle;
      break;
    case directions.SOUTH_WEST:
      tHeight = baseHeight + (node?.text?.height || 0);
      rWidth = baseWidth + halfWidthText;
      lWidth = halfWidthText + textAngle;
      break;
    default:
      break;
  }
  node.rWidth = rWidth;
  node.tHeight = tHeight;
  node.bHeight = bHeight;
  node.lWidth = lWidth;
  node.textAngle = textAngle;
}

export function determineFishboneDirection(node, child) {
  // node is diagonal bone -> child is parallel bone
  if (node.level % 2 !== 0) {
    if (child.index % 2 === 0) {
      child.direction = directions.EAST; // If the bone is parallel to the root, then the even index will be east,
    } else {
      child.direction = directions.WEST; // If the bone is parallel to the root, then odd index will have west direction
    }
  }
  // node is parallel bone -> child is cross bone
  else {
    if (node.direction === directions.EAST) {
      // Parent node is facing east -> child node will also have a bias towards east (1)
      if (child.index % 2 === 0) {
        child.direction = directions.SOUTH_EAST; // Even index direction southeast
      } else {
        child.direction = directions.NORTH_EAST; // Odd index northeast direction
      }
    } else {
      // Parent node is facing west -> child node will also have a bias towards west (2)
      if (child.index % 2 === 0) {
        child.direction = directions.SOUTH_WEST; // Even index southwest
      } else {
        child.direction = directions.NORTH_WEST; // Odd index northwest
      }
    }
  }
}

// Handle the balance of the root's ossicle height
export function handleRootChildHeight(root) {
  if (root.children && root.children.length) {
    // Find the maximum height of the root's ossicles
    root.children.forEach((child) => {
      root.maxHeightChildren = Math.max(root.maxHeightChildren || 0, child.tHeight + child.bHeight);
      root.maxHeightText = Math.max(root.maxHeightText || 0, child.text.height + 2 * config.BASE_TEXT_PADDING);
    });
    root.height = (root.maxHeightChildren + root.maxHeightText) * 2;
    let maxAddHeight = 0;
    let rootCoordinates = [];
    root.children.forEach((child, index) => {
      // If the height of the sub bone is smaller than the largest sub bone, increase the left width to display this sub bone when the height of the lv1 bones is equal
      if (child.direction === directions.SOUTH_EAST) {
        const addD = (root.maxHeightChildren - child.tHeight) / config.SLOPEANGLE;
        root.evenWidth += addD;
        child.lWidth += addD;
      } else {
        const addD = (root.maxHeightChildren - child.bHeight) / config.SLOPEANGLE;
        root.oddWidth += addD;
        child.lWidth += addD;
      }

      // Handle the length and width of the small bones when the height of the lv1 bones is equal and the lv2 bones need to be displayed symmetrically
      child.isLeft = child.isRight = true;

      // Balance handling with the left bones
      const addWidthLeft =
        Math.abs(root.maxHeightChildren - child.evenHeight - config.STAGGERED_SPACING) / config.SLOPEANGLE;
      child.spaceWidthEast = addWidthLeft / (Math.ceil(child.children.length / 2) + 1);
      child.spaceHeightEast =
        Math.abs(root.maxHeightChildren - child.evenHeight - config.STAGGERED_SPACING) /
        (Math.ceil(child.children.length / 2) + 1);

      // Balance handling with the right bones
      const addWidthRight = Math.abs(root.maxHeightChildren - child.oddHeight) / config.SLOPEANGLE;
      child.spaceWidthWest = addWidthRight / (Math.floor(child.children.length / 2) + 1);
      child.spaceHeightWest =
        Math.abs(root.maxHeightChildren - child.oddHeight) / (Math.floor(child.children.length / 2) + 1);

      root.isAbove = root.evenWidth < root.oddWidth;

      const length = root.isAbove ? Math.ceil(root.children.length / 2) : Math.floor(root.children.length / 2);
      root.space = Math.abs(root.evenWidth - root.oddWidth) / (length + 1);

      const _preNodeCoordinates = rootCoordinates[index - 2] || 0;
      const _preNode = root[index - 2] || null;

      let _nodeCoordinates = _preNodeCoordinates;
      let _dif;

      _nodeCoordinates += child.lWidth + config.BASE_PADDING;
      if (_preNode) {
        _nodeCoordinates += config.BASE_PADDING + (_preNode.rWidth || 0);
      }
      if (root.isAbove && child.index % 2 === 0) {
        _nodeCoordinates += root.space;
      }
      if (!root.isAbove && child.index % 2 === 1) {
        _nodeCoordinates += root.space;
      }
      _dif = rootCoordinates.find((d) => Math.abs(d - _nodeCoordinates) < 15);
      if (_dif) {
        child.lWidth += 15 - (_nodeCoordinates - _dif);
        if (child.index % 2 === 0) {
          root.evenWidth += 15 - (_nodeCoordinates - _dif);
        } else {
          root.oddWidth += 15 - (_nodeCoordinates - _dif);
        }
        root.lWidth = Math.max(root.lWidth, Math.max(root.evenWidth, root.oddWidth));
        _nodeCoordinates = _dif + 15;
      }
      rootCoordinates.push(_nodeCoordinates);

      let count = 0;
      const coordinates = [];

      for (let i = 0; i < child.children.length; i++) {
        const _child = child.children[i];
        const preNodeCoordinates = coordinates[i - 2] || 0;
        const preNode = child.children[i - 2] || null;
        let nodeCoordinates = preNodeCoordinates;
        if (_child.index === 1) {
          nodeCoordinates += config.STAGGERED_SPACING;
        }
        let dif;
        switch (child.direction) {
          case directions.SOUTH_EAST:
            nodeCoordinates += (preNode?.tHeight || 0) + _child.bHeight + 2 * config.BASE_PADDING;
            if (child.isLeft && _child.index % 2 === 0) {
              nodeCoordinates += child.spaceHeightEast;
            }
            if (child.isRight && _child.index % 2 === 1) {
              nodeCoordinates += child.spaceHeightWest;
            }
            dif = coordinates.find((d) => Math.abs(d - nodeCoordinates) < 15);
            if (dif) {
              _child.bHeight += 15 - (nodeCoordinates - dif);
              count += 15 - (nodeCoordinates - dif);
              nodeCoordinates = dif + 15;
            }
            coordinates.push(nodeCoordinates);
            break;
          case directions.NORTH_EAST:
            nodeCoordinates += (preNode?.bHeight || 0) + _child.tHeight + 2 * config.BASE_PADDING;
            if (child.isLeft && _child.index % 2 === 0) {
              nodeCoordinates += child.spaceHeightEast;
            }
            if (child.isRight && _child.index % 2 === 1) {
              nodeCoordinates += child.spaceHeightWest;
            }
            dif = coordinates.find((d) => Math.abs(d - nodeCoordinates) < 15);
            if (dif) {
              _child.tHeight += 15 - (nodeCoordinates - dif);
              count += 15 - (nodeCoordinates - dif);
              nodeCoordinates = dif + 15;
            }
            coordinates.push(nodeCoordinates);
            break;
          default:
            console.log("========= throw error");
            break;
        }
      }
      maxAddHeight = Math.max(maxAddHeight, count);
    });
    root.height = (root.maxHeightChildren + maxAddHeight + root.maxHeightText) * 2;
  }

  const { height } = checkHeightRootText(root.name, root.fontFamily, root.fontSize);

  // Calculate the width of the root bone when the height of the lv1 bone has been increased equally
  root.width = root.lWidth = Math.max(
    Math.max(root.evenWidth || 0, root.oddWidth || 0) + root.textAngle + config.BASE_TEXT_PADDING + 100,
    300,
  );

  root.height = Math.max(height + 200, root.height || 0, 500);
}
