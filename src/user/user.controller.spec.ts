import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '../common/strategies/jwt.strategy';
import { PrismaService } from '../prisma.services';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Request } from 'express';
import { FindUserDto } from './dto/find-user.dto';
import { User } from '@prisma/client';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { AuthenticateUserDto } from './dto/authenticate-user.dto';
import { createMockRequest, getUser, getUserWithCreds } from './user.test.helper';

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'JWT_SECRET',
          signOptions: {
            expiresIn: '1year',
            algorithm: 'HS256',
          },
        }),
      ],
      providers: [UserService, PrismaService, JwtStrategy, ConfigService],
    }).compile();
    userService = module.get<UserService>(UserService);
    userController = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(userController).toBeDefined();
    expect(userService).toBeDefined();
  });

  describe('find', () => {
    it('should return all users for admin', async () => {
      const adminUser = { id: 1, is_admin: true };
      const findUserDto = new FindUserDto();
      const users: User[] = [getUser(1, 'test1@xyz.com', 'test1'), getUser(2, 'test2@xyz.com', 'test2')];
      jest.spyOn(userService, 'find').mockResolvedValue(users);

      const result = await userController.find(findUserDto, createMockRequest(adminUser));

      expect(result).toEqual(users);
    });

    it('should return self for non-admin user', async () => {
      const regularUser = { id: 2, is_admin: false };
      const findUserDto = new FindUserDto();
      const selfUser = getUserWithCreds(3, 'self@prq.com', 'self');

      jest.spyOn(userService, 'findUnique').mockResolvedValue(selfUser);

      const result = await userController.find(findUserDto, createMockRequest(regularUser));

      expect(result).toEqual(selfUser);
    });

    it('should throw an exception if an error occurs', async () => {
      const regularUser = { id: 2, is_admin: false };
      const findUserDto = new FindUserDto();

      jest.spyOn(userService, 'find').mockRejectedValueOnce(new Error('Test Error'));

      try {
        await userController.find(findUserDto, createMockRequest(regularUser));
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('findUnique', () => {
    it('should return different user if requested by an admin user', async () => {
      const adminUser = { id: 2, is_admin: true };
      const anotherUserId = 1;
      const anotherUser = getUserWithCreds(1, 'self@prq.com', 'self');

      jest.spyOn(userService, 'findUnique').mockResolvedValue(anotherUser);

      const result = await userController.findUnique(anotherUserId, createMockRequest(adminUser));

      expect(result).toEqual(anotherUser);
    });

    it('should return error if different user requested by an non-admin user', async () => {
      const regularUser = { id: 2, is_admin: false };
      const anotherUserId = 1;
      const anotherUser = getUserWithCreds(1, 'self@prq.com', 'self');

      jest.spyOn(userService, 'findUnique').mockResolvedValue(anotherUser);

      try {
        await userController.findUnique(anotherUserId, createMockRequest(regularUser));
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });

    it('should return same user if user requested by an non-admin user', async () => {
      const regularUser = { id: 2, is_admin: true };
      const testId = 2;
      const selfUser = getUserWithCreds(2, 'self@prq.com', 'self');

      jest.spyOn(userService, 'findUnique').mockResolvedValue(selfUser);

      const result = await userController.findUnique(testId, createMockRequest(regularUser));

      expect(result).toEqual(selfUser);
    });

    it('should throw an exception if an error occurs', async () => {
      const regularUser = { id: 2, is_admin: false };
      const testId = 2;

      jest.spyOn(userService, 'findUnique').mockRejectedValueOnce(new Error('Test Error'));

      try {
        await userController.findUnique(testId, createMockRequest(regularUser));
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'test name',
        email: 'test@test.com',
        confirmed_email: true,
        password: 'password',
        is_admin: false,
      };

      const createdUser = getUser(1, 'test@test.com', 'test name');

      jest.spyOn(userService, 'create').mockResolvedValue(createdUser);

      const result = await userController.create(createUserDto);

      expect(result).toEqual(createdUser);
    });

    it('should throw an error if user creation fails', async () => {
      const createUserDto = getUser(1, 'abc@test.com', 'test name');

      jest.spyOn(userService, 'create').mockRejectedValue(new Error('User creation failed'));

      try {
        await userController.create(createUserDto);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('update', () => {
    it('should update non-admin user', async () => {
      const updateUserDto: UpdateUserDto = {
        id: 1,
        name: 'New Name',
      };

      const updatedUser = getUser(1, 'abc@test.com', 'New Name');
      const regularUser = { id: 1, is_admin: false };

      jest.spyOn(userService, 'update').mockResolvedValue(updatedUser);

      const result = await userController.update(updateUserDto, createMockRequest(regularUser));

      expect(result).toEqual(updatedUser);
    });

    it('should update another user when requested by admin user', async () => {
      const updateUserDto: UpdateUserDto = {
        id: 1,
        name: 'New Name',
      };

      const updatedUser = getUser(1, 'abc@test.com', 'New Name');
      const adminUser = { id: 2, is_admin: true };

      jest.spyOn(userService, 'update').mockResolvedValue(updatedUser);

      const result = await userController.update(updateUserDto, createMockRequest(adminUser));

      expect(result).toEqual(updatedUser);
    });

    it('should throw UnauthorizedException when not authorized', async () => {
      const updateUserDto: UpdateUserDto = {
        id: 2,
        name: 'Updated Name',
      };

      const regularUser = { id: 1, is_admin: false };

      try {
        await userController.update(updateUserDto, createMockRequest(regularUser));
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });
  });

  describe('delete', () => {
    it('should delete non-admin user', async () => {
      const deleteUserDto: DeleteUserDto = {
        id: 1,
      };

      const expectedMessage = { message: 'User deleted.' };
      const regularUser = { id: 1, is_admin: false };

      jest.spyOn(userService, 'update').mockResolvedValue(expectedMessage);

      const result = await userController.update(deleteUserDto, createMockRequest(regularUser));

      expect(result).toEqual(expectedMessage);
    });

    it('should delete another user when requested by admin user', async () => {
      const deleteUserDto: DeleteUserDto = {
        id: 1,
      };

      const expectedMessage = { message: 'User deleted.' };
      const adminUser = { id: 2, is_admin: true };

      jest.spyOn(userService, 'update').mockResolvedValue(expectedMessage);

      const result = await userController.update(deleteUserDto, createMockRequest(adminUser));

      expect(result).toEqual(expectedMessage);
    });

    it('should throw UnauthorizedException when not authorized', async () => {
      const deleteUserDto: DeleteUserDto = {
        id: 2,
      };

      const regularUser = { id: 1, is_admin: false };

      try {
        await userController.delete(deleteUserDto, createMockRequest(regularUser));
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });
  });

  describe('userValidateToken', () => {
    it('should return decoded token when provided with a valid token', async () => {
      const validToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwiaXNfYWRtaW4iOnRydWUsImlhdCI6MTY5NjcyNDA1MSwiZXhwIjoxNzI4MjgxNjUxfQ.1LnUjZxOdDfzbV5as6BZCiEW6VHU0Rcdxgo23FLUb2E';
      const decodedToken = { sub: 1, is_admin: false };

      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as Request;

      jest.spyOn(userService, 'validateToken').mockResolvedValue(decodedToken);

      const result = await userController.userValidateToken(mockRequest);

      expect(result).toEqual(decodedToken);
    });

    it('should throw Exception when provided with an invalid token', async () => {
      const invalidToken = 'invalid-token';
      const mockRequest = {
        headers: {
          authorization: `Bearer ${invalidToken}`,
        },
      } as Request;

      jest.spyOn(userService, 'validateToken').mockRejectedValue(new BadRequestException('Invalid token'));

      try {
        await userController.userValidateToken(mockRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('userAuthenticate', () => {
    it('should return true when provided with valid credentials', async () => {
      const authenticateUserDto: AuthenticateUserDto = {
        email: 'valid-email@test.com',
        password: 'valid-password',
      };

      jest.spyOn(userService, 'authenticate').mockResolvedValue({ result: true });

      const result = await userController.userAuthenticate(authenticateUserDto);

      expect(result).toEqual({ result: true });
      expect(userService.authenticate).toHaveBeenCalledWith(authenticateUserDto);
    });

    it('should return false when authentication fails', async () => {
      const authenticateUserDto: AuthenticateUserDto = {
        email: 'invalid-email@example.com',
        password: 'invalid-password',
      };

      jest.spyOn(userService, 'authenticate').mockResolvedValue({ result: false });
      const result = await userController.userAuthenticate(authenticateUserDto);
      expect(result).toEqual({ result: false });
      expect(userService.authenticate).toHaveBeenCalledWith(authenticateUserDto);
    });
  });

  describe('userGetToken', () => {
    it('should return a valid JWT token when provided with valid credentials', async () => {
      const validCredentials: AuthenticateUserDto = {
        email: 'test@test.com',
        password: 'testpassword',
      };

      const mockToken = 'mocked-jwt-token';

      jest.spyOn(userService, 'authenticateAndGetJwtToken').mockResolvedValue({ token: mockToken });

      const result = await userController.userGetToken(validCredentials);

      expect(result).toEqual({ token: mockToken });
      expect(userService.authenticateAndGetJwtToken).toHaveBeenCalledWith(validCredentials);
    });

    it('should throw BadRequestException when provided with invalid credentials', async () => {
      const invalidCredentials: AuthenticateUserDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      jest
        .spyOn(userService, 'authenticateAndGetJwtToken')
        .mockRejectedValue(new BadRequestException('Invalid credentials'));

      try {
        await userController.userGetToken(invalidCredentials);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Invalid credentials');
        expect(userService.authenticateAndGetJwtToken).toHaveBeenCalledWith(invalidCredentials);
      }
    });
  });
});
