import { FindUserDto } from './dto/find-user.dto';

export const DELETED_USER_NAME = '(deleted)';

export function createFindFilter(findUserDto: FindUserDto) {
  const filter: any = {
    where: {
      email: {
        not: {
          equals: null,
        },
      },
    },
  };

  if (findUserDto.id) {
    filter.where.id = { in: findUserDto.id };
  } else if (findUserDto.name) {
    filter.where.name = {
      contains: findUserDto.name,
    };
  } else if (findUserDto.email) {
    filter.where.email = findUserDto.email;
  }

  if (findUserDto.limit) {
    filter.take = findUserDto.limit;
  }

  if (findUserDto.offset) {
    filter.skip = findUserDto.offset;
  }

  if (findUserDto.credentials) {
    filter.include = {
      credentials: true,
    };
  }

  if (findUserDto.updated_since) {
    filter.where.updatedAt = {
      gte: findUserDto.updated_since,
    };
  }

  return filter;
}

export function isAuthorized(requestingUser: Express.User, targetUserId: number): boolean {
  const requestingUserInfo = requestingUser as { id: number; is_admin: boolean };

  if (requestingUserInfo.is_admin || requestingUserInfo.id === targetUserId) {
    return true;
  }

  return false;
}
