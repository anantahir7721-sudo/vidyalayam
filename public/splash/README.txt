==================================================
  VIDYALAYAM CUSTOM SPLASH ANIMATION INSTRUCTIONS
==================================================

You can customize the app opening splash screen animation by placing
your media files inside this `/public/splash/` folder:

Supported file formats (auto-detected in priority order):
1. `splash.mp4`   - MP4 Video animation (H.264, auto-plays seamlessly)
2. `splash.webm`  - WebM Video animation
3. `splash.gif`   - Animated GIF (or `animation.gif`)
4. `splash.svg`   - Animated SVG vector graphic

How to use your zip file:
--------------------------------------------------
Extract your zip file and place the animation file here as `splash.mp4`
or `splash.gif`. The app will automatically detect it on launch and play
it with smooth opening and exit transitions!

If no custom file is found, the built-in cinematic Framer Motion
Vidyalayam vector opening animation is displayed automatically.
