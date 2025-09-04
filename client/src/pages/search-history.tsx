import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Clock, Search as SearchIcon } from "lucide-react";
import Layout from "@/components/layout-new";
import { Button } from "@/components/ui/button";
import type { Search } from "@shared/schema";

export default function SearchHistory() {
  const [, setLocation] = useLocation();

  const { data: searches = [], isLoading } = useQuery<Search[]>({
    queryKey: ["/api/searches"],
  });

  const handleViewResults = (searchId: number) => {
    setLocation(`/search/${searchId}`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="w-8 h-8 border-4 border-google-blue border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-google-gray-dark mb-2">Search History</h1>
          <p className="text-google-gray">
            Your recent gap analysis searches
          </p>
        </div>

        {searches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-google-gray mb-4">No searches yet</p>
            <p className="text-google-gray">
              Start exploring gaps and opportunities
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {searches.map((search: Search) => (
              <div
                key={search.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <SearchIcon className="w-4 h-4 text-google-gray mr-2" />
                      <h3 className="text-lg font-medium text-google-gray-dark">
                        {search.query}
                      </h3>
                    </div>
                    <div className="flex items-center text-sm text-google-gray">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(search.timestamp).toLocaleDateString()} at{" "}
                      {new Date(search.timestamp).toLocaleTimeString()}
                      <span className="mx-2">•</span>
                      {search.resultsCount} results found
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleViewResults(search.id)}
                    className="ml-4"
                  >
                    View Results
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
