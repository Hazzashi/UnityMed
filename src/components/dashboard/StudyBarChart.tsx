'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { useTheme } from 'next-themes'
import type { SubjectWithStats } from '@/types'

interface StudyBarChartProps {
  subjects: SubjectWithStats[]
}

export function StudyBarChart({ subjects }: StudyBarChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const textColor     = isDark ? '#F4F3EF' : '#000000'
  const gridColor     = isDark ? 'rgba(244,243,239,0.08)' : 'rgba(0,0,0,0.08)'
  const bgBarColor    = isDark ? '#2C2C27' : '#EAE8DF'
  const tooltipBg     = isDark ? '#181816' : '#ffffff'
  const tooltipBorder = isDark ? 'rgba(244,243,239,0.15)' : 'rgba(0,0,0,0.10)'

  const NAVY = isDark ? '#4A72A8' : '#1E3A5F'

  const data = subjects.map((s) => ({
    name: s.name.length > 13 ? s.name.slice(0, 13) + '…' : s.name,
    Estudadas: parseFloat(s.studied_hours.toFixed(1)),
    Planejadas: parseFloat(s.allocated_hours.toFixed(1)),
  }))

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
        Cadastre matérias no Planejamento para ver o gráfico
      </div>
    )
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
          <XAxis
            type="number"
            tick={{ fontSize: 13, fill: textColor, fontFamily: 'var(--font-quicksand)' }}
            tickFormatter={(v) => `${v}h`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 13, fill: textColor, fontFamily: 'var(--font-quicksand)' }}
            axisLine={false}
            tickLine={false}
            width={106}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value}h`, name]}
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'var(--font-quicksand)',
              color: isDark ? '#F4F3EF' : '#000000',
            }}
            labelStyle={{ color: isDark ? '#F4F3EF' : '#000000', fontWeight: 600, fontFamily: 'var(--font-quicksand)' }}
            itemStyle={{ color: isDark ? '#F4F3EF' : '#000000', fontFamily: 'var(--font-quicksand)' }}
            cursor={{ fill: isDark ? 'rgba(44,44,39,0.4)' : 'rgba(234,232,223,0.4)' }}
          />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: '13px', paddingTop: '10px', color: textColor, fontFamily: 'var(--font-quicksand)' }}
          />
          {/* Barra de fundo (planejadas) — tom neutro */}
          <Bar dataKey="Planejadas" fill={bgBarColor} radius={[0, 6, 6, 0]} />
          {/* Barra estudadas — navy corporativo */}
          <Bar dataKey="Estudadas" fill={NAVY} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
