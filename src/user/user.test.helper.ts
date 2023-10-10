import { Request } from 'express';

export function getUserWithCreds(id: number, email: string, name: string) {
  let userWithCreds = getUser(id, email, name);
  userWithCreds['credentials'] = {
    id: 6,
    hash: '$2b$10$F0fQklkFOGeWqxepNqnJveLmKDV6VRS/a9lUAReR2QH4e58A1VGLe',
    created_at: new Date('2023-10-07T15:53:40.728Z'),
    updated_at: new Date('2023-10-07T15:53:40.728Z'),
  };
  return userWithCreds;
}

export function getUser(id: number, email: string, name: string): any {
  return {
    id,
    email,
    name,
    confirmed_email: false,
    is_admin: false,
    created_at: new Date('2023-10-07T15:53:40.728Z'),
    updated_at: new Date('2023-10-07T15:53:40.728Z'),
    credentials_id: id,
  };
}

export function createMockRequest(user: any): Request {
  const request: Request = {} as Request;
  request.user = user;
  return request;
}
