import type { ReactNode } from 'react';
import type { TrueSheetContextMethods } from './TrueSheet.types';
export interface TrueSheetProviderProps {
    children: ReactNode;
}
/**
 * Provider for TrueSheet on native platforms.
 * This is a pass-through component - no context is needed on native
 * since TrueSheet uses static instance methods internally.
 */
export declare function TrueSheetProvider({ children }: TrueSheetProviderProps): ReactNode;
/**
 * Hook to control TrueSheet instances by name.
 * On native, this maps directly to TrueSheet static methods.
 */
export declare function useTrueSheet(): TrueSheetContextMethods;
//# sourceMappingURL=TrueSheetProvider.d.ts.map