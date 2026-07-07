import { useCallback, useEffect, useState } from 'react'
import { App as AntApp, Card, Col, DatePicker, Empty, Row, Typography } from 'antd'
import { Column, Line, Pie } from '@ant-design/plots'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { getApiErrorMessage } from '../api/client'
import { getDashboardStats } from '../api/transactionApi'
import type { DashboardStatsResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { toBalanceLine, toCategoryPie, toDailyBars, toMonthlyBars } from '../utils/chartData'
import { formatMoney } from '../utils/money'

const CREDIT_COLOR = '#52c41a'
const DEBIT_COLOR = '#f5222d'
const CHART_HEIGHT = 280

const vnd = (value: number) => formatMoney({ amount: value, currency: 'VND' })

export function DashboardPage() {
  const { t } = useI18n()
  const { message } = AntApp.useApp()
  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStats(await getDashboardStats(month.format('YYYY-MM')))
    } catch (error) {
      message.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setLoading(false)
    }
  }, [month, message, t])

  useEffect(() => {
    void load()
  }, [load])

  const monthlyBars = stats
    ? toMonthlyBars(stats.monthly, t('summary.colCredit'), t('summary.colDebit'))
    : []
  const balanceLine = stats ? toBalanceLine(stats.monthly) : []
  const dailyBars = stats ? toDailyBars(stats.daily) : []
  const categoryPie = stats ? toCategoryPie(stats.byCategory, t) : []

  const empty = <Empty description={t('dashboard.empty')} />

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('dashboard.title')}
        </Typography.Title>
        <DatePicker
          picker="month"
          value={month}
          onChange={(value) => value && setMonth(value)}
          allowClear={false}
        />
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.monthlyChart')} loading={loading}>
            <Column
              data={monthlyBars}
              xField="month"
              yField="amount"
              colorField="type"
              group
              height={CHART_HEIGHT}
              scale={{ color: { range: [CREDIT_COLOR, DEBIT_COLOR] } }}
              axis={{ y: { labelFormatter: vnd } }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.balanceChart')} loading={loading}>
            <Line
              data={balanceLine}
              xField="x"
              yField="amount"
              height={CHART_HEIGHT}
              axis={{ y: { labelFormatter: vnd } }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.dailyChart')} loading={loading}>
            {stats && dailyBars.length === 0 ? (
              empty
            ) : (
              <Column
                data={dailyBars}
                xField="x"
                yField="amount"
                height={CHART_HEIGHT}
                style={{ fill: DEBIT_COLOR }}
                axis={{ y: { labelFormatter: vnd } }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.categoryChart')} loading={loading}>
            {stats && categoryPie.length === 0 ? (
              empty
            ) : (
              <Pie data={categoryPie} angleField="amount" colorField="label" height={CHART_HEIGHT} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
