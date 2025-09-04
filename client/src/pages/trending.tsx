import Layout from "@/components/layout-new";
import TrendingDashboard from "@/components/trending-dashboard";

export default function Trending() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <TrendingDashboard />
      </div>
    </Layout>
  );
}