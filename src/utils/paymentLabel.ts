import type { TransactionResponse } from '../api/types'

export function paymentLabel(tx: TransactionResponse, t: (key: string) => string): string {
  if (tx.paymentMethod === 'card') {
    const type = tx.cardType ? ` ${t(`payment.cardType.${tx.cardType}`)}` : ''
    const bank = tx.bank ? ` ${tx.bank}` : ''
    return `${t('payment.card')}${type}${bank}`
  }
  return t(`payment.${tx.paymentMethod}`)
}
