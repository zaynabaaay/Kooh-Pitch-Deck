# KOOX presenter recordings

The existing 16-slide deck now supports one circular presenter recording per slide.

## Add your recordings

Put these MP4 files in the repository's `videos/` folder, then push/upload them and reload the deck:

| File | Slide |
| --- | --- |
| `slide-01.mp4` | 1. Cover |
| `slide-02.mp4` | 2. The Premise |
| `slide-03.mp4` | 3. The Tone |
| `slide-04.mp4` | 4. Series Format |
| `slide-05.mp4` | 5. Adventure 1 |
| `slide-06.mp4` | 6. Adventure 2 |
| `slide-07.mp4` | 7. Adventure 3 |
| `slide-08.mp4` | 8. Market Overview |
| `slide-09.mp4` | 9. Competitive Analysis |
| `slide-10.mp4` | 10. Why KOOX? |
| `slide-11.mp4` | 11. Target Audience |
| `slide-12.mp4` | 12. Discoverability & Marketing |
| `slide-13.mp4` | 13. Target Channel & Partners |
| `slide-14.mp4` | 14. Funding Strategy |
| `slide-15.mp4` | 15. Profit Strategy |
| `slide-16.mp4` | 16. Thank You |

Use MP4 with H.264 video and AAC audio for broad iPad/Safari compatibility. Square or portrait recordings work well; the centre of the recording fills a circular crop. Audio is preserved, never automatically muted.

`presenter-videos.js` is the single configuration file. The numbered paths above are already configured. Change a path there to use another filename or set an entry to `null` to intentionally leave a slide without a recording. Do not edit individual slide HTML.

If a recording is unavailable, preview mode shows a subtle circular placeholder. Presentation mode hides it and restores the slide's original text width. Uploaded recordings appear after reloading the page.

## Present

- Click **Full screen**, or press **F**.
- Native Fullscreen API is used when available, with a clean viewport presentation fallback.
- All page navigation, numbers and fullscreen controls are hidden while presenting.
- Swipe left/right on iPad, or use arrow keys / Page Up / Page Down / Space on a keyboard.
- **Swipe down**, **Esc**, or **F** exits presentation. Browser-provided fullscreen exit gestures also work.
- If the browser blocks autoplay with sound, tap the small play button inside the circle. Playback never silently falls back to muted video.

Each slide starts its recording from the beginning. Leaving it pauses, resets and unloads the previous recording. There is only one video element, so two slide recordings cannot play at once.

## Layout and implementation

The presentation remains 16:9. The circular player has one consistent size and corner placement. A shared geometry-based layout checks actual text fragments against its footprint. Only overlapping copy is narrowed; if wrapping needs more room, its position and vertical spacing can adjust without changing fonts, font sizes, line heights, wording or colours.

- `presentation.js`: existing navigation, fullscreen state and touch/keyboard gestures.
- `presenter.js`: one shared player and sound-preserving playback lifecycle.
- `presenter-layout.js`: responsive collision handling.
- `presenter.css`: circle and clean presentation mode.
- `presenter-videos.js`: all recording paths.

No new runtime dependencies, animations or transitions are added.

