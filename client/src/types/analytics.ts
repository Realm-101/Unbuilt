/**
 * Analytics and Data Visualization Type Definitions
 * 
 * This module contains type definitions for analytics dashboards,
 * charts, and data visualization components.
 */

/**
 * Treemap Data Interface
 * 
 * Represents hierarchical data for treemap visualizations.
 * Supports nested structures for multi-level treemaps.
 * 
 * @property {string} name - Display name for the data point
 * @property {number} value - Numeric value determining cell size
 * @property {number} growth - Growth percentage for color coding
 * @property {TreemapData[]} [children] - Optional: Nested child data points
 * 
 * @example
 * ```typescript
 * const data: TreemapData = {
 *   name: 'Technology',
 *   value: 1000,
 *   growth: 15.5,
 *   children: [
 *     { name: 'AI', value: 600, growth: 25.0 },
 *     { name: 'Cloud', value: 400, growth: 10.0 }
 *   ]
 * };
 * ```
 */
export interface TreemapData {
  name: string;
  value: number;
  growth: number;
  children?: TreemapData[];
}

/**
 * Treemap Cell Props Interface
 * 
 * Props passed to custom treemap cell renderers by Recharts.
 * Includes positioning, sizing, and data properties.
 * 
 * @property {number} x - X coordinate of the cell
 * @property {number} y - Y coordinate of the cell
 * @property {number} width - Width of the cell in pixels
 * @property {number} height - Height of the cell in pixels
 * @property {string} name - Display name for the cell
 * @property {number} value - Numeric value of the cell
 * @property {number} growth - Growth percentage for the cell
 * @property {number} [depth] - Optional: Nesting depth in hierarchy
 * @property {number} [index] - Optional: Index in the data array
 * @property {any} [root] - Optional: Root node reference
 * @property {any} [key: string] - Additional props from Recharts library
 * 
 * @example
 * ```typescript
 * const CustomCell = (props: TreemapCellProps) => {
 *   const { x, y, width, height, name, value, growth } = props;
 *   return (
 *     <g>
 *       <rect x={x} y={y} width={width} height={height} />
 *       <text x={x + width / 2} y={y + height / 2}>
 *         {name}: {value}
 *       </text>
 *     </g>
 *   );
 * };
 * ```
 */
export interface TreemapCellProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  value: number;
  growth: number;
  depth?: number;
  index?: number;
  root?: any;
  [key: string]: any; // Allow additional props from Recharts
}
