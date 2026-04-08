#!/bin/bash

# 翻译监控脚本
# 每 10 分钟检查翻译进度，如果进程停止则自动重启

LOG_FILE="/tmp/translate_monitor.log"
TRANSLATE_LOG="/tmp/translate.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 获取翻译进度
get_progress() {
  local result=$(psql "$DATABASE_URL" -t -c "
    SELECT 
      (SELECT COUNT(*) FROM (
        SELECT volume_number FROM zizhitongjian_paragraphs 
        GROUP BY volume_number
        HAVING COUNT(CASE WHEN translation IS NOT NULL AND translation != '' AND translation != '翻译失败' AND translation != '翻译中' THEN 1 END) = COUNT(*)
      ) t) as completed,
      (SELECT COUNT(DISTINCT volume_number) FROM zizhitongjian_paragraphs) as total
  " 2>/dev/null | tr -d ' ')
  
  echo "$result"
}

# 检查翻译进程是否在运行
is_translate_running() {
  pgrep -f "translate_volumes.ts" > /dev/null 2>&1
  return $?
}

# 启动翻译进程
start_translate() {
  log "启动翻译进程..."
  cd /workspace/projects/server
  
  # 找到下一个需要翻译的卷
  local next_volume=$(psql "$DATABASE_URL" -t -c "
    SELECT MIN(volume_number) FROM (
      SELECT volume_number, 
             COUNT(*) as total,
             COUNT(CASE WHEN translation IS NOT NULL AND translation != '' AND translation != '翻译失败' AND translation != '翻译中' THEN 1 END) as translated
      FROM zizhitongjian_paragraphs 
      GROUP BY volume_number
      HAVING COUNT(CASE WHEN translation IS NOT NULL AND translation != '' AND translation != '翻译失败' AND translation != '翻译中' THEN 1 END) < COUNT(*)
    ) t
  " 2>/dev/null | tr -d ' ')
  
  if [ -z "$next_volume" ] || [ "$next_volume" = "NULL" ]; then
    log "所有卷已翻译完成！"
    return 0
  fi
  
  log "从第 $next_volume 卷继续翻译..."
  
  # 后台启动翻译脚本
  nohup npm exec tsx scripts/translate_volumes.ts $next_volume 294 > "$TRANSLATE_LOG" 2>&1 &
  
  sleep 5
  log "翻译进程已启动 (PID: $!)"
}

# 主监控循环
monitor() {
  log "========== 翻译监控启动 =========="
  
  while true; do
    # 获取当前进度
    local progress=$(get_progress)
    local completed=$(echo "$progress" | head -1)
    local total=$(echo "$progress" | tail -1)
    
    if [ -z "$completed" ] || [ -z "$total" ]; then
      log "无法获取进度，数据库连接可能有问题"
      sleep 600
      continue
    fi
    
    log "当前进度: $completed/$total 卷"
    
    # 检查是否全部完成
    if [ "$completed" -ge "$total" ]; then
      log "========== 全部翻译完成！ =========="
      exit 0
    fi
    
    # 检查翻译进程是否在运行
    if ! is_translate_running; then
      log "翻译进程已停止，准备重启..."
      start_translate
    else
      log "翻译进程运行中..."
    fi
    
    # 等待 10 分钟
    sleep 600
  done
}

# 启动监控
monitor
