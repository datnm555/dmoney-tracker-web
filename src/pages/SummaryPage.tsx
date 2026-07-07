import { useCallback, useEffect, useState } from 'react'
import { App as AntApp, Button, DatePicker, Popconfirm, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { getApiErrorMessage } from '../api/client'
import {
  createTransaction,
  deleteTransaction,
  getMonthlySummary,
  updateTransaction,
} from '../api/transactionApi'
import type { MonthlySummaryResponse, TransactionResponse } from '../api/types'
import { TransactionFormModal } from '../components/TransactionFormModal'
import type { TransactionFormValues } from '../components/TransactionFormModal'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'

export function SummaryPage() {
  const { t, lang } = useI18n()
  const { message } = AntApp.useApp()
  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSummary(await getMonthlySummary(month.format('YYYY-MM')))
    } catch (error) {
      message.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setLoading(false)
    }
  }, [month, message, t])

  useEffect(() => {
    void load()
  }, [load])

  const handleSubmit = async (values: TransactionFormValues) => {
    const payload = {
      date: values.date.format('YYYY-MM-DD'),
      content: values.content,
      creditAmount: values.creditAmount ?? 0,
      debitAmount: values.debitAmount ?? 0,
      note: values.note,
      category: values.category ?? null,
    }
    setSubmitting(true)
    try {
      if (editing) {
        await updateTransaction(editing.id, payload)
      } else {
        await createTransaction(payload)
      }
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch (error) {
      message.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id)
      await load()
    } catch (error) {
      message.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const columns: ColumnsType<TransactionResponse> = [
    {
      title: t('summary.colDate'),
      dataIndex: 'date',
      render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
      width: 120,
    },
    { title: t('summary.colContent'), dataIndex: 'content' },
    {
      title: t('summary.colCredit'),
      dataIndex: 'credit',
      align: 'right',
      width: 150,
      render: (credit: TransactionResponse['credit']) =>
        credit.amount > 0 ? <span style={{ color: 'green' }}>{formatMoney(credit)}</span> : '—',
    },
    {
      title: t('summary.colDebit'),
      dataIndex: 'debit',
      align: 'right',
      width: 150,
      render: (debit: TransactionResponse['debit']) =>
        debit.amount > 0 ? <span style={{ color: 'red' }}>{formatMoney(debit)}</span> : '—',
    },
    { title: t('summary.colNote'), dataIndex: 'note' },
    {
      title: t('summary.colCategory'),
      dataIndex: 'category',
      width: 130,
      render: (category: string | null) =>
        category ? <Tag>{t(`category.${category}`)}</Tag> : null,
    },
    {
      title: t('summary.colActions'),
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditing(record)
              setModalOpen(true)
            }}
          >
            {t('summary.edit')}
          </Button>
          <Popconfirm
            title={t('summary.deleteConfirm')}
            okText={t('summary.delete')}
            cancelText={t('summary.cancel')}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger>
              {t('summary.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div key={lang}>
      <Space style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('summary.title')}
        </Typography.Title>
        <Space>
          <DatePicker
            picker="month"
            value={month}
            onChange={(value) => value && setMonth(value)}
            allowClear={false}
            placeholder={t('summary.month')}
          />
          <Button
            type="primary"
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            {t('summary.create')}
          </Button>
        </Space>
      </Space>

      <Table<TransactionResponse>
        rowKey="id"
        columns={columns}
        dataSource={summary?.items ?? []}
        loading={loading}
        pagination={false}
        locale={{ emptyText: t('summary.empty') }}
        summary={() =>
          summary && (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <strong>
                  {t('summary.balance')}: {formatMoney(summary.balance)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <strong style={{ color: 'green' }}>{formatMoney(summary.totalCredit)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <strong style={{ color: 'red' }}>{formatMoney(summary.totalDebit)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={3} />
            </Table.Summary.Row>
          )
        }
      />

      <TransactionFormModal
        open={modalOpen}
        editing={editing}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
