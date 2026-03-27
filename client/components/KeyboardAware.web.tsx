/**
 * KeyboardAware ScrollView - Web 版本
 * 使用普通 ScrollView，避免 findNodeHandle 错误
 */
import React from 'react';
import { ScrollView, FlatList, SectionList } from 'react-native';
import type { ScrollViewProps, FlatListProps, SectionListProps } from 'react-native';

interface ExtraProps {
  extraHeight?: number;
  extraScrollHeight?: number;
  enableOnAndroid?: boolean;
  enableAutomaticScroll?: boolean;
  /** 兼容 native 版本的 innerRef prop */
  innerRef?: React.Ref<any> | ((instance: any) => void);
}

/**
 * 将 innerRef 转换为标准 ref 回调函数
 */
const resolveRef = (
  ref: React.Ref<any> | undefined,
  innerRef: React.Ref<any> | ((instance: any) => void) | undefined
): ((instance: any) => void) | undefined => {
  const finalRef = ref || innerRef;
  if (!finalRef) return undefined;
  if (typeof finalRef === 'function') return finalRef;
  // 如果是 ref 对象，返回一个更新函数
  return (instance: any) => {
    (finalRef as React.MutableRefObject<any>).current = instance;
  };
};

// Web 端直接导出原生组件，并处理 innerRef 到 ref 的转换
export const KeyboardAwareScrollView = React.forwardRef<ScrollView, ScrollViewProps & ExtraProps>(
  (props, ref) => {
    const { innerRef, ...rest } = props;
    const resolvedRef = resolveRef(ref, innerRef);
    return <ScrollView ref={resolvedRef} {...rest} />;
  }
);
KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';

export const KeyboardAwareFlatList = React.forwardRef<FlatList<any>, FlatListProps<any> & ExtraProps>(
  (props, ref) => {
    const { innerRef, ...rest } = props;
    const resolvedRef = resolveRef(ref, innerRef);
    return <FlatList ref={resolvedRef} {...rest} />;
  }
) as React.ComponentType<FlatListProps<any> & ExtraProps>;
KeyboardAwareFlatList.displayName = 'KeyboardAwareFlatList';

export const KeyboardAwareSectionList = React.forwardRef<SectionList<any>, SectionListProps<any> & ExtraProps>(
  (props, ref) => {
    const { innerRef, ...rest } = props;
    const resolvedRef = resolveRef(ref, innerRef);
    return <SectionList ref={resolvedRef} {...rest} />;
  }
) as React.ComponentType<SectionListProps<any> & ExtraProps>;
KeyboardAwareSectionList.displayName = 'KeyboardAwareSectionList';
