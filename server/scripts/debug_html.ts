import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('/workspace/projects/server/data/volume001.html', 'utf-8');
const $ = cheerio.load(html);

const contentDiv = $('.mw-parser-output');
const paragraphs = contentDiv.find('p');

// 只检查前30个p
paragraphs.slice(0, 30).each((i, el) => {
  const text = $(el).text().trim().substring(0, 80);
  const boldText = $(el).find('b').first().text().trim();
  console.log(`p[${i}]: bold='${boldText}' | text='${text}...'`);
});
