const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

// 类型定义
export interface Post {
  id: number;
  title: string;
  content: string;
  category: 'discussion' | 'question' | 'sharing' | 'notice';
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    username: string;
    nickname: string;
  };
}

export interface Comment {
  id: number;
  content: string;
  like_count: number;
  created_at: string;
  updated_at: string;
  parent_id: number | null;
  user: {
    id: number;
    username: string;
    nickname: string;
  };
  replies?: Comment[];
}

export interface PostsResponse {
  success: boolean;
  data: {
    posts: Post[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CommentsResponse {
  success: boolean;
  data: {
    comments: Comment[];
    total: number;
    page: number;
    limit: number;
  };
}

// 获取帖子列表
export async function getPosts(params?: {
  category?: string;
  page?: number;
  limit?: number;
}): Promise<PostsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.set('category', params.category);
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const response = await fetch(
    `${BASE_URL}/api/v1/posts?${queryParams.toString()}`
  );
  return response.json();
}

// 获取帖子详情
export async function getPost(id: number): Promise<{ success: boolean; data: Post }> {
  const response = await fetch(`${BASE_URL}/api/v1/posts/${id}`);
  return response.json();
}

// 创建帖子
export async function createPost(data: {
  title: string;
  content: string;
  category?: string;
  userId: number;
}): Promise<{ success: boolean; data: Post }> {
  const response = await fetch(`${BASE_URL}/api/v1/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// 删除帖子
export async function deletePost(id: number, userId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${BASE_URL}/api/v1/posts/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return response.json();
}

// 点赞帖子
export async function likePost(id: number, userId: number): Promise<{ success: boolean; data: { liked: boolean } }> {
  const response = await fetch(`${BASE_URL}/api/v1/posts/${id}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return response.json();
}

// 获取评论列表
export async function getComments(postId: number, params?: {
  page?: number;
  limit?: number;
}): Promise<CommentsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const response = await fetch(
    `${BASE_URL}/api/v1/comments/post/${postId}?${queryParams.toString()}`
  );
  return response.json();
}

// 创建评论
export async function createComment(data: {
  postId: number;
  content: string;
  parentId?: number;
  userId: number;
}): Promise<{ success: boolean; data: Comment }> {
  const response = await fetch(`${BASE_URL}/api/v1/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// 删除评论
export async function deleteComment(id: number, userId: number): Promise<{ success: boolean }> {
  const response = await fetch(`${BASE_URL}/api/v1/comments/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return response.json();
}

// 点赞评论
export async function likeComment(id: number, userId: number): Promise<{ success: boolean; data: { liked: boolean } }> {
  const response = await fetch(`${BASE_URL}/api/v1/comments/${id}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return response.json();
}
