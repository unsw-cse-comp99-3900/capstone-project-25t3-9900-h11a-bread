import Header from "./Header";
import AccentDropdown from "./AccentDropdown";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <Header />
      <main className="flex justify-center items-center">
        {/* Add your main content here */}
      </main>
    </div>
  );
};

export default Home;
