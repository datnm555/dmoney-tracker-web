import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogSectionLabel,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Shared look of the small "create one named item" dialogs used by the settings
 * pages (banks, plans, gold types, beneficiaries, purchase places): one section
 * label + a rounded-xl input, then a cancel / create footer.
 */
export function NameCreateDialog({
  open,
  title,
  icon,
  iconClassName,
  inputId,
  label,
  value,
  onChange,
  onSubmit,
  onClose,
  submitLabel,
  submitDisabled,
  cancelLabel,
}: {
  open: boolean
  title: string
  /** Small decorative icon shown before the title. */
  icon?: ReactNode
  /** Overrides the default primary tint of the icon badge. */
  iconClassName?: string
  inputId: string
  label: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onClose: () => void
  submitLabel: string
  submitDisabled: boolean
  cancelLabel: string
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            {icon && (
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-4',
                  iconClassName,
                )}
              >
                {icon}
              </span>
            )}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <DialogSectionLabel>
            <label htmlFor={inputId}>{label}</label>
          </DialogSectionLabel>
          <Input
            id={inputId}
            className="h-11 rounded-xl"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            autoComplete="off"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button disabled={submitDisabled} onClick={onSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
