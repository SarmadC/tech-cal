export interface CircleDiscussionAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface CircleDiscussionMention {
  userId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface CircleDiscussionMedia {
  id: string;
  path: string;
  url: string;
  width: number;
  height: number;
  position: number;
}

export interface CircleDiscussionLinkPreview {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
}

export interface CircleDiscussionEmbeddedEvent {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  location?: string | null;
  startTime: string;
  endTime?: string | null;
  imageUrl?: string | null;
  organizerName?: string | null;
  tags?: string[];
  timeLabel?: string | null;
  formatLabel?: string | null;
  priceLabel?: string | null;
}

export interface CircleDiscussionComment {
  id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: CircleDiscussionAuthor;
  isRemoved?: boolean;
  score?: number;
  userVote?: number;
  replies: CircleDiscussionComment[];
}

export interface CircleDiscussionPost {
  id: string;
  content: string;
  created_at: string;
  author: CircleDiscussionAuthor;
  comments: CircleDiscussionComment[];
  isRemoved?: boolean;
  score?: number;
  userVote?: number;
  postType?: 'update' | 'question' | 'intro' | 'showcase' | 'event_note' | 'announcement';
  eventId?: string | null;
  event?: CircleDiscussionEmbeddedEvent | null;
  mentions?: CircleDiscussionMention[];
  media?: CircleDiscussionMedia[];
  linkPreviews?: CircleDiscussionLinkPreview[];
  isPinned?: boolean;
}

export interface CircleDiscussionCurrentUser {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export interface CircleDiscussionMember {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  headline: string | null;
}

export interface CircleDiscussionUpcomingEvent {
  id: string;
  slug: string;
  title: string | null;
  startTime: string | null;
  organizerName: string | null;
  organizerLogoUrl: string | null;
}
