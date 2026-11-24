'use client';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import {cn} from '../../lib/cn';

export const DropdownMenu=DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger=DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({className,sideOffset=8,...props}:DropdownMenuPrimitive.DropdownMenuContentProps){
 return <DropdownMenuPrimitive.Portal>
  <DropdownMenuPrimitive.Content sideOffset={sideOffset} className={cn('z-50 min-w-48 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none',className)} {...props}/>
 </DropdownMenuPrimitive.Portal>;
}

export function DropdownMenuItem({className,...props}:DropdownMenuPrimitive.DropdownMenuItemProps){
 return <DropdownMenuPrimitive.Item className={cn('relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors focus:bg-muted focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',className)} {...props}/>;
}

export function DropdownMenuLabel({className,...props}:DropdownMenuPrimitive.DropdownMenuLabelProps){
 return <DropdownMenuPrimitive.Label className={cn('px-2.5 py-2 text-xs font-semibold text-muted-foreground',className)} {...props}/>;
}

export function DropdownMenuSeparator({className,...props}:DropdownMenuPrimitive.DropdownMenuSeparatorProps){
 return <DropdownMenuPrimitive.Separator className={cn('-mx-1.5 my-1 h-px bg-border',className)} {...props}/>;
}
