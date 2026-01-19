import type { TrueSheetProps, TrueSheetRef } from './TrueSheet.types';
declare const TrueSheetComponent: import("react").ForwardRefExoticComponent<TrueSheetProps & import("react").RefAttributes<TrueSheetRef>>;
interface TrueSheetStatic {
    present: (name: string, index?: number) => Promise<void>;
    dismiss: (name: string) => Promise<void>;
    resize: (name: string, index: number) => Promise<void>;
    dismissAll: () => Promise<void>;
}
export declare const TrueSheet: typeof TrueSheetComponent & TrueSheetStatic;
export {};
//# sourceMappingURL=TrueSheet.web.d.ts.map