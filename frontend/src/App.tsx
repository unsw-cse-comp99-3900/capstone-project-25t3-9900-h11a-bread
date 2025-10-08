import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8 text-center">
      <div className="flex justify-center items-center mb-8">
        <a href="https://vite.dev" target="_blank" className="p-6">
          <img
            src={viteLogo}
            className="h-24 hover:drop-shadow-lg transition-all duration-300"
            alt="Vite logo"
          />
        </a>
        <a href="https://react.dev" target="_blank" className="p-6">
          <img
            src={reactLogo}
            className="h-24 hover:drop-shadow-lg transition-all duration-300 animate-spin-slow"
            alt="React logo"
          />
        </a>
      </div>
      <h1 className="text-4xl font-bold text-blue-500 mb-8">
        SystemX - React + TypeScript + Docker + Tailwind
      </h1>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded mb-4"
        >
          count is {count}
        </button>
        <p className="text-gray-700 mb-4">
          Edit <code className="bg-gray-100 px-1 rounded">src/App.tsx</code> and
          save to test HMR
        </p>
        <p className="text-sm text-gray-500">
          🐳 SystemX running in Docker container with TypeScript support
        </p>
      </div>
      <p className="text-gray-500 mt-8 text-sm">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
}

export default App;
