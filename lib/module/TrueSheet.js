"use strict";

import { PureComponent, createRef, isValidElement, createElement } from 'react';
import TrueSheetViewNativeComponent from './fabric/TrueSheetViewNativeComponent';
import TrueSheetContainerViewNativeComponent from './fabric/TrueSheetContainerViewNativeComponent';
import TrueSheetContentViewNativeComponent from './fabric/TrueSheetContentViewNativeComponent';
import TrueSheetHeaderViewNativeComponent from './fabric/TrueSheetHeaderViewNativeComponent';
import TrueSheetFooterViewNativeComponent from './fabric/TrueSheetFooterViewNativeComponent';
import TrueSheetModule from "./specs/NativeTrueSheetModule.js";
import { Platform, StyleSheet, findNodeHandle, processColor } from 'react-native';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const LINKING_ERROR = `The package '@lodev09/react-native-true-sheet' doesn't seem to be linked. Make sure: \n\n` + Platform.select({
  ios: "- You have run 'pod install'\n",
  default: ''
}) + '- You rebuilt the app after installing the package\n' + '- You are not using Expo Go\n' + '- You are using the new architecture (Fabric)\n';
if (!TrueSheetModule) {
  throw new Error(LINKING_ERROR);
}
export class TrueSheet extends PureComponent {
  displayName = 'TrueSheet';
  /**
   * Map of sheet names against their instances.
   */
  static instances = {};

  /**
   * Resolver to be called when mount event is received
   */
  presentationResolver = null;

  /**
   * Tracks if a present operation is in progress
   */
  isPresenting = false;
  constructor(props) {
    super(props);
    this.nativeRef = /*#__PURE__*/createRef();
    this.validateDetents();

    // Lazy load by default, except when initialDetentIndex is set (for auto-presentation)
    const shouldRenderImmediately = props.initialDetentIndex !== undefined && props.initialDetentIndex >= 0;
    this.state = {
      shouldRenderNativeView: shouldRenderImmediately
    };
    this.onMount = this.onMount.bind(this);
    this.onWillDismiss = this.onWillDismiss.bind(this);
    this.onDidDismiss = this.onDidDismiss.bind(this);
    this.onWillPresent = this.onWillPresent.bind(this);
    this.onDidPresent = this.onDidPresent.bind(this);
    this.onDetentChange = this.onDetentChange.bind(this);
    this.onDragBegin = this.onDragBegin.bind(this);
    this.onDragChange = this.onDragChange.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
    this.onPositionChange = this.onPositionChange.bind(this);
    this.onWillFocus = this.onWillFocus.bind(this);
    this.onDidFocus = this.onDidFocus.bind(this);
    this.onWillBlur = this.onWillBlur.bind(this);
    this.onDidBlur = this.onDidBlur.bind(this);
    this.onBackPress = this.onBackPress.bind(this);
  }
  validateDetents() {
    const {
      detents,
      initialDetentIndex
    } = this.props;

    // Warn if detents length exceeds 3
    if (detents && detents.length > 3) {
      console.warn(`TrueSheet: detents array has ${detents.length} items but maximum is 3. Only the first 3 will be used.`);
    }

    // Warn for invalid detent fractions
    if (detents) {
      detents.forEach((detent, index) => {
        if (detent !== 'auto' && typeof detent === 'number') {
          if (detent <= 0 || detent > 1) {
            console.warn(`TrueSheet: detent at index ${index} (${detent}) should be between 0 and 1. It will be clamped.`);
          }
        }
      });
    }

    // Validate initialDetentIndex bounds
    if (initialDetentIndex !== undefined && initialDetentIndex >= 0) {
      const detentsLength = Math.min(detents?.length ?? 2, 3); // Max 3 detents
      if (initialDetentIndex >= detentsLength) {
        throw new Error(`TrueSheet: initialDetentIndex (${initialDetentIndex}) is out of bounds. detents array has ${detentsLength} item(s)`);
      }
    }
  }
  static getInstance(name) {
    const instance = TrueSheet.instances[name];
    if (!instance) {
      console.warn(`Could not find TrueSheet instance with name "${name}". Check your name prop.`);
      return;
    }
    return instance;
  }
  get handle() {
    const nodeHandle = findNodeHandle(this.nativeRef.current);
    if (nodeHandle == null || nodeHandle === -1) {
      throw new Error('Could not get native view tag');
    }
    return nodeHandle;
  }

