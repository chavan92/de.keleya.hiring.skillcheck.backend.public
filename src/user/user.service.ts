import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { hashPassword, matchHashedPassword } from '../common/utils/password';
import { PrismaService } from '../prisma.services';
import { AuthenticateUserDto } from './dto/authenticate-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { FindUserDto } from './dto/find-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { createFindFilter, DELETED_USER_NAME } from './user.utils';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  /**
   * Finds users with matching fields
   *
   * @param findUserDto
   * @returns User[]
   */
  async find(findUserDto: FindUserDto): Promise<User[]> {
    const filter = createFindFilter(findUserDto);
    const users = await this.prisma.user.findMany(filter);
    return users;
  }

  /**
   * Finds single User by id, name or email
   *
   * @param whereUnique
   * @returns User
   */
  async findUnique(whereUnique: Prisma.UserWhereUniqueInput, includeCredentials = false) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          not: {
            equals: null,
          },
        },
        ...whereUnique,
      },
      include: includeCredentials ? { credentials: true } : undefined,
    });
    return user;
  }

  /**
   * Creates a new user with credentials
   *
   * @param createUserDto
   * @returns result of create
   */
  async create(createUserDto: CreateUserDto) {
    const user = await this.prisma.$transaction(async (prisma: PrismaService) => {
      const userExists = await this.findUnique({ email: createUserDto.email });

      if (userExists) {
        throw new BadRequestException('Email already exists');
      }

      // Generate hash and add it to credentials table
      const hash = await hashPassword(createUserDto.password);
      const credentials = await prisma.credentials.create({ data: { hash } });

      const { password, ...createUserData } = createUserDto;
      // Add row to the user table
      return await prisma.user.create({
        data: {
          credentials_id: credentials.id,
          ...createUserData,
        },
      });
    });

    return user;
  }

  /**
   * Updates a user unless it does not exist or has been marked as deleted before
   *
   * @param updateUserDto
   * @returns result of update
   */
  async update(updateUserDto: UpdateUserDto) {
    const user = await this.findUnique({ id: updateUserDto.id });

    if (!user) {
      throw new BadRequestException('User does not exist');
    }

    let updatedUser: any = user;

    await this.prisma.$transaction(async (prisma: PrismaService) => {
      if (updateUserDto.password) {
        const hash = await hashPassword(updateUserDto.password);
        await prisma.credentials.update({
          where: { id: user.credentials_id },
          data: { hash: hash },
        });
      }

      const { id, password, ...updateData } = updateUserDto;

      if (Object.keys(updateData).length > 0) {
        updatedUser = await prisma.user.update({
          where: { id: id },
          data: { ...updateData },
        });
      }
    });

    return updatedUser;
  }

  /**
   * Deletes a user
   * Function does not actually remove the user from database but instead marks them as deleted by:
   * - removing the corresponding `credentials` row from your db
   * - changing the name to DELETED_USER_NAME constant (default: `(deleted)`)
   * - setting email to NULL
   *
   * @param deleteUserDto
   * @returns results of users and credentials table modification
   */
  async delete(deleteUserDto: DeleteUserDto) {
    const user = await this.findUnique({ id: deleteUserDto.id });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    let result = null;

    await this.prisma.$transaction(async (prisma: PrismaService) => {
      await prisma.credentials.delete({ where: { id: deleteUserDto.id } });
      result = await prisma.user.update({
        where: { id: deleteUserDto.id },
        data: { name: DELETED_USER_NAME, email: null, credentials_id: null },
      });
    });

    return result;
  }

  /**
   * Authenticates a user and returns a JWT token
   *
   * @param authenticateUserDto email and password for authentication
   * @returns a JWT token
   */
  async authenticateAndGetJwtToken(authenticateUserDto: AuthenticateUserDto) {
    const user = await this.findUnique({ email: authenticateUserDto.email }, true);
    if (user) {
      const isValidPassword = await matchHashedPassword(authenticateUserDto.password, user.credentials.hash);

      if (isValidPassword) {
        const token = this.jwtService.sign({ id: user.id, is_admin: user.is_admin });
        return { token: token };
      }
    }

    throw new BadRequestException('Invalid credentials');
  }

  /**
   * Authenticates a user
   *
   * @param authenticateUserDto email and password for authentication
   * @returns true or false
   */
  async authenticate(authenticateUserDto: AuthenticateUserDto) {
    const user = await this.findUnique({ email: authenticateUserDto.email }, true);
    if (!user) {
      return { result: false };
    }

    const isValidPassword = await matchHashedPassword(authenticateUserDto.password, user.credentials.hash);
    if (!isValidPassword) {
      return { result: false };
    }

    return { result: true };
  }

  /**
   * Validates a JWT token
   *
   * @param token a JWT token
   * @returns the decoded token if valid
   */
  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded;
    } catch (error) {
      throw new BadRequestException('Invalid token');
    }
  }
}
