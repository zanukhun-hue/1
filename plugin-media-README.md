# Before / after video pairs

The production `plugin-media.json` is empty until actual matched footage is provided. Do not label general product demos as before/after examples.

Add a plugin ID with `before` and `after` URLs, for example:

```json
{
  "saber": {
    "before": "/assets/comparisons/saber-before.mp4",
    "after": "/assets/comparisons/saber-after.mp4"
  }
}
```

Both files must show the same shot, be aligned from frame zero, have matching frame rate and duration, and demonstrate the named plugin. Prefer H.264 MP4, 16:9, 720p. The plugin page then renders the comparison automatically: shared playback, muted video and a movable divider. Local files live under `assets/comparisons`; HTTPS media URLs are also supported. A shorter video ends shared playback. The page does not create a blank comparison when a pair is missing.
