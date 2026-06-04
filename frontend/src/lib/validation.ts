/// <reference path="../types/pristinejs.d.ts" />
import Pristine from 'pristinejs';

export const createPristine = (form: HTMLFormElement) => {
  return new Pristine(form, {
    classTo: 'form-group',
    errorClass: 'has-danger',
    successClass: 'has-success',
    errorTextParent: 'form-group',
    errorTextTag: 'div',
    errorTextClass: 'text-help'
  });
};

// Custom validators
export const phoneValidator = (value: string) => {
  if (!value) return true;
  // Basic international phone format: +[country code][number]
  return /^\+?[1-9]\d{1,14}$/.test(value);
};

export const instanceNameValidator = (value: string) => {
  if (!value) return true;
  // alphanumeric and hyphens only
  return /^[a-zA-Z0-9-]+$/.test(value);
};
