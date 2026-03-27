/**
 * KeyboardAware ScrollView 类型声明
 * 实际实现由 KeyboardAware.web.tsx 和 KeyboardAware.native.tsx 提供
 */
import type { ScrollViewProps, FlatListProps, SectionListProps } from 'react-native';

interface ExtraProps {
  extraHeight?: number;
  extraScrollHeight?: number;
  enableOnAndroid?: boolean;
  enableAutomaticScroll?: boolean;
}

export const KeyboardAwareScrollView: React.ComponentType<ScrollViewProps & ExtraProps>;
export const KeyboardAwareFlatList: React.ComponentType<FlatListProps<any> & ExtraProps>;
export const KeyboardAwareSectionList: React.ComponentType<SectionListProps<any> & ExtraProps>;
