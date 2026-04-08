#!/bin/bash
# 下载资治通鉴HTML文件
# 用法: bash scripts/download_html.sh <开始卷号> <结束卷号>

START=${1:-21}
END=${2:-294}
HTML_DIR="$(dirname "$0")/../data/html"

mkdir -p "$HTML_DIR"

echo "开始下载卷 $START - $END"
echo "HTML目录: $HTML_DIR"
echo "开始时间: $(date)"

for vol in $(seq $START $END); do
  vol_padded=$(printf "%03d" $vol)
  html_path="$HTML_DIR/vol_${vol_padded}.html"
  
  # 如果已存在且不为空，跳过
  if [ -s "$html_path" ]; then
    echo "[$vol/$END] 已存在，跳过"
    continue
  fi
  
  url="https://www.zhonghuashu.com/wiki/%E8%B3%87%E6%B2%BB%E9%80%9A%E9%91%92_(%E8%83%A1%E4%B8%89%E7%9C%81%E9%9F%B3%E6%B3%A8)/%E5%8D%B7${vol_padded}"
  
  echo "[$vol/$END] 下载中..."
  curl -s "$url" -o "$html_path"
  
  # 检查下载是否成功
  if [ -s "$html_path" ]; then
    size=$(ls -lh "$html_path" | awk '{print $5}')
    echo "[$vol/$END] 成功: $size"
  else
    echo "[$vol/$END] 失败!"
  fi
  
  # 延迟避免请求过快
  sleep 0.5
done

echo "下载完成: $(date)"
echo "HTML文件总数: $(ls -1 $HTML_DIR/vol_*.html | wc -l)"
