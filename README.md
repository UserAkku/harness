# Harness 🚀

**Harness** is a powerful web-based visual simulation environment built for designing, simulating, and testing logic circuits, microcontrollers, and hardware systems directly in the browser. 

## 🌟 Features

- **Interactive Visual Canvas**: Drag and drop components using a node-based interface powered by React Flow (`@xyflow/react`).
- **High-Performance Simulation Engine**: Runs simulations off the main thread using Web Workers and `comlink`, backed by a custom `PriorityQueue` for accurate tick execution.
- **Extensive Component Library**: Includes ready-to-use Actuators, Controllers, Logic Gates, Network modules, Power sources, and Sensors.
- **Integrated Code Editor**: Built-in support for coding and testing configurations using `@monaco-editor/react`.
- **User Authentication**: Secure signup and login workflows utilizing NextAuth and `bcryptjs`.
- **Project Workspaces**: Save, manage, and resume your simulation projects. Data is synced securely to your database via Prisma and temporarily locally via IndexedDB (`idb`).
- **Modern Tech Stack**: Blazing fast rendering and routing with Next.js 16 (App Router), React 19, and Tailwind CSS v4.

## 🛠️ Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Canvas/Nodes**: [@xyflow/react](https://reactflow.dev/)
- **Database & ORM**: [Prisma](https://www.prisma.io/) + PostgreSQL/MySQL (Configurable in schema)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Others**: `uuid`, `comlink` (Web Workers), `@monaco-editor/react`

## 📁 Project Structure

```bash
harness/
├── prisma/            # Prisma ORM schema and migrations
├── public/            # Static assets
├── src/
│   ├── app/           # Next.js App Router (Pages, API routes, Auth)
│   ├── components/    # Reusable UI React components (Canvas, Layout, Panels)
│   ├── lib/           # Utility functions, Prisma client, and Storage
│   ├── simulation/    # Core logic, simulation engine, and components
│   ├── stores/        # Zustand global state (Auth, Project, Simulation, UI)
│   └── types/         # TypeScript definitions
```

## 🚀 Getting Started

### Prerequisites

Make sure you have Node.js (v20+) and your preferred package manager (`npm`, `yarn`, or `pnpm`) installed.

### 1. Clone the repository

```bash
git clone https://github.com/UserAkku/harness.git
cd harness
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Setup Environment Variables

Create a `.env` file in the root of the project and add your database URL and NextAuth secrets:

```env
DATABASE_URL="your_database_connection_string"
NEXTAUTH_SECRET="your_secure_secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Setup the Database

Generate Prisma client and push the schema to your database:

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the Development Server

Start the development server with Turbopack for faster builds:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧪 Testing

To run the internal simulation test runner:
Navigate to the `TestRunnerTab.tsx` within your editor context, or expand on built-in checks inside `src/simulation/tests/TestRunner.ts`.

## 📜 License

[MIT License](LICENSE)
