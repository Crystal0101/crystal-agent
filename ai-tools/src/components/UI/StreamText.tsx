'use client';
import { useState, useEffect, useRef } from 'react';

interface StreamTextProps {
  text: string;
  className?: string;
  speed?: number;
}

export function StreamText({ text, className, speed = 12 }: StreamTextProps) {
  const [displayed, setDisplayed] = useState('');
  const prevRef = useRef('');

  useEffect(() => {
    if (text === prevRef.current) return;
    const newPart = text.slice(prevRef.current.length);
    prevRef.current = text;
    let i = 0;
    const base = displayed;
    const interval = setInterval(() => {
      i++;
      setDisplayed(base + newPart.slice(0, i));
      if (i >= newPart.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  return <span className={className}>{displayed}</span>;
}