  /**
   * Present the sheet by given `name` (Promise-based)
   * @param name - Sheet name (must match sheet's name prop)
   * @param index - Detent index (default: 0)
   * @param animated - Whether to animate the presentation (default: true)
   * @returns Promise that resolves when sheet is fully presented
   * @throws Error if sheet not found or presentation fails
   */
  static async present(name, index = 0, animated = true) {
    const instance = TrueSheet.getInstance(name);
    if (!instance) {
      throw new Error(`Sheet with name "${name}" not found`);
    }
    return instance.present(index, animated);
  }

  /**
   * Dismiss the sheet by given `name` (Promise-based)
   * @param name - Sheet name
   * @param animated - Whether to animate the dismissal (default: true)
   * @returns Promise that resolves when sheet is fully dismissed
   * @throws Error if sheet not found or dismissal fails
   */
  static async dismiss(name, animated = true) {
    const instance = TrueSheet.getInstance(name);
    if (!instance) {
      throw new Error(`Sheet with name "${name}" not found`);
    }
    return instance.dismiss(animated);
  }

  /**
   * Resize the sheet by given `name` (Promise-based)
   * @param name - Sheet name
   * @param index - New detent index
   * @returns Promise that resolves when resize is complete
   * @throws Error if sheet not found
   */
  static async resize(name, index) {
    const instance = TrueSheet.getInstance(name);
    if (!instance) {
      throw new Error(`Sheet with name "${name}" not found`);
    }
    return instance.resize(index);
  }

