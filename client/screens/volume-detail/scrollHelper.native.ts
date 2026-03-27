/**
 * 滚动辅助函数 - Native 版本
 * 使用 UIManager.measureLayout 实现滚动定位
 */
import { UIManager, findNodeHandle as rnFindNodeHandle, View, ScrollView } from 'react-native';

interface ScrollToOptions {
  sectionRef: View | React.Component | null;
  scrollViewRef: React.RefObject<ScrollView>;
  scrollContentRef: React.RefObject<View>;
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
  // 详细检查各个 ref
  if (!sectionRef) {
    console.warn('scrollToSection: sectionRef is null');
    onError?.();
    return;
  }
  
  if (!scrollViewRef.current) {
    console.warn('scrollToSection: scrollViewRef.current is null');
    onError?.();
    return;
  }
  
  if (!scrollContentRef.current) {
    console.warn('scrollToSection: scrollContentRef.current is null');
    onError?.();
    return;
  }

  // 获取原生节点句柄
  const sectionHandle = rnFindNodeHandle(sectionRef as View);
  const contentHandle = rnFindNodeHandle(scrollContentRef.current);

  console.log('scrollToSection: handles', { 
    sectionHandle: !!sectionHandle, 
    contentHandle: !!contentHandle 
  });

  if (!sectionHandle) {
    console.warn('scrollToSection: failed to get section node handle');
    onError?.();
    return;
  }

  if (!contentHandle) {
    console.warn('scrollToSection: failed to get content node handle');
    onError?.();
    return;
  }

  // 使用 UIManager.measureLayout 计算相对位置
  // 参数: (nodeHandle, relativeToNodeHandle, onError, onSuccess)
  try {
    UIManager.measureLayout(
      sectionHandle,
      contentHandle,
      () => {
        console.warn('scrollToSection: measureLayout failed');
        onError?.();
      },
      (left, top, width, height) => {
        console.log('scrollToSection: success', { left, top, width, height });
        // top 是目标元素相对于 scrollContent 的 Y 坐标
        const scrollToY = Math.max(0, top - 80);
        scrollViewRef.current?.scrollTo({ y: scrollToY, animated: true });
        onSuccess?.();
      }
    );
  } catch (error) {
    console.error('scrollToSection: exception', error);
    onError?.();
  }
};

export { rnFindNodeHandle as findNodeHandle };
