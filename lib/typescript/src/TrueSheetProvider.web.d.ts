import { type ReactNode, type RefObject } from 'react';
import type { TrueSheetContextMethods, TrueSheetRef } from './TrueSheet.types';
interface BottomSheetContextValue extends TrueSheetContextMethods {
    register: (name: string, methods: RefObject<TrueSheetRef>) => void;
    unregister: (name: string) => void;
    pushToStack: (name: string) => void;
    removeFromStack: (name: string) => void;
    getSheetsAbove: (name: string) => string[];
    dismissDirect: (name: string) => Promise<void>;
    dismissAll: () => Promise<void>;
}
export declare const BottomSheetContext: import("react").Context<BottomSheetContextValue | null>;
export declare const getPresent: () => ((name: string, index?: number) => Promise<void>) | null;
export declare const getDismiss: () => ((name: string) => Promise<void>) | null;
export declare const getResize: () => ((name: string, index: number) => Promise<void>) | null;
export declare const getDismissAll: () => (() => Promise<void>) | null;
export interface TrueSheetProviderProps {
    children: ReactNode;
}
/**
 * Provider for TrueSheet on web.
 * Required to wrap your app for sheet management via useTrueSheet hook.
 */
export declare function TrueSheetProvider({ children }: TrueSheetProviderProps): import("react/jsx-runtime").JSX.Element;
/**
 * Hook to control TrueSheet instances by name.
 * On web, this uses the TrueSheetContext from TrueSheetProvider.
 */
export declare function useTrueSheet(): TrueSheetContextMethods;
export {};
//# sourceMappingURL=TrueSheetProvider.web.d.ts.map