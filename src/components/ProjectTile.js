import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";

// a simple hash function to convert a string into an index for a color list
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    /* eslint-disable no-bitwise */
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
    /* eslint-enable no-bitwise */
  }
  return Math.abs(hash);
}

// restricted palette: darker blues, grays, and golds only
const DEFAULT_COLORS = [
  "#0D47A1", // dark blue
  "#1976D2", // medium blue
  "#3F51B5", // indigo
  "#2196F3", // blue
  "#455A64", // blue grey dark
  "#607D8B", // blue grey
  "#9E9E9E", // grey
  "#424242", // dark grey
  "#FFC107", // amber (gold)
  "#FFA000", // dark amber
  "#FF8F00", // darker gold
  "#795548", // brown (dark)
];

export const PROJECT_COLORS = DEFAULT_COLORS;

export default function ProjectTile({
  project,
  // old 'size' used for both dimensions; newer code accepts width/height separately
  size = 200, // make default width/height larger so longer names fit
  width,
  height,
  onEdit = () => {},
  onDelete = () => {},
}) {
  const [progress] = useState(() => {
    if (typeof project.progress === "number") return project.progress;
    return Math.floor(Math.random() * 40) + 30;
  });

  const color = useMemo(() => {
    if (project.color) return project.color;
    const idx = hashString(project.id || project.text || "") % DEFAULT_COLORS.length;
    return DEFAULT_COLORS[idx];
  }, [project.id, project.text, project.color]);

  // compute final width/height with CSS variable overrides
  const resolvedWidth = width !== undefined ? width : size;
  const resolvedHeight = height !== undefined ? height : size;
  const widthStr = `var(--project-tile-width, ${typeof resolvedWidth === 'number' ? resolvedWidth + 'px' : resolvedWidth})`;
  const heightStr = `var(--project-tile-height, ${typeof resolvedHeight === 'number' ? resolvedHeight + 'px' : resolvedHeight})`;
  return (
    <div
      className="project-tile"
      style={{
        width: widthStr,
        height: heightStr,
        "--project-color": color,
      }}
      data-testid="project-tile"
    >
      <div className="project-strip" />
      <div className="project-name">{project.text || project.name}</div>
      <div className="project-progress-container">
        <div
          className="project-progress"
          style={{ width: `${progress}%` }}
          data-testid="project-progress"
        />
      </div>
      <div className="project-percent" data-testid="project-percent">
        {progress}%
      </div>
      <div className="project-actions">
        <span
          className="material-icons edit-icon"
          title="Edit project"
          onClick={() => onEdit(project.id)}
        >
          edit
        </span>
        <span
          className="material-icons delete-icon"
          title="Delete project"
          onClick={() => onDelete(project.id)}
        >
          delete
        </span>
      </div>
    </div>
  );
}

ProjectTile.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.string,
    text: PropTypes.string,
    name: PropTypes.string,
    color: PropTypes.string,
    progress: PropTypes.number,
  }).isRequired,
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), // legacy; width/height preferred
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};
