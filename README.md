<div align="center">
 <h1>♟️ Chessy </h1> 
 
 ---
</div>

## 🌟 Overview

**Chessy** is a modern, responsive web-based chess game built to provide an elegant and seamless playing experience right in your browser. Powered by Vite for lightning-fast development and optimized builds, Chessy combines classic gameplay with modern web technologies.

## ✨ Features

- **Modern UI/UX**: A clean, intuitive, and visually appealing interface.
- **Fast Performance**: Built with Vite for rapid loading and instant updates.
- **Responsive Design**: Play smoothly on desktops, tablets, and mobile devices.
- **Pure JavaScript Engine**: Custom chess logic implementation with `chessEngine.js`.
- **Modular Architecture**: Clean separation between UI logic (`uiController.js`) and game rules.

## 🛠️ Tech Stack

- **Core**: HTML5, CSS3, Vanilla JavaScript
- **Build Tool**: [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- **Styling**: Custom `style.css` for a tailored aesthetic

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You'll need [Node.js](https://nodejs.org/) installed on your system.

### Installation

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd chessy
   ```

2. **Install the dependencies**:
   ```bash
   npm install
   ```

### Running the App Locally

To start the Vite development server with hot-module replacement (HMR):

```bash
npm run dev
```

Open your browser and visit `http://localhost:5173/` (or the port specified in your terminal) to play!

### Building for Production

To create an optimized production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## 📂 Project Structure

```text
chessy/
├── index.html          # Main HTML entry point
├── package.json        # Project metadata and dependencies
├── style.css           # Global application styles
├── vite.config.js      # Vite configuration file
└── src/
    ├── aiEngine.js     # AI logic for playing against computer
    ├── audio.js        # Sound effects and audio management
    ├── chessEngine.js  # Core chess logic and move validation
    ├── main.js         # Application initialization
    ├── pieceSvg.js     # SVG assets for chess pieces
    └── uiController.js # Handles DOM manipulation and user interactions
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

---

<div align="center">
  <sub>Built with ❤️ for Chess Lovers.</sub>
</div>
