# Wrath of Ashardalon - Web Implementation

A fan-inspired web implementation of the classic Dungeons & Dragons board game "Wrath of Ashardalon," optimized for tabletop computers and designed to run standalone from GitHub Pages.

## Overview

This project brings the excitement of the Wrath of Ashardalon board game to your browser. Originally designed for tabletop computers, this web application allows players to enjoy the cooperative dungeon-crawling experience digitally without requiring any server infrastructure.

## Features

- **Browser-Based**: Runs entirely in the browser with no server required
- **GitHub Pages Ready**: Deploy and play directly from GitHub Pages
- **Tabletop Optimized**: Designed with tabletop computer displays in mind
- **Cooperative Gameplay**: Supports the cooperative dungeon-crawling experience of the original game

## Getting Started

### Playing the Game

1. Visit the [deployed game](https://egirard.github.io/Ashardalon/)
2. No installation required - the game runs directly in your browser
3. Gather your party and start exploring!

### Local Development

To run the project locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/egirard/Ashardalon.git
   cd Ashardalon
   ```

2. Open `index.html` in your browser, or use a local web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (with http-server)
   npx http-server
   ```

3. Navigate to `http://localhost:8000` in your browser

## How to Play

Wrath of Ashardalon is a cooperative dungeon-crawling adventure where players work together to:

- Explore randomly generated dungeon tiles
- Battle monsters and overcome challenges
- Complete adventure objectives
- Level up heroes and discover treasure

For detailed rules and gameplay mechanics, refer to the original Wrath of Ashardalon board game rulebook.

## Project Documentation

### User Experience & Design
- [**lobby-ux.md**](docs/lobby-ux.md) - Character selection screen layout and interactions
- [**gameplay-ux.md**](docs/gameplay-ux.md) - Game board screen layout and interactions
- [UX Guidelines](docs/UX_GUIDELINES.md) - General UX principles for tabletop displays
- [Initial Screens](docs/INITIAL_SCREENS.md) - Technical specification for screen flow

### Project Overview
- [Vision Document](docs/VISION.md) - Project goals, roadmap, and design philosophy
- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute to the project
- [Game Asset Rules](CONTRIBUTING.md#contributing-art-and-assets) - Guidelines for contributing artwork and assets
- [Development Environment](docs/DEVELOPMENT.md) - Setup and development tools

### Game Mechanics Implementation
- [Dazed Condition Implementation](docs/DAZED_CONDITION_IMPLEMENTATION.md) - Complete specification for implementing the Dazed status condition
- [Encounter Cards Implementation](docs/ENCOUNTER_CARDS_IMPLEMENTATION.md) - Status of encounter card effects
- [Monster Card Implementation](docs/MONSTER_CARD_IMPLEMENTATION.md) - Monster behaviors and abilities
- [Player Cards Implementation](docs/PLAYER_CARDS_IMPLEMENTATION.md) - Hero cards and abilities
- [Power Cards Implementation](docs/POWER_CARDS_IMPLEMENTATION.md) - Hero power effects
- [Treasure Implementation](docs/TREASURE_IMPLEMENTATION.md) - Treasure card effects

## Technology Stack

- HTML5
- CSS3
- JavaScript (Vanilla)
- Designed for static hosting (GitHub Pages)

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get involved.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This is a fan-made project and is not affiliated with, endorsed by, or connected to Wizards of the Coast or Hasbro. "Wrath of Ashardalon" and "Dungeons & Dragons" are trademarks of Wizards of the Coast LLC. This project is intended for personal, non-commercial use only.

## Acknowledgments

- The original Wrath of Ashardalon board game designers and Wizards of the Coast
- The D&D community for their continued enthusiasm and support
- All contributors who help make this project better
