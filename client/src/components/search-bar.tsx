import { useState } from "react";
import { SearchX, ArrowRight } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
}

export default function SearchBar({ onSearch, loading = false, placeholder = "Enter your query to find what's missing..." }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
      <div className="flex items-center bg-white border border-gray-300 rounded-full px-6 py-4 shadow-lg hover:shadow-xl transition-shadow focus-within:shadow-xl focus-within:border-google-blue">
        <SearchX className="text-google-gray w-5 h-5 mr-4" />
        <input 
          type="text" 
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 outline-none text-lg"
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={!query.trim() || loading}
          className="bg-google-blue text-white px-6 py-2 rounded-full hover:bg-google-blue-dark transition-colors ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowRight className="w-5 h-5" />
          )}
        </button>
      </div>
    </form>
  );
}
