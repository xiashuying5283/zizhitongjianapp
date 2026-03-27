const https = require('https');
const http = require('http');
const iconv = require('iconv-lite');
const url = require('url');

/**
 * 获取网页内容（带请求头）
 */
function fetchPage(pageUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new url.URL(pageUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
      }
    };
    
    const req = client.request(options, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const html = iconv.decode(buffer, 'gb2312');
        resolve(html);
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * 主函数
 */
async function main() {
  const pageUrl = 'http://www.ziyexing.com/files-5/zizhitongjian/zizhitongjian_001.htm';
  
  console.log(`爬取URL: ${pageUrl}\n`);
  
  const html = await fetchPage(pageUrl);
  
  console.log(`网页长度: ${html.length} 字符\n`);
  
  // 查找【译文】标记
  const lines = html.split('\n');
  let foundCount = 0;
  
  console.log('=== 查找【译文】标记 ===\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('【译文】')) {
      foundCount++;
      console.log(`第 ${i} 行: ${lines[i].trim()}`);
      console.log(`下一行: ${lines[i + 1] ? lines[i + 1].trim().substring(0, 100) : '(空)'}\n`);
      
      if (foundCount >= 5) break;
    }
  }
  
  console.log(`\n找到 ${foundCount} 个【译文】标记`);
}

main().catch(console.error);
