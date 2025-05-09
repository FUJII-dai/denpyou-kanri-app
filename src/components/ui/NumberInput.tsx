import React, { useState, useEffect, useRef } from 'react';

interface NumberInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  id?: string;
  name?: string;
  required?: boolean;
  label?: string;
  error?: string;
}

/**
 * A custom number input component that works well on mobile devices.
 * Uses text input with inputMode="numeric" and pattern="[0-9]*" for better mobile support.
 */
const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  className = '',
  min,
  max,
  step,
  disabled = false,
  onBlur,
  onFocus,
  id,
  name,
  required = false,
  label,
  error,
}) => {
  const [inputValue, setInputValue] = useState<string>(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.toString() !== inputValue) {
      setInputValue(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(sanitizedValue);
    
    let numValue = sanitizedValue === '' ? 0 : parseInt(sanitizedValue, 10);
    
    if (min !== undefined && numValue < min) {
      numValue = min;
    }
    
    if (max !== undefined && numValue > max) {
      numValue = max;
    }
    
    onChange(numValue);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    if (onFocus) onFocus();
  };

  const handleBlur = () => {
    setInputValue(value.toString());
    if (onBlur) onBlur();
  };

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm text-gray-600 mb-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        id={id}
        name={name}
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`border rounded-md p-2 w-full ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
        required={required}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default NumberInput;
