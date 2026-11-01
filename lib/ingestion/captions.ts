import Parser from "srt-parser-2";

/**
 * Parses SRT caption content into segments using the `srt-parser-2` package.
 *
 * Each segment is one text section from the transcript: a single SRT cue,
 * with its start/end times converted to milliseconds.
 */

export type CaptionSegment = {
  /** Cue text, with markup stripped and internal newlines joined by spaces. */
  text: string;
  /** Cue start time in milliseconds. */
  startTime: number;
  /** Cue end time in milliseconds. */
  endTime: number;
};

export function parseCaptions(input: string): CaptionSegment[] {
  const parser = new Parser();
  const cues = parser.fromSrt(input);

  return cues.flatMap((cue) => {
    const text = cue.text
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length === 0) return [];

    return [
      {
        text,
        startTime: Math.round(cue.startSeconds * 1000),
        endTime: Math.round(cue.endSeconds * 1000),
      },
    ];
  });
}
