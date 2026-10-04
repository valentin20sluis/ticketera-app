"use client"

import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "cn"

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({ className, ...props }: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      className={cn("outline-none", className)}
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  align = "end",
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "sideOffset" | "align" | "side">) {
  return (
    <MenuPrimitive.Portal data-slot="dropdown-menu-portal">
      <MenuPrimitive.Positioner
        data-slot="dropdown-menu-positioner"
        sideOffset={sideOffset}
        align={align}
        className="z-50 outline-none"
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "min-w-40 rounded-lg border border-border bg-popover bg-clip-padding p-1 text-popover-foreground shadow-lg outline-none transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none select-none data-highlighted:bg-muted data-highlighted:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem }
