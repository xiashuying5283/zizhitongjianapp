import React, { useRef, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { FontAwesome6 } from '@expo/vector-icons';
import { HistoricalLocation, HistoricalRoute } from '@/data/types';

interface InteractiveMapViewProps {
  locations: HistoricalLocation[];
  routes: HistoricalRoute[];
  selectedLocation: HistoricalLocation | null;
  onLocationPress: (location: HistoricalLocation) => void;
}

// 天地图 API Key
// 请前往天地图开发者平台申请Key：https://lbs.tianditu.gov.cn/
// 1. 注册账号 → 2. 进入控制台 → 3. 创建应用 → 4. 获取Key
const TIANDITU_KEY = 'YOUR_TIANDITU_KEY_HERE'; // 请替换为你自己的Key

export function InteractiveMapView({
  locations,
  routes,
  selectedLocation,
  onLocationPress,
}: InteractiveMapViewProps) {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [currentStyle, setCurrentStyle] = React.useState<string>('高德'); // 默认使用高德，天地图需要申请Key

  // 生成地图HTML
  const htmlContent = useMemo(() => {
    const markers = locations.map(loc => {
      const color = loc.type === 'capital' ? '#f59e0b' :
                    loc.type === 'battlefield' ? '#ef4444' :
                    loc.type === 'strategic' ? '#6366f1' : '#6b7280';
      return {
        id: loc.id,
        name: loc.name,
        lat: loc.coordinates.lat,
        lng: loc.coordinates.lng,
        type: loc.type,
        color,
        modernName: loc.modernName,
        description: loc.description,
      };
    });

    const routePaths = routes.map(route => ({
      id: route.id,
      name: route.name,
      color: route.type === 'rebel' ? '#ef4444' :
             route.type === 'tang' ? '#6366f1' : '#6b7280',
      path: route.path
        .map(id => locations.find(l => l.id === id))
        .filter(Boolean)
        .map(l => ({ lat: l!.coordinates.lat, lng: l!.coordinates.lng })),
    }));

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>历史地图</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    
    .custom-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .marker-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: white;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .marker-label {
      margin-top: 4px;
      padding: 2px 6px;
      background: white;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .selected .marker-icon {
      transform: scale(1.2);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.4);
    }
    .selected .marker-label {
      background: #6366f1;
      color: white;
    }
    
    .leaflet-popup-content-wrapper {
      border-radius: 8px;
      padding: 0;
    }
    .leaflet-popup-content {
      margin: 12px;
      min-width: 180px;
    }
    .popup-title {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 4px;
    }
    .popup-modern {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .popup-desc {
      font-size: 12px;
      color: #374151;
      line-height: 1.5;
    }
    .popup-type {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      margin-top: 8px;
    }
    .popup-type.capital { background: #fef3c7; color: #d97706; }
    .popup-type.battlefield { background: #fee2e2; color: #dc2626; }
    .popup-type.strategic { background: #e0e7ff; color: #4f46e5; }
    .popup-type.city { background: #f3f4f6; color: #4b5563; }
  </style>
</head>
<body>
  <div id="map"></div>
  
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // 初始化地图
    const map = L.map('map', {
      center: [35, 112],
      zoom: 5,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
    });

    // 添加缩放控件到右下角
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tk = '${TIANDITU_KEY}';

    // OpenStreetMap 作为备用底图（无需Key）
    const osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { 
        maxZoom: 18, 
        subdomains: ['a','b','c'],
        attribution: 'OpenStreetMap contributors'
      }
    );

    // 高德地图作为备用
    const gaodeLayer = L.tileLayer(
      'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      { 
        maxZoom: 18, 
        subdomains: ['1','2','3','4'],
        attribution: '高德地图'
      }
    );

    // 天地图底图图层（使用DataServer接口）
    const tdtVec = L.tileLayer(
      'https://t{0-7}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=' + tk,
      { maxZoom: 18, subdomains: ['0','1','2','3','4','5','6','7'] }
    );
    const tdtImg = L.tileLayer(
      'https://t{0-7}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' + tk,
      { maxZoom: 18, subdomains: ['0','1','2','3','4','5','6','7'] }
    );
    const tdtTer = L.tileLayer(
      'https://t{0-7}.tianditu.gov.cn/DataServer?T=ter_w&x={x}&y={y}&l={z}&tk=' + tk,
      { maxZoom: 18, subdomains: ['0','1','2','3','4','5','6','7'] }
    );

    // 天地图标注图层
    const tdtCva = L.tileLayer(
      'https://t{0-7}.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=' + tk,
      { maxZoom: 18, subdomains: ['0','1','2','3','4','5','6','7'] }
    );
    const tdtCia = L.tileLayer(
      'https://t{0-7}.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=' + tk,
      { maxZoom: 18, subdomains: ['0','1','2','3','4','5','6','7'] }
    );

    // 底图配置
    const baseLayers = {
      '高德': gaodeLayer,
      'OSM': osmLayer,
      '天地图矢量': tdtVec,
      '天地图影像': tdtImg,
      '天地图地形': tdtTer,
    };

    // 默认使用高德地图（更稳定）
    let currentBaseLayer = '高德';
    baseLayers[currentBaseLayer].addTo(map);

    // 切换底图
    function switchBaseLayer(layerName) {
      if (baseLayers[layerName]) {
        map.removeLayer(baseLayers[currentBaseLayer]);
        
        // 移除天地图标注图层
        try {
          map.removeLayer(tdtCva);
          map.removeLayer(tdtCia);
        } catch(e) {}
        
        baseLayers[layerName].addTo(map);
        currentBaseLayer = layerName;
        
        // 天地图需要添加标注图层
        if (layerName === '天地图矢量' || layerName === '天地图地形') {
          tdtCva.addTo(map);
        } else if (layerName === '天地图影像') {
          tdtCia.addTo(map);
        }
      }
    }

    // 标记点数据
    const markers = ${JSON.stringify(markers)};
    const routePaths = ${JSON.stringify(routePaths)};
    const markerLayers = {};

    // 创建自定义图标
    function createMarkerIcon(marker, isSelected) {
      const typeLabel = {
        capital: '都',
        battlefield: '战',
        strategic: '镇',
        city: '城'
      };
      
      return L.divIcon({
        className: 'custom-marker' + (isSelected ? ' selected' : ''),
        html: '<div class="marker-icon" style="background:' + marker.color + '">' + typeLabel[marker.type] + '</div><div class="marker-label">' + marker.name + '</div>',
        iconSize: [28, 40],
        iconAnchor: [14, 40],
        popupAnchor: [0, -40],
      });
    }

    // 添加标记点
    markers.forEach(m => {
      const marker = L.marker([m.lat, m.lng], {
        icon: createMarkerIcon(m, false)
      }).addTo(map);
      
      const typeLabel = {
        capital: '都城',
        battlefield: '战场',
        strategic: '重镇',
        city: '城市'
      };
      
      marker.bindPopup(
        '<div class="popup-title">' + m.name + '</div>' +
        '<div class="popup-modern">今' + m.modernName + '</div>' +
        '<div class="popup-desc">' + m.description + '</div>' +
        '<div class="popup-type ' + m.type + '">' + typeLabel[m.type] + '</div>',
        { closeButton: false }
      );
      
      marker.on('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'locationPress',
            id: m.id
          }));
        }
      });
      
      markerLayers[m.id] = marker;
    });

    // 添加路线
    routePaths.forEach(route => {
      if (route.path.length >= 2) {
        const polyline = L.polyline(route.path, {
          color: route.color,
          weight: 3,
          opacity: 0.7,
          dashArray: '10, 5'
        }).addTo(map);
        
        polyline.bindPopup('<strong>' + route.name + '</strong>');
      }
    });

    // 自动调整视野
    if (markers.length > 0) {
      const group = L.featureGroup(Object.values(markerLayers));
      map.fitBounds(group.getBounds().pad(0.1));
    }

    // 选中标记点
    function selectMarker(markerId) {
      Object.keys(markerLayers).forEach(id => {
        const m = markerLayers[id];
        const data = markers.find(mk => mk.id === id);
        if (data) {
          m.setIcon(createMarkerIcon(data, id === markerId));
        }
      });
      
      if (markerLayers[markerId]) {
        markerLayers[markerId].openPopup();
      }
    }

    // 接收来自RN的消息
    window.addEventListener('message', function(e) {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'selectLocation') {
          selectMarker(data.id);
        } else if (data.type === 'switchLayer') {
          switchBaseLayer(data.layer);
        }
      } catch(err) {}
    });
    
    // Web端接收消息
    document.addEventListener('message', function(e) {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'selectLocation') {
          selectMarker(data.id);
        } else if (data.type === 'switchLayer') {
          switchBaseLayer(data.layer);
        }
      } catch(err) {}
    });
  </script>
