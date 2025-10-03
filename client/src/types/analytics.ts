/**
 * Analytics and data visualization type definitions
 */

export interface TreemapData {
  name: string;
  value: number;
  growth: number;
  children?: TreemapData[];
}

export interface TreemapCellProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  value: number;
  growth: number;
}
