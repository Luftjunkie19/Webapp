import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Layer, ResponsiveLine } from '@nivo/line'
// @ts-expect-error
import { linearGradientDef } from '@nivo/core'
import { colors, theme } from '@static/theme'
import { Button, Grid, Typography, useMediaQuery } from '@material-ui/core'
import classNames from 'classnames'
import ZoomInIcon from '@static/svg/zoom-in-icon.svg'
import ZoomOutIcon from '@static/svg/zoom-out-icon.svg'
import Brush from './Brush/Brush'
import { nearestTickIndex } from '@consts/utils'
import { PlotTickData } from '@reducers/positions'
import loader from '@static/gif/loader.gif'
import useStyles from './style'
import { useStyles as useChartStyles } from '../Stats/Liquidity/style'

export type TickPlotPositionData = Omit<PlotTickData, 'y'>

export interface IPriceRangePlot {
  data: PlotTickData[]
  midPrice?: TickPlotPositionData
  globalPrice?: number
  leftRange: TickPlotPositionData
  rightRange: TickPlotPositionData
  onChangeRange?: (left: number, right: number) => void
  style?: React.CSSProperties
  className?: string
  disabled?: boolean
  plotMin: number
  plotMax: number
  zoomMinus: () => void
  zoomPlus: () => void
  loading?: boolean
  isXtoY: boolean
  xDecimal: number
  yDecimal: number
  tickSpacing: number
  isDiscrete?: boolean
  coverOnLoading?: boolean
  hasError?: boolean
  reloadHandler: () => void
  volumeRange?: {
    min: number
    max: number
  },
  isShownHeatMap: boolean,
}

