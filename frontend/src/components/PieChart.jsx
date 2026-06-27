import React, { useId, useMemo, useState } from 'react';

function buildSegments(data, size, innerRatio = 0.58) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return { total: 0, segments: [] };

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR * innerRatio;
  let currentAngle = -90;

  const segments = data
    .filter((item) => item.value > 0)
    .map((item) => {
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const largeArc = angle > 180 ? 1 : 0;

      const ox1 = cx + outerR * Math.cos(startRad);
      const oy1 = cy + outerR * Math.sin(startRad);
      const ox2 = cx + outerR * Math.cos(endRad);
      const oy2 = cy + outerR * Math.sin(endRad);
      const ix1 = cx + innerR * Math.cos(endRad);
      const iy1 = cy + innerR * Math.sin(endRad);
      const ix2 = cx + innerR * Math.cos(startRad);
      const iy2 = cy + innerR * Math.sin(startRad);

      const pathData = [
        `M ${ox1} ${oy1}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
        'Z',
      ].join(' ');

      return {
        ...item,
        pathData,
        percentage: ((item.value / total) * 100).toFixed(1),
        midAngle: startAngle + angle / 2,
      };
    });

  return { total, segments };
}

export default function PieChart({
  data = [],
  size = 220,
  title,
  rotating = false,
  isDarkMode = true,
  className = '',
}) {
  const uid = useId().replace(/:/g, '');
  const [activeIndex, setActiveIndex] = useState(null);
  const { total, segments } = useMemo(() => buildSegments(data, size), [data, size]);

  const centerFill = isDarkMode ? '#111318' : '#ffffff';
  const centerStroke = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.15)';
  const titleCls = isDarkMode ? 'text-white' : 'text-gray-900';
  const subCls = isDarkMode ? 'text-slate-500' : 'text-gray-500';
  const legendText = isDarkMode ? 'text-slate-400' : 'text-gray-600';
  const legendValue = isDarkMode ? 'text-white' : 'text-gray-900';
  const legendPct = isDarkMode ? 'text-slate-500' : 'text-gray-400';
  const emptyRing = isDarkMode ? 'border-white/10 text-slate-500' : 'border-gray-200 text-gray-400';

  if (total === 0) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div
          className={`flex items-center justify-center rounded-full border-4 ${emptyRing} ${rotating ? 'pie-chart-idle-spin' : ''}`}
          style={{ width: size * 0.72, height: size * 0.72 }}
        >
          <span className="text-sm font-medium">No data</span>
        </div>
        {title && <p className={`mt-4 text-sm font-semibold ${titleCls}`}>{title}</p>}
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const innerR = (size / 2 - 8) * 0.58;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className={`pie-chart-shell relative ${rotating ? 'pie-chart-rotating' : ''}`}
        style={{ width: size, height: size }}
      >
        {rotating && (
          <div
            className="pointer-events-none absolute inset-0 rounded-full pie-chart-glow"
            aria-hidden="true"
          />
        )}

        <svg width={size} height={size} className="relative z-10 overflow-visible">
          <defs>
            {segments.map((segment, index) => (
              <filter key={`glow-${index}`} id={`pie-glow-${uid}-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={segment.color} floodOpacity="0.55" />
              </filter>
            ))}
          </defs>

          <g
            className={rotating ? 'pie-chart-spin' : ''}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            {segments.map((segment, index) => {
              const isActive = activeIndex === null || activeIndex === index;
              return (
                <path
                  key={segment.label}
                  d={segment.pathData}
                  fill={segment.color}
                  stroke={isDarkMode ? 'rgba(17,19,24,0.6)' : 'rgba(255,255,255,0.9)'}
                  strokeWidth="2"
                  filter={activeIndex === index ? `url(#pie-glow-${uid}-${index})` : undefined}
                  className="pie-chart-segment cursor-pointer transition-all duration-300"
                  style={{
                    opacity: isActive ? 1 : 0.35,
                    transform: activeIndex === index ? 'scale(1.04)' : 'scale(1)',
                    transformOrigin: `${cx}px ${cy}px`,
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                />
              );
            })}
          </g>

          <circle
            cx={cx}
            cy={cy}
            r={innerR - 4}
            fill={centerFill}
            stroke={centerStroke}
            strokeWidth="2"
            className="pie-chart-center"
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold tabular-nums ${titleCls}`}>{total}</span>
          <span className={`text-[11px] font-medium uppercase tracking-wider ${subCls}`}>Documents</span>
          {rotating && (
            <span className={`mt-1 text-[9px] font-semibold uppercase tracking-widest ${isDarkMode ? 'text-indigo-400/80' : 'text-indigo-500'}`}>
              Live
            </span>
          )}
        </div>
      </div>

      {title && <p className={`mt-4 text-sm font-semibold ${titleCls}`}>{title}</p>}

      <div className="mt-5 w-full space-y-2">
        {segments.map((segment, index) => (
          <button
            key={segment.label}
            type="button"
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
            className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors ${
              activeIndex === index
                ? isDarkMode ? 'bg-white/5' : 'bg-indigo-50'
                : 'bg-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ring-white/10"
                style={{ backgroundColor: segment.color }}
              />
              <span className={`text-xs ${legendText}`}>{segment.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold tabular-nums ${legendValue}`}>{segment.value}</span>
              <span className={`text-[10px] tabular-nums ${legendPct}`}>({segment.percentage}%)</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
