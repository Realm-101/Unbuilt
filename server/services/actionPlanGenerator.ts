import axios from 'axios';
import type { Idea } from '@shared/schema';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  duration: string;
  dependencies: string[];
  deliverables: string[];
  resources: string[];
  successCriteria: string[];
  estimatedCost?: string;
}

export interface Phase {
  id: string;
  name: string;
  objective: string;
  duration: string;
  milestones: Milestone[];
  keyDeliverables: string[];
  budget: string;
  team: string[];
  risks: string[];
  gates: string[]; // Decision gates before moving to next phase
}

export interface ActionPlan {
  id?: string;
  ideaId: number;
  title: string;
  overview: string;
  totalDuration: string;
  totalBudget: string;
  phases: {
    discovery: Phase;
    development: Phase;
    launch: Phase;
    growth: Phase;
  };
  criticalPath: string[]; // Sequence of critical milestones
  resourcePlan: {
    team: {
      role: string;
      count: number;
      whenNeeded: string;
      skills: string[];
    }[];
    tools: {
      category: string;
      specific: string[];
      cost: string;
    }[];
    infrastructure: {
      type: string;
      provider: string;
      estimatedCost: string;
    }[];
  };
  metrics: {
    phase: string;
    kpis: {
      name: string;
      target: string;
      measurement: string;
    }[];
  }[];
  contingencyPlans: {
    risk: string;
    likelihood: 'High' | 'Medium' | 'Low';
    impact: 'High' | 'Medium' | 'Low';
    mitigation: string;
    contingency: string;
  }[];
  nextActions: {
    immediate: string[]; // Next 7 days
    shortTerm: string[]; // Next 30 days
    planning: string[];  // Things to research/prepare
  };
}

