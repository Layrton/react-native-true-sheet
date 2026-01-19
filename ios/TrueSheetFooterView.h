//
//  Created by Jovanni Lo (@lodev09)
//  Copyright (c) 2024-present. All rights reserved.
//
//  This source code is licensed under the MIT license found in the
//  LICENSE file in the root directory of this source tree.
//

#ifdef RCT_NEW_ARCH_ENABLED

#import <React/RCTSurfaceTouchHandler.h>
#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

@class TrueSheetViewController;

NS_ASSUME_NONNULL_BEGIN

@protocol TrueSheetFooterViewDelegate <NSObject>
- (void)footerViewDidChangeBottomInset:(CGFloat)bottomInset;
@end

@interface TrueSheetFooterView : RCTViewComponentView

@property (nonatomic, weak, nullable) id<TrueSheetFooterViewDelegate> delegate;
@property (nonatomic, readonly) CGFloat currentBottomInset;

- (void)setupConstraintsWithHeight:(CGFloat)height;
- (void)setupKeyboardHandler;
- (void)cleanupKeyboardHandler;

@end

NS_ASSUME_NONNULL_END

#endif