</body>
</html>
`;
  }, [locations, routes]);

  // 处理来自WebView的消息
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationPress') {
        const location = locations.find(l => l.id === data.id);
        if (location) {
          onLocationPress(location);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [locations, onLocationPress]);

  // 发送消息到WebView
  const sendMessage = useCallback((data: object) => {
    const js = `window.postMessage(${JSON.stringify(data)}, '*');`;
    if (Platform.OS === 'web') {
      // Web端直接执行JS
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(data, '*');
      }
    } else {
      webViewRef.current?.injectJavaScript(js);
    }
  }, []);

  // 选中地点时更新地图
  React.useEffect(() => {
    if (selectedLocation) {
      sendMessage({ type: 'selectLocation', id: selectedLocation.id });
    }
  }, [selectedLocation, sendMessage]);

  // 切换底图样式
  const handleSwitchLayer = useCallback((layer: string) => {
    setCurrentStyle(layer as any);
    sendMessage({ type: 'switchLayer', layer });
  }, [sendMessage]);

  return (
    <View style={{ flex: 1 }}>
      {/* 地图容器 */}
      {Platform.OS === 'web' ? (
        <iframe
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={{ flex: 1 }}
          onMessage={handleMessage}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
        />
      )}

      {/* 底图切换按钮 */}
      <View style={{
        position: 'absolute',
        top: Spacing.md,
        left: Spacing.md,
        flexDirection: 'row',
        backgroundColor: theme.backgroundDefault,
        borderRadius: BorderRadius.md,
        padding: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
      }}>
        {[
          { key: '天地图矢量', label: '矢量', icon: 'map' },
          { key: '天地图影像', label: '影像', icon: 'satellite' },
          { key: '天地图地形', label: '地形', icon: 'mountain' },
          { key: '高德', label: '高德', icon: 'location-dot' },
        ].map(item => (
          <TouchableOpacity
            key={item.key}
            style={{
              paddingHorizontal: Spacing.sm,
              paddingVertical: Spacing.xs,
              borderRadius: BorderRadius.sm,
              backgroundColor: currentStyle === item.key ? theme.primary : 'transparent',
            }}
            onPress={() => handleSwitchLayer(item.key)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <FontAwesome6
                name={item.icon}
                size={12}
                color={currentStyle === item.key ? theme.buttonPrimaryText : theme.textSecondary}
              />
              <ThemedText
                variant="tiny"
                color={currentStyle === item.key ? theme.buttonPrimaryText : theme.textSecondary}
              >
                {item.label}
              </ThemedText>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
