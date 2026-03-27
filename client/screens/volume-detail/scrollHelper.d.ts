/**
 * 滚动辅助函数类型声明
 * 实际实现由 scrollHelper.web.ts 和 scrollHelper.native.ts 提供
 */

interface ScrollToOptions {
  sectionRef: any;
  scrollViewRef: any;
  scrollContentRef: any;
  onSuccess?: () => void;
  onError?: () => void;
}

export const scrollToSection: (options: ScrollToOptions) => void;
export const findNodeHandle: ((ref: any) => number | null) | null;
