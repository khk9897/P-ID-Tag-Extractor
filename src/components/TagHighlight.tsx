import React from 'react';
import { DEFAULT_COLORS } from '../constants.ts';

export type HighlightType = 'primary' | 'note' | 'equipment' | 'description' | 'related';
export type HighlightEffect = 'arrows' | 'box' | 'outline' | 'all';

interface TagHighlightProps {
  bbox: { x1: number; y1: number; x2: number; y2: number };
  type: HighlightType;
  effect: HighlightEffect;
  isPinged?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isMultiSelection?: boolean;
  customColor?: string;
  colorSettings?: any;
}

export const TagHighlight: React.FC<TagHighlightProps> = React.memo(({
  bbox,
  type,
  effect,
  isPinged = false,
  isSelected = false,
  isHighlighted = false,
  isMultiSelection = false,
  customColor,
  colorSettings,
}) => {
  const { x1, y1, x2, y2 } = bbox;
  const rectX = Math.min(x1, x2);
  const rectY = Math.min(y1, y2);
  const rectWidth = Math.abs(x2 - x1);
  const rectHeight = Math.abs(y2 - y1);

  // Get color from settings or defaults
  const colors = {
    ...DEFAULT_COLORS.highlights,
    ...(colorSettings?.highlights || {})
  };

  const getHighlightColor = (): string => {
    if (customColor) return customColor;
    return colors[type] || colors.primary;
  };

  const color = getHighlightColor();
  const shouldShow = isPinged || isSelected || isHighlighted;

  if (!shouldShow) return null;

  const renderArrows = () => {
    if (effect !== 'arrows' && effect !== 'all') return null;
    // 다중 선택일 때는 화살표 표시 안함 (핑은 예외)
    if (isMultiSelection && !isPinged) return null;

    const arrowSize = 21; // 3배 증가 (7 * 3)
    const arrowOffset = 45; // 3배 증가 (15 * 3)
    
    return (
      <g className={isPinged ? 'animate-pulse' : ''}>
        {/* Top-left arrow - pointing towards tag */}
        <polygon
          points={`${rectX - arrowOffset + arrowSize},${rectY - arrowOffset + arrowSize} ${rectX - arrowOffset},${rectY - arrowOffset + arrowSize} ${rectX - arrowOffset + arrowSize},${rectY - arrowOffset}`}
          fill={color}
        />
        
        {/* Top-right arrow - pointing towards tag */}
        <polygon
          points={`${rectX + rectWidth + arrowOffset - arrowSize},${rectY - arrowOffset + arrowSize} ${rectX + rectWidth + arrowOffset},${rectY - arrowOffset + arrowSize} ${rectX + rectWidth + arrowOffset - arrowSize},${rectY - arrowOffset}`}
          fill={color}
        />
        
        {/* Bottom-left arrow - pointing towards tag */}
        <polygon
          points={`${rectX - arrowOffset + arrowSize},${rectY + rectHeight + arrowOffset - arrowSize} ${rectX - arrowOffset},${rectY + rectHeight + arrowOffset - arrowSize} ${rectX - arrowOffset + arrowSize},${rectY + rectHeight + arrowOffset}`}
          fill={color}
        />
        
        {/* Bottom-right arrow - pointing towards tag */}
        <polygon
          points={`${rectX + rectWidth + arrowOffset - arrowSize},${rectY + rectHeight + arrowOffset - arrowSize} ${rectX + rectWidth + arrowOffset},${rectY + rectHeight + arrowOffset - arrowSize} ${rectX + rectWidth + arrowOffset - arrowSize},${rectY + rectHeight + arrowOffset}`}
          fill={color}
        />
      </g>
    );
  };

  const renderBox = () => {
    if (effect !== 'box' && effect !== 'all') return null;

    const padding = 4;
    const className = isPinged ? 'ping-highlight-box' : '';

    return (
      <rect
        x={rectX - padding}
        y={rectY - padding}
        width={rectWidth + padding * 2}
        height={rectHeight + padding * 2}
        fill="none"
        stroke={color}
        strokeWidth={isPinged ? "3" : "2"}
        className={className}
        rx="4"
      />
    );
  };

  const renderOutline = () => {
    if (effect !== 'outline' && effect !== 'all') return null;

    return (
      <rect
        x={rectX}
        y={rectY}
        width={rectWidth}
        height={rectHeight}
        fill={`${color}99`} // 60% opacity
        stroke={color}
        strokeWidth="2"
        rx="2"
        className={isHighlighted ? 'animate-pulse' : ''}
      />
    );
  };

  return (
    <g>
      {renderBox()}
      {renderOutline()}
      {renderArrows()}
    </g>
  );
});

// Utility function to determine highlight type based on entity type
export const getHighlightTypeFromEntity = (entityType: string): HighlightType => {
  switch (entityType) {
    case 'tag':
    case 'Tag':
      return 'primary';
    case 'description':
    case 'Description':
      return 'description';
    case 'equipmentShortSpec':
    case 'EquipmentShortSpec':
      return 'equipment';
    case 'note':
    case 'Note':
      return 'note';
    case 'related':
      return 'related';
    default:
      return 'primary';
  }
};

// Utility function to determine effect based on context
export const getHighlightEffect = (
  isSelected: boolean,
  isPinged: boolean,
  isRelated: boolean
): HighlightEffect => {
  if (isPinged) return 'box';
  if (isSelected) return 'arrows';
  if (isRelated) return 'outline';
  return 'all';
};