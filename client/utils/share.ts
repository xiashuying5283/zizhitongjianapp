import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Linking, Alert, Platform } from 'react-native';

/**
 * 分享内容配置
 */
interface ShareContent {
  title: string;
  message: string;
  url?: string;
}

/**
 * 应用信息
 */
const APP_INFO = {
  name: '资治通鉴阅读',
  description: '一部贯通古今的历史巨著，让我们一起品读《资治通鉴》',
  downloadUrl: 'https://example.com/download',
};

/**
 * 检查是否在 Expo Go 环境中运行
 */
function isExpoGo(): boolean {
  // Expo Go 环境检测
  const expo = (globalThis as any).expo;
  return !!expo?.modules?.ExponentConstants?.appOwnership;
}

/**
 * 使用系统分享面板分享内容
 */
export async function shareWithSystem(content: ShareContent): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('提示', '当前设备不支持分享功能');
      return false;
    }

    // 构建分享内容
    const shareMessage = content.url 
      ? `${content.title}\n${content.message}\n${content.url}`
      : `${content.title}\n${content.message}`;

    // 复制到剪贴板作为备用方案
    await Clipboard.setStringAsync(shareMessage);
    
    Alert.alert(
      '分享内容已复制',
      '内容已复制到剪贴板，您可以打开微信或微博粘贴分享',
      [
        { text: '知道了', style: 'cancel' },
        { text: '打开微信', onPress: () => openWechat() },
        { text: '打开微博', onPress: () => openWeibo() },
      ]
    );
    return true;
  } catch (error) {
    console.error('Share error:', error);
    Alert.alert('分享失败', '请稍后重试');
    return false;
  }
}

/**
 * 分享到微信
 */
export async function shareToWechat(content: ShareContent): Promise<boolean> {
  try {
    const shareMessage = content.url 
      ? `${content.title}\n${content.message}\n${content.url}`
      : `${content.title}\n${content.message}`;

    // 先复制内容到剪贴板
    await Clipboard.setStringAsync(shareMessage);

    // 在 Expo Go 中无法直接打开其他应用
    if (isExpoGo()) {
      Alert.alert(
        '内容已复制',
        '分享内容已复制到剪贴板，请打开微信粘贴分享。\n\n提示：在独立App中可直接跳转微信。',
        [
          { text: '知道了', style: 'cancel' },
        ]
      );
      return true;
    }

    if (Platform.OS === 'android') {
      // Android 尝试直接打开微信
      const canOpen = await Linking.canOpenURL('weixin://');
      if (canOpen) {
        Alert.alert(
          '内容已复制',
          '分享内容已复制到剪贴板，打开微信后粘贴发送即可',
          [
            { text: '取消', style: 'cancel' },
            { 
              text: '打开微信', 
              onPress: async () => {
                try {
                  await Linking.openURL('weixin://');
                } catch {
                  Alert.alert('提示', '打开微信失败，请手动打开微信');
                }
              }
            },
          ]
        );
        return true;
      }
    }

    if (Platform.OS === 'ios') {
      // iOS 尝试打开微信
      const canOpen = await Linking.canOpenURL('weixin://');
      if (canOpen) {
        Alert.alert(
          '内容已复制',
          '分享内容已复制到剪贴板，打开微信后粘贴发送即可',
          [
            { text: '取消', style: 'cancel' },
            { 
              text: '打开微信', 
              onPress: async () => {
                try {
                  await Linking.openURL('weixin://');
                } catch {
                  Alert.alert('提示', '打开微信失败，请手动打开微信');
                }
              }
            },
          ]
        );
        return true;
      }
    }

    // 无法打开微信，提示用户手动操作
    Alert.alert(
      '内容已复制',
      '分享内容已复制到剪贴板，请手动打开微信粘贴分享',
      [{ text: '知道了' }]
    );
    return true;
  } catch (error) {
    console.error('Share to WeChat error:', error);
    return shareWithSystem(content);
  }
}

/**
 * 分享到微博
 */
