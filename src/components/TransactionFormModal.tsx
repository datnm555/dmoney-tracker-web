import { useEffect } from 'react'
import { DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { TransactionResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { CATEGORY_CODES } from '../utils/categories'

export interface TransactionFormValues {
  date: Dayjs
  content: string
  creditAmount: number | null
  debitAmount: number | null
  note: string | null
  category: string | null
}

interface Props {
  open: boolean
  editing: TransactionResponse | null
  submitting: boolean
  onSubmit: (values: TransactionFormValues) => void
  onCancel: () => void
}

const thousands = (value: string | number | undefined) =>
  `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export function TransactionFormModal({ open, editing, submitting, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const [form] = Form.useForm<TransactionFormValues>()

  useEffect(() => {
    if (!open) {
      return
    }
    if (editing) {
      form.setFieldsValue({
        date: dayjs(editing.date),
        content: editing.content,
        creditAmount: editing.credit.amount,
        debitAmount: editing.debit.amount,
        note: editing.note,
        category: editing.category,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ date: dayjs(), creditAmount: null, debitAmount: null, note: null, category: null })
    }
  }, [open, editing, form])

  const validateAmounts = async () => {
    const credit = form.getFieldValue('creditAmount') ?? 0
    const debit = form.getFieldValue('debitAmount') ?? 0
    if (credit > 0 || debit > 0) {
      return
    }
    throw new Error(t('form.amountRequired'))
  }

  return (
    <Modal
      open={open}
      title={editing ? t('summary.editTitle') : t('summary.createTitle')}
      okText={t('summary.submit')}
      cancelText={t('summary.cancel')}
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form<TransactionFormValues> form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="date"
          label={t('form.date')}
          rules={[{ required: true, message: t('form.dateRequired') }]}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item
          name="content"
          label={t('form.content')}
          rules={[{ required: true, whitespace: true, message: t('form.contentRequired') }, { max: 500 }]}
        >
          <Input maxLength={500} />
        </Form.Item>
        <Form.Item
          name="creditAmount"
          label={t('form.credit')}
          dependencies={['debitAmount']}
          rules={[{ validator: validateAmounts }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={1000}
            formatter={thousands}
            parser={(value) => Number((value ?? '').replace(/\./g, ''))}
          />
        </Form.Item>
        <Form.Item
          name="debitAmount"
          label={t('form.debit')}
          dependencies={['creditAmount']}
          rules={[{ validator: validateAmounts }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={1000}
            formatter={thousands}
            parser={(value) => Number((value ?? '').replace(/\./g, ''))}
          />
        </Form.Item>
        <Form.Item name="category" label={t('form.category')}>
          <Select
            allowClear
            options={CATEGORY_CODES.map((code) => ({ value: code, label: t(`category.${code}`) }))}
          />
        </Form.Item>
        <Form.Item name="note" label={t('form.note')} rules={[{ max: 1000 }]}>
          <Input.TextArea rows={3} maxLength={1000} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