export async function generateActionPlan(
  idea: Partial<Idea>,
  validationScore?: number,
  marketSize?: string
): Promise<ActionPlan> {
  if (!XAI_API_KEY) {
    console.warn('⚠️ xAI API key not configured - using fallback action plan');
    return getFallbackActionPlan(idea);
  }

  const prompt = `Generate a comprehensive 4-phase action plan for launching this validated business idea:

Title: ${idea.title}
Description: ${idea.description}
Target Market: ${idea.targetMarket}
Business Model: ${idea.businessModel}
Category: ${idea.category}
Validation Score: ${validationScore ?? 'Not provided'}
Market Size: ${marketSize ?? 'Not provided'}
Initial Investment: ${idea.initialInvestment ? `$${idea.initialInvestment}` : 'Not specified'}

Create a detailed, actionable roadmap with:

1. PHASE 1 - DISCOVERY & VALIDATION (0-3 months)
   - Market research milestones
   - Customer discovery activities
   - MVP definition
   - Team formation
   - Initial funding

2. PHASE 2 - DEVELOPMENT & TESTING (3-9 months)
   - Product development milestones
   - Alpha/Beta testing
   - Early customer acquisition
   - Product-market fit validation
   - Seed funding preparation

3. PHASE 3 - LAUNCH & MARKET ENTRY (9-15 months)
   - Go-to-market execution
   - Marketing campaigns
   - Sales activation
   - Operations scaling
   - Series A preparation

4. PHASE 4 - GROWTH & SCALE (15-27 months)
   - Market expansion
   - Product enhancement
   - Team scaling
   - Revenue optimization
   - Strategic partnerships

For each phase include:
- Specific milestones with timelines
- Resource requirements (team, tools, budget)
- Success criteria and KPIs
- Risk mitigation strategies
- Decision gates

Also provide:
- Critical path analysis
- Resource planning
- Contingency plans
- Immediate next actions

Return ONLY a JSON object matching the ActionPlan interface structure, no additional text.`;

  try {
    const response = await axios.post(
      XAI_API_URL,
      {
        model: 'grok-2-1212',
        messages: [
          {
            role: 'system',
            content: 'You are a strategic business planning expert. Provide detailed, actionable roadmaps in JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 6000,
      },
      {
        headers: {
          'Authorization': `Bearer ${XAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in xAI response');
    }

    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const plan = JSON.parse(cleanContent);
      
      // Add ideaId to the plan
      plan.ideaId = idea.id || 0;
      
      return plan;
    } catch (parseError) {
      console.error('Error parsing xAI action plan response:', parseError);
      return getFallbackActionPlan(idea);
    }
  } catch (error) {
    console.error('xAI action plan generation error:', error);
    return getFallbackActionPlan(idea);
  }
}

function getFallbackActionPlan(idea: Partial<Idea>): ActionPlan {
  const createMilestone = (
    id: string,
    title: string,
    description: string,
    duration: string,
    deliverables: string[]
  ): Milestone => ({
    id,
    title,
    description,
    duration,
    dependencies: [],
    deliverables,
    resources: ['Team member time', 'Collaboration tools'],
    successCriteria: [`${title} completed and validated`],
    estimatedCost: '$1,000-5,000'
  });

  return {
    ideaId: idea.id ?? 0,
    title: `Action Plan: ${idea.title ?? 'New Venture'}`,
    overview: `Comprehensive roadmap to launch and scale ${idea.title}, targeting ${idea.targetMarket} with a ${idea.businessModel} model.`,
    totalDuration: '24 months',
    totalBudget: '$100,000 - $500,000',
    phases: {
      discovery: {
        id: 'phase-1',
        name: 'Discovery & Validation',
        objective: 'Validate market need and define MVP',
        duration: '3 months',
        milestones: [
          createMilestone(
            'm1-1',
            'Market Research Complete',
            'Comprehensive analysis of target market, competitors, and opportunities',
            '3 weeks',
            ['Market research report', 'Competitor analysis', 'TAM/SAM/SOM analysis']
          ),
          createMilestone(
            'm1-2',
            'Customer Interviews',
            'Interview 50+ potential customers to validate problem and solution',
            '4 weeks',
            ['Interview transcripts', 'Insights summary', 'Persona documents']
          ),
          createMilestone(
            'm1-3',
            'MVP Definition',
            'Define minimum viable product features and technical architecture',
            '3 weeks',
            ['MVP specification', 'Technical architecture', 'UI/UX mockups']
          ),
          createMilestone(
            'm1-4',
            'Team Formation',
            'Recruit co-founders and initial team members',
            '2 weeks',
            ['Team roster', 'Equity agreements', 'Roles defined']
          )
        ],
        keyDeliverables: [
          'Validated problem-solution fit',
          'MVP specification document',
          'Go/No-go decision',
          'Initial team assembled'
        ],
        budget: '$5,000 - $15,000',
        team: ['Founder', 'Market Researcher', 'UX Designer'],
        risks: ['Market validation failure', 'Unable to find team'],
        gates: ['Customer validation achieved', 'Team commitment secured']
      },
      development: {
        id: 'phase-2',
        name: 'Development & Testing',
        objective: 'Build and test MVP with early adopters',
        duration: '6 months',
        milestones: [
          createMilestone(
            'm2-1',
            'MVP Development',
            'Build core features of minimum viable product',
            '12 weeks',
            ['Working MVP', 'Documentation', 'Test suite']
          ),
          createMilestone(
            'm2-2',
            'Alpha Testing',
            'Internal testing and quality assurance',
            '2 weeks',
            ['Bug reports fixed', 'Performance optimized', 'Security review']
          ),
          createMilestone(
            'm2-3',
            'Beta Launch',
            'Launch to 100 beta users for feedback',
            '6 weeks',
            ['Beta user feedback', 'Product iterations', 'Retention metrics']
          ),
          createMilestone(
            'm2-4',
            'Product-Market Fit',
            'Achieve measurable product-market fit signals',
            '4 weeks',
            ['PMF metrics', 'User testimonials', 'Case studies']
          )
        ],
        keyDeliverables: [
          'Functional MVP',
          'Beta user base',
          'Product-market fit validation',
          'Seed funding deck'
        ],
        budget: '$25,000 - $100,000',
        team: ['CTO', '2 Developers', 'Product Manager', 'Customer Success'],
        risks: ['Technical debt', 'Slow user adoption', 'Funding challenges'],
        gates: ['MVP feature complete', '40% user retention achieved']
      },
      launch: {
        id: 'phase-3',
        name: 'Launch & Market Entry',
        objective: 'Public launch and establish market presence',
        duration: '6 months',
        milestones: [
          createMilestone(
            'm3-1',
            'Production Launch',
            'Deploy production-ready platform',
            '2 weeks',
            ['Production deployment', 'Monitoring setup', 'Support system']
          ),
          createMilestone(
            'm3-2',
            'Marketing Campaign',
            'Execute go-to-market strategy',
            '8 weeks',
            ['Website launch', 'Content marketing', 'PR coverage']
          ),
          createMilestone(
            'm3-3',
            'Sales Activation',
            'Build sales pipeline and close first customers',
            '12 weeks',
            ['Sales playbook', 'First 10 customers', 'Revenue generation']
          ),
          createMilestone(
            'm3-4',
            'Operations Scale',
            'Scale operations to support growth',
            '4 weeks',
            ['Processes documented', 'Automation implemented', 'Team trained']
          )
        ],
        keyDeliverables: [
          '1,000+ users',
          '$10K+ MRR',
          'Operational excellence',
          'Series A readiness'
        ],
        budget: '$50,000 - $200,000',
        team: ['CEO', 'Sales team (2)', 'Marketing Manager', 'DevOps', 'Support team'],
        risks: ['Competition', 'Scaling issues', 'Cash flow'],
        gates: ['Revenue targets met', 'Unit economics positive']
      },
      growth: {
        id: 'phase-4',
        name: 'Growth & Scale',
        objective: 'Accelerate growth and market expansion',
        duration: '12 months',
        milestones: [
          createMilestone(
            'm4-1',
            'Market Expansion',
            'Enter new geographic or vertical markets',
            '16 weeks',
            ['New market entry', 'Localization', 'Partnerships']
          ),
          createMilestone(
            'm4-2',
            'Product Enhancement',
            'Add advanced features and integrations',
            '20 weeks',
            ['Feature releases', 'API platform', 'Mobile apps']
          ),
          createMilestone(
            'm4-3',
            'Team Scaling',
            'Build world-class team across all functions',
            '12 weeks',
            ['20+ employees', 'Culture defined', 'Leadership team']
          ),
          createMilestone(
            'm4-4',
            'Series A Funding',
            'Raise growth capital from VCs',
            '12 weeks',
            ['Pitch deck', 'Due diligence', '$2M+ raised']
          )
        ],
        keyDeliverables: [
          '10,000+ users',
          '$100K+ MRR',
          'Market leadership position',
          'Series A closed'
        ],
        budget: '$200,000 - $1,000,000',
        team: ['Full executive team', '20+ employees', 'Advisory board'],
        risks: ['Market saturation', 'Talent retention', 'Competitive threats'],
        gates: ['Sustainable growth achieved', 'Path to profitability clear']
      }
    },
    criticalPath: [
      'Customer validation',
      'MVP development',
      'Product-market fit',
      'Revenue generation',
      'Sustainable growth'
    ],
    resourcePlan: {
      team: [
        {
          role: 'Technical Co-founder/CTO',
          count: 1,
          whenNeeded: 'Phase 1',
          skills: ['Full-stack development', 'Architecture', 'Team leadership']
        },
        {
          role: 'Developers',
          count: 3,
          whenNeeded: 'Phase 2',
          skills: ['Frontend', 'Backend', 'DevOps']
        },
        {
          role: 'Product Manager',
          count: 1,
          whenNeeded: 'Phase 2',
          skills: ['Product strategy', 'User research', 'Agile']
        },
        {
          role: 'Marketing Lead',
          count: 1,
          whenNeeded: 'Phase 3',
          skills: ['Digital marketing', 'Content', 'Growth hacking']
        },
        {
          role: 'Sales Team',
          count: 2,
          whenNeeded: 'Phase 3',
          skills: ['B2B sales', 'Account management', 'Pipeline building']
        }
      ],
      tools: [
        {
          category: 'Development',
          specific: ['GitHub', 'AWS/Cloud', 'CI/CD tools'],
          cost: '$500/month'
        },
        {
          category: 'Marketing',
          specific: ['CRM', 'Email marketing', 'Analytics'],
          cost: '$300/month'
        },
        {
          category: 'Operations',
          specific: ['Project management', 'Communication', 'Documentation'],
          cost: '$200/month'
        }
      ],
      infrastructure: [
        {
          type: 'Cloud hosting',
          provider: 'AWS/GCP/Azure',
          estimatedCost: '$100-1000/month'
        },
        {
          type: 'Database',
          provider: 'PostgreSQL/MongoDB',
          estimatedCost: '$50-500/month'
        },
        {
          type: 'CDN/Security',
          provider: 'Cloudflare',
          estimatedCost: '$20-200/month'
        }
      ]
    },
    metrics: [
      {
        phase: 'Discovery',
        kpis: [
          { name: 'Customer interviews', target: '50+', measurement: 'Count' },
          { name: 'Problem validation', target: '70% confirm', measurement: 'Percentage' }
        ]
      },
      {
        phase: 'Development',
        kpis: [
          { name: 'Beta users', target: '100+', measurement: 'Count' },
          { name: 'User retention', target: '40% at 30 days', measurement: 'Percentage' }
        ]
      },
      {
        phase: 'Launch',
        kpis: [
          { name: 'Total users', target: '1,000+', measurement: 'Count' },
          { name: 'MRR', target: '$10,000', measurement: 'Revenue' },
          { name: 'CAC', target: '<$100', measurement: 'Cost' }
        ]
      },
      {
        phase: 'Growth',
        kpis: [
          { name: 'Total users', target: '10,000+', measurement: 'Count' },
          { name: 'MRR', target: '$100,000', measurement: 'Revenue' },
          { name: 'LTV/CAC', target: '>3', measurement: 'Ratio' }
        ]
      }
    ],
    contingencyPlans: [
      {
        risk: 'Slower than expected user adoption',
        likelihood: 'Medium',
        impact: 'High',
        mitigation: 'Increase customer development, adjust positioning',
        contingency: 'Pivot to adjacent market or use case'
      },
      {
        risk: 'Technical scalability issues',
        likelihood: 'Low',
        impact: 'High',
        mitigation: 'Build with scalability in mind, load testing',
        contingency: 'Emergency infrastructure upgrade, hire DevOps expert'
      },
      {
        risk: 'Funding challenges',
        likelihood: 'Medium',
        impact: 'Medium',
        mitigation: 'Bootstrap longer, revenue-first approach',
        contingency: 'Reduce burn rate, focus on profitability'
      },
      {
        risk: 'Key team member departure',
        likelihood: 'Low',
        impact: 'Medium',
        mitigation: 'Competitive compensation, equity, culture',
        contingency: 'Have succession plan, document everything'
      }
    ],
    nextActions: {
      immediate: [
        'Schedule 10 customer discovery calls',
        'Create landing page for idea validation',
        'Join relevant industry communities',
        'Start building email list',
        'Define MVP feature set'
      ],
      shortTerm: [
        'Complete 50 customer interviews',
        'Develop detailed financial model',
        'Create pitch deck for co-founders',
        'Register business entity',
        'Set up basic infrastructure'
      ],
      planning: [
        'Research competitors deeply',
        'Identify potential advisors',
        'Map out technical architecture',
        'Develop go-to-market strategy',
        'Create hiring plan'
      ]
    }
  };
}

export function summarizeActionPlan(plan: ActionPlan): {
  summary: string;
  totalMilestones: number;
  criticalMilestones: string[];
  estimatedTimeline: string;
  budgetRange: string;
  teamSize: string;
  immediateActions: string[];
} {
  const totalMilestones = 
    plan.phases.discovery.milestones.length +
    plan.phases.development.milestones.length +
    plan.phases.launch.milestones.length +
    plan.phases.growth.milestones.length;

  const criticalMilestones = [
    plan.phases.discovery.milestones[0]?.title,
    plan.phases.development.milestones.find(m => m.title.includes('MVP'))?.title,
    plan.phases.launch.milestones[0]?.title,
    plan.phases.growth.milestones.find(m => m.title.includes('Series'))?.title
  ].filter((m): m is string => Boolean(m));

  return {
    summary: plan.overview,
    totalMilestones,
    criticalMilestones,
    estimatedTimeline: plan.totalDuration,
    budgetRange: plan.totalBudget,
    teamSize: `${plan.resourcePlan.team.reduce((sum, role) => sum + role.count, 0)}+ people`,
    immediateActions: plan.nextActions.immediate
  };
}