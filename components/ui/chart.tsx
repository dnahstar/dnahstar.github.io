"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

const ChartContext = React.createContext<{ config: any } | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer.")
  }
  return context
}

// 에러 해결을 위해 Chart와 ChartTooltip 정의를 추가했습니다
const Chart = RechartsPrimitive.ResponsiveContainer
const ChartTooltip = RechartsPrimitive.Tooltip

interface CustomTooltipProps extends React.ComponentProps<typeof RechartsPrimitive.Tooltip> {
  hideLabel?: boolean;
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, CustomTooltipProps>(
  (props, ref) => {
    const { hideLabel = false } = props
    return null
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = RechartsPrimitive.Legend
const ChartLegendContent = React.forwardRef<any, any>((props, ref) => null)
ChartLegendContent.displayName = "ChartLegend"

const ChartStyle = ({ id, config }: { id: string; config: any }) => null

export {
  Chart,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
