import * as React from 'react';
import {Check} from 'lucide-react';
import {cn} from '../../lib/cn';

export const Checkbox=React.forwardRef<HTMLInputElement,React.ComponentProps<'input'>>(({className,...props},ref)=>(
 <span className={cn('relative inline-grid size-4 shrink-0 place-items-center',className)}>
  <input ref={ref} type="checkbox" className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0" {...props}/>
  <span aria-hidden="true" className="grid size-4 place-items-center rounded border border-input bg-card text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
   <Check className="size-3"/>
  </span>
 </span>
));
Checkbox.displayName='Checkbox';
