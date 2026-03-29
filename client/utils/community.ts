const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

// 上传图片
export async function uploadImage(uri: string, userId: number): Promise<{ success: boolean; data?: { url: string } }> {
  try {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri,
      name: filename,
      type,
    } as any);
    formData.append('userId', userId.toString());

    const response = await fetch(`${BASE_URL}/api/v1/upload/image`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.json();
  } catch (error) {
    console.error('上传图片失败:', error);
    return { success: false };
  }
}

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
  userId?: number;
}): Promise<PostsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.set('category', params.category);
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.userId) queryParams.set('userId', params.userId.toString());

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

// 更新帖子
export async function updatePost(id: number, data: {
  title?: string;
  content?: string;
  category?: string;
  userId: number;
}): Promise<{ success: boolean; data: Post }> {
  const response = await fetch(`${BASE_URL}/api/v1/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
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

// 通知类型
export interface Notification {
  id: number;
  type: 'post_comment' | 'comment_reply';
  content: string | null;
  isRead: boolean;
  createdAt: string;
  postId: number;
  commentId: number;
  postTitle: string | null;
  fromUser: {
    id: number;
    nickname: string;
  } | null;
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 获取通知列表
export async function getNotifications(params: {
  userId: number;
  page?: number;
  limit?: number;
}): Promise<NotificationsResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set('userId', params.userId.toString());
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const response = await fetch(
    `${BASE_URL}/api/v1/notifications?${queryParams.toString()}`
  );
  return response.json();
}

// 获取未读通知数
export async function getUnreadCount(userId: number): Promise<{ success: boolean; data: { unreadCount: number } }> {
  const response = await fetch(`${BASE_URL}/api/v1/notifications?userId=${userId}&limit=1`);
  const result = await response.json();
  return { success: result.success, data: { unreadCount: result.data?.unreadCount || 0 } };
}

// 标记通知为已读
export async function markNotificationsRead(userId: number, notificationIds?: number[]): Promise<{ success: boolean }> {
  const response = await fetch(`${BASE_URL}/api/v1/notifications/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, notificationIds }),
  });
  return response.json();
}
