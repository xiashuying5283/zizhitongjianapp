const fontkit = require('fontkit');
const path = 'd:/Code/zizhitongjian/client/assets/fonts/NotoSerifCJKsc-Regular.otf';

try {
  const font = fontkit.openSync(path);
  console.log('Font loaded:', path);
  console.log('Glyph count:', font.numGlyphs);
  
  // Test U+26407
  const testChars = [
    { char: '\u{26407}', cp: 'U+26407', desc: '𦐇' },
    { char: '\u{2A7DD}', cp: 'U+2A7DD', desc: '𪟝 (最频繁,221次)' },
    { char: '\u{2B5AE}', cp: 'U+2B5AE', desc: '𫖮 (156次)' },
  ];
  
  for (const t of testChars) {
    const cp = t.char.codePointAt(0);
    const glyph = font.glyphForCodePoint(cp);
    const hasGlyph = glyph.path && glyph.path.commands && glyph.path.commands.length > 0;
    console.log(`${t.cp} (${t.desc}): hasGlyph=${hasGlyph}, glyph id=${glyph.id}`);
  }
} catch (e) {
  console.error('Error:', e.message);
}
