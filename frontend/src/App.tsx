import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Login from "./components/Login";
import VoiceTest from "./components/VoiceTest";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/voice-test" element={<VoiceTest />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
