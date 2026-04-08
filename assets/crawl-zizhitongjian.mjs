/**
 * 资治通鉴（胡三省音注）爬虫
 * 爬取前10卷内容
 */

const BASE_URL = 'https://www.zhonghuashu.com';
const BOOK_NAME = '资治通鉴（胡三省音注）';

// 清理HTML标签
function cleanText(html) {
  let text = html;
  // 移除透明文字（干扰文字）
  text = text.replace(/<span[^>]*color:\s*transparent[^>]*>[\s\S]*?<\/span>/gi, '');
  // 移除HTML标签
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  // 解码HTML实体
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#160;/g, ' ');
  // 清理多余空白
  text = text.replace(/\n\s*\n/g, '\n');
  text = text.trim();
  return text;
}

// 解析单卷内容
function parseChapter(html, chapterNum) {
  // 提取主要内容区域
  const contentMatch = html.match(/<div class="mw-parser-output">([\s\S]*?)<\/div>\s*<\/div>\s*<\/article>/);
  if (!contentMatch) {
    console.log(`  卷${chapterNum}: 未找到内容区域`);
    return null;
  }
  
  const contentHtml = contentMatch[1];
  
  // 提取标题信息
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const fullTitle = titleMatch ? cleanText(titleMatch[1]) : `卷${chapterNum}`;
  
  // 提取章节标题（周纪一、周纪二等）
  const chapterTitleMatch = contentHtml.match(/<b>([^<]+)<\/b>/);
  const chapterTitle = chapterTitleMatch ? cleanText(chapterTitleMatch[1]) : `卷${chapterNum}`;
  
  // 解析段落内容
  const paragraphs = [];
  
  // 匹配 <p> 标签内的内容
  const pRegex = /<p>([\s\S]*?)<\/p>/g;
  let match;
  
  while ((match = pRegex.exec(contentHtml)) !== null) {
    const pHtml = match[1];
    
    // 跳过导航链接
    if (pHtml.includes('<a href') && (pHtml.includes('资治通鉴') || pHtml.includes('中华文库'))) {
      continue;
    }
    
    // 提取原文和注
    // 注在 <small> 标签内，或带特殊样式
    const result = { original: '', notes: [] };
    
    // 提取小字注（胡三省注）
    const smallRegex = /<small[^>]*>([\s\S]*?)<\/small>/g;
    let smallMatch;
    const smallNotes = [];
    let htmlWithoutSmall = pHtml;
    
    while ((smallMatch = smallRegex.exec(pHtml)) !== null) {
      const noteText = cleanText(smallMatch[1]);
      if (noteText.length > 1 && !noteText.includes('color:transparent')) {
        smallNotes.push(noteText);
      }
      htmlWithoutSmall = htmlWithoutSmall.replace(smallMatch[0], '');
    }
    
    // 提取剩余的原文
    const originalText = cleanText(htmlWithoutSmall);
    
    // 过滤有效内容
    if (originalText.length > 10 && !originalText.startsWith('←') && !originalText.startsWith('→')) {
      result.original = originalText;
      result.notes = smallNotes;
      paragraphs.push(result);
    }
  }
  
  // 如果段落太少，尝试用 <dl><dd> 结构解析
  if (paragraphs.length < 3) {
    const ddRegex = /<dd>([\s\S]*?)<\/dd>/g;
    while ((match = ddRegex.exec(contentHtml)) !== null) {
      const ddHtml = match[1];
      
      // 提取注
      const smallRegex = /<small[^>]*>([\s\S]*?)<\/small>/g;
      let smallMatch;
      const smallNotes = [];
      let htmlWithoutSmall = ddHtml;
      
      while ((smallMatch = smallRegex.exec(ddHtml)) !== null) {
        const noteText = cleanText(smallMatch[1]);
        if (noteText.length > 1 && !noteText.includes('color:transparent')) {
          smallNotes.push(noteText);
        }
        htmlWithoutSmall = htmlWithoutSmall.replace(smallMatch[0], '');
      }
      
      const originalText = cleanText(htmlWithoutSmall);
      
      if (originalText.length > 10) {
        paragraphs.push({ original: originalText, notes: smallNotes });
      }
    }
  }
  
  console.log(`  卷${chapterNum}: 提取到 ${paragraphs.length} 个段落`);
  
  return {
    chapterNum,
    chapterTitle,
    fullTitle,
    paragraphs
  };
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('  资治通鉴（胡三省音注）爬虫');
  console.log('  爬取前10卷');
  console.log('========================================\n');
  
  const results = [];
  
  // 爬取前10卷
  for (let i = 1; i <= 10; i++) {
    const chapterNum = String(i).padStart(3, '0');
    const url = `${BASE_URL}/wiki/%E8%B3%87%E6%B2%BB%E9%80%9A%E9%91%92_(%E8%83%A1%E4%B8%89%E7%9C%81%E9%9F%B3%E6%B3%A8)/%E5%8D%B7${chapterNum}`;
    
    console.log(`[${i}/10] 正在爬取卷${chapterNum}...`);
    console.log(`  URL: ${url}`);
    
    try {
      const response = await fetch(url);
      const html = await response.text();
      
      const chapter = parseChapter(html, chapterNum);
      if (chapter) {
        results.push(chapter);
      }
      
      // 礼貌延迟
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(`  错误: ${error.message}`);
    }
  }
  
  console.log('\n========================================');
  console.log('  爬取完成');
  console.log('========================================\n');
  
  // 输出统计
  console.log('爬取结果统计：');
  results.forEach(ch => {
    const totalNotes = ch.paragraphs.reduce((sum, p) => sum + p.notes.length, 0);
    console.log(`  卷${ch.chapterNum} ${ch.chapterTitle}: ${ch.paragraphs.length} 段, ${totalNotes} 条注`);
  });
  
  // 输出第一卷前3段示例
  if (results.length > 0) {
    console.log('\n示例 - 第一卷前3段：\n');
    results[0].paragraphs.slice(0, 3).forEach((p, i) => {
      console.log(`【第${i + 1}段原文】`);
      console.log(p.original.substring(0, 200) + (p.original.length > 200 ? '...' : ''));
      if (p.notes.length > 0) {
        console.log(`【注】${p.notes[0].substring(0, 100)}...`);
      }
      console.log('');
    });
  }
  
  // 保存为JSON
  const output = {
    bookName: BOOK_NAME,
    crawlTime: new Date().toISOString(),
    totalChapters: results.length,
    chapters: results
  };
  
  console.log('\n数据已保存到变量 output 中');
  console.log(`总字数约: ${JSON.stringify(output).length} 字符`);
  
  return output;
}

main().catch(console.error);
