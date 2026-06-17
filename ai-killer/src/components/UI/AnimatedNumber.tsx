'use client';
import { useEffect, useRef, useState } from 'react';

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const diff = end - start;
    if (diff === 0) return;

    const steps = 20;
    const step = diff / steps;
    let current = start;
    let count = 0;

    const interval = setInterval(() => {
      count++;
      current += step;
      if (count >= steps) {
        setDisplay(end);
        clearInterval(interval);
      } else {
        setDisplay(Math.round(current));
      }
    }, 30);

    prevRef.current = value;
    return () => clearInterval(interval);
  }, [value]);

  return <span className={className}>{display > 0 ? `+${display}` : display}</span>;
}
