import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/ui/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50',
  { variants: {
    variant: { default: 'bg-primary text-primary-foreground hover:bg-primary/90', outline: 'border border-border bg-card hover:bg-secondary', ghost: 'hover:bg-secondary' },
    size: { default: 'h-11 rounded-full px-5', sm: 'h-9 rounded-full px-3', icon: 'h-11 w-11 rounded-full' },
  }, defaultVariants: { variant: 'default', size: 'default' } },
)

export function Button({ className, variant, size, type = 'button', ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return <button data-slot="button" type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
export { buttonVariants }
