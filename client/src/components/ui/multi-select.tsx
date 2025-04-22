import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (selectedValues: string[]) => void;
  placeholder?: string;
  className?: string;
  maxItems?: number;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select items...",
  className,
  maxItems,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);

  // Handler for clicking on an option
  const handleSelect = (selectedValue: string) => {
    const newValues = value.includes(selectedValue)
      ? value.filter(v => v !== selectedValue)
      : [...value, selectedValue];
    
    // Check if we're under the maxItems limit or if we're removing an item
    if (!maxItems || newValues.length <= maxItems || newValues.length < value.length) {
      onChange(newValues);
    }
  };

  // Handler for removing a selected item via the badge's X button
  const handleRemove = (selectedValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== selectedValue));
  };

  // Get labels for the selected values
  const selectedLabels = value.map(v => {
    const option = options.find(opt => opt.value === v);
    return option ? option.label : v;
  });

  // Filter options based on search value
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        open && 
        buttonRef.current && 
        !buttonRef.current.contains(e.target as Node) &&
        commandRef.current && 
        !commandRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          onClick={() => setOpen(!open)}
        >
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1 overflow-hidden">
              {selectedLabels.map((label, i) => (
                <Badge 
                  key={i} 
                  variant="secondary"
                  className="flex items-center justify-between px-3 py-1"
                >
                  <span className="truncate max-w-[100px]">{label}</span>
                  <button
                    onClick={(e) => handleRemove(value[i], e)}
                    className="ml-1 hover:bg-accent hover:text-accent-foreground rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command ref={commandRef} filter={(value, search) => {
          // We're handling the filtering ourselves
          if (value.includes(search.toLowerCase())) return 1;
          return 0;
        }}>
          <CommandInput 
            placeholder="Search..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {filteredOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label.toLowerCase()}
                onSelect={() => handleSelect(option.value)}
                disabled={maxItems ? value.length >= maxItems && !value.includes(option.value) : false}
                className={cn(
                  maxItems && value.length >= maxItems && !value.includes(option.value) ? 'opacity-50 cursor-not-allowed' : '',
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.includes(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}