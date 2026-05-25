import React from 'react';

export default function PieChart({ data, size = 200, title }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: size }}>
        <div className="h-32 w-32 rounded-full border-4 border-white/10 flex items-center justify-center">
          <span className="text-slate-500 text-sm">No data</span>
        </div>
        {title && <p className="mt-3 text-sm font-semibold text-white">{title}</p>}
      </div>
    );
  }

  let currentAngle = -90; // Start from top
  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Calculate path for pie slice
    const radius = size / 2 - 10;
    const centerX = size / 2;
    const centerY = size / 2;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    return {
      ...item,
      pathData,
      percentage: percentage.toFixed(1),
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform">
        {segments.map((segment, index) => (
          <g key={index}>
            <path
              d={segment.pathData}
              fill={segment.color}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="1"
              className="transition-opacity hover:opacity-80 cursor-pointer"
            />
          </g>
        ))}
        {/* Center circle for donut effect */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 4}
          fill="rgba(17, 19, 24, 1)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2 - 5}
          textAnchor="middle"
          className="text-2xl font-bold fill-white"
        >
          {total}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 12}
          textAnchor="middle"
          className="text-xs fill-slate-500"
        >
          Total
        </text>
      </svg>
      
      {title && <p className="mt-3 text-sm font-semibold text-white">{title}</p>}
      
      {/* Legend */}
      <div className="mt-4 space-y-2 w-full">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-slate-400">{segment.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{segment.value}</span>
              <span className="text-slate-500">({segment.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
