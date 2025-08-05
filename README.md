# commad

> [!CAUTION]
> This project is under active development and is **not production-ready**.  
> Breaking changes may occur at any time.

A React application built with Vite.

## Prerequisites

- Node.js (version 16.x or higher recommended)
- npm (comes with Node.js)

## Installation

Install dependencies

```bash
npm install
```

## Running the Application

### Development Server

To start the development server with hot-reload:

```bash
npm run dev
```

This will start the development server at http://localhost:5173 (or another port if 5173 is in use).

### Building for Production

To build the application for production:

```bash
npm run build
```

The build output will be in the `dist` directory.

### Previewing Production Build

To preview the production build locally:

```bash
npm run preview
```

This will serve the production build at http://localhost:4173 (or another port if 4173 is in use).

## Additional Scripts

- `npm run lint` - Run ESLint to check code quality
- `npm test` - Run tests (if configured)