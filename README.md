# Project Reclamation

**Project Reclamation** is a browser-based MMO strategy game built with a focus on ethical design, high-performance simulation, and community extensibility.

## 🌍 Overview

This project aims to reclaim the MMO genre from predatory monetization and addictive loops. It features:

*   **Ethical Systems:** "Rest" mechanics that reward offline time instead of punishing it. No infinite scrolls or dark patterns.
*   **Fluid Simulation Engine:** A high-performance, server-authoritative fluid simulation (100x100 grid) synchronized via binary patching.
*   **Hybrid Modding Engine:** A secure, sandboxed environment allowing players to extend the game logic safely.
*   **"Dumb Client" Architecture:** The client is a pure visualizer; all game logic resides on the authoritative server.

## 🛠️ Tech Stack

*   **Language:** TypeScript 5.x (Strict Mode)
*   **Frontend:** Phaser 3 (WebGL) + Vite
*   **Backend:** Node.js + Colyseus (Authoritative Server)
*   **Monorepo:** Managed via Yarn Workspaces

## 🚀 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18+ recommended)
*   [Yarn](https://yarnpkg.com/)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/MelvinLoos/project-reclamation.git
    cd project-reclamation
    ```

2.  Install dependencies:
    ```bash
    yarn install
    ```

### Running the Project

You will need two terminal windows to run the full stack.

**1. Start the Server:**
```bash
yarn server
```
*Runs on `ws://localhost:2567`*

**2. Start the Client:**
```bash
yarn client
```
*Accessible at `http://localhost:5173` (or similar)*

### Building for Production

To build all workspaces (Shared, Server, Client):
```bash
yarn build
```

## 📂 Project Structure

This project follows a strict Monorepo structure:

*   **`client/`**: The Phaser frontend. Responsible **only** for rendering and input collection.
*   **`server/`**: The Colyseus backend. Contains all game logic, physics, and the fluid simulation.
*   **`shared/`**: The "One Truth". Contains shared Types, Schemas, and Constants.
    *   *Note:* Never duplicate code between client and server; move it here.
*   **`docs/`**: Technical Design Documents (PDFs).

## 🤝 Contributing

We welcome contributions that align with our architectural and ethical goals.

### Key Rules
1.  **The Shared Kernel:** Never duplicate types or magic strings. Use `shared/constants/MessageTags.ts` for network messages.
2.  **The Dumb Client:** Do not put game logic (damage calc, pathfinding) in the client.
3.  **Strict Typing:** `noImplicitAny` is the law.
4.  **Ethical Design:** We do not implement mechanics designed solely to maximize engagement time at the expense of player well-being.

### Documentation
Please read the **Technical Design Documents** located in the `docs/` folder before making major architectural changes.

*   `TDD 01: Core Architecture & Stack`
*   `TDD 02: Ethical Systems & Retention`
*   `TDD 03: The Hybrid Modding Engine`
*   `TDD 04: Fluid Simulation Engine`

For AI Agents or detailed coding guidelines, refer to `.github/copilot-instructions.md`.
