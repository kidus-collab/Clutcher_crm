# Leads.tsx Refactoring Plan

## Current State Analysis
- **File**: components/Leads.tsx
- **Current Approach**: Mock data with analytics focus
- **Target**: Real data with enhanced UI (Board, List, Analytics tabs)

## Refactoring Strategy

### Phase 1: Foundation
1. **Keep existing imports and state management**
   - Preserve current navigation hooks
   - Maintain existing modal patterns
   - Keep existing data fetching logic

2. **Replace mock data with real data integration**
   - Replace MOCK_LEADS with actual getLeads() calls
   - Maintain existing filtering and column logic

### Phase 2: UI Structure Implementation
1. **Tab Navigation System**
   ```
   Board | List | Analytics
   ────────────────────────
   [Sliding Indicator]
   ```

2. **Header Section**
   - Title: "Leads Central"
   - Subtitle: "Advanced prospect intelligence & pipeline oversight"
   - Search bar with filter button
   - Add Lead button (positioned correctly)

3. **Board View** (Default Tab)
   - Kanban-style columns: New, No Reply, Negotiations, Converted
   - Enhanced card design with hover effects
   - Drag and drop functionality (if feasible)
   - Quick actions: Outreach, Delete

4. **List View** (Table Tab)
   - Detailed table with sortable columns
   - Inline editing capabilities
   - Bulk actions
   - Advanced filtering and search

5. **Analytics View** (Analytics Tab)
   - Outcome summary cards
   - Pipeline health metrics
   - Performance charts (funnel, intensity, trends)
   - Conversion rates and KPIs

### Phase 3: Component Architecture
1. **Tab Components**
   - `BoardView`: Kanban board implementation
   - `ListView`: Table view with advanced features
   - `AnalyticsView`: Charts and metrics dashboard

2. **Shared Components**
   - `LeadCard`: Reusable card component
   - `StatusBadge`: Consistent status indicators
   - `ActionButtons`: Outreach, edit, delete actions

3. **Data Flow**
   ```
   getLeads() → State Management → UI Components
   ```

### Phase 4: Implementation Order
1. **Update state management** (preserve existing patterns)
2. **Implement tab navigation** (add sliding indicator)
3. **Refactor board view** (enhance existing cards)
4. **Add list view** (new table component)
5. **Implement analytics view** (new charts and metrics)
6. **Add modal functionality** (enhance existing)
7. **Test all views** (ensure functionality preserved)

### Phase 5: Key Considerations
1. **Maintain existing URL routing** (/outreach?lead=${id})
2. **Preserve existing status management**
3. **Keep existing modal patterns**
4. **Ensure responsive design** (mobile-first approach)
5. **Maintain TypeScript types** (update as needed)

### Success Criteria
- [ ] All existing functionality preserved
- [ ] New UI implemented correctly
- [ ] Real data integration working
- [ ] Tab navigation functional
- [ ] Modal system working
- [ ] Responsive design maintained
- [ ] No breaking changes to existing workflows