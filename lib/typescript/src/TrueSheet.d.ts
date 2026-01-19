import { PureComponent, type ReactNode } from 'react';
import type { TrueSheetProps, TrueSheetRef } from './TrueSheet.types';
interface TrueSheetState {
    shouldRenderNativeView: boolean;
}
export declare class TrueSheet extends PureComponent<TrueSheetProps, TrueSheetState> implements TrueSheetRef {
    displayName: string;
    private readonly nativeRef;
    /**
     * Map of sheet names against their instances.
     */
    private static readonly instances;
    /**
     * Resolver to be called when mount event is received
     */
    private presentationResolver;
    /**
     * Tracks if a present operation is in progress
     */
    private isPresenting;
    constructor(props: TrueSheetProps);
    private validateDetents;
    private static getInstance;
    private get handle();
    /**
     * Present the sheet by given `name` (Promise-based)
     * @param name - Sheet name (must match sheet's name prop)
     * @param index - Detent index (default: 0)
     * @param animated - Whether to animate the presentation (default: true)
     * @returns Promise that resolves when sheet is fully presented
     * @throws Error if sheet not found or presentation fails
     */
    static present(name: string, index?: number, animated?: boolean): Promise<void>;
    /**
     * Dismiss the sheet by given `name` (Promise-based)
     * @param name - Sheet name
     * @param animated - Whether to animate the dismissal (default: true)
     * @returns Promise that resolves when sheet is fully dismissed
     * @throws Error if sheet not found or dismissal fails
     */
    static dismiss(name: string, animated?: boolean): Promise<void>;
    /**
     * Resize the sheet by given `name` (Promise-based)
     * @param name - Sheet name
     * @param index - New detent index
     * @returns Promise that resolves when resize is complete
     * @throws Error if sheet not found
     */
    static resize(name: string, index: number): Promise<void>;
    /**
     * Dismiss all presented sheets by dismissing from the bottom of the stack.
     * This ensures child sheets are dismissed first before their parent.
     * @param animated - Whether to animate the dismissals (default: true)
     * @returns Promise that resolves when all sheets are dismissed
     */
    static dismissAll(animated?: boolean): Promise<void>;
    private registerInstance;
    private unregisterInstance;
    private onDetentChange;
    private onWillPresent;
    private onDidPresent;
    private onWillDismiss;
    private onDidDismiss;
    private onMount;
    private onDragBegin;
    private onDragChange;
    private onDragEnd;
    private onPositionChange;
    private onWillFocus;
    private onDidFocus;
    private onWillBlur;
    private onDidBlur;
    private onBackPress;
    present(index?: number, animated?: boolean): Promise<void>;
    resize(index: number): Promise<void>;
    dismiss(animated?: boolean): Promise<void>;
    componentDidMount(): void;
    componentDidUpdate(prevProps: TrueSheetProps): void;
    componentWillUnmount(): void;
    render(): ReactNode;
}
export {};
//# sourceMappingURL=TrueSheet.d.ts.map