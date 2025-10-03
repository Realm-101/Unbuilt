import { eq, and, or, desc, inArray } from 'drizzle-orm';
import { db } from '../db';
import { 
  teams, 
  teamMembers, 
  ideaShares, 
  comments, 
  activityFeed,
  ideas,
  type Team,
  type TeamMember,
  type IdeaShare,
  type Comment,
  type ActivityFeedItem
} from '@shared/schema';

// Team Management
export async function createTeam(
  name: string, 
  description: string | null, 
  ownerId: string
): Promise<Team> {
  const [team] = await db.insert(teams).values({
    name,
    description,
    ownerId,
  }).returning();
  
  // Add owner as team member
  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: ownerId,
    email: ownerId, // This should be the user's email, but we'll use userId for now
    role: 'owner',
    invitedBy: ownerId,
    status: 'active'
  });
  
  // Log activity
  await logActivity({
    teamId: team.id,
    userId: ownerId,
    userEmail: ownerId,
    action: 'created',
    entityType: 'team',
    entityId: team.id,
    details: { teamName: name }
  });
  
  return team;
}

export async function inviteTeamMember(
  teamId: number,
  email: string,
  role: string,
  invitedBy: string
): Promise<TeamMember> {
  const [member] = await db.insert(teamMembers).values({
    teamId,
    userId: email, // Will be updated when user accepts invitation
    email,
    role,
    invitedBy,
    status: 'invited'
  }).returning();
  
  await logActivity({
    teamId,
    userId: invitedBy,
    userEmail: invitedBy,
    action: 'invited',
    entityType: 'member',
    entityId: member.id,
    details: { email, role }
  });
  
  return member;
}

export async function getTeamsByUser(userId: string): Promise<(Team & { memberCount: number })[]> {
  const userTeams = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, 'active')
      )
    );
    
  if (userTeams.length === 0) return [];
  
  const teamIds = userTeams.map((tm: TeamMember) => tm.teamId);
  const teamsData = await db
    .select()
    .from(teams)
    .where(inArray(teams.id, teamIds));
    
  // Get member counts
  const memberCounts = await Promise.all(
    teamsData.map(async (team: Team) => {
      const members = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, team.id));
      return { teamId: team.id, count: members.length };
    })
  );
  
  return teamsData.map((team: Team) => ({
    ...team,
    memberCount: memberCounts.find((mc: { teamId: number; count: number }) => mc.teamId === team.id)?.count || 0
  }));
}

// Idea Sharing
export async function shareIdea(
  ideaId: number,
  sharedBy: string,
  options: {
    teamId?: number;
    sharedWith?: string;
    permissions?: {
      canEdit: boolean;
      canComment: boolean;
      canShare: boolean;
    };
    expiresAt?: string;
  }
): Promise<IdeaShare> {
  const [share] = await db.insert(ideaShares).values({
    ideaId,
    teamId: options.teamId || null,
    sharedWith: options.sharedWith || null,
    sharedBy,
    permissions: options.permissions || { canEdit: false, canComment: true, canShare: false },
    expiresAt: options.expiresAt || null
  }).returning();
  
  // Get idea details for activity log
  const [idea] = await db.select().from(ideas).where(eq(ideas.id, ideaId));
  
  await logActivity({
    teamId: options.teamId || null,
    ideaId,
    userId: sharedBy,
    userEmail: sharedBy,
    action: 'shared',
    entityType: 'idea',
    entityId: ideaId,
    details: { 
      ideaTitle: idea?.title,
      sharedWith: options.sharedWith || `Team ${options.teamId}`,
      permissions: options.permissions 
    }
  });
  
  return share;
}

export async function getSharedIdeas(userId: string, teamIds: number[] = []): Promise<any[]> {
  const shares = await db
    .select()
    .from(ideaShares)
    .where(
      or(
        eq(ideaShares.sharedWith, userId),
        teamIds.length > 0 ? inArray(ideaShares.teamId, teamIds) : undefined
      )
    );
    
  if (shares.length === 0) return [];
  
  const ideaIds = shares.map((s: IdeaShare) => s.ideaId);
  const ideasData = await db
    .select()
    .from(ideas)
    .where(inArray(ideas.id, ideaIds));
    
  return ideasData.map((idea: any) => {
    const share = shares.find((s: IdeaShare) => s.ideaId === idea.id);
    return {
      ...idea,
      shareInfo: share
    };
  });
}

// Comments System
export async function addComment(
  ideaId: number,
  userId: string,
  userEmail: string,
  content: string,
  parentId: number | null = null
): Promise<Comment> {
  const [comment] = await db.insert(comments).values({
    ideaId,
    userId,
    userEmail,
    content,
    parentId
  }).returning();
  
  // Get idea details for activity log
  const [idea] = await db.select().from(ideas).where(eq(ideas.id, ideaId));
  
  await logActivity({
    ideaId,
    userId,
    userEmail,
    action: 'commented',
    entityType: 'comment',
    entityId: comment.id,
    details: { 
      ideaTitle: idea?.title,
      commentPreview: content.substring(0, 100),
      isReply: !!parentId
    }
  });
  
  return comment;
}

