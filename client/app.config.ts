import { ExpoConfig, ConfigContext } from 'expo/config';

const appName = process.env.APP_NAME || '资治通鉴深度阅读App';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    "name": appName,
    "slug": "zizhitongjian",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "zizhitongjian",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "config": {
        "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
      },
      "infoPlist": {
        "LSApplicationQueriesSchemes": [
          "weixin",
          "weixinULAPI",
          "weixinURLParams",
          "wechat",
          "weibo",
          "sinaweibo",
          "sinaweibohd",
          "sinaweibosso",
          "sinaweibohdsso",
          "mqq",
          "mqqapi",
          "mqqopensdkapiV2",
          "mqqopensdkapiV3"
        ]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.zizhitongjian.app",
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
        }
      }
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      process.env.EXPO_PUBLIC_BACKEND_BASE_URL ? [
        "expo-router",
        {
          "origin": process.env.EXPO_PUBLIC_BACKEND_BASE_URL
        }
      ] : 'expo-router',
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": `允许资治通鉴深度阅读App访问您的相册，以便您上传或保存图片。`,
          "cameraPermission": `允许资治通鉴深度阅读App使用您的相机，以便您直接拍摄照片上传。`,
          "microphonePermission": `允许资治通鉴深度阅读App访问您的麦克风，以便您拍摄带有声音的视频。`
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": `资治通鉴深度阅读App需要访问您的位置以提供周边服务及导航功能。`
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": `资治通鉴深度阅读App需要访问相机以拍摄照片和视频。`,
          "microphonePermission": `资治通鉴深度阅读App需要访问麦克风以录制视频声音。`,
          "recordAudioAndroid": true
        }
      ],
      [
        "expo-audio",
        {
          "microphonePermission": "资治通鉴深度阅读App需要访问麦克风以录制音频。"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
