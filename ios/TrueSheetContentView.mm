//
//  Created by Jovanni Lo (@lodev09)
//  Copyright (c) 2024-present. All rights reserved.
//
//  This source code is licensed under the MIT license found in the
//  LICENSE file in the root directory of this source tree.
//

#ifdef RCT_NEW_ARCH_ENABLED

#import "TrueSheetContentView.h"
#import "TrueSheetView.h"
#import "TrueSheetViewController.h"
#import "utils/LayoutUtil.h"
#import "utils/UIView+FirstResponder.h"
#import <React/RCTScrollViewComponentView.h>
#import <react/renderer/components/TrueSheetSpec/ComponentDescriptors.h>
#import <react/renderer/components/TrueSheetSpec/EventEmitters.h>
#import <react/renderer/components/TrueSheetSpec/Props.h>
#import <react/renderer/components/TrueSheetSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

static NSString *const TrueSheetDisableFooterInsetFixKey = @"TrueSheetDisableFooterInsetFix";
static CGFloat const kScrollVisibilityBuffer = 30.0;

@implementation TrueSheetContentView {
  RCTScrollViewComponentView *_pinnedScrollView;
  UIView *_pinnedTopView;
  CGSize _lastSize;
  UIEdgeInsets _contentInsets;
  UIEdgeInsets _pinnedInsets;
  CGFloat _footerHeight;
  CGFloat _appliedFooterInset;
  UIScrollViewContentInsetAdjustmentBehavior _originalAdjustmentBehavior;
  BOOL _didOverrideAdjustmentBehavior;
  CGFloat _keyboardHeight;
  BOOL _isObservingKeyboard;
  CGFloat _lastSetContentInset;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<TrueSheetContentViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const TrueSheetContentViewProps>();
    _props = defaultProps;
    _footerHeight = 0;
    _appliedFooterInset = 0;
    _didOverrideAdjustmentBehavior = NO;
    _keyboardHeight = 0;
    _isObservingKeyboard = NO;
    _lastSetContentInset = -1;
  }
  return self;
}

- (BOOL)isFooterInsetFixDisabled {
  id plistValue = [[NSBundle mainBundle] objectForInfoDictionaryKey:TrueSheetDisableFooterInsetFixKey];
  if ([plistValue isKindOfClass:[NSNumber class]]) {
    return ((NSNumber *)plistValue).boolValue;
  }
  return NO;
}

#pragma mark - Layout

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics
           oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];

  UIEdgeInsets newInsets = UIEdgeInsetsMake(layoutMetrics.contentInsets.top, layoutMetrics.contentInsets.left,
    layoutMetrics.contentInsets.bottom, layoutMetrics.contentInsets.right);

  if (!UIEdgeInsetsEqualToEdgeInsets(newInsets, _contentInsets)) {
    _contentInsets = newInsets;
    [self.delegate contentViewDidChangeInsets];
  }

  CGSize newSize = CGSizeMake(layoutMetrics.frame.size.width, layoutMetrics.frame.size.height);
  if (!CGSizeEqualToSize(newSize, _lastSize)) {
    _lastSize = newSize;
    [self.delegate contentViewDidChangeSize:newSize];
  }
}

#pragma mark - Child Mounting

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index {
  [super mountChildComponentView:childComponentView index:index];
  [self.delegate contentViewDidChangeChildren];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index {
  [super unmountChildComponentView:childComponentView index:index];
  [self.delegate contentViewDidChangeChildren];
}

#pragma mark - ScrollView Pinning

- (void)clearPinning {
  [self cleanupKeyboardObserver];
  if (_pinnedScrollView) {
    if (_didOverrideAdjustmentBehavior) {
      _pinnedScrollView.scrollView.contentInsetAdjustmentBehavior = _originalAdjustmentBehavior;
      _didOverrideAdjustmentBehavior = NO;
    }
    if (_appliedFooterInset > 0) {
      UIScrollView *scrollView = _pinnedScrollView.scrollView;
      UIEdgeInsets contentInset = scrollView.contentInset;
      contentInset.bottom = MAX(0, contentInset.bottom - _appliedFooterInset);
      scrollView.contentInset = contentInset;

      UIEdgeInsets indicatorInset = scrollView.scrollIndicatorInsets;
      indicatorInset.bottom = MAX(0, indicatorInset.bottom - _appliedFooterInset);
      scrollView.scrollIndicatorInsets = indicatorInset;

      _appliedFooterInset = 0;
    }
    [LayoutUtil unpinView:_pinnedScrollView fromParentView:self];
    [LayoutUtil unpinView:_pinnedScrollView fromParentView:self.superview];
  }
  _pinnedScrollView = nil;
  _pinnedTopView = nil;
  _pinnedInsets = UIEdgeInsetsZero;
  _lastSetContentInset = -1;
}

- (void)setupScrollViewPinning:(BOOL)pinned {
  UIView *containerView = self.superview;

  if (!pinned) {
    [self clearPinning];
    return;
  }

  UIView *topSibling = nil;
  RCTScrollViewComponentView *scrollView = [self findScrollView:&topSibling];

  BOOL needsUpdate = scrollView != _pinnedScrollView || topSibling != _pinnedTopView ||
                     !UIEdgeInsetsEqualToEdgeInsets(_contentInsets, _pinnedInsets);

  if (scrollView && containerView && needsUpdate) {
    [self clearPinning];

    UIEdgeInsets insets =
      UIEdgeInsetsMake(topSibling ? 0 : _contentInsets.top, _contentInsets.left, 0, _contentInsets.right);

    if (topSibling) {
      [LayoutUtil pinView:scrollView
             toParentView:self
              withTopView:topSibling
                    edges:UIRectEdgeLeft | UIRectEdgeRight
                   insets:insets];
    } else {
      [LayoutUtil pinView:scrollView
             toParentView:self
                    edges:UIRectEdgeTop | UIRectEdgeLeft | UIRectEdgeRight
                   insets:insets];
    }

    [LayoutUtil pinView:scrollView toParentView:containerView edges:UIRectEdgeBottom];

    _pinnedScrollView = scrollView;
    _pinnedTopView = topSibling;
    _pinnedInsets = _contentInsets;

    [self applyFooterSafeArea];
    [self setupKeyboardObserver];
  } else if (!scrollView && _pinnedScrollView) {
    [self clearPinning];
  }
}

#pragma mark - Footer Safe Area

- (void)setupKeyboardObserver {
  if (_isObservingKeyboard) {
    return;
  }
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(keyboardWillChangeFrame:)
                                               name:UIKeyboardWillChangeFrameNotification
                                             object:nil];
  _isObservingKeyboard = YES;
}

