import * as React from 'react';
import {cn} from '../../lib/cn';

export const Input=React.forwardRef<HTMLInputElement,React.ComponentProps<'input'>>(({className,type,...props},ref)=>(
 <input ref={ref} type={type} className={cn('flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',className)} {...props}/>
));
Input.displayName='Input';
