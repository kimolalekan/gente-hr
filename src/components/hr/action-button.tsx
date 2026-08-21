'use client';

import { useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

/**
 * Button that briefly shows a success state after being pressed — used for
 * demo actions (invite, generate, upgrade…) that don't have a backend yet.
 */
export function ActionButton({
  children,
  onAction,
  doneLabel = 'Done',
  ...props
}: ButtonProps & { onAction?: () => void; doneLabel?: string; children: ReactNode }) {
  const [done, setDone] = useState(false);

  return (
    <Button
      {...props}
      onClick={() => {
        onAction?.();
        setDone(true);
        window.setTimeout(() => setDone(false), 2000);
      }}
    >
      {done ? (
        <>
          <Check />
          {doneLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
