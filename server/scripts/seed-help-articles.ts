import { db } from '../db';
import { helpArticles, type InsertHelpArticle } from '@shared/schema';

const helpArticlesData: Omit<InsertHelpArticle, 'id' | 'viewCount' | 'helpfulCount' | 'createdAt' | 'updatedAt'>[] = [
  // Getting Started Articles
  {
    title: 'Welcome to Unbuilt',
    content: `
      <h2>Welcome to Unbuilt!</h2>
      <p>Unbuilt is an AI-powered innovation gap analysis platform that helps you discover untapped market opportunities.</p>
      
      <h3>Getting Started</h3>
      <ol>
        <li><strong>Create your account</strong> - Sign up with your email or use social login</li>
        <li><strong>Explore the dashboard</strong> - Familiarize yourself with the interface</li>
        <li><strong>Run your first search</strong> - Enter an industry or problem area to analyze</li>
        <li><strong>Review insights</strong> - Examine the AI-generated gap analysis</li>
        <li><strong>Save favorites</strong> - Bookmark promising opportunities</li>
      </ol>
      
      <h3>Key Features</h3>
      <ul>
        <li>AI-powered market gap discovery</li>
        <li>Innovation scoring and feasibility ratings</li>
        <li>Competitive analysis</li>
        <li>4-phase action plans</li>
        <li>Project organization</li>
        <li>Progress tracking</li>
      </ul>
    `,
    context: ['dashboard', 'home', 'onboarding'],
    category: 'getting-started',
    tags: ['welcome', 'introduction', 'basics'],
    videoUrl: null,
    relatedArticles: [],
  },
  {
    title: 'How to Run Your First Search',
    content: `
      <h2>Running Your First Gap Analysis</h2>
      <p>Follow these steps to discover market opportunities:</p>
      
      <h3>Step 1: Navigate to Search</h3>
      <p>Click the search bar on your dashboard or navigate to the "Discover" section.</p>
      
      <h3>Step 2: Enter Your Query</h3>
      <p>Be specific about the industry or problem area you want to explore. Good examples:</p>
      <ul>
        <li>"Sustainable packaging for e-commerce"</li>
        <li>"Mental health apps for teenagers"</li>
        <li>"AI tools for small business accounting"</li>
      </ul>
      
      <h3>Step 3: Review Results</h3>
      <p>Our AI will analyze the market and present gaps with:</p>
      <ul>
        <li>Innovation scores (0-100)</li>
        <li>Feasibility ratings (High/Medium/Low)</li>
        <li>Market potential indicators</li>
        <li>Detailed gap reasons</li>
      </ul>
      
      <h3>Step 4: Save Promising Opportunities</h3>
      <p>Click the star icon to favorite results you want to explore further.</p>
    `,
    context: ['search', 'dashboard'],
    category: 'getting-started',
    tags: ['search', 'tutorial', 'first-time'],
    videoUrl: null,
    relatedArticles: [],
  },
  {
    title: 'Understanding Your Dashboard',
    content: `
      <h2>Dashboard Overview</h2>
      <p>Your dashboard is your command center for innovation discovery.</p>
      
      <h3>Recent Searches</h3>
      <p>View your 5 most recent gap analyses with quick access to results.</p>
      
      <h3>Favorites</h3>
      <p>All your starred opportunities in one place for easy reference.</p>
      
      <h3>Projects</h3>
      <p>Organize multiple analyses into projects for better management.</p>
      
      <h3>Quick Stats</h3>
      <ul>
        <li><strong>Searches Used:</strong> Track your monthly search quota</li>
        <li><strong>Favorites Count:</strong> Number of saved opportunities</li>
        <li><strong>Active Projects:</strong> Projects you're currently working on</li>
      </ul>
      
      <h3>Tier Indicator</h3>
      <p>See your current plan (Free/Pro/Enterprise) and usage limits at a glance.</p>
    `,
    context: ['dashboard'],
    category: 'getting-started',
    tags: ['dashboard', 'navigation', 'overview'],
    videoUrl: null,
    relatedArticles: [],
  },

  // Features Articles
  {
    title: 'Understanding Innovation Scores',
    content: `
      <h2>Innovation Scores Explained</h2>
      <p>Innovation scores range from 0-100 and indicate the novelty and potential impact of a market gap.</p>
      
      <h3>Score Ranges</h3>
      <ul>
        <li><strong>80-100:</strong> Highly innovative, breakthrough opportunities</li>
        <li><strong>60-79:</strong> Strong innovation potential with clear differentiation</li>
        <li><strong>40-59:</strong> Moderate innovation, incremental improvements</li>
        <li><strong>0-39:</strong> Low innovation, crowded market space</li>
      </ul>
      
      <h3>What Influences the Score?</h3>
      <ul>
        <li>Market saturation level</li>
        <li>Technology novelty</li>
        <li>Unmet customer needs</li>
        <li>Competitive landscape</li>
        <li>Timing and market readiness</li>
      </ul>
      
      <h3>How to Use Scores</h3>
      <p>Higher scores indicate better opportunities, but also consider:</p>
      <ul>
        <li>Your resources and capabilities</li>
        <li>Market size and potential</li>
        <li>Feasibility ratings</li>
        <li>Your risk tolerance</li>
      </ul>
    `,
    context: ['search-results', 'analysis'],
    category: 'features',
    tags: ['scoring', 'innovation', 'metrics'],
    videoUrl: null,
    relatedArticles: [],
  },
  {
    title: 'Working with Projects',
    content: `
      <h2>Organizing with Projects</h2>
      <p>Projects help you organize multiple gap analyses around themes or business ideas.</p>
      
      <h3>Creating a Project</h3>
      <ol>
        <li>Click "New Project" on your dashboard</li>
        <li>Enter a descriptive name</li>
        <li>Add an optional description</li>
        <li>Click "Create"</li>
      </ol>
      
      <h3>Adding Analyses to Projects</h3>
      <p>You can add analyses to projects in two ways:</p>
      <ul>
        <li>Drag and drop from your dashboard</li>
        <li>Use the "Add to Project" button on any analysis</li>
      </ul>
      
      <h3>Managing Projects</h3>
      <ul>
        <li><strong>Rename:</strong> Click the edit icon next to the project name</li>
        <li><strong>Archive:</strong> Hide completed projects from your main view</li>
        <li><strong>Delete:</strong> Permanently remove a project (analyses remain)</li>
      </ul>
      
      <h3>Best Practices</h3>
      <ul>
        <li>Create projects for different business verticals</li>
        <li>Use descriptive names and descriptions</li>
        <li>Add tags for easy filtering</li>
        <li>Archive old projects to keep your dashboard clean</li>
      </ul>
    `,
    context: ['dashboard', 'projects'],
    category: 'features',
    tags: ['projects', 'organization', 'management'],
    videoUrl: null,
    relatedArticles: [],
  },
  {
    title: 'Action Plan Progress Tracking',
    content: `
      <h2>Tracking Your Progress</h2>
      <p>Every gap analysis includes a 4-phase action plan to help you bring ideas to life.</p>
      
      <h3>The Four Phases</h3>
      <ol>
        <li><strong>Research & Validation:</strong> Validate the opportunity</li>
        <li><strong>Planning & Strategy:</strong> Develop your approach</li>
        <li><strong>Development & Testing:</strong> Build and test your solution</li>
        <li><strong>Launch & Growth:</strong> Go to market and scale</li>
      </ol>
      
      <h3>Checking Off Steps</h3>
      <p>Click the checkbox next to any step to mark it complete. Your progress is automatically saved.</p>
      
      <h3>Progress Indicators</h3>
      <ul>
        <li>Phase completion percentages</li>
        <li>Overall progress bar</li>
        <li>Visual celebration when completing phases</li>
      </ul>
      
      <h3>Progress Dashboard</h3>
      <p>View completion status across all your active projects in one place.</p>
      
      <h3>Tips</h3>
      <ul>
        <li>Complete steps in order for best results</li>
        <li>Use the undo button if you check something by mistake</li>
        <li>Export your progress reports for team updates</li>
      </ul>
    `,
    context: ['action-plan', 'progress'],
    category: 'features',
    tags: ['action-plan', 'progress', 'tracking'],
    videoUrl: null,
    relatedArticles: [],
  },
  {
    title: 'Sharing Your Analysis',
    content: `
      <h2>Sharing Gap Analyses</h2>
      <p>Share your findings with collaborators, investors, or team members.</p>
      
      <h3>Creating a Share Link</h3>
      <ol>
        <li>Open any gap analysis</li>
        <li>Click the "Share" button</li>
        <li>Set an optional expiration date</li>
        <li>Copy the generated link</li>
      </ol>
      
      <h3>Share Link Features</h3>
      <ul>
        <li>Read-only access (viewers can't edit)</li>
        <li>No account required to view</li>
        <li>Track view counts</li>
        <li>Set expiration dates</li>
        <li>Revoke access anytime</li>
      </ul>
      
      <h3>Managing Share Links</h3>
      <p>View all your active share links from your dashboard:</p>
      <ul>
        <li>See view counts and last accessed times</li>
        <li>Update expiration dates</li>
        <li>Revoke links instantly</li>
      </ul>
      
      <h3>Security</h3>
      <p>Share links use secure tokens and can be revoked at any time for your protection.</p>
    `,
    context: ['analysis', 'sharing'],
    category: 'features',
    tags: ['sharing', 'collaboration', 'links'],
    videoUrl: null,
    relatedArticles: [],
  },

  // Troubleshooting Articles
  {
    title: 'Search Not Returning Results',
    content: `
      <h2>Troubleshooting Empty Search Results</h2>
      
      <h3>Common Causes</h3>
      <ul>
        <li>Query too broad or vague</li>
        <li>Query too specific or niche</li>
        <li>Temporary API issues</li>
        <li>Network connectivity problems</li>
      </ul>
      
      <h3>Solutions</h3>
      
      <h4>1. Refine Your Query</h4>
      <p>Try these approaches:</p>
      <ul>
        <li>Be more specific: "AI chatbots for healthcare" instead of "AI"</li>
        <li>Include context: "sustainable packaging for food delivery"</li>
        <li>Focus on problems: "solutions for remote team collaboration"</li>
      </ul>
      
      <h4>2. Check Your Connection</h4>
      <p>Ensure you have a stable internet connection.</p>
      
      <h4>3. Try Again Later</h4>
      <p>If you see an error message, our AI services may be temporarily unavailable.</p>
      
      <h4>4. Contact Support</h4>
      <p>If problems persist, reach out to our support team with details about your search.</p>
    `,
    context: ['search', 'troubleshooting'],
    category: 'troubleshooting',
    tags: ['search', 'errors', 'problems'],
    videoUrl: null,
    relatedArticles: [],
  },
  {
    title: 'Account and Login Issues',
    content: `
      <h2>Resolving Login Problems</h2>
      
      <h3>Can't Log In</h3>
      <ul>
        <li>Verify your email and password are correct</li>
        <li>Check for typos in your email address</li>
        <li>Try the "Forgot Password" link</li>
        <li>Clear your browser cache and cookies</li>
        <li>Try a different browser</li>
      </ul>
      
      <h3>Password Reset Not Working</h3>
      <ul>
        <li>Check your spam/junk folder for the reset email</li>
        <li>Wait a few minutes for the email to arrive</li>
        <li>Request a new reset link if the old one expired</li>
        <li>Contact support if you don't receive the email</li>
      </ul>
      
      <h3>Account Locked</h3>
      <p>After multiple failed login attempts, your account may be temporarily locked for security. Wait 30 minutes and try again.</p>
      
      <h3>Social Login Issues</h3>
      <ul>
        <li>Ensure you're using the same provider you signed up with</li>
        <li>Check that pop-ups are enabled in your browser</li>
        <li>Try logging in directly with email/password</li>
      </ul>
    `,
    context: ['login', 'account'],
    category: 'troubleshooting',
    tags: ['login', 'password', 'account'],
    videoUrl: null,
    relatedArticles: [],
  },

  // FAQ Articles
  {
    title: 'Frequently Asked Questions',
    content: `
      <h2>Common Questions</h2>
      
      <h3>What is a market gap?</h3>
      <p>A market gap is an unmet need or underserved area in a market where customer demand exists but current solutions are inadequate or non-existent.</p>
      
      <h3>How accurate are the AI insights?</h3>
      <p>Our AI analyzes real-time data from multiple sources to provide insights. While highly accurate, we recommend validating findings with your own research.</p>
      
      <h3>Can I export my results?</h3>
      <p>Yes! Pro users can export analyses in PDF, CSV, and JSON formats. Free users have limited export capabilities.</p>
      
      <h3>How many searches can I do?</h3>
      <ul>
        <li><strong>Free:</strong> 5 searches per month</li>
        <li><strong>Pro:</strong> Unlimited searches</li>
        <li><strong>Enterprise:</strong> Unlimited searches + priority support</li>
      </ul>
      
      <h3>Is my data secure?</h3>
      <p>Yes. We use enterprise-grade encryption and security measures to protect your data. See our Security page for details.</p>
      
      <h3>Can I collaborate with my team?</h3>
      <p>Yes! Share analyses via secure links or upgrade to Enterprise for full team collaboration features.</p>
      
      <h3>What payment methods do you accept?</h3>
      <p>We accept all major credit cards through Stripe. Enterprise customers can arrange invoicing.</p>
    `,
    context: ['general', 'faq'],
    category: 'faq',
    tags: ['faq', 'questions', 'common'],
    videoUrl: null,
    relatedArticles: [],
  },
  {
    title: 'Pricing and Plans',
    content: `
      <h2>Understanding Our Plans</h2>
      
      <h3>Free Plan</h3>
      <ul>
        <li>5 searches per month</li>
        <li>Basic gap analysis</li>
        <li>Innovation scoring</li>
        <li>Limited exports</li>
        <li>Community support</li>
      </ul>
      <p><strong>Best for:</strong> Exploring the platform and occasional research</p>
      
      <h3>Pro Plan - $29/month</h3>
      <ul>
        <li>Unlimited searches</li>
        <li>Advanced AI features</li>
        <li>Full export capabilities (PDF, CSV, JSON)</li>
        <li>Business plan generation</li>
        <li>Action plan tracking</li>
        <li>Priority support</li>
        <li>API access</li>
      </ul>
      <p><strong>Best for:</strong> Entrepreneurs and innovators</p>
      
      <h3>Enterprise Plan - Custom Pricing</h3>
      <ul>
        <li>Everything in Pro</li>
        <li>Team collaboration</li>
        <li>Custom integrations</li>
        <li>Dedicated support</li>
        <li>SLA guarantees</li>
        <li>Custom training</li>
      </ul>
      <p><strong>Best for:</strong> Organizations and teams</p>
      
      <h3>Free Trial</h3>
      <p>Try Pro features free for 7 days. No credit card required.</p>
    `,
    context: ['pricing', 'plans', 'subscription'],
    category: 'faq',
    tags: ['pricing', 'plans', 'subscription'],
    videoUrl: null,
    relatedArticles: [],
  },
];

export async function seedHelpArticles() {
  console.log('🌱 Seeding help articles...');
  
  try {
    // Check if articles already exist
    const existingArticles = await db.select().from(helpArticles).limit(1);
    
    if (existingArticles.length > 0) {
      console.log('ℹ️  Help articles already exist, skipping seed');
      return;
    }
    
    // Insert all articles
    for (const article of helpArticlesData) {
      await db.insert(helpArticles).values(article);
    }
    
    console.log(`✅ Successfully seeded ${helpArticlesData.length} help articles`);
  } catch (error) {
    console.error('❌ Error seeding help articles:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedHelpArticles()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}
