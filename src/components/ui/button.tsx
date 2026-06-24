import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-black text-white hover:bg-black/85 dark:bg-[#F4F3EF] dark:text-black dark:hover:bg-[#E8E7E3]',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-zinc-200/60 dark:border-zinc-700/60 bg-transparent hover:bg-[#EAE8DF] dark:hover:bg-[#2C2C27] text-black dark:text-[#F4F3EF]',
        secondary:
          'bg-[#EAE8DF] dark:bg-[#2C2C27] text-black dark:text-[#F4F3EF] hover:bg-zinc-200/80 dark:hover:bg-[#333330]',
        ghost:
          'text-zinc-500 dark:text-zinc-400 hover:bg-[#EAE8DF] dark:hover:bg-[#2C2C27] hover:text-black dark:hover:text-[#F4F3EF]',
        link:
          'text-black dark:text-[#F4F3EF] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-xl px-3',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
