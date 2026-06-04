import { useEffect, useRef, useState } from 'react';
import Pristine from 'pristinejs';

export function usePristine(options = {}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pristine, setPristine] = useState<Pristine | null>(null);

  useEffect(() => {
    if (formRef.current) {
      const p = new Pristine(formRef.current, {
        classTo: 'space-y-2', // Match shadcn layout
        errorClass: 'text-destructive',
        successClass: 'text-primary',
        errorTextParent: 'space-y-2',
        errorTextTag: 'p',
        errorTextClass: 'text-[0.8rem] font-medium text-destructive',
        ...options
      }, true);
      setPristine(p);

      return () => {
        if (p) p.destroy();
      };
    }
  }, []);

  const validate = () => {
    if (pristine) {
      return pristine.validate();
    }
    return true;
  };

  const getErrors = () => {
    if (pristine) {
      return pristine.getErrors();
    }
    return [];
  };

  return { formRef, validate, getErrors, pristine };
}