- (void)cleanupKeyboardObserver {
  if (!_isObservingKeyboard) {
    return;
  }
  [[NSNotificationCenter defaultCenter] removeObserver:self
                                                  name:UIKeyboardWillChangeFrameNotification
                                                object:nil];
  _isObservingKeyboard = NO;
  _keyboardHeight = 0;
}

- (void)applyFooterInsetsToScrollView {
  if (!_pinnedScrollView) {
    return;
  }

  UIScrollView *scrollView = _pinnedScrollView.scrollView;
  CGFloat currentBottom = scrollView.contentInset.bottom;
  CGFloat targetFooterInset = _footerHeight;

  CGFloat baseInset;

  if (_lastSetContentInset < 0) {
    baseInset = currentBottom;
  } else if (fabs(currentBottom - _lastSetContentInset) > 0.5) {
    baseInset = currentBottom;
  } else {
    baseInset = currentBottom - _appliedFooterInset;
  }

  CGFloat targetBottom = baseInset + targetFooterInset;

  UIEdgeInsets targetContentInset = scrollView.contentInset;
  targetContentInset.bottom = targetBottom;

  UIEdgeInsets targetIndicatorInsets = scrollView.scrollIndicatorInsets;
  targetIndicatorInsets.bottom = targetBottom;

  if ([self isFooterInsetFixDisabled]) {
    return;
  }

  if (!UIEdgeInsetsEqualToEdgeInsets(scrollView.contentInset, targetContentInset)) {
    scrollView.contentInset = targetContentInset;
  }

  if (!UIEdgeInsetsEqualToEdgeInsets(scrollView.scrollIndicatorInsets, targetIndicatorInsets)) {
    scrollView.scrollIndicatorInsets = targetIndicatorInsets;
  }

  _appliedFooterInset = targetFooterInset;
  _lastSetContentInset = targetBottom;
}

- (BOOL)isFirstResponderWithinSheet {
  TrueSheetViewController *sheetController = [self findSheetViewController];
  if (!sheetController) {
    return NO;
  }
  UIView *firstResponder = [sheetController.view findFirstResponder];
  return firstResponder != nil;
}

- (void)keyboardWillChangeFrame:(NSNotification *)notification {
  if (!_pinnedScrollView) {
    return;
  }

  TrueSheetViewController *sheetController = [self findSheetViewController];
  if (sheetController && !sheetController.isTopmostPresentedController) {
    return;
  }

  if (![self isFirstResponderWithinSheet]) {
    return;
  }

  NSDictionary *userInfo = notification.userInfo;
  CGRect keyboardFrame = [userInfo[UIKeyboardFrameEndUserInfoKey] CGRectValue];
  UIWindow *window = self.window;
  if (!window) {
    return;
  }

  CGRect keyboardFrameInWindow = [window convertRect:keyboardFrame fromWindow:nil];
  CGFloat keyboardHeight = window.bounds.size.height - keyboardFrameInWindow.origin.y;

  _keyboardHeight = MAX(0, keyboardHeight);

  UIView *firstResponder = [[self findSheetViewController].view findFirstResponder];
  if (firstResponder) {
    __weak __typeof(self) weakSelf = self;
    dispatch_async(dispatch_get_main_queue(), ^{
      __strong __typeof(weakSelf) strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_pinnedScrollView) {
        return;
      }

      [strongSelf applyFooterInsetsToScrollView];

      UIView *responder = [[strongSelf findSheetViewController].view findFirstResponder];
      if (responder) {
        UIScrollView *scrollView = strongSelf->_pinnedScrollView.scrollView;

        CGFloat currentInsetBottom = scrollView.contentInset.bottom;
        CGFloat systemComfortPadding = MAX(0, currentInsetBottom - strongSelf->_footerHeight - strongSelf->_keyboardHeight);

        CGFloat extraBuffer = MAX(0, kScrollVisibilityBuffer - systemComfortPadding);

        CGRect responderRect = [responder convertRect:responder.bounds toView:scrollView];

        if (extraBuffer > 0) {
          responderRect.size.height += extraBuffer;
        }

        [scrollView scrollRectToVisible:responderRect animated:YES];
      }
    });
  }
}