export async function shareToWeibo(content: ShareContent): Promise<boolean> {
  try {
    const shareMessage = content.url 
      ? `${content.title} ${content.message} ${content.url}`
      : `${content.title} ${content.message}`;

    // 先复制内容到剪贴板
    await Clipboard.setStringAsync(shareMessage);

    // 在 Expo Go 中无法直接打开其他应用
    if (isExpoGo()) {
      Alert.alert(
        '内容已复制',
        '分享内容已复制到剪贴板，请打开微博粘贴分享。\n\n提示：在独立App中可直接跳转微博。',
        [
          { text: '知道了', style: 'cancel' },
        ]
      );
      return true;
    }

    if (Platform.OS === 'android') {
      const canOpen = await Linking.canOpenURL('weibo://');
      if (canOpen) {
        Alert.alert(
          '内容已复制',
          '分享内容已复制到剪贴板，打开微博后粘贴发布即可',
          [
            { text: '取消', style: 'cancel' },
            { 
              text: '打开微博', 
              onPress: async () => {
                try {
                  await Linking.openURL('weibo://');
                } catch {
                  Alert.alert('提示', '打开微博失败，请手动打开微博');
                }
              }
            },
          ]
        );
        return true;
      }
    }

    if (Platform.OS === 'ios') {
      const canOpen = await Linking.canOpenURL('weibo://');
      if (canOpen) {
        Alert.alert(
          '内容已复制',
          '分享内容已复制到剪贴板，打开微博后粘贴发布即可',
          [
            { text: '取消', style: 'cancel' },
            { 
              text: '打开微博', 
              onPress: async () => {
                try {
                  await Linking.openURL('weibo://');
                } catch {
                  Alert.alert('提示', '打开微博失败，请手动打开微博');
                }
              }
            },
          ]
        );
        return true;
      }
    }

    // 无法打开微博，提示用户手动操作
    Alert.alert(
      '内容已复制',
      '分享内容已复制到剪贴板，请手动打开微博粘贴分享',
      [{ text: '知道了' }]
    );
    return true;
  } catch (error) {
    console.error('Share to Weibo error:', error);
    return shareWithSystem(content);
  }
}

/**
 * 打开微信
 */
export async function openWechat(): Promise<boolean> {
  try {
    // 在 Expo Go 中无法直接打开其他应用
    if (isExpoGo()) {
      Alert.alert(
        '提示',
        '在 Expo Go 环境中无法直接跳转到微信。\n\n请手动打开微信，或构建独立App后使用此功能。'
      );
      return false;
    }

    if (Platform.OS === 'android') {
      const canOpen = await Linking.canOpenURL('weixin://');
      if (canOpen) {
        await Linking.openURL('weixin://');
        return true;
      }
    }

    if (Platform.OS === 'ios') {
      const canOpen = await Linking.canOpenURL('weixin://');
      if (canOpen) {
        await Linking.openURL('weixin://');
        return true;
      }
    }

    Alert.alert('提示', '未检测到微信应用，请确认已安装微信');
    return false;
  } catch (error) {
    console.error('Open WeChat error:', error);
    Alert.alert('提示', '打开微信失败，请手动打开');
    return false;
  }
}

/**
 * 打开微博
 */
export async function openWeibo(): Promise<boolean> {
  try {
    // 在 Expo Go 中无法直接打开其他应用
    if (isExpoGo()) {
      Alert.alert(
        '提示',
        '在 Expo Go 环境中无法直接跳转到微博。\n\n请手动打开微博，或构建独立App后使用此功能。'
      );
      return false;
    }

    if (Platform.OS === 'android') {
      const canOpen = await Linking.canOpenURL('weibo://');
      if (canOpen) {
        await Linking.openURL('weibo://');
        return true;
      }
    }

    if (Platform.OS === 'ios') {
      const canOpen = await Linking.canOpenURL('weibo://');
      if (canOpen) {
        await Linking.openURL('weibo://');
        return true;
      }
    }

    Alert.alert('提示', '未检测到微博应用，请确认已安装微博');
    return false;
  } catch (error) {
    console.error('Open Weibo error:', error);
    Alert.alert('提示', '打开微博失败，请手动打开');
    return false;
  }
}

/**
 * 复制内容到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch (error) {
    console.error('Copy to clipboard error:', error);
    return false;
  }
}

/**
 * 获取默认分享内容
 */
export function getDefaultShareContent(): ShareContent {
  return {
    title: APP_INFO.name,
    message: APP_INFO.description,
    url: APP_INFO.downloadUrl,
  };
}

/**
 * 分享应用
 */
export async function shareApp(): Promise<boolean> {
  const content = getDefaultShareContent();
  return shareWithSystem(content);
}
