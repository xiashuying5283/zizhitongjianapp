import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useScriptText } from '@/hooks/useScriptText';
import { Typography } from '@/constants/theme';

type TypographyVariant = keyof typeof Typography;

interface ThemedTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  children?: React.ReactNode;
}

export function ThemedText({
  variant = 'body',
  color,
  style,
  children,
  ...props
}: ThemedTextProps) {
  const { theme } = useTheme();
  const { t } = useScriptText();
  const typographyStyle = Typography[variant];

  const textStyle: TextStyle = {
    ...typographyStyle,
    color: color ?? theme.textPrimary,
  };

  // 如果 children 是字符串，则进行简繁转换
  const processedChildren = typeof children === 'string' ? t(children) : children;

  return (
    <Text style={[textStyle, style]} {...props}>
      {processedChildren}
    </Text>
  );
}
