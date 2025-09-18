"use client";

import { useEffect, useState } from "react";
import styles from "./LoadingAnimation.module.css";

interface LoadingAnimationProps {
  text: string;
  className?: string;
}

export function LoadingAnimation({ text, className }: LoadingAnimationProps) {
  const [animationOffset, setAnimationOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationOffset((prev) => (prev + 1) % (text.length + 10));
    }, 100);

    return () => clearInterval(interval);
  }, [text.length]);

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <span className={styles.text}>
        {text.split("").map((char, index) => {
          const isHighlighted = 
            index >= animationOffset - 3 && 
            index <= animationOffset + 3;
          
          return (
            <span
              key={index}
              className={`${styles.char} ${isHighlighted ? styles.highlighted : ""}`}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          );
        })}
      </span>
    </div>
  );
}