  /**
   * Dismiss all presented sheets by dismissing from the bottom of the stack.
   * This ensures child sheets are dismissed first before their parent.
   * @param animated - Whether to animate the dismissals (default: true)
   * @returns Promise that resolves when all sheets are dismissed
   */
  static async dismissAll(animated = true) {
    return TrueSheetModule?.dismissAll(animated);
  }
  registerInstance() {
    if (this.props.name) {
      TrueSheet.instances[this.props.name] = this;
    }
  }
  unregisterInstance() {
    if (this.props.name) {
      delete TrueSheet.instances[this.props.name];
    }
  }
  onDetentChange(event) {
    this.props.onDetentChange?.(event);
  }
  onWillPresent(event) {
    this.props.onWillPresent?.(event);
  }
  onDidPresent(event) {
    this.props.onDidPresent?.(event);
  }
  onWillDismiss(event) {
    this.props.onWillDismiss?.(event);
  }
  onDidDismiss(event) {
    // Clean up native view after dismiss for lazy loading.
    // Skip unmount if a present is in progress to avoid race condition.
    if (!this.isPresenting) {
      this.setState({
        shouldRenderNativeView: false
      });
    }
    this.props.onDidDismiss?.(event);
  }
  onMount(event) {
    // Resolve the mount promise if waiting
    if (this.presentationResolver) {
      this.presentationResolver();
      this.presentationResolver = null;
    }
    this.props.onMount?.(event);
  }
  onDragBegin(event) {
    this.props.onDragBegin?.(event);
  }
  onDragChange(event) {
    this.props.onDragChange?.(event);
  }
  onDragEnd(event) {
    this.props.onDragEnd?.(event);
  }
  onPositionChange(event) {
    this.props.onPositionChange?.(event);
  }
  onWillFocus(event) {
    this.props.onWillFocus?.(event);
  }
  onDidFocus(event) {
    this.props.onDidFocus?.(event);
  }
  onWillBlur(event) {
    this.props.onWillBlur?.(event);
  }
  onDidBlur(event) {
    this.props.onDidBlur?.(event);
  }
  onBackPress(event) {
    this.props.onBackPress?.(event);
  }
  async present(index = 0, animated = true) {
    const detentsLength = Math.min(this.props.detents?.length ?? 2, 3); // Max 3 detents
    if (index < 0 || index >= detentsLength) {
      throw new Error(`TrueSheet: present index (${index}) is out of bounds. detents array has ${detentsLength} item(s)`);
    }
    this.isPresenting = true;

    // Lazy load: render native view if not already rendered
    if (!this.state.shouldRenderNativeView) {
      await new Promise(resolve => {
        this.presentationResolver = resolve;
        this.setState({
          shouldRenderNativeView: true
        });
      });
    }
    await TrueSheetModule?.presentByRef(this.handle, index, animated);
    this.isPresenting = false;
  }
  async resize(index) {
    await TrueSheetModule?.resizeByRef(this.handle, index);
  }
  async dismiss(animated = true) {
    return TrueSheetModule?.dismissByRef(this.handle, animated);
  }
  componentDidMount() {
    this.registerInstance();
  }
  componentDidUpdate(prevProps) {
    this.registerInstance();

    // Validate when detents prop changes
    if (prevProps.detents !== this.props.detents) {
      this.validateDetents();
    }
  }
  componentWillUnmount() {
    this.unregisterInstance();

    // Clean up presentation resolver
    this.presentationResolver = null;
  }
  render() {
    const {
      detents = [0.5, 1],
      backgroundColor,
      dismissible = true,
      draggable = true,
      grabber = true,
      grabberOptions,
      dimmed = true,
      initialDetentIndex = -1,
      initialDetentAnimated = true,
      dimmedDetentIndex,
      backgroundBlur,
      blurOptions,
      cornerRadius,
      maxHeight,
      scrollable = false,
      scrollableOptions,
      pageSizing = true,
      children,
      style,
      header,
      headerStyle,
      footer,
      footerStyle,
      insetAdjustment = 'automatic',
      ...rest
    } = this.props;

    // Trim to max 3 detents and clamp fractions
    const resolvedDetents = detents.slice(0, 3).map(detent => {
      if (detent === 'auto' || detent === -1) return -1;

      // Default to 0.1 if zero or below
      if (detent <= 0) return 0.1;

      // Clamp to maximum of 1
      return Math.min(1, detent);
    });
    const containerStyle = this.props.scrollable && Platform.select({
      android: styles.scrollableAndroidContainer
    });
    const contentStyle = this.props.scrollable && Platform.select({
      android: styles.scrollableAndroidContent
    });
    return /*#__PURE__*/_jsx(TrueSheetViewNativeComponent, {
      ...rest,
      ref: this.nativeRef,
      style: styles.sheetView,
      detents: resolvedDetents,
      backgroundBlur: backgroundBlur,
      blurOptions: blurOptions,
      backgroundColor: backgroundColor,
      cornerRadius: cornerRadius,
      grabber: grabber,
      grabberOptions: {
        ...grabberOptions,
        color: processColor(grabberOptions?.color)
      },
      dimmed: dimmed,
      dimmedDetentIndex: dimmedDetentIndex,
      initialDetentIndex: initialDetentIndex,
      initialDetentAnimated: initialDetentAnimated,
      dismissible: dismissible,
      draggable: draggable,
      maxHeight: maxHeight,
      scrollable: scrollable,
      scrollableOptions: scrollableOptions,
      pageSizing: pageSizing,
      insetAdjustment: insetAdjustment,
      onMount: this.onMount,
      onWillPresent: this.onWillPresent,
      onDidPresent: this.onDidPresent,
      onWillDismiss: this.onWillDismiss,
      onDidDismiss: this.onDidDismiss,
      onDetentChange: this.onDetentChange,
      onDragBegin: this.onDragBegin,
      onDragChange: this.onDragChange,
      onDragEnd: this.onDragEnd,
      onPositionChange: this.onPositionChange,
      onWillFocus: this.onWillFocus,
      onDidFocus: this.onDidFocus,
      onWillBlur: this.onWillBlur,
      onDidBlur: this.onDidBlur,
      onBackPress: this.onBackPress,
      children: this.state.shouldRenderNativeView && /*#__PURE__*/_jsxs(TrueSheetContainerViewNativeComponent, {
        style: containerStyle,
        children: [header && /*#__PURE__*/_jsx(TrueSheetHeaderViewNativeComponent, {
          style: [styles.header, headerStyle],
          children: /*#__PURE__*/isValidElement(header) ? header : /*#__PURE__*/createElement(header)
        }), /*#__PURE__*/_jsx(TrueSheetContentViewNativeComponent, {
          style: [style, contentStyle],
          children: children
        }), footer && /*#__PURE__*/_jsx(TrueSheetFooterViewNativeComponent, {
          style: [styles.footer, footerStyle],
          children: /*#__PURE__*/isValidElement(footer) ? footer : /*#__PURE__*/createElement(footer)
        })]
      })
    });
  }
}
const styles = StyleSheet.create({
  sheetView: {
    zIndex: -9999,
    pointerEvents: 'box-none',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Android needs a fixed bottom to avoid jumping content
    bottom: Platform.select({
      android: 0
    })
  },
  scrollableAndroidContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  scrollableAndroidContent: {
    flexGrow: 1,
    flexBasis: 0
  },
  header: {
    pointerEvents: 'box-none'
  },
  footer: {
    pointerEvents: 'box-none',
    position: 'absolute',
    left: 0,
    right: 0
  }
});
//# sourceMappingURL=TrueSheet.js.map