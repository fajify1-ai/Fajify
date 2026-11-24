'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
import {cn} from '../../lib/cn';

export const Dialog=DialogPrimitive.Root;
export const DialogTrigger=DialogPrimitive.Trigger;
export const DialogClose=DialogPrimitive.Close;

export function DialogContent({className,children,...props}:DialogPrimitive.DialogContentProps){
 return <DialogPrimitive.Portal>
  <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"/>
  <DialogPrimitive.Content className={cn('fixed left-1/2 top-1/2 z-50 max-h-[min(88vh,900px)] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-card p-6 text-card-foreground shadow-2xl focus:outline-none',className)} {...props}>
   {children}
   <DialogPrimitive.Close aria-label="Close dialog" className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground opacity-80 transition-opacity hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <X className="size-4"/>
   </DialogPrimitive.Close>
  </DialogPrimitive.Content>
 </DialogPrimitive.Portal>;
}

export function DialogHeader({className,...props}:React.HTMLAttributes<HTMLDivElement>){
 return <div className={cn('flex flex-col gap-2 text-left',className)} {...props}/>;
}

export function DialogTitle({className,...props}:DialogPrimitive.DialogTitleProps){
 return <DialogPrimitive.Title className={cn('text-lg font-semibold leading-none tracking-tight',className)} {...props}/>;
}

export function DialogDescription({className,...props}:DialogPrimitive.DialogDescriptionProps){
 return <DialogPrimitive.Description className={cn('text-sm leading-5 text-muted-foreground',className)} {...props}/>;
}
