import { cn } from '@/lib/utils';

interface DataPoint {
  label: string;
  value: number;
  [key: string]: any;
}

interface AccessibleChartProps {
  data: DataPoint[];
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper for charts that provides accessible data table alternative
 */
export function AccessibleChart({
  data,
  title,
  description,
  children,
  className,
}: AccessibleChartProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Visual chart */}
      <div role="img" aria-label={`${title}${description ? `: ${description}` : ''}`}>
        {children}
      </div>

      {/* Accessible data table (hidden visually but available to screen readers) */}
      <details className="sr-only">
        <summary>View data table for {title}</summary>
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">Label</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point, index) => (
              <tr key={index}>
                <th scope="row">{point.label}</th>
                <td>{point.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      {/* Text summary */}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

interface AccessibleTableProps {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
  className?: string;
}

/**
 * Accessible data table with proper semantic markup
 */
export function AccessibleTable({
  caption,
  headers,
  rows,
  className,
}: AccessibleTableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <caption className="text-lg font-semibold mb-2 text-left">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-border">
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                className="px-4 py-2 text-left font-medium text-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-border hover:bg-muted/50 transition-colors"
            >
              {row.map((cell, cellIndex) => {
                // First cell in each row is a row header
                if (cellIndex === 0) {
                  return (
                    <th
                      key={cellIndex}
                      scope="row"
                      className="px-4 py-2 text-left font-medium"
                    >
                      {cell}
                    </th>
                  );
                }
                return (
                  <td key={cellIndex} className="px-4 py-2">
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Generate text description for chart data
 */
export function generateChartDescription(data: DataPoint[]): string {
  if (data.length === 0) return 'No data available';

  const values = data.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const maxPoint = data.find(d => d.value === max);
  const minPoint = data.find(d => d.value === min);

  return `Chart showing ${data.length} data points. ` +
    `Highest value: ${maxPoint?.label} at ${max}. ` +
    `Lowest value: ${minPoint?.label} at ${min}. ` +
    `Average: ${avg.toFixed(2)}.`;
}
