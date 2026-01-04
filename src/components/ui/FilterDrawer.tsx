'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FilterDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: number;
  onClearAll: () => void;
  children: React.ReactNode;
}

export function FilterDrawer({
  isOpen,
  onOpenChange,
  activeFilters,
  onClearAll,
  children,
}: FilterDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[70vh] rounded-t-2xl bg-bg-secondary border-border"
      >
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center justify-between text-text-primary">
            <span>Filters</span>
            {activeFilters > 0 && (
              <Badge variant="secondary" className="bg-gold-subtle text-gold-primary">
                {activeFilters} active
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto py-4 flex-1">
          {children}
        </div>

        <SheetFooter className="border-t border-border pt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={onClearAll}
            disabled={activeFilters === 0}
            className="flex-1"
          >
            Clear All
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-gold-primary hover:bg-gold-light text-black"
          >
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
