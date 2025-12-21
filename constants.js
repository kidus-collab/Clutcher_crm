// New requested order: New -> Qualified -> Contacted(outreach) -> Proposal (follow up) -> Won/closed
export const PIPELINE_STAGES = [
    'New', 'Qualified', 'Contacted', 'Proposal', 'Won'
];
export const MOCK_KPIS = [
    { id: '1', label: 'Closed Leads', value: '0', delta: '+0%', isPositive: true, icon: 'CheckSquare' },
    { id: '2', label: 'Unclosed Leads', value: '0', delta: '+0%', isPositive: true, icon: 'Users' },
    { id: '3', label: 'New Leads', value: '142', delta: '+28%', isPositive: true, icon: 'PlusCircle' },
    { id: '4', label: 'Outreach Sent', value: '350', delta: '+15%', isPositive: true, icon: 'Send' },
];
export const MOCK_DEALS = [
    { id: 'd1', title: 'Enterprise License', company: 'Acme Corp', value: 45000, stage: 'Proposal', probability: 60, lastContact: '2d ago' },
    { id: 'd2', title: 'Q3 Consultation', company: 'Globex', value: 12000, stage: 'Qualified', probability: 40, lastContact: '1d ago' },
    { id: 'd3', title: 'Team Plan', company: 'Soylent Corp', value: 8500, stage: 'New', probability: 10, lastContact: '4h ago' },
    { id: 'd4', title: 'Expansion Pack', company: 'Initech', value: 25000, stage: 'Contacted', probability: 80, lastContact: '5d ago' },
    { id: 'd5', title: 'Startup Tier', company: 'Umbrella Corp', value: 5000, stage: 'Qualified', probability: 20, lastContact: '1w ago' },
    { id: 'd6', title: 'Global Rollout', company: 'Stark Ind', value: 120000, stage: 'Won', probability: 100, lastContact: 'Just now' },
];
export const MOCK_LEADS = [
    {
        id: 'l1',
        business: {
            id: 'b1',
            name: 'Cyberdyne Systems',
            website: 'cyberdyne.net',
            email: 'contact@cyberdyne.net',
            phone: '+1 555 0199',
            socials: [{ platform: 'twitter', url: '#', handle: '@cyberdyne' }, { platform: 'linkedin', url: '#', handle: 'Cyberdyne Systems' }]
        },
        status: 'Hot',
        source: 'Scraper',
        lastContact: '2 days ago',
        tags: ['AI', 'Defense'],
        rating: 4,
        outcome: 'Interested'
    },
    {
        id: 'l2',
        business: {
            id: 'b2',
            name: 'The Continental',
            website: 'continental.hotel',
            email: 'concierge@continental.hotel',
            phone: '+1 555 0100',
            socials: [{ platform: 'instagram', url: '#', handle: '@continental_official' }]
        },
        status: 'Warm',
        source: 'Referral',
        lastContact: '1 week ago',
        tags: ['Hospitality'],
        rating: 3,
        outcome: 'Pending'
    },
    {
        id: 'l3',
        business: {
            id: 'b3',
            name: 'Weyland-Yutani',
            website: 'weyland.corp',
            email: 'inquiries@weyland.corp',
            phone: '+1 555 9988',
            socials: [{ platform: 'linkedin', url: '#', handle: 'Weyland-Yutani Corp' }]
        },
        status: 'New',
        source: 'Scraper',
        lastContact: 'Just now',
        tags: ['Space', 'Logistics'],
        rating: 0,
        outcome: 'Pending'
    },
];
export const MOCK_ACTIVITIES = [
    { id: 'a1', type: 'email', description: 'Sent proposal to Acme Corp', timestamp: '10:30 AM', isCompleted: true },
    { id: 'a2', type: 'call', description: 'Discovery call with Globex', timestamp: '11:15 AM', isCompleted: true },
    { id: 'a3', type: 'meeting', description: 'Internal pipeline review', timestamp: '2:00 PM', isCompleted: false },
    { id: 'a4', type: 'social', description: 'Followed up via LinkedIn with Stark', timestamp: '4:45 PM', isCompleted: false },
];
export const CHART_DATA = [
    { name: 'Mon', value: 12 },
    { name: 'Tue', value: 15 },
    { name: 'Wed', value: 14 },
    { name: 'Thu', value: 18 },
    { name: 'Fri', value: 22 },
    { name: 'Sat', value: 24 },
    { name: 'Sun', value: 28 },
];
