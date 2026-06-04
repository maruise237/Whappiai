declare module 'pristinejs' {
    export default class Pristine {
        constructor(form: HTMLElement, config?: any, live?: boolean);
        validate(input?: HTMLElement | NodeList | null, silent?: boolean): boolean;
        getErrors(input?: HTMLElement | NodeList | null): any[];
        addValidator(elem: HTMLElement, fn: Function, msg: string, priority?: number, halt?: boolean): void;
        destroy(): void;
        reset(): void;
    }
}
