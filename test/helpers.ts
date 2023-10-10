import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

const defaultUser = {
  email: 'test12345@email.com',
  name: 'test user',
  password: 'password',
  confirmed_email: true,
  is_admin: false,
};

export async function createUser(app: INestApplication, data: any = defaultUser) {
  return request(app.getHttpServer()).post('/user').send(data);
}

export async function getToken(
  app: INestApplication,
  email: string = defaultUser.email,
  password: string = defaultUser.password,
) {
  return request(app.getHttpServer()).post('/user/token').send({ email: email, password: password });
}

export async function validateToken(app: INestApplication, token: any) {
  return await request(app.getHttpServer()).post('/user/validate').set('Authorization', `Bearer ${token}`).send();
}

export async function authenticateUser(app: INestApplication, email: string, password: string) {
  return request(app.getHttpServer()).post('/user/authenticate').send({ email, password });
}

export async function getUserDetails(app: INestApplication, id: number, token: any) {
  return request(app.getHttpServer()).get(`/user/${id}`).set('Authorization', `Bearer ${token}`);
}

export async function deleteUser(app: INestApplication, id: number, token: any) {
  return request(app.getHttpServer()).delete('/user').set('Authorization', `Bearer ${token}`).send({ id });
}
