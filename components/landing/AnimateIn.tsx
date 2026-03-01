'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface AnimateInProps {
  children: ReactNode
  className?: string
  animation?: string
  delay?: string
  threshold?: number
  once?: boolean
}

export function AnimateIn({
  children,
  className = '',
  animation = 'animate-fade-in-up animate-duration-700',
  delay = '',
  threshold = 0.15,
  once = true,
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          if (once) observer.unobserve(el)
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, once])

  return (
    <div
      ref={ref}
      className={`${visible ? `${animation} ${delay}` : 'opacity-0'} ${className}`}
    >
      {children}
    </div>
  )
}
