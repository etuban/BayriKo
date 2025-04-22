import React, { useRef, useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

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
  placeholder = "Select options...",
  className = "",
  maxItems,
  disabled = false
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !value.includes(option.value)
  );

  const selectedOptions = value
    .map(v => options.find(option => option.value === v))
    .filter(Boolean) as Option[];

  const hasReachedMaxItems = maxItems ? value.length >= maxItems : false;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOption = (option: Option) => {
    if (value.includes(option.value)) {
      onChange(value.filter(v => v !== option.value));
    } else {
      if (maxItems && value.length >= maxItems) return;
      onChange([...value, option.value]);
    }
  };

  const removeOption = (option: Option, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== option.value));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !searchTerm && selectedOptions.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full ${className}`}
      onClick={() => !disabled && setIsOpen(true)}
    >
      <div 
        className={`border rounded-md p-1.5 min-h-10 flex flex-wrap gap-1 ${
          isOpen ? 'ring-2 ring-primary/50 border-primary' : 'border-input'
        } ${disabled ? 'bg-muted cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {selectedOptions.length === 0 && !searchTerm && (
          <div className="text-muted-foreground py-0.5 px-1.5">
            {placeholder}
          </div>
        )}
        
        {selectedOptions.map(option => (
          <div 
            key={option.value}
            className="bg-primary/10 border border-primary/20 text-primary rounded-md px-2 py-0.5 flex items-center gap-1"
          >
            <span>{option.label}</span>
            {!disabled && (
              <X 
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" 
                onClick={(e) => removeOption(option, e)}
              />
            )}
          </div>
        ))}
        
        {isOpen && !hasReachedMaxItems && (
          <input
            type="text"
            className="flex-1 outline-none bg-transparent min-w-[80px] py-0.5 px-1.5"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-background border rounded-md shadow-md max-h-60 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-center text-muted-foreground">
              No options available
            </div>
          ) : (
            filteredOptions.map(option => (
              <div
                key={option.value}
                className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center justify-between"
                onClick={() => toggleOption(option)}
              >
                {option.label}
                <div className="h-4 w-4 rounded-sm border flex items-center justify-center">
                  {value.includes(option.value) && <Check className="h-3 w-3" />}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}