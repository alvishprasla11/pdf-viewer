# 📚 Reader - Desktop Book Viewer

A beautiful, calm desktop application for reading PDF and EPUB books with realistic page-turning animations. Available for macOS and Windows.

## ✨ Features

- **📖 Realistic FlipBook Animation**: 3D page-turning effects that simulate a real book
- **🔍 Zoom & Rotate**: Adjust view with zoom and rotation controls  
- **📍 Chapter Navigation**: Quick access to book chapters from PDF/EPUB table of contents
- **🎨 Customizable Themes**: Light/dark background options with calm, classic design
- **⌨️ Keyboard Shortcuts**: Efficient navigation (Arrow keys, H, T, F, C)
- **🔒 100% Private**: Everything runs locally, no cloud storage or uploads
- **📄 PDF & EPUB Support**: Both formats work seamlessly
- **🖥️ Cross-Platform**: Desktop apps for macOS (Intel + Apple Silicon) and Windows (64-bit + 32-bit)
- **🌓 Dark Mode**: Full dark theme support

## 🖥️ Desktop App

### Development

Run the desktop app in development mode:

```bash
npm run electron:dev
```

This starts the Next.js dev server and launches the Electron app.

### Building Desktop Apps

Build for your current platform:
```bash
npm run electron:build
```

Build for specific platforms:
```bash
npm run electron:build:mac    # macOS only
npm run electron:build:win    # Windows only
npm run electron:build:all    # Both platforms
```

Built apps are in the `dist/` folder:
- **macOS**: `.dmg` installer + `.zip` archive (Universal: Intel + Apple Silicon)
- **Windows**: `.exe` installer + portable `.exe` (64-bit and 32-bit)

### Distribution

Distribute the built apps directly to users:

**macOS**:
- `Reader-{version}.dmg` - Drag and drop installer
- `Reader-{version}-mac.zip` - Direct application archive

**Windows**:
- `Reader Setup {version}.exe` - NSIS installer with customizable location
- `Reader {version}.exe` - Portable version, no installation needed

## 🌐 Web Version

You can still run it as a web app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⌨️ Keyboard Shortcuts

- **Arrow Keys** - Navigate pages (Left/Right or Up/Down)
- **H** - Hide/show UI for immersive reading
- **T** - Toggle theme (light/dark background)
- **F** - Fullscreen mode
- **C** - Open chapters panel
- **Cmd/Ctrl+O** - Open file (desktop app only)

## 🛠️ Tech Stack

- **Next.js 16** - React framework with static export
- **Electron** - Desktop app framework
- **PDF.js** - PDF rendering and parsing
- **EPUB.js** - EPUB file handling  
- **react-pageflip** - 3D page-turning animations
- **Tailwind CSS 4** - Styling with calm, classic design
- **TypeScript** - Type safety

## 📖 How to Use

1. Upload a PDF or EPUB file (drag & drop or click to browse)
2. Wait for conversion (progress indicator shows status)
3. Flip pages using arrow keys or clicking page edges
4. Press **H** to hide UI for distraction-free reading
5. Press **C** to access chapter navigation
6. Use zoom controls for closer reading
7. Toggle between light/dark themes with **T**

Made with ❤️ for book lovers everywhere

