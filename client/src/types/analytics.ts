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
  depth?: number;
  index?: number;
  root?: any;
  [key: string]: any; // Allow additional props from Recharts
}
