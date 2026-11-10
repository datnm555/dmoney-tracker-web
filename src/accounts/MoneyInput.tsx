import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatThousands } from './moneyDigits'


/** Digit-only money field, mirrors the amount input in TransactionFormModal. */
export function MoneyInput({
  id,
  label,
  digits,
  onChange,
}: {
  id: string
  label: string
  digits: string
  onChange: (digits: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          className="pr-9"
          value={formatThousands(digits)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          ₫
        </span>
      </div>
    </div>
  )
}

