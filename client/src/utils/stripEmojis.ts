/** Strip emoji from displayed text (e.g. cached AI replies). */
export function stripEmojis(text: string): string {
  return text
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
      ''
    )
    .replace(/[\u2705\u274C\u26A0\uFE0F\u2713\u2717\u2714\u2718]/g, '')
    .trim();
}
