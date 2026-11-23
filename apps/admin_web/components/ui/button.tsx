import * as React from 'react';
import {cva,type VariantProps} from 'class-variance-authority';
import {cn} from '../../lib/cn';

const buttonVariants=cva(
 'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
 {
  variants:{
   variant:{
    default:'bg-primary text-primary-foreground hover:brightness-95',
    outline:'border border-border bg-card text-foreground hover:bg-muted',
    secondary:'bg-secondary text-secondary-foreground hover:brightness-95',
    ghost:'text-foreground hover:bg-muted',
    destructive:'bg-destructive text-white hover:brightness-95',
    link:'text-primary underline-offset-4 hover:underline'
   },
   size:{
    default:'h-10 px-4 py-2',
    sm:'h-9 rounded-md px-3',
    lg:'h-11 rounded-lg px-5',
    icon:'size-10 p-0',
    'icon-sm':'size-9 p-0'
   }
  },
  defaultVariants:{variant:'default',size:'default'}
 }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,VariantProps<typeof buttonVariants>{}

export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(({className,variant,size,...props},ref)=>(
 <button ref={ref} className={cn(buttonVariants({variant,size,className}))} {...props}/>
));
Button.displayName='Button';
