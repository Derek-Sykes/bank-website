interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
}

const DonutChart = ({ segments, centerLabel, centerValue }: DonutChartProps) => {
  const positiveSegments = segments.filter((segment) => segment.value > 0);
  const total = positiveSegments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const gradient = total
    ? positiveSegments
        .map((segment) => {
          const start = cursor;
          cursor += (segment.value / total) * 100;
          return `${segment.color} ${start}% ${cursor}%`;
        })
        .join(", ")
    : "#dbeafe 0% 100%";

  return (
    <div className="donutChartGroup">
      <div className="donutChart" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="donutChart__center">
          <span>{centerLabel}</span>
          <strong>{centerValue}</strong>
        </div>
      </div>
      <div className="donutLegend">
        {(positiveSegments.length ? positiveSegments : segments).map((segment) => (
          <div className="donutLegend__item" key={segment.label}>
            <span className="donutLegend__swatch" style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
