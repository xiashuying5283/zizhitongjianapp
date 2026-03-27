/**
 * 滚动辅助函数 - Web 版本
 * Web 端使用 DOM API 实现滚动定位
 */

interface ScrollToOptions {
  sectionRef: any;  // 在 Web 端是 DOM 元素
  scrollViewRef: any;
  scrollContentRef: any;
  onSuccess?: () => void;
  onError?: () => void;
}

export const scrollToSection = ({
  sectionRef,
  scrollViewRef,
  scrollContentRef,
  onSuccess,
  onError,
}: ScrollToOptions): void => {
  // Web 端：sectionRef 是直接的 DOM 元素（不是 { current } 形式）
  const element = sectionRef as HTMLElement | null;

  if (element && element.scrollIntoView) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onSuccess?.();
    return;
  }
  onError?.();
};

// Web 端不需要 findNodeHandle
export const findNodeHandle = null;
