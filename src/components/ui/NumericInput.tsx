import React, { useState, useEffect, useRef } from 'react';

interface NumericInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
  label?: string;
  errorMessage?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  className = '',
  min,
  max,
  label,
  errorMessage,
  onFocus,
  onBlur
}) => {
  const [inputValue, setInputValue] = useState<string>(value?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setInputValue(value.toString());
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(sanitizedValue);
    
    const numValue = sanitizedValue === '' ? 0 : parseInt(sanitizedValue, 10);
    
    let finalValue = numValue;
    if (min !== undefined && numValue < min) finalValue = min;
    if (max !== undefined && numValue > max) finalValue = max;
    
    onChange(finalValue);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    if (onFocus) onFocus();
  };

  const handleBlur = () => {
    if (inputValue === '') {
      setInputValue('0');
      onChange(0);
    }
    if (onBlur) onBlur();
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm text-gray-600 mb-1">{label}</label>
      )}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className={`border rounded-md p-2 w-full ${errorMessage ? 'border-red-500' : 'border-gray-300'} ${className}`}
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!errorMessage}
      />
      {errorMessage && (
        <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

export default NumericInput;
