"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, Search } from "lucide-react";

/** A styled select whose popup has a search input to filter its fixed options. */
export function SearchSelect({
  label,
  items,
  value,
  onValueChange,
  placeholder,
  emptyText,
}: {
  label: string;
  items: string[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  emptyText: string;
}) {
  return (
    <Combobox.Root
      items={items}
      value={value || null}
      onValueChange={(next: string | null) => { if (next) onValueChange(next); }}
      disabled={items.length === 0}
    >
      <div className="flex flex-col gap-2">
        <Combobox.Label className="text-body text-muted-foreground">{label}</Combobox.Label>
        <Combobox.Trigger className="flex h-12 w-full items-center justify-between gap-2 rounded-[10px] border bg-card px-3 text-left text-[14px] outline-none transition-colors hover:border-[#a1a1a1] focus-visible:border-primary data-[popup-open]:border-primary disabled:cursor-not-allowed disabled:opacity-50">
          <span className="truncate">
            <Combobox.Value placeholder={<span className="text-muted-foreground">{placeholder}</span>} />
          </span>
          <Combobox.Icon className="shrink-0 text-muted-foreground">
            <ChevronsUpDown className="size-4" />
          </Combobox.Icon>
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner align="start" sideOffset={4} className="z-50 outline-none">
          <Combobox.Popup
            aria-label={label}
            className="w-[var(--anchor-width)] overflow-hidden rounded-card border bg-card shadow-lg outline-none"
          >
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Combobox.Input
                placeholder={`Search ${label.toLowerCase()}…`}
                className="h-11 w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Combobox.Empty className="px-3 py-4 text-body text-muted-foreground empty:hidden">
              {emptyText}
            </Combobox.Empty>
            <Combobox.List className="max-h-64 overflow-y-auto p-1 empty:hidden">
              {(item: string) => (
                <Combobox.Item
                  key={item}
                  value={item}
                  className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-[14px] outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    <Combobox.ItemIndicator>
                      <Check className="size-4 text-primary" />
                    </Combobox.ItemIndicator>
                  </span>
                  <span className="truncate">{item}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
