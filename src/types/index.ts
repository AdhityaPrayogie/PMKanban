export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type NotificationType = 'deadline' | 'mention' | 'assignment' | 'system';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'active' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  unit_id?: string | null;
  unit_name?: string | null;
  role?: UserRole;
  status?: UserStatus;
  password_plain?: string | null;
  last_active_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MasterUnit {
  id: string;
  name: string;
  code: string;
  description: string | null;
  users_count?: number;
  projects_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at?: string;
}

export interface Task {
  id: string;
  project_id: string;
  column_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  customer?: string | null;
  unit_tags?: string[] | string | null;
  priority: Priority;
  start_date: string | null;
  due_date: string | null;
  position: number;
  creator_id: string;
  created_at?: string;
  updated_at?: string;
  // joined relations
  assignees?: User[];
  labels?: Label[];
  sub_tasks?: Task[];
  comments_count?: number;
  attachments_count?: number;
  attachments?: TaskAttachment[];
}

export type AttachmentCategory = 'image' | 'doc' | 'pdf' | 'md' | 'excel' | 'zip';

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: AttachmentCategory;
  uploaded_by?: string | null;
  uploader?: User;
  created_at: string;
}

export interface BoardColumn {
  id: string;
  project_id: string;
  title: string;
  position: number;
  tasks?: Task[];
  created_at?: string;
  updated_at?: string;
}

export type BoardStage = 'Planning' | 'Active' | 'Review' | 'Completed';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  unit_tag?: string;
  stage?: BoardStage;
  parent_id?: string | null;
  position?: number;
  columns_count?: number;
  tasks_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  updated_at?: string;
  user?: User;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  related_task_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_one_id: string;
  user_two_id: string;
  created_at: string;
  other_user?: User;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url?: string | null;
  is_read: boolean;
  created_at: string;
  sender?: User;
}

export interface ActivityChange {
  field: string;
  old?: any;
  new?: any;
}

export interface TaskActivity {
  id: string;
  task_id: string | null;
  project_id: string | null;
  user_id: string;
  action: 'create_board' | 'create_task' | 'update_task' | 'move_task' | 'upload_attachment' | 'delete_attachment' | string;
  details: {
    summary?: string;
    changes?: ActivityChange[];
  };
  created_at: string;
  user?: User;
}
