/**
 * KeyboardAware ScrollView - Native 版本
 * 使用 react-native-keyboard-aware-scroll-view
 */
import React from 'react';
import {
  KeyboardAwareScrollView as NativeKeyboardAwareScrollView,
  KeyboardAwareFlatList as NativeKeyboardAwareFlatList,
  KeyboardAwareSectionList as NativeKeyboardAwareSectionList,
} from 'react-native-keyboard-aware-scroll-view';

// 包装组件以确保 innerRef 正确传递
const wrapWithInnerRef = <T extends React.ComponentType<any>>(Component: T, displayName: string): T => {
  const WrappedComponent = React.forwardRef<any, any>((props, ref) => {
    // 排除 key 属性，避免与父级传递的 key 冲突
    const { innerRef, key: _, ...rest } = props;
    
    // 合并 ref 和 innerRef
    const handleRef = (instance: any) => {
      // 更新 forwardRef
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref) {
        (ref as React.MutableRefObject<any>).current = instance;
      }
      // 调用 innerRef
      if (typeof innerRef === 'function') {
        innerRef(instance);
      }
    };

    // 使用 any 类型绕过类型检查
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return React.createElement(Component as any, { ...rest, innerRef: handleRef });
  });
  
  WrappedComponent.displayName = displayName;
  return WrappedComponent as unknown as T;
};

export const KeyboardAwareScrollView = wrapWithInnerRef(NativeKeyboardAwareScrollView, 'KeyboardAwareScrollView');
export const KeyboardAwareFlatList = wrapWithInnerRef(NativeKeyboardAwareFlatList, 'KeyboardAwareFlatList');
export const KeyboardAwareSectionList = wrapWithInnerRef(NativeKeyboardAwareSectionList, 'KeyboardAwareSectionList');