export async function getComments(
  ideaId: number,
  includeReplies: boolean = true
): Promise<Comment[]> {
  const allComments = await db
    .select()
    .from(comments)
    .where(eq(comments.ideaId, ideaId))
    .orderBy(desc(comments.createdAt));
    
  if (!includeReplies) {
    return allComments.filter((c: Comment) => !c.parentId);
  }
  
  // Organize comments in a hierarchical structure
  return organizeComments(allComments);
}

function organizeComments(allComments: Comment[]): Comment[] {
  const commentMap = new Map<number, Comment & { replies?: Comment[] }>();
  const topLevelComments: (Comment & { replies?: Comment[] })[] = [];
  
  // First pass: Create map of all comments
  allComments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });
  
  // Second pass: Organize into hierarchy
  allComments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.id)!;
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(commentWithReplies);
      }
    } else {
      topLevelComments.push(commentWithReplies);
    }
  });
  
  return topLevelComments;
}

export async function toggleCommentReaction(
  commentId: number,
  userId: string,
  reaction: string
): Promise<Comment> {
  const [comment] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId));
    
  if (!comment) {
    throw new Error('Comment not found');
  }
  
  const reactions = (comment.reactions as any) || {};
  const reactionUsers = reactions[reaction] || [];
  
  if (reactionUsers.includes(userId)) {
    // Remove reaction
    reactions[reaction] = reactionUsers.filter((u: string) => u !== userId);
    if (reactions[reaction].length === 0) {
      delete reactions[reaction];
    }
  } else {
    // Add reaction
    reactions[reaction] = [...reactionUsers, userId];
  }
  
  const [updated] = await db
    .update(comments)
    .set({ reactions })
    .where(eq(comments.id, commentId))
    .returning();
    
  return updated;
}

export async function resolveComment(
  commentId: number,
  resolved: boolean
): Promise<Comment> {
  const [updated] = await db
    .update(comments)
    .set({ isResolved: resolved })
    .where(eq(comments.id, commentId))
    .returning();
    
  return updated;
}

// Activity Feed
export async function logActivity(params: {
  teamId?: number | null;
  ideaId?: number | null;
  userId: string;
  userEmail: string;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: any;
}): Promise<ActivityFeedItem> {
  const [activity] = await db.insert(activityFeed).values({
    teamId: params.teamId,
    ideaId: params.ideaId,
    userId: params.userId,
    userEmail: params.userEmail,
    action: params.action,
    entityType: params.entityType || null,
    entityId: params.entityId || null,
    details: params.details || {}
  }).returning();
  
  return activity;
}

export async function getActivityFeed(options: {
  teamId?: number;
  ideaId?: number;
  userId?: string;
  limit?: number;
}): Promise<ActivityFeedItem[]> {
  let query = db.select().from(activityFeed);
  
  const conditions = [];
  if (options.teamId) {
    conditions.push(eq(activityFeed.teamId, options.teamId));
  }
  if (options.ideaId) {
    conditions.push(eq(activityFeed.ideaId, options.ideaId));
  }
  if (options.userId) {
    conditions.push(eq(activityFeed.userId, options.userId));
  }
  
  if (conditions.length > 0) {
    // @ts-ignore - Drizzle ORM type inference limitation with dynamic where conditions
    query = query.where(or(...conditions));
  }
  
  return await query
    .orderBy(desc(activityFeed.timestamp))
    .limit(options.limit || 50);
}

// Helper function to check permissions
export async function checkIdeaAccess(
  ideaId: number,
  userId: string,
  requiredPermission: 'view' | 'edit' | 'comment' | 'share'
): Promise<boolean> {
  // Check if user owns the idea
  const [idea] = await db
    .select()
    .from(ideas)
    .where(eq(ideas.id, ideaId));
    
  if (idea && idea.userId.toString() === userId) {
    return true; // Owner has all permissions
  }
  
  // Check direct shares
  const directShare = await db
    .select()
    .from(ideaShares)
    .where(
      and(
        eq(ideaShares.ideaId, ideaId),
        eq(ideaShares.sharedWith, userId)
      )
    );
    
  if (directShare.length > 0) {
    const permissions = directShare[0].permissions as any;
    if (requiredPermission === 'view') return true;
    if (requiredPermission === 'comment') return permissions.canComment;
    if (requiredPermission === 'edit') return permissions.canEdit;
    if (requiredPermission === 'share') return permissions.canShare;
  }
  
  // Check team shares
  const userTeams = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, 'active')
      )
    );
    
  if (userTeams.length > 0) {
    const teamIds = userTeams.map((tm: TeamMember) => tm.teamId);
    const teamShares = await db
      .select()
      .from(ideaShares)
      .where(
        and(
          eq(ideaShares.ideaId, ideaId),
          inArray(ideaShares.teamId, teamIds)
        )
      );
      
    if (teamShares.length > 0) {
      const permissions = teamShares[0].permissions as any;
      if (requiredPermission === 'view') return true;
      if (requiredPermission === 'comment') return permissions.canComment;
      if (requiredPermission === 'edit') return permissions.canEdit;
      if (requiredPermission === 'share') return permissions.canShare;
    }
  }
  
  return false;
}