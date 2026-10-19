"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

export function NavigationProgressLink({
  children,
  className,
  href,
  pendingLabel,
  statusClassName,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  pendingLabel: string;
  statusClassName?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <a
      className={className}
      href={href}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        setPending(true);
        router.push(href);
      }}
    >
      {children}
      <span
        aria-live="polite"
        className={statusClassName}
        data-navigation-state={pending ? "pending" : "idle"}
      >
        {pending ? pendingLabel : ""}
      </span>
    </a>
  );
}
