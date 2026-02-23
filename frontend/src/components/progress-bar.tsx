"use client";

import { useEffect } from "react";
import NProgress from "nprogress";
import { usePathname, useSearchParams } from "next/navigation";

export default function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // This will run on every route change
    if (typeof window !== 'undefined') {
      try {
        NProgress.done();
      } catch (e) {}
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        try {
          NProgress.start();
        } catch (e) {}
      }
    };
  }, [pathname, searchParams]);

  return null;
}
