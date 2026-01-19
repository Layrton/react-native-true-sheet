"use strict";

import { createElement, Fragment, forwardRef, isValidElement, useCallback, useContext, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter, BottomSheetHandle, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { BottomSheetContext, getPresent, getDismiss, getResize, getDismissAll } from "./TrueSheetProvider.web.js";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const DEFAULT_CORNER_RADIUS = 16;
const DEFAULT_ELEVATION = 4;
const DEFAULT_GRABBER_COLOR = 'rgba(0, 0, 0, 0.3)';
const DEFAULT_GRABBER_WIDTH = 32;
const DEFAULT_GRABBER_HEIGHT = 4;

/**
 * Converts elevation to CSS box-shadow based on Material Design 3 elevation system.
 * Uses a combination of ambient and key shadows for realistic depth.
 */
const getElevationShadow = elevation => {
  if (elevation <= 0) return 'none';
  const ambientY = elevation * 0.5;
  const ambientBlur = elevation * 1.5;
  const ambientOpacity = 0.08 + elevation * 0.01;
  const keyY = elevation;
  const keyBlur = elevation * 2;
  const keyOpacity = 0.12 + elevation * 0.02;
  return `0px ${ambientY}px ${ambientBlur}px rgba(0, 0, 0, ${ambientOpacity}), 0px ${keyY}px ${keyBlur}px rgba(0, 0, 0, ${keyOpacity})`;
};
const renderSlot = slot => {
  if (!slot) return null;
  if (/*#__PURE__*/isValidElement(slot)) return slot;
  return /*#__PURE__*/createElement(slot);
};
const TrueSheetComponent = /*#__PURE__*/forwardRef((props, ref) => {
  const {
    name,
    detents = [0.5, 1],
    dismissible = true,
    draggable = true,
    dimmed = true,
    dimmedDetentIndex = 0,
    children,
    scrollable = false,
    initialDetentIndex = -1,
    backgroundColor = '#ffffff',
    cornerRadius = DEFAULT_CORNER_RADIUS,
    elevation = DEFAULT_ELEVATION,
    grabber = true,
    grabberOptions,
    maxHeight,
    header,
    headerStyle,
    footer,
    footerStyle,
    onMount,
    onWillPresent,
    onDidPresent,
    onWillDismiss,
    onDidDismiss,
    onDetentChange,
    onPositionChange,
    onDragBegin,
    onDragChange,
    onDragEnd,
    onWillFocus,
    onDidFocus,
    onWillBlur,
    onDidBlur,
    stackBehavior = 'switch',
    style
  } = props;
  const {
    height: windowHeight
  } = useWindowDimensions();
  const defaultName = useId();
  const sheetName = name ?? defaultName;
  const bottomSheetContext = useContext(BottomSheetContext);
  const bottomSheetModalRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const initialDetentIndexRef = useRef(initialDetentIndex);
  const currentIndexRef = useRef(0);
  const isPresenting = useRef(false);
  const isDismissing = useRef(false);
  const isMinimized = useRef(false);
  const isDragging = useRef(false);
  const presentResolver = useRef(null);
  const dismissResolver = useRef(null);
  const animatedPosition = useSharedValue(windowHeight);
  const animatedIndex = useSharedValue(0);
  const [snapIndex, setSnapIndex] = useState(initialDetentIndex);
  const [isMounted, setIsMounted] = useState(false);
  const isNonModal = stackBehavior === 'none';
  useDerivedValue(() => {
    onPositionChange?.({
      nativeEvent: {
        position: animatedPosition.value,
        index: animatedIndex.value,
        detent: detents[animatedIndex.value] ?? 0,
        realtime: true
      }
    });
  });
  const hasAutoDetent = detents.includes('auto');
  const containerHeight = maxHeight ?? windowHeight;
  const snapPoints = useMemo(() => detents.filter(detent => detent !== 'auto' && typeof detent === 'number').map(detent => Math.min(1, Math.max(0.1, detent)) * containerHeight), [detents, containerHeight]);
  const handleChange = useCallback((index, _position, _type) => {
    const previousIndex = currentIndexRef.current;
    currentIndexRef.current = index;

    // Handle drag end
    if (isDragging.current && !isPresenting.current) {
      isDragging.current = false;
      onDragEnd?.({
        nativeEvent: {
          index,
          position: animatedPosition.value,
          detent: detents[index] ?? 0
        }
      });
    }
    if (!isPresenting.current && !isMinimized.current && previousIndex !== index && index >= 0) {
      onDetentChange?.({
        nativeEvent: {
          index,
          position: animatedPosition.value,
          detent: detents[index] ?? 0
        }
      });
    }
    if (isPresenting.current) {
      isPresenting.current = false;

      // Resolve present promise
      if (presentResolver.current) {
        presentResolver.current();
        presentResolver.current = null;
      }
      onDidPresent?.({
        nativeEvent: {
          index,
          position: animatedPosition.value,
          detent: detents[index] ?? 0
        }
      });
      onDidFocus?.({
        nativeEvent: null
      });
    }

    // Fire onDidBlur when sheet reaches minimized state (index -1 but still mounted)
    if (isMinimized.current && index === -1) {
      onDidBlur?.({
        nativeEvent: null
      });
    }

    // Fire onDidFocus when sheet is restored from minimized state
    if (isMinimized.current && index >= 0) {
      isMinimized.current = false;
      onDidFocus?.({
        nativeEvent: null
      });
    }
  }, [detents, animatedPosition]);
  const handleDismiss = useCallback(() => {
    // Remove from stack when dismissed
    bottomSheetContext?.removeFromStack(sheetName);

    // Resolve dismiss promise
    if (dismissResolver.current) {
      dismissResolver.current();
      dismissResolver.current = null;
    }
    onDidDismiss?.({
      nativeEvent: null
    });

    // Reset states since sheet is being dismissed
    isMinimized.current = false;
    isDismissing.current = false;
    isDragging.current = false;
  }, [sheetName]);
  const handleAnimate = useCallback((_fromIndex, toIndex) => {
    // Detect drag begin (when not presenting or dismissing)
    if (!isPresenting.current && !isDismissing.current && !isDragging.current && toIndex >= 0) {
      isDragging.current = true;
      onDragBegin?.({
        nativeEvent: {
          index: currentIndexRef.current,
          position: animatedPosition.value,
          detent: detents[currentIndexRef.current] ?? 0
        }
      });
    }

    // Drag change during animation
    if (isDragging.current && toIndex >= 0) {
      onDragChange?.({
        nativeEvent: {
          index: toIndex,
          position: animatedPosition.value,
          detent: detents[toIndex] ?? 0
        }
      });
    }
    if (isPresenting.current) {
      onWillPresent?.({
        nativeEvent: {
          index: toIndex,
          position: animatedPosition.value,
          detent: detents[toIndex] ?? 0
        }
      });

      // Focus events fire together with present events
      onWillFocus?.({
        nativeEvent: null
      });
    }

    // Detect if sheet is being restored (will focus)
    if (isMinimized.current && toIndex >= 0) {
      onWillFocus?.({
        nativeEvent: null
      });
    }
    if (toIndex === -1 && !isPresenting.current) {
      // Will be handled as blur if the sheet doesn't actually dismiss
      isMinimized.current = true;
      onWillBlur?.({
        nativeEvent: null
      });
      onWillDismiss?.({
        nativeEvent: null
      });
    }
  }, [detents, animatedPosition]);
  const backdropComponent = useCallback(backdropProps => {
    if (!dimmed) {
      return null;
    }
    return /*#__PURE__*/_jsx(BottomSheetBackdrop, {
      ...backdropProps,
      opacity: 0.5,
      appearsOnIndex: dimmedDetentIndex,
      disappearsOnIndex: dimmedDetentIndex - 1,
      pressBehavior: dismissible ? 'close' : 'none'
    });
  }, [dimmed, dimmedDetentIndex, dismissible]);
  const handleComponent = useCallback(handleProps => {
    if (!grabber) {
      return null;
    }
    const height = grabberOptions?.height ?? DEFAULT_GRABBER_HEIGHT;
    const borderRadius = grabberOptions?.cornerRadius ?? height / 2;
    return /*#__PURE__*/_jsx(BottomSheetHandle, {
      ...handleProps,
      style: [styles.handle, {
        paddingTop: grabberOptions?.topMargin
      }],
      indicatorStyle: {
        height,
        borderRadius,
        width: grabberOptions?.width ?? DEFAULT_GRABBER_WIDTH,
        backgroundColor: grabberOptions?.color ?? DEFAULT_GRABBER_COLOR
      }
    });
  }, [grabber, grabberOptions]);
  const footerComponent = useMemo(() => footer ? footerProps => /*#__PURE__*/_jsx(BottomSheetFooter, {
    style: StyleSheet.flatten([styles.footer, footerStyle]),
    ...footerProps,
    children: renderSlot(footer)
  }) : undefined, [footer, footerStyle]);

  // For scrollable, we render the child directly
  const ContainerComponent = scrollable ? Fragment : BottomSheetView;
  const dismissInternal = useCallback(() => {
    return new Promise(resolve => {
      dismissResolver.current = resolve;
      isDismissing.current = true;
      if (isNonModal) {
        bottomSheetRef.current?.close();
      } else {
        bottomSheetModalRef.current?.dismiss();
      }
    });
  }, [isNonModal]);
  const sheetMethodsRef = useRef({
    present: (index = 0) => {
      return new Promise(resolve => {
        presentResolver.current = resolve;
        setSnapIndex(index);
        isPresenting.current = true;
        if (isNonModal) {
          bottomSheetRef.current?.snapToIndex(index);
        } else {
          bottomSheetContext?.pushToStack(sheetName);
          bottomSheetModalRef.current?.present();
        }
      });
    },
    dismiss: () => {
      return new Promise(resolve => {
        // iOS-like behavior: dismiss sheets above, but not itself.
        // See: https://developer.apple.com/documentation/uikit/uiviewcontroller/1621505-dismiss
        const sheetsAbove = bottomSheetContext?.getSheetsAbove(sheetName) ?? [];
        const immediateChild = sheetsAbove[sheetsAbove.length - 1];
        if (immediateChild) {
          // Dismiss the immediate child - gorhom will dismiss all sheets above it
          bottomSheetContext?.dismissDirect(immediateChild).then(resolve);
          return;
        }
        dismissInternal().then(resolve);
      });
    },
    dismissDirect: () => dismissInternal(),
    resize: async index => {
      if (isNonModal) {
        bottomSheetRef.current?.snapToIndex(index);
      } else {
        bottomSheetModalRef.current?.snapToIndex(index);
      }
    }
  });
  useImperativeHandle(ref, () => sheetMethodsRef.current);

  // Register with context provider
  useEffect(() => {
    bottomSheetContext?.register(sheetName, sheetMethodsRef);
    return () => {
      bottomSheetContext?.unregister(sheetName);
    };
  }, [sheetName]);

  // Auto-present on mount if initialDetentIndex is set
  useEffect(() => {
    if (initialDetentIndexRef.current >= 0) {
      sheetMethodsRef.current.present(initialDetentIndexRef.current);
    }
  }, []);

  // Handle mount event after first render
  useEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
      onMount?.({
        nativeEvent: null
      });
    }
  }, [isMounted, onMount]);
  const sheetContent = /*#__PURE__*/_jsxs(ContainerComponent, {
    children: [header && /*#__PURE__*/_jsx(View, {
      style: headerStyle,
      children: renderSlot(header)
    }), scrollable ? children : /*#__PURE__*/_jsx(View, {
      style: style,
      children: children
    })]
  });
  const sharedProps = {
    style: [styles.root, {
      backgroundColor,
      borderTopLeftRadius: cornerRadius,
      borderTopRightRadius: cornerRadius,
      boxShadow: getElevationShadow(elevation)
    }],
    index: snapIndex,
    enablePanDownToClose: dismissible,
    enableContentPanningGesture: draggable,
    enableHandlePanningGesture: draggable,
    animatedPosition,
    animatedIndex,
    handleComponent,
    onChange: handleChange,
    onAnimate: handleAnimate,
    enableDynamicSizing: hasAutoDetent,
    maxDynamicContentSize: maxHeight,
    snapPoints: snapPoints.length > 0 ? snapPoints : undefined,
    backdropComponent,
    backgroundComponent: null,
    footerComponent
  };
  if (isNonModal) {
    return /*#__PURE__*/_jsx(BottomSheet, {
      ref: bottomSheetRef,
      onClose: handleDismiss,
      ...sharedProps,
      children: sheetContent
    });
  }
  return /*#__PURE__*/_jsx(BottomSheetModal, {
    ref: bottomSheetModalRef,
    name: sheetName,
    animateOnMount: true,
    onDismiss: handleDismiss,
    stackBehavior: stackBehavior,
    ...sharedProps,
    children: sheetContent
  });
});
export const TrueSheet = TrueSheetComponent;
TrueSheet.present = async (name, index) => {
  const present = getPresent();
  if (!present) {
    throw new Error('TrueSheet.present(): TrueSheetProvider is not mounted.');
  }
  return present(name, index);
};
TrueSheet.dismiss = async name => {
  const dismiss = getDismiss();
  if (!dismiss) {
    throw new Error('TrueSheet.dismiss(): TrueSheetProvider is not mounted.');
  }
  return dismiss(name);
};
TrueSheet.resize = async (name, index) => {
  const resize = getResize();
  if (!resize) {
    throw new Error('TrueSheet.resize(): TrueSheetProvider is not mounted.');
  }
  return resize(name, index);
};
TrueSheet.dismissAll = async () => {
  const dismissAll = getDismissAll();
  if (!dismissAll) {
    throw new Error('TrueSheet.dismissAll(): TrueSheetProvider is not mounted.');
  }
  return dismissAll();
};
const styles = StyleSheet.create({
  root: {
    overflow: 'hidden'
  },
  handle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingVertical: 10,
    pointerEvents: 'none'
  },
  footer: {
    pointerEvents: 'box-none'
  }
});
//# sourceMappingURL=TrueSheet.web.js.map