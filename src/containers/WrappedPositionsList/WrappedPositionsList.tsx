import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { LiquidityList } from '@components/LiquidityList/LiquidityList'
import { isLoadingPositionsList, positionsWithPoolsData } from '@selectors/positions'
import { useHistory } from 'react-router-dom'
import { PRICE_DECIMAL } from '@consts/static'
import { calculate_price_sqrt } from '@invariant-labs/sdk'
import { printBN } from '@consts/utils'
import { Status, actions } from '@reducers/solanaWallet'
import { status } from '@selectors/solanaWallet'

export const WrappedPositionsList: React.FC = () => {
  const dispatch = useDispatch()

  const list = useSelector(positionsWithPoolsData)
  const isLoading = useSelector(isLoadingPositionsList)
  const walletStatus = useSelector(status)

  const history = useHistory()

  const maxDecimals = (value: number): number => {
    if (value >= 10000) {
      return 0
    }

    if (value >= 1000) {
      return 1
    }

    if (value >= 100) {
      return 2
    }

    return 4
  }

  return (
    <LiquidityList
      onAddPositionClick={() => { history.push('/newPosition') }}
      data={list.map((position) => {
        const lowerSqrtDec = calculate_price_sqrt(position.lowerTickIndex)
        const upperSqrtDec = calculate_price_sqrt(position.upperTickIndex)

        const lowerSqrt = +printBN(lowerSqrtDec.v, PRICE_DECIMAL)
        const upperSqrt = +printBN(upperSqrtDec.v, PRICE_DECIMAL)

        const min = Math.min(lowerSqrt ** 2, upperSqrt ** 2)
        const max = Math.max(lowerSqrt ** 2, upperSqrt ** 2)

        return {
          tokenXName: position.tokenX.symbol,
          tokenYName: position.tokenY.symbol,
          tokenXIcon: position.tokenX.logoURI,
          tokenYIcon: position.tokenY.logoURI,
          fee: +printBN(position.poolData.fee.v, PRICE_DECIMAL - 2),
          min: +(min.toFixed(maxDecimals(min))),
          max: +(max.toFixed(maxDecimals(max)))
        }
      })}
      loading={isLoading}
      showNoConnected={walletStatus !== Status.Initialized}
      noConnectedBlockerProps={{
        onConnect: (type) => { dispatch(actions.connect(type)) },
        onDisconnect: () => { dispatch(actions.disconnect()) },
        descCustomText: 'No liquidity positions to show.'
      }}
    />
  )
}

export default WrappedPositionsList
