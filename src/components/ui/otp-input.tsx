'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Fired when every box is filled. */
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Highlights the boxes red (e.g. after a failed verify). */
  invalid?: boolean;
  'aria-label'?: string;
  id?: string;
}

/**
 * Segmented one-time-password input: one box per digit with auto-advance,
 * backspace-to-previous, arrow-key navigation, and paste support.
 * Fires `onComplete` once every digit is entered.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  disabled = false,
  invalid = false,
  'aria-label': ariaLabel = 'One-time code',
  id,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.split('').slice(0, length);

  // Auto-submit once all digits are filled.
  useEffect(() => {
    if (value.length === length && value.length > 0) onComplete?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only on digit count changes
  }, [value.length]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setDigit = (index: number, digit: string) => {
    const chars = value.split('');
    chars[index] = digit;
    onChange(chars.join('').slice(0, length));
  };

  const handleChange = (index: number, raw: string) => {
    const filtered = raw.replace(/\D/g, '');

    // Paste or multi-digit input: distribute across the remaining boxes.
    if (filtered.length > 1) {
      const chars = value.split('');
      for (let i = 0; i < filtered.length && index + i < length; i++) {
        chars[index + i] = filtered[i];
      }
      onChange(chars.join('').slice(0, length));
      refs.current[Math.min(index + filtered.length, length - 1)]?.focus();
      return;
    }

    if (filtered.length === 0) {
      setDigit(index, '');
      if (index > 0) refs.current[index - 1]?.focus();
      return;
    }

    setDigit(index, filtered);
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && digits[index] === '' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!text) return;
    onChange(text.split('').slice(0, length).join(''));
    refs.current[Math.min(text.length, length) - 1]?.focus();
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex justify-center gap-2"
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          id={index === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          pattern="[0-9]*"
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          value={digits[index] ?? ''}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          className={cn(
            'h-12 w-11 rounded-lg border border-input bg-background text-center font-mono text-2xl font-semibold shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            invalid && 'border-destructive focus-visible:ring-destructive',
            digits[index] && !invalid && 'border-primary/60',
          )}
        />
      ))}
    </div>
  );
}
