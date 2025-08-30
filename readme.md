# kiwoom-stock

## Project Description
This is an Electron application, likely designed for interacting with the Kiwoom Stock API. It leverages Electron Forge for packaging and Vite for efficient bundling and development.

## Features
*   **Desktop Application:** Built using Electron, providing a cross-platform desktop experience.
*   **Fast Development:** Utilizes Vite for a rapid development server and optimized production builds.
*   **Secure Inter-Process Communication (IPC):** Incorporates a preload script for secure communication between the main and renderer processes.
*   **Developer Tools:** Opens Electron's DevTools by default in development mode for easier debugging.

## Tech Stack
*   **Electron:** For building cross-platform desktop applications.
*   **TypeScript:** For type-safe and scalable code.
*   **Vite:** A fast build tool and development server.
*   **Electron Forge:** A complete tool for packaging and publishing Electron applications.
*   **CSS:** For styling the user interface.

## Getting Started

### Installation
To set up the project locally, clone the repository and install the dependencies:

```bash
git clone https://github.com/your-username/kiwoom-stock.git # Replace with actual repo URL
cd kiwoom-stock
npm install
```

### Running the Application (Development)
To run the application in development mode:

```bash
npm run start
```

This will open the Electron application and the DevTools.

### Building the Application
To create a production build of the application:

```bash
npm run build
```

### Packaging and Making Installers
To package the application and create distributable installers for your operating system:

```bash
npm run make
```

The generated installers will be located in the `out` directory.

### Publishing the Application
To publish the application (requires proper configuration in `forge.config.ts`):

```bash
npm run publish
```

## Project Structure

```
.
├── .eslintrc.json
├── .gitignore
├── forge.config.ts
├── forge.env.d.ts
├── index.html
├── package-lock.json
├── package.json
├── tsconfig.json
├── vite.main.config.ts
├── vite.preload.config.ts
├── vite.renderer.config.ts
├── src/
│   ├── index.css
│   ├── main.ts
│   ├── preload.ts
│   └── renderer.ts
└── ... (other generated files and directories like .git, .vite, node_modules, out)
```