- (TrueSheetViewController *)findSheetViewController {
  UIResponder *responder = self;
  while (responder) {
    if ([responder isKindOfClass:[TrueSheetViewController class]]) {
      return (TrueSheetViewController *)responder;
    }
    responder = responder.nextResponder;
  }
  return nil;
}

- (void)setFooterHeight:(CGFloat)footerHeight {
  if (_footerHeight == footerHeight) {
    [self applyFooterSafeArea];
    return;
  }
  _footerHeight = footerHeight;
  [self applyFooterSafeArea];
}

- (void)applyFooterSafeArea {
  BOOL isDisabled = [self isFooterInsetFixDisabled];

  TrueSheetViewController *sheetVC = [self findSheetViewController];
  if (sheetVC) {
    UIEdgeInsets currentInsets = sheetVC.additionalSafeAreaInsets;
    if (fabs(currentInsets.bottom - _footerHeight) > 0.5) {
      if (!isDisabled) {
        sheetVC.additionalSafeAreaInsets = UIEdgeInsetsMake(
            currentInsets.top, currentInsets.left, _footerHeight, currentInsets.right);
      }
    }
  }

  if (_pinnedScrollView) {
    UIScrollView *scrollView = _pinnedScrollView.scrollView;

    if (_footerHeight > 0) {
      if (!_didOverrideAdjustmentBehavior) {
        _originalAdjustmentBehavior = scrollView.contentInsetAdjustmentBehavior;
        _didOverrideAdjustmentBehavior = YES;
      }
      if (!isDisabled) {
        scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentAutomatic;
      }
    } else if (_didOverrideAdjustmentBehavior) {
      if (!isDisabled) {
        scrollView.contentInsetAdjustmentBehavior = _originalAdjustmentBehavior;
      }
      _didOverrideAdjustmentBehavior = NO;
    }
  }

  [self applyFooterInsetsToScrollView];
}

- (RCTScrollViewComponentView *)findScrollView:(UIView **)outTopSibling {
  if (self.subviews.count == 0) {
    return nil;
  }

  RCTScrollViewComponentView *scrollView = [self findScrollViewInSubviews:self.subviews];

  if (!scrollView) {
    for (UIView *subview in self.subviews) {
      scrollView = [self findScrollViewInSubviews:subview.subviews];
      if (scrollView) {
        break;
      }
    }
  }

  if (outTopSibling) {
    *outTopSibling = [self findTopSiblingForScrollView:scrollView];
  }

  return scrollView;
}

- (RCTScrollViewComponentView *)findScrollViewInSubviews:(NSArray<UIView *> *)subviews {
  for (UIView *subview in subviews) {
    if ([subview isKindOfClass:RCTScrollViewComponentView.class] && ![subview isKindOfClass:TrueSheetView.class]) {
      return (RCTScrollViewComponentView *)subview;
    }
  }
  return nil;
}

- (UIView *)findTopSiblingForScrollView:(RCTScrollViewComponentView *)scrollView {
  if (!scrollView || scrollView.superview != self || self.subviews.count <= 1) {
    return nil;
  }

  CGFloat scrollViewTop = CGRectGetMinY(scrollView.frame);
  UIView *topSibling = nil;
  CGFloat closestDistance = CGFLOAT_MAX;

  for (UIView *sibling in self.subviews) {
    if (sibling == scrollView || [sibling isKindOfClass:TrueSheetView.class]) {
      continue;
    }

    CGFloat siblingBottom = CGRectGetMaxY(sibling.frame);
    if (siblingBottom <= scrollViewTop) {
      CGFloat distance = scrollViewTop - siblingBottom;
      if (distance < closestDistance) {
        closestDistance = distance;
        topSibling = sibling;
      }
    }
  }

  return topSibling;
}

#pragma mark - Lifecycle

- (void)prepareForRecycle {
  [super prepareForRecycle];

  TrueSheetViewController *sheetVC = [self findSheetViewController];
  if (sheetVC) {
    UIEdgeInsets currentInsets = sheetVC.additionalSafeAreaInsets;
    sheetVC.additionalSafeAreaInsets = UIEdgeInsetsMake(
        currentInsets.top, currentInsets.left, 0, currentInsets.right);
  }

  [self clearPinning];
  _footerHeight = 0;
  _keyboardHeight = 0;
}

@end

Class<RCTComponentViewProtocol> TrueSheetContentViewCls(void) {
  return TrueSheetContentView.class;
}

#endif
