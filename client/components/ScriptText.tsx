import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useScriptText } from '@/hooks/useScriptText';

/**
 * 自动根据简繁设置转换文字的 Text 组件
 * 用于替代原生 Text 组件显示中文文字
 */
export function ScriptText(props: TextProps) {
  const { t } = useScriptText();
  const { children, style, ...rest } = props;

  // 如果 children 是字符串，则进行简繁转换
  const processedChildren = typeof children === 'string' ? t(children) : children;

  return (
    <Text style={style} {...rest}>
      {processedChildren}
    </Text>
  );
}
