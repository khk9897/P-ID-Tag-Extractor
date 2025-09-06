/**
 * Geometry utility functions
 */

/**
 * Calculate minimum distance from point to bbox corners and center
 * @param {number} centerX - X coordinate of the point
 * @param {number} centerY - Y coordinate of the point 
 * @param {Object} bbox - Bounding box with x1, y1, x2, y2 coordinates
 * @returns {number} Minimum distance
 */
export const calculateMinDistanceToCorners = (centerX, centerY, bbox) => {
  const points = [
    [bbox.x1, bbox.y1], // top-left
    [bbox.x2, bbox.y1], // top-right
    [bbox.x1, bbox.y2], // bottom-left
    [bbox.x2, bbox.y2], // bottom-right
    [(bbox.x1 + bbox.x2) / 2, (bbox.y1 + bbox.y2) / 2] // center
  ];
  
  return Math.min(...points.map(([x, y]) => 
    Math.sqrt((centerX - x) ** 2 + (centerY - y) ** 2)
  ));
};