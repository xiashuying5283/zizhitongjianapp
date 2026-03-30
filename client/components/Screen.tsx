import React, { useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
// 使用平台兼容的 KeyboardAware wrapper
import {
  KeyboardAwareScrollView,
} from './KeyboardAware';

/**
 * # Screen 组件使用指南
 *
 * 核心原则：统一使用手动安全区管理 (padding)，支持沉浸式布局，解决 iOS/Android 状态栏一致性问题。
 *
 * ## preset 页面布局预设：
 * - `preset="fixed"`：固定布局页面。页面内部自身必须带有能够滚动的容器（如 ScrollView / FlatList / WebView），或者页面内容少不需要滚动。
 * - `preset="scroll"`：可滚动页面。自动用 KeyboardAwareScrollView 包裹整个页面，适合长页面、表单页。
 *
 * ## 安全区控制 `safeAreaEdges`
 * - 默认: ['top', 'left', 'right', 'bottom'] (全避让)
 * - 沉浸式 Header: 去掉 'top'
 * - 沉浸式底部（如有固定悬浮按钮）: 去掉 'bottom'
 */
export interface ScreenProps {
  children: React.ReactNode;
  /** 
   * 页面预设行为
   * - 'fixed': 内容不会被额外嵌套滚动组件（如需滚动请在 children 内部提供 ScrollView 等）
   * - 'scroll': 整个页面自动获得滚动和键盘避让能力（使用 KeyboardAwareScrollView包裹）
   * 
   * @default 'fixed'
   */
  preset?: 'fixed' | 'scroll';
  /** 背景色，默认 #fff */
  backgroundColor?: string;
  /**
   * 状态栏样式
   * - 'dark': 黑色文字 (默认)
   * - 'light': 白色文字 (深色背景时用)
   */
  statusBarStyle?: 'auto' | 'inverted' | 'light' | 'dark';
  /**
   * 状态栏背景色
   * - 默认 'transparent' 以支持沉浸式
   * - Android 下如果需要不透明，可传入具体颜色
   */
  statusBarColor?: string;
  /**
   * 安全区避让边
   */
  safeAreaEdges?: Edge[];
  /** 自定义容器样式 */
  style?: ViewStyle;
}

export const Screen = ({
  children,
  preset = 'fixed',
  backgroundColor = '#fff',
  statusBarStyle = 'dark',
  statusBarColor = 'transparent',
  safeAreaEdges = ['top', 'left', 'right', 'bottom'],
  style,
}: ScreenProps) => {
  const insets = useSafeAreaInsets();
  const [keyboardShown, setKeyboardShown] = React.useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvent, () => setKeyboardShown(true));
    const s2 = Keyboard.addListener(hideEvent, () => setKeyboardShown(false));
    return () => { s1.remove(); s2.remove(); };
  }, []);

  // 解析安全区设置
  const hasTop = safeAreaEdges.includes('top');
  const hasBottom = safeAreaEdges.includes('bottom');
  const hasLeft = safeAreaEdges.includes('left');
  const hasRight = safeAreaEdges.includes('right');

  // 强制禁用 iOS 自动调整内容区域，完全由手动 padding 控制，消除系统自动计算带来的多余空白
  const contentInsetBehaviorIOS = 'never';

  const isScroll = preset === 'scroll';

  const wrapperStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: hasTop ? insets.top : 0,
    paddingLeft: hasLeft ? insets.left : 0,
    paddingRight: hasRight ? insets.right : 0,
    // 在 fixed 模式下，底部安全区由 View 自行处理
    // 滚动模式下，底部安全区由 ScrollView contentContainerStyle 处理
    paddingBottom: (!isScroll && hasBottom)
      ? (keyboardShown ? 0 : insets.bottom)
      : 0,
  };

  const containerProps = isScroll ? {
    contentContainerStyle: {
      flexGrow: 1,
      // 滚动模式下，Bottom 安全区由内容容器处理，保证内容能完整显示且不被 Home Indicator 遮挡，同时背景色能延伸到底部
      paddingBottom: hasBottom ? (keyboardShown ? 0 : insets.bottom) : 0,
    },
    keyboardShouldPersistTaps: 'handled' as const,
    showsVerticalScrollIndicator: false,
    keyboardDismissMode: 'on-drag' as const,
    // Native 端额外属性
    ...(Platform.OS !== 'web' ? {
      enableOnAndroid: true,
      extraHeight: 100,
    } : {}),
    // iOS 顶部白条修复：强制不自动添加顶部安全区
    ...(Platform.OS === 'ios'
      ? { contentInsetAdjustmentBehavior: contentInsetBehaviorIOS }
      : {}),
  } : {};

  return (
    // 核心原则：严禁使用 SafeAreaView，统一使用 View + padding 手动管理
    <View style={wrapperStyle}>
      {/* 状态栏配置：强制透明背景 + 沉浸式，以支持背景图延伸 */}
      <StatusBar
        style={statusBarStyle}
        backgroundColor={statusBarColor}
        translucent
      />

      {isScroll ? (
        <KeyboardAwareScrollView style={[styles.innerContainer, style]} {...containerProps}>
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[styles.innerContainer, style]}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  innerContainer: {
    flex: 1,
    // 确保内部容器透明，避免背景色遮挡
    backgroundColor: 'transparent',
  },
});
