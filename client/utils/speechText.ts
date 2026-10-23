// Keep every part below the platform TTS input limit, preferably at a sentence boundary.
export function splitSpeechText(text: string, maxLength = 800): string[] {
  const result: string[] = [];
  let remaining = text.trim();
  while (remaining.length > maxLength) {
    const candidate = remaining.slice(0, maxLength);
    const punctuation = Math.max(candidate.lastIndexOf('。'), candidate.lastIndexOf('！'), candidate.lastIndexOf('？'), candidate.lastIndexOf('；'), candidate.lastIndexOf('\n'));
    const cut = punctuation >= maxLength / 2 ? punctuation + 1 : maxLength;
    result.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining) result.push(remaining);
  return result;
}
