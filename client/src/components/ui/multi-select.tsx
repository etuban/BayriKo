import React, { useState, useRef, useEffect } from 'react';
import { Check, X, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export type Option = {
  value: string;
  label: string;
};

type MultiSelectProps = {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  maxItems?: number;
  disabled?: boolean;
};

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  className,
  maxItems,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(value || []);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [inputValue, setInputValue] = useState('');

  // Sync value changes with internal state
  useEffect(() => {
    setSelectedValues(value || []);
  }, [value]);

  const handleSelect = (optionValue: string) => {
    const isSelected = selectedValues.includes(optionValue);
    let updatedValues: string[];

    if (isSelected) {
      // Remove option if already selected
      updatedValues = selectedValues.filter((v) => v !== optionValue);
    } else {
      // Add option if not at max limit
      if (maxItems && selectedValues.length >= maxItems) {
        return; // Don't add if at max limit
      }
      updatedValues = [...selectedValues, optionValue];
    }

    setSelectedValues(updatedValues);
    onChange(updatedValues);
    setInputValue(''); // Clear input after selection
  };

  const handleRemove = (optionValue: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updatedValues = selectedValues.filter((v) => v !== optionValue);
    setSelectedValues(updatedValues);
    onChange(updatedValues);
  };

  // Get the label for a value
  const getLabel = (optionValue: string) => {
    const option = options.find((o) => o.value === optionValue);
    return option ? option.label : optionValue;
  };

  // Filter options based on input value
  const filteredOptions = options.filter((option) => {
    // Show all options when no input, otherwise filter by label
    return !inputValue ||
      option.label.toLowerCase().includes(inputValue.toLowerCase());
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between min-h-10',
            selectedValues.length > 0 ? 'h-auto' : '',
            className
          )}
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 mr-2">
            {selectedValues.length > 0 ? (
              selectedValues.map((value) => (
                <Badge
                  key={value}
                  variant="secondary"
                  className="mr-1 mb-1"
                >
                  {getLabel(value)}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRemove(value);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => handleRemove(value, e)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    <span className="sr-only">Remove {getLabel(value)}</span>
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full min-w-[200px] p-0"
        style={{ width: triggerRef.current?.offsetWidth }}
      >
        <Command className="max-h-[300px]">
          <CommandInput 
            placeholder="Search options..." 
            className="h-9"
            value={inputValue}
            onValueChange={setInputValue}
          />
          {filteredOptions.length === 0 && (
            <CommandEmpty>No options found.</CommandEmpty>
          )}
          <CommandGroup className="max-h-[240px] overflow-auto">
            {filteredOptions.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              // Skip rendering if already selected and no matching input
              if (isSelected && inputValue === '') {
                return null;
              }
              // Disable option if at max limit and not already selected
              const isDisabled = maxItems ? selectedValues.length >= maxItems && !isSelected : false;
              
              return (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                  disabled={isDisabled}
                  className={cn(
                    'flex items-center gap-2',
                    isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'opacity-50'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span>{option.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}