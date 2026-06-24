'use client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { WeeklyStats } from '@/types'

interface StudyAreaChartProps {
  data: WeeklyStats[]
}

export function StudyAreaChart({ data }: StudyAreaChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const textColor     = isDark ? '#F4F3EF' : '#000000'
  const gridColor     = isDark ? 'rgba(244,243,239,0.08)' : 'rgba(0,0,0,0.08)'
  const strokeColor   = isDark ? '#F4F3EF' : '#000000'   /* linha: bege/preto */
  const tooltipBg     = isDark ? '#181816' : '#ffffff'
  const tooltipBorder = isDark ? 'rgba(63,63,70,0.4)' : 'rgba(228,228,231,0.4)'

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={strokeColor} stopOpacity={isDark ? 0.25 : 0.12} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="dayLabel"
            tick={{ fontSize: 13, fill: textColor, fontFamily: 'var(--font-quicksand)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 13, fill: textColor, fontFamily: 'var(--font-quicksand)' }}
            tickFormatter={(v) => `${v}m`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [`${value} min`, 'Foco']}
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'var(--font-quicksand)',
              color: isDark ? '#F4F3EF' : '#000000',
            }}
            cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="minutes"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill="url(#studyGrad)"
            dot={false}
            activeDot={{ r: 4, fill: strokeColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
