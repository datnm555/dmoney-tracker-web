import { cn } from '@/lib/utils'
import { selectedPayWithKey } from '../../utils/payWith'
import type { PayWithChip, PayWithFields } from '../../utils/payWith'

interface Props {
  chips: PayWithChip[]
  value: PayWithFields
  onPick: (fields: PayWithFields) => void
}

export function PayWithChips({ chips, value, onPick }: Props) {
  const selectedKey = selectedPayWithKey(chips, value)
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const selected = chip.key === selectedKey
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(chip.fields)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm text-muted-foreground hover:border-zinc-300',
              selected && 'border-primary bg-primary/5 text-primary ring-1 ring-primary/30',
            )}
          >
            {chip.label}
            {chip.lastDigits && <span className="ml-1 text-xs opacity-70">•••{chip.lastDigits}</span>}
          </button>
        )
      })}
    </div>
  )
}
