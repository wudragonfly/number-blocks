# Number Blocks

Fun learning games for kids - counting, addition, and subtraction with colorful blocks!

## Features

- 🔢 **Count to 100** - Learn numbers 1-100 with visual block representations
- ➕ **Addition** - Add numbers together by combining blocks
- ➖ **Subtraction** - Subtract by taking away blocks and seeing what remains
- 🗣️ **Speech Support** - Hear numbers spoken in English and Chinese
- 🌐 **Bilingual** - Chinese and English language support

## Platform Support

This app works on both **iPad** and **Web browsers**:

### iPad Features
- Touch-optimized buttons (44px+ touch targets)
- iOS safe area support (notch, home indicator)
- "Add to Home Screen" as a web app (PWA)
- Gesture support (swipe to navigate)
- Speech synthesis compatible with iOS Safari

### Web Features
- Keyboard navigation (arrow keys, number keys)
- Mouse hover effects
- Responsive design for all screen sizes

## Installation

### As a Web App (iPad)
1. Open the app in Safari on your iPad
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will now appear as an icon and run in fullscreen mode

### Local Development
Simply open `index.html` in a web browser, or serve with any static file server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

## Project Structure

```
number-blocks/
├── index.html        # Main menu / home page
├── counting.html     # Count 1-100 game
├── addition.html     # Addition practice
├── subtraction.html  # Subtraction practice
├── loader.js         # Auto-loads cross-platform support
├── platform.js       # Platform detection & touch handling
├── platform.css      # Cross-platform responsive styles
├── manifest.json     # PWA manifest for "Add to Home Screen"
├── icons/
│   └── icon.svg      # App icon
└── README.md
```

## Cross-Platform Implementation

The cross-platform support is implemented with minimal changes to the original HTML files. Each HTML file only needs one additional line:

```html
<script src="loader.js"></script>
```

The `loader.js` script automatically:
- Injects `platform.css` for responsive/touch styles
- Injects `platform.js` for touch handling and iOS fixes
- Adds PWA manifest and iOS meta tags
- Ensures proper viewport settings

## Browser Compatibility

- Safari (iOS 12+)
- Chrome (Android, Desktop)
- Firefox (Desktop)
- Edge (Desktop)

## License

Made with ❤️ for little learners
