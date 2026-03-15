export interface CircleDiscussionAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface CircleDiscussionComment {
  id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: CircleDiscussionAuthor;
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
  score?: number;
  userVote?: number;
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
}