export const PriceRangePlot: React.FC<IPriceRangePlot> = ({
  data,
  leftRange,
  rightRange,
  midPrice,
  globalPrice,
  onChangeRange,
  style,
  className,
  disabled = false,
  plotMin,
  plotMax,
  zoomMinus,
  zoomPlus,
  loading,
  isXtoY,
  xDecimal,
  yDecimal,
  tickSpacing,
  isDiscrete = false,
  coverOnLoading = false,
  hasError = false,
  reloadHandler,
  volumeRange,
  isShownHeatMap
}) => {
  const classes = useStyles()
  const chartClasses = useChartStyles()

  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'))

  const containerRef = useRef<HTMLDivElement>(null)

  const maxVal = useMemo(() => Math.max(...data.map(element => element.y)), [data])

  const pointsOmitter = useCallback(
    (data: Array<{ x: number; y: number }>) => {
      if (containerRef.current === null || data.length <= 1000) {
        return data
      }

      const minXDist = containerRef.current.offsetWidth / 100000
      const minYChange = containerRef.current.offsetHeight / 1000

      const dataAfterOmit: Array<{ x: number; y: number }> = []

      data.forEach((tick, index) => {
        if (
          index === 0 ||
          index === data.length - 1 ||
          (dataAfterOmit.length > 0 &&
            ((tick.x - dataAfterOmit[dataAfterOmit.length - 1].x) / (plotMax - plotMin) >=
              minXDist ||
              Math.abs(tick.y - dataAfterOmit[dataAfterOmit.length - 1].y) / maxVal >= minYChange))
        ) {
          dataAfterOmit.push(tick)
        }
      })

      return dataAfterOmit
    },
    [containerRef.current, plotMin, plotMax, maxVal]
  )

  const currentLessThanRange = useMemo(() => {
    if (disabled || leftRange.x < Math.max(plotMin, data[0].x)) {
      return []
    }

    let rangeData: Array<{ x: number; y: number }> = data.filter(tick => tick.x <= leftRange.x)
    const outData: Array<{ x: number; y: number }> = data.filter(
      tick => tick.x < Math.max(plotMin, data[0].x)
    )

    if (!rangeData.length) {
      return []
    }

    if (rangeData[rangeData.length - 1].x < leftRange.x) {
      rangeData.push({
        x: leftRange.x,
        y: rangeData[rangeData.length - 1].y
      })
    }

    rangeData = rangeData.slice(outData.length, rangeData.length)

    if (rangeData[0].x > Math.max(plotMin, data[0].x)) {
      rangeData.unshift({
        x: Math.max(plotMin, data[0].x),
        y: outData.length > 0 ? outData[outData.length - 1].y : 0
      })
    }

    return pointsOmitter(rangeData)
  }, [disabled, leftRange, data, plotMin, plotMax, pointsOmitter])

  const currentRange = useMemo(() => {
    if (disabled) {
      const outMinData: Array<{ x: number; y: number }> = data.filter(
        tick => tick.x < Math.max(plotMin, data[0].x)
      )
      const outMaxData: Array<{ x: number; y: number }> = data.filter(
        tick => tick.x > Math.min(plotMax, data[data.length - 1].x)
      )
      const rangeData: Array<{ x: number; y: number }> = data.slice(
        outMinData.length,
        data.length - outMaxData.length
      )

      if (!rangeData.length || rangeData[0].x > Math.max(plotMin, data[0].x)) {
        rangeData.unshift({
          x: Math.max(plotMin, data[0].x),
          y: outMinData.length > 0 ? outMinData[outMinData.length - 1].y : 0
        })
      }

      if (rangeData[rangeData.length - 1].x < Math.min(plotMax, data[data.length - 1].x)) {
        rangeData.push({
          x: Math.min(plotMax, data[data.length - 1].x),
          y: rangeData[rangeData.length - 1].y
        })
      }

      return pointsOmitter(rangeData)
    }

    if (leftRange.x > plotMax || rightRange.x < plotMin) {
      return []
    }

    const lessThan = data.filter(tick => tick.x <= leftRange.x).length
    let rangeData: Array<{ x: number; y: number }> = data.filter(
      tick => tick.x >= leftRange.x && tick.x <= rightRange.x
    )

    if (!rangeData.length) {
      rangeData.push({
        x: Math.max(leftRange.x, plotMin),
        y: data[lessThan - 1].y
      })

      rangeData.push({
        x: Math.min(rightRange.x, plotMax),
        y: data[lessThan - 1].y
      })
    } else {
      if (rangeData[0].x > leftRange.x) {
        rangeData.unshift({
          x: leftRange.x,
          y: rangeData[0].y
        })
      }

      if (rangeData[rangeData.length - 1].x < rightRange.x) {
        rangeData.push({
          x: rightRange.x,
          y: rangeData[rangeData.length - 1].y
        })
      }

      const outMinData: Array<{ x: number; y: number }> = rangeData.filter(
        tick => tick.x < Math.max(plotMin, data[0].x)
      )
      const outMaxData: Array<{ x: number; y: number }> = rangeData.filter(
        tick => tick.x > Math.min(plotMax, data[data.length - 1].x)
      )
      const newRangeData: Array<{ x: number; y: number }> = rangeData.slice(
        outMinData.length,
        rangeData.length - outMaxData.length
      )

      if (!newRangeData.length || newRangeData[0].x > Math.max(plotMin, rangeData[0].x)) {
        newRangeData.unshift({
          x: Math.max(plotMin, rangeData[0].x),
          y: outMinData.length > 0 ? outMinData[outMinData.length - 1].y : 0
        })
      }

      if (
        newRangeData[newRangeData.length - 1].x <
        Math.min(plotMax, rangeData[rangeData.length - 1].x)
      ) {
        newRangeData.push({
          x: Math.min(plotMax, rangeData[rangeData.length - 1].x),
          y: newRangeData[newRangeData.length - 1].y
        })
      }

      rangeData = newRangeData
    }

    return pointsOmitter(rangeData)
  }, [disabled, data, leftRange, rightRange, plotMin, plotMax, pointsOmitter])

  const currentGreaterThanRange = useMemo(() => {
    if (disabled || rightRange.x > plotMax) {
      return []
    }

    let rangeData: Array<{ x: number; y: number }> = data.filter(tick => tick.x >= rightRange.x)
    const outData: Array<{ x: number; y: number }> = data.filter(
      tick => tick.x > Math.min(plotMax, data[data.length - 1].x)
    )

    if (!rangeData.length) {
      return []
    }

    if (rangeData[0].x > rightRange.x) {
      rangeData.unshift({
        x: rightRange.x,
        y: rangeData[0].y
      })
    }

    rangeData = rangeData.slice(0, rangeData.length - outData.length)

    if (rangeData[rangeData.length - 1].x < Math.min(plotMax, data[data.length - 1].x)) {
      rangeData.push({
        x: Math.min(plotMax, data[data.length - 1].x),
        y: rangeData[rangeData.length - 1].y
      })
    }

    return pointsOmitter(rangeData)
  }, [disabled, data, rightRange, plotMin, plotMax, pointsOmitter])

  const currentLayer: Layer = ({ innerWidth, innerHeight }) => {
    if (typeof midPrice === 'undefined') {
      return null
    }

    const unitLen = innerWidth / (plotMax - plotMin)
    return (
      <svg x={(midPrice.x - plotMin) * unitLen - 20} y={0} width={60} height={innerHeight}>
        <defs>
          <filter id='shadow' x='-10' y='-9' width='20' height={innerHeight}>
            <feGaussianBlur in='SourceGraphic' stdDeviation='8' />
          </filter>
        </defs>
        <rect x={14} y={20} width='16' height={innerHeight} filter='url(#shadow)' opacity='0.3' />
        <rect x={19} y={20} width='3' height={innerHeight} fill={colors.invariant.yellow} />
      </svg>
    )
  }

  const globalPriceLayer: Layer = ({ innerWidth, innerHeight }) => {
    if (typeof globalPrice === 'undefined') {
      return null
    }

    const unitLen = innerWidth / (plotMax - plotMin)
    return (
      <svg x={(globalPrice - plotMin) * unitLen - 20} y={-20} width={40} height={innerHeight + 20}>
        <defs>
          <filter id='shadow-global-price' x='-10' y='-9' width='20' height={innerHeight}>
            <feGaussianBlur in='SourceGraphic' stdDeviation='8' />
          </filter>
        </defs>
        <rect
          x={14}
          y={20}
          width='16'
          height={innerHeight}
          filter='url(#shadow-global-price)'
          opacity='0.3'
        />
        <rect x={19} y={20} width='3' height={innerHeight} fill={colors.invariant.blue} />
      </svg>
    )
  }

  const calculateConcentration = (v: number, p1: number, p2: number) => {
    return Math.floor(v / Math.abs(p1 - p2))
  }

  const [hoveredVolume, setHoveredVolume] = useState<{volume: number, concentration: number, p1: number, p2: number} | null>(null)

  const concentrationData = [
    {
  p1: 5,
  p2: 10,
  volume: 15000
    },
{
  p1: 2,
  p2: 4,
  volume: 10000
},
    {
  p1: -1,
  p2: -5,
  volume: 40000
},
{
  p1: 1,
  p2: 2,
  volume: 15000
},

{
  p1: -1,
  p2: 1,
  volume: 60000
}
]

  const concentrationLevelLayers: Layer = ({ innerHeight }) => {
    if (!isShownHeatMap) {
      // If the toggle-switch is disabled do not display any thing
      return null
    }

    const concentrationFromAll = concentrationData.reduce((prev, cur) => {
      return prev + calculateConcentration(cur.volume, cur.p1, cur.p2)
    }, 0)

    return (<svg width={'50%'} onClick={(e) => {
      console.log(e)
    }}>
      {
    concentrationData.map((item) => ({ ...item, concentration: calculateConcentration(item.volume, item.p1, item.p2) })).sort((a, b) => a.concentration - b.concentration).map((point, i) => (<rect x={`${Math.floor((point.concentration / (concentrationFromAll)) * 95)}%`} onClick={() => { setHoveredVolume({ ...point }) }} width={`${((concentrationFromAll) / point.concentration) * 5}%`} fillOpacity={isShownHeatMap ? 0.2 + 0.2 * i : 0} style={{ transition: 'ease-in-out', transitionDuration: '0.5s', transitionDelay: `${i * 0.25}s` }} fill={'#2EE09A'} height={innerHeight} key={i} />))
      }
    </svg>)
  }

  const volumeRangeLayer: Layer = ({ innerWidth, innerHeight }) => {
    if (typeof volumeRange === 'undefined') {
      return null
    }

    const unitLen = innerWidth / (plotMax - plotMin)
    return (
      <>
        {volumeRange.min >= plotMin ? (
          <line
            x1={(volumeRange.min - plotMin) * unitLen}
            x2={(volumeRange.min - plotMin) * unitLen}
            y1={0}
            strokeWidth={1}
            y2={innerHeight}
            stroke={colors.invariant.text}
            strokeDasharray='16 4'
          />
        ) : null}
        {volumeRange.max <= plotMax ? (
          <line
            x1={(volumeRange.max - plotMin) * unitLen}
            x2={(volumeRange.max - plotMin) * unitLen}
            y1={0}
            strokeWidth={1}
            y2={innerHeight}
            stroke={colors.invariant.text}
            strokeDasharray='16 4'
          />
        ) : null}
      </>
    )
  }

  const bottomLineLayer: Layer = ({ innerWidth, innerHeight }) => {
    const bottomLine = innerHeight
    return <rect x={0} y={bottomLine} width={innerWidth} height={1} fill={colors.invariant.light} />
  }

  const lazyLoadingLayer: Layer = ({ innerWidth, innerHeight }) => {
    if (!loading || coverOnLoading) {
      return null
    }

    return (
      <svg
        width={innerWidth}
        height={innerHeight + 5}
        viewBox={`0 0 ${innerWidth} ${innerHeight + 5}`}
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        x={0}
        y={-5}>
        <rect x={0} y={0} width='100%' height='100%' fill={`${colors.white.main}10`} />
        <text
          x='50%'
          y='50%'
          dominantBaseline='middle'
          textAnchor='middle'
          className={classes.loadingText}>
          Loading liquidity data...
        </text>
      </svg>
    )
  }

  const brushLayer = Brush(
    leftRange.x,
    rightRange.x,
    position => {
      const nearest = nearestTickIndex(
        plotMin + position * (plotMax - plotMin),
        tickSpacing,
        isXtoY,
        xDecimal,
        yDecimal
      )
      onChangeRange?.(
        isXtoY
          ? Math.min(rightRange.index - tickSpacing, nearest)
          : Math.max(rightRange.index + tickSpacing, nearest),
        rightRange.index
      )
    },
    position => {
      const nearest = nearestTickIndex(
        plotMin + position * (plotMax - plotMin),
        tickSpacing,
        isXtoY,
        xDecimal,
        yDecimal
      )
      onChangeRange?.(
        leftRange.index,
        isXtoY
          ? Math.max(leftRange.index + tickSpacing, nearest)
          : Math.min(leftRange.index - tickSpacing, nearest)
      )
    },
    plotMin,
    plotMax,
    disabled
  )

  return (
    <Grid
      container
      className={classNames(classes.container, className)}
      style={style}
      innerRef={containerRef}>

      {loading && coverOnLoading ? (
        <Grid container className={classes.cover}>
          <img src={loader} className={classes.loader} />
        </Grid>
      ) : null}
      {!loading && hasError ? (
        <Grid container className={classes.cover}>
          <Grid className={classes.errorWrapper} container direction='column' alignItems='center'>
            <Typography className={classes.errorText}>Unable to load liquidity chart</Typography>
            <Button className={classes.reloadButton} onClick={reloadHandler}>
              Reload chart
            </Button>
          </Grid>
        </Grid>
      ) : null}
      <Grid
        container
        item
        className={classNames(classes.zoomButtonsWrapper, 'zoomBtns')}
        justifyContent='space-between'>
        <Button className={classes.zoomButton} onClick={zoomPlus} disableRipple>
          <img src={ZoomInIcon} className={classes.zoomIcon} />
        </Button>
        <Button className={classes.zoomButton} onClick={zoomMinus} disableRipple>
          <img src={ZoomOutIcon} className={classes.zoomIcon} />
        </Button>
      </Grid>

      <ResponsiveLine
        tooltip={({ point }) => {
           return (
              <Grid className={chartClasses.volumeTooltip}>
               <Typography className={chartClasses.volumeTooltipText}>Price: {point.data.x}</Typography>
               <Typography className={chartClasses.volumeTooltipText}>Volume: {JSON.stringify(hoveredVolume)}</Typography>
              </Grid>
            )
        }}
        data={[
          {
            id: 'less than range',
            data: currentLessThanRange.length ? currentLessThanRange : [{ x: plotMin, y: 0 }]
          },
          {
            id: 'range',
            data: currentRange
          },
          {
            id: 'greater than range',
            data: currentGreaterThanRange.length ? currentGreaterThanRange : [{ x: plotMax, y: 0 }]
          }
        ]}
        curve={isDiscrete ? (isXtoY ? 'stepAfter' : 'stepBefore') : 'basis'}
        margin={{ top: isSmDown ? 55 : 25, bottom: 15 }}
        legends={[]}
        axisTop={null}
        axisRight={null}
        axisLeft={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 0,
          tickRotation: 0,
          tickValues: 5
        }}
        xScale={{
          type: 'linear',
          min: plotMin,
          max: plotMax
        }}
        yScale={{
          type: 'linear',
          min: 0,
          max: maxVal
        }}
        role='aplication'
        enableGridX={false}
        enableGridY={false}
        enablePoints={false}
        enableArea={true}
        isInteractive
        useMesh
        animate
        colors={colors.invariant.green}
        theme={{
          axis: {
            ticks: {
              line: { stroke: colors.invariant.component },
              text: { fill: '#A9B6BF' }
            }
          },
          crosshair: {
            line: {
              stroke: colors.invariant.lightGrey,
              strokeWidth: 1,
              strokeDasharray: 'solid'
            }
          }
        }}
        lineWidth={2}
        layers={[concentrationLevelLayers, 'mesh', 'lines', 'grid', 'areas', 'axes', currentLayer, globalPriceLayer, volumeRangeLayer, bottomLineLayer, lazyLoadingLayer, brushLayer]}
        defs={[
          linearGradientDef('gradient', [
            { offset: 0, color: 'inherit' },
            { offset: 50, color: 'inherit' },
            { offset: 100, color: 'inherit', opacity: 0 }
          ])
        ]}
        fill={[{ match: '*', id: 'gradient' }]}
        crosshairType='bottom'

      />
    </Grid>
  )
}

export default PriceRangePlot
