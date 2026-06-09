export const config = {
  SMALLEST_BONE_WIDTH: 60, // minimum length of a fish bone
  BASE_PADDING: 20,
  BASE_TEXT_PADDING: 15,
  ANGLE_DEGREES: 60,
  STAGGERED_SPACING: 20,
  ANGLERADIANS: (60 * Math.PI) / 180,
  SLOPEANGLE: Math.tan((60 * Math.PI) / 180),
};

export const directions = Object.freeze({
  EAST: "east",
  WEST: "west",
  SOUTH: "south",
  NORTH: "north",
  NORTH_EAST: "northEast",
  SOUTH_EAST: "southEast",
  NORTH_WEST: "northWest",
  SOUTH_WEST: "southWest",
});
