import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { createUser, deleteUser, getToken, validateToken } from './helpers';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await createUser(app);
  });

  afterEach(async () => {
    const tokenResponse = await getToken(app);
    const token = tokenResponse.body.token;
    const decodedToken = await validateToken(app, token);
    await deleteUser(app, decodedToken.body.id, token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/_health (GET)', () => {
    return request(app.getHttpServer()).get('/api/_health').expect(HttpStatus.OK).expect('OK');
  });

  it('/user (GET) with custom headers', async () => {
    const tokenResponse = await getToken(app);
    const token = tokenResponse.body.token;
    const decodedToken = await validateToken(app, token);

    const id = decodedToken.body.id;

    return request(app.getHttpServer())
      .get(`/user/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK);
  });

  it('/user/authenticate (POST)', () => {
    return request(app.getHttpServer())
      .post('/user/authenticate')
      .send({
        email: 'test12345@email.com',
        password: 'password',
      })
      .expect(HttpStatus.OK)
      .expect(`{"result":true}`);
  });

  it('/user/authenticate (POST) with wrong credentials', () => {
    return request(app.getHttpServer())
      .post('/user/authenticate')
      .send({
        email: 'test12345@email.com',
        password: 'wrong-password',
      })
      .expect(HttpStatus.OK)
      .expect(`{"result":false}`);
  });

  it('/user/token (POST)', () => {
    return request(app.getHttpServer())
      .post('/user/token')
      .send({
        email: 'test12345@email.com',
        password: 'password',
      })
      .expect(HttpStatus.OK);
  });

  it('/user/token (POST) with wrong credentials', () => {
    return request(app.getHttpServer())
      .post('/user/token')
      .send({
        email: 'test12345@email.com',
        password: 'wrong-password',
      })
      .expect(HttpStatus.BAD_REQUEST)
      .expect('{"statusCode":400,"message":"Invalid credentials","error":"Bad Request"}');
  });

  it('/user/validate (POST)', async () => {
    const tokenResponse = await getToken(app);
    const token = tokenResponse.body.token;

    return request(app.getHttpServer())
      .post('/user/validate')
      .set('Authorization', `Bearer ${token}`)
      .send()
      .expect(HttpStatus.OK);
  });

  it('/user/validate (POST)', async () => {
    return request(app.getHttpServer())
      .post('/user/validate')
      .set('Authorization', `Bearer invalid-token`)
      .send()
      .expect(HttpStatus.BAD_REQUEST)
      .expect('{"statusCode":400,"message":"Invalid token","error":"Bad Request"}');
  });

  it('/user (PATCH)', async () => {
    const tokenResponse = await getToken(app);
    const token = tokenResponse.body.token;
    const decodedToken = await validateToken(app, token);

    const id = decodedToken.body.id;
    return request(app.getHttpServer())
      .patch('/user')
      .set('Authorization', `Bearer ${token}`)
      .send({ id, name: 'new name' })
      .expect(HttpStatus.OK);
  });

  it('/user (PATCH) with invalid token', async () => {
    return request(app.getHttpServer())
      .patch('/user')
      .set('Authorization', `Bearer invalid-token`)
      .send({ id: 10, name: 'new name' })
      .expect(HttpStatus.UNAUTHORIZED)
      .expect('{"statusCode":401,"message":"Unauthorized"}');
  });

  it('/user (POST)', async () => {
    await request(app.getHttpServer())
      .post('/user')
      .send({
        email: 'test_post@email.com',
        name: 'test user2',
        password: 'password',
        confirmed_email: true,
        is_admin: false,
      })
      .expect(HttpStatus.OK);

    const tokenResponse = await getToken(app, 'test_post@email.com', 'password');
    const token = tokenResponse.body.token;
    const decodedToken = await validateToken(app, token);

    await deleteUser(app, decodedToken.body.id, token);
  });

  it('/user (DELETE)', async () => {
    await createUser(app, {
      email: 'test_delete@email.com',
      name: 'test user2',
      password: 'password',
      confirmed_email: true,
      is_admin: false,
    });

    const tokenResponse = await getToken(app, 'test_delete@email.com', 'password');
    const token = tokenResponse.body.token;
    const decodedToken = await validateToken(app, token);
    const id = decodedToken.body.id;

    return request(app.getHttpServer())
      .delete('/user')
      .set('Authorization', `Bearer ${token}`)
      .send({ id })
      .expect(HttpStatus.OK);
  });

  it('/user (DELETE) with invalid token', async () => {
    return request(app.getHttpServer())
      .delete('/user')
      .set('Authorization', `Bearer invalid-token`)
      .send({ id: 10 })
      .expect(HttpStatus.UNAUTHORIZED)
      .expect('{"statusCode":401,"message":"Unauthorized"}');
  });
});
