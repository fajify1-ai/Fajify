import * as React from 'react';
import {cva,type VariantProps} from 'class-variance-authority';
import {cn} from '../../lib/cn';

const badgeVariants=cva('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium leading-none',{
 variants:{variant:{
  default:'border-transparent bg-secondary text-secondary-foreground',
  success:'border-transparent bg-success text-success-foreground',
  warning:'border-transparent bg-warning text-warning-foreground',
  destructive:'border-transparent bg-accent text-accent-foreground',
  outline:'border-border text-foreground'
 }},
 defaultVariants:{variant:'default'}
});

export function Badge({className,variant,...props}:React.HTMLAttributes<HTMLSpanElement>&VariantProps<typeof badgeVariants>){
 return <span className={cn(badgeVariants({variant}),className)} {...props}/>;
}
