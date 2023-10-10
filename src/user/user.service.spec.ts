import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { Credentials, User } from '@prisma/client';
import { JwtStrategy } from '../common/strategies/jwt.strategy';
import { PrismaService } from '../prisma.services';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUserDto } from './dto/find-user.dto';
import { UserService } from './user.service';
import { createFindFilter, DELETED_USER_NAME } from './user.utils';
import * as passwordModule from '../common/utils/password';
import { getUser, getUserWithCreds } from './user.test.helper';

describe('UserService', () => {
  let userService: UserService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const prismaServiceMock = {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    credentials: {
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const jwtServiceMock = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const passwordModuleMock = {
    matchHashedPassword: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
    })
      .overrideProvider(PrismaService)
      .useValue(prismaServiceMock)
      .overrideProvider(JwtService)
      .useValue(jwtServiceMock)
      .overrideProvider(passwordModule)
      .useValue(passwordModuleMock)
      .compile();

    userService = module.get<UserService>(UserService);
    prismaService = prismaServiceMock as any;
    jwtService = jwtServiceMock as any;
  });

  beforeEach(() => {
    // Clear mock function calls between tests
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(userService).toBeDefined();
  });

  describe('find', () => {
    it('should find users with matching fields', async () => {
      const findUserDto: FindUserDto = {
        name: 'test',
      };
      const users: User[] = [getUser(1, 'test1test.com', 'test1'), getUser(2, 'test2test.com', 'test2')];

      const expectedFilter = createFindFilter(findUserDto);
      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue(users);

      const result = await userService.find(findUserDto);

      expect(result).toEqual(users);
      expect(prismaService.user.findMany).toHaveBeenCalledWith(expectedFilter);
    });
  });

  describe('findUnique', () => {
    it('should find a user by id when includeCredentials is false', async () => {
      const userId = 1;
      const whereUnique = { id: userId };
      const user = getUser(1, 'test@email.com', 'test name');

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(user);

      const result = await userService.findUnique(whereUnique, false);

      expect(result).toEqual(user);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          ...whereUnique,
          email: {
            not: {
              equals: null,
            },
          },
        },
      });
    });

    it('should find a user by id when includeCredentials is true', async () => {
      const userId = 1;
      const whereUnique = { id: userId };
      const user = getUserWithCreds(1, 'test@email.com', 'test name');

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(user);

      const result = await userService.findUnique(whereUnique, true);

      expect(result).toEqual(user);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          ...whereUnique,
          email: {
            not: {
              equals: null,
            },
          },
        },
        include: { credentials: true },
      });
    });
  });

  describe('create', () => {
    it('should create a new user with credentials', async () => {
      const createUserDto: CreateUserDto = {
        name: 'test',
        email: 'user1@test.com',
        password: 'password123',
        is_admin: false,
        confirmed_email: true,
      };

      const credentials: Credentials = {
        id: 1,
        hash: 'hashedPassword',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const user: User = getUser(10, 'test@test.com', 'test');
      const hash = 'hashed-password';

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        jest.spyOn(prismaService.credentials, 'create').mockResolvedValue(credentials);
        jest.spyOn(prismaService.user, 'create').mockResolvedValue(user);
        jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(undefined);

        return callback(prismaService);
      });

      const result = await userService.create(createUserDto);

      expect(result).toEqual(user);
    });

    it('should throw exception if transaction fails due to an error', async () => {
      const createUserDto: CreateUserDto = {
        name: 'test',
        email: 'test@test.com',
        password: 'password123',
        is_admin: false,
        confirmed_email: true,
      };

      const credentials: Credentials = {
        id: 1,
        hash: 'hashedPassword',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const user: User = getUser(10, 'test@test.com', 'test');
      const hash = 'hashed-password';

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        throw new Error('transaction failed');
      });

      try {
        await userService.create(createUserDto);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto = {
        id: 1,
        name: 'new name',
        password: 'newpassword',
      };

      const user = getUser(1, 'test@email.com', 'old name');
      const updatedUser = getUser(1, 'test@email.com', 'new name');
      const credentials = {
        id: 6,
        hash: '$2b$10$hc27UOLACohffUyMjlY.gOp.yhTBF.JFXBSUSXYm.t8TA8MFL7QtW',
        created_at: new Date('2023-10-07T15:53:40.728Z'),
        updated_at: new Date('2023-10-07T15:53:40.728Z'),
      };

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(user);
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        jest.spyOn(prismaService.credentials, 'update').mockResolvedValueOnce(credentials);
        jest.spyOn(prismaService.user, 'update').mockResolvedValueOnce(updatedUser);

        return callback(prismaService);
      });

      const result = await userService.update(updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(userService.findUnique).toHaveBeenCalledWith({ id: updateUserDto.id });
      expect(prismaService.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should throw BadRequestException if user does not exist', async () => {
      const updateUserDto = {
        id: 1,
        username: 'newusername',
        password: 'newpassword',
      };

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(null);

      try {
        await userService.update(updateUserDto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw exception if transaction fails', async () => {
      const updateUserDto = {
        id: 1,
        name: 'new name',
        password: 'newpassword',
      };

      const user = getUser(1, 'test@email.com', 'old name');

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(user);
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        throw new Error('Transaction Failed');
      });

      try {
        await userService.update(updateUserDto);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      const deleteUserDto = {
        id: 1,
      };

      const credentials = {
        id: 6,
        hash: '$2b$10$hc27UOLACohffUyMjlY.gOp.yhTBF.JFXBSUSXYm.t8TA8MFL7QtW',
        created_at: new Date('2023-10-07T15:53:40.728Z'),
        updated_at: new Date('2023-10-07T15:53:40.728Z'),
      };

      const user = getUser(1, 'test@example', 'name1');
      const deletedUser = getUser(1, undefined, DELETED_USER_NAME);

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(user);

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        jest.spyOn(prismaService.credentials, 'delete').mockResolvedValueOnce(credentials);
        jest.spyOn(prismaService.user, 'update').mockResolvedValueOnce(deletedUser);

        return callback(prismaService);
      });

      const result = await userService.delete(deleteUserDto);

      expect(result.name).toEqual('(deleted)');
    });

    it('should throw BadRequestException if user does not exist', async () => {
      const deleteUserDto = {
        id: 1,
      };

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(null);

      try {
        await userService.delete(deleteUserDto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw exception if transaction fails', async () => {
      const deleteUserDto = {
        id: 1,
      };

      const user = getUser(1, 'test@example', 'name1');

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(user);
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        throw new Error('Trasaction failed');
      });

      try {
        await userService.delete(deleteUserDto);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('authenticateAndGetJwtToken', () => {
    it('should authenticate and return a JWT token', async () => {
      const authenticateUserDto = {
        email: 'test@test.com',
        password: 'password',
      };

      const user = getUserWithCreds(2, 'test@test.com', 'test name');

      const token = 'mockedJwtToken';

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(user);
      jest.spyOn(passwordModule, 'matchHashedPassword').mockResolvedValueOnce(true);
      jest.spyOn(jwtService, 'sign').mockReturnValue(token);

      const result = await userService.authenticateAndGetJwtToken(authenticateUserDto);

      expect(result).toEqual({ token: token });
      expect(userService.findUnique).toHaveBeenCalledWith({ email: authenticateUserDto.email }, true);
      expect(passwordModule.matchHashedPassword).toHaveBeenCalledWith(
        authenticateUserDto.password,
        user.credentials.hash,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({ id: user.id, is_admin: user.is_admin });
    });

    it('should throw BadRequestException if user does not exist', async () => {
      const authenticateUserDto = {
        email: 'nonexistent@test.com',
        password: 'testpassword',
      };

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(null);

      try {
        await userService.authenticateAndGetJwtToken(authenticateUserDto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw exception if credentials are invalid', async () => {
      const authenticateUserDto = {
        email: 'test@test.com',
        password: 'password',
      };

      const user = getUserWithCreds(2, 'test@test.com', 'test name');

      const token = 'mockedJwtToken';

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(user);
      jest.spyOn(passwordModule, 'matchHashedPassword').mockResolvedValueOnce(false);
      jest.spyOn(jwtService, 'sign').mockReturnValue(token);

      try {
        await userService.authenticateAndGetJwtToken(authenticateUserDto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('authenticate', () => {
    it('should authenticate a user with valid credentials', async () => {
      const authenticateUserDto = {
        email: 'test@test.com',
        password: 'testpassword',
      };

      const user = getUserWithCreds(1, 'test@test.com', 'test name');

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(user);
      jest.spyOn(passwordModule, 'matchHashedPassword').mockResolvedValueOnce(true);

      const result = await userService.authenticate(authenticateUserDto);

      expect(result).toEqual({ result: true });
      expect(userService.findUnique).toHaveBeenCalledWith({ email: authenticateUserDto.email }, true);
      expect(passwordModule.matchHashedPassword).toHaveBeenCalledWith(
        authenticateUserDto.password,
        user.credentials.hash,
      );
    });

    it('should not authenticate a user with incorrect email', async () => {
      const authenticateUserDto = {
        email: 'nonexistent@test.com',
        password: 'testpassword',
      };

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(null);

      const result = await userService.authenticate(authenticateUserDto);

      expect(result).toEqual({ result: false });
      expect(userService.findUnique).toHaveBeenCalledWith({ email: authenticateUserDto.email }, true);
    });

    it('should not authenticate a user with invalid password', async () => {
      const authenticateUserDto = {
        email: 'test@test.com',
        password: 'wrongpassword',
      };

      const user = getUserWithCreds(1, 'test@test.com', 'test name');

      jest.spyOn(userService, 'findUnique').mockResolvedValueOnce(user);
      jest.spyOn(passwordModule, 'matchHashedPassword').mockResolvedValueOnce(false);

      const result = await userService.authenticate(authenticateUserDto);

      expect(result).toEqual({ result: false });
      expect(userService.findUnique).toHaveBeenCalledWith({ email: authenticateUserDto.email }, true);
      expect(passwordModule.matchHashedPassword).toHaveBeenCalledWith(
        authenticateUserDto.password,
        user.credentials.hash,
      );
    });
  });

  describe('validateToken', () => {
    it('should validate a valid JWT token', async () => {
      const validToken = 'validToken';

      const decodedToken = {
        id: 8,
        is_admin: true,
        iat: 1696724051,
        exp: 1728281651,
      };

      jest.spyOn(jwtService, 'verify').mockReturnValueOnce(decodedToken);
      const result = await userService.validateToken(validToken);

      expect(result).toEqual(decodedToken);
      expect(jwtService.verify).toHaveBeenCalledWith(validToken);
    });

    it('should throw BadRequestException for an invalid JWT token', async () => {
      const invalidToken = 'invalidToken';
      jest.spyOn(jwtService, 'verify').mockReturnValueOnce(new Error('Invalid Token'));

      try {
        await userService.validateToken(invalidToken);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });
});
