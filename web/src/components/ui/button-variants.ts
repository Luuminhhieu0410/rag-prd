import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-zinc-950 text-white shadow-sm shadow-zinc-950/10 hover:bg-zinc-800',
        destructive:
          'bg-red-600 text-white shadow-sm shadow-red-600/10 hover:bg-red-700',
        outline:
          'border border-zinc-200 bg-white text-zinc-900 shadow-sm shadow-zinc-950/[0.03] hover:border-zinc-300 hover:bg-zinc-50',
        secondary:
          'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
        ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950',
        link: 'text-zinc-950 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-xl px-3',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
