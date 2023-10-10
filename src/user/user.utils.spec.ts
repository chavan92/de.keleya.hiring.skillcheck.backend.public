import { createFindFilter } from './user.utils';
import { FindUserDto } from './dto/find-user.dto';

describe('createFindFilter', () => {
  it('should create a filter object where email is not', () => {
    const findUserDto: FindUserDto = {};
    const filter = createFindFilter(findUserDto);

    expect(filter.where.email).toEqual({
      not: {
        equals: null,
      },
    });
  });

  it('should add id filter when id is provided', () => {
    const findUserDto: FindUserDto = { id: [1, 2, 3] };
    const filter = createFindFilter(findUserDto);

    expect(filter.where.id).toEqual({ in: [1, 2, 3] });
  });

  it('should add name filter when name is provided', () => {
    const findUserDto: FindUserDto = { name: 'Test' };
    const filter = createFindFilter(findUserDto);

    expect(filter.where.name).toEqual({ contains: 'Test' });
  });

  it('should add email filter when email is provided', () => {
    const findUserDto: FindUserDto = { email: 'test@test.com' };
    const filter = createFindFilter(findUserDto);

    expect(filter.where.email).toEqual('test@test.com');
  });

  it('should add limit filter when limit is provided', () => {
    const findUserDto: FindUserDto = { limit: 10 };
    const filter = createFindFilter(findUserDto);

    expect(filter.take).toEqual(10);
  });

  it('should add offset filter when offset is provided', () => {
    const findUserDto: FindUserDto = { offset: 5 };
    const filter = createFindFilter(findUserDto);

    expect(filter.skip).toEqual(5);
  });

  it('should add credentials filter when credentials is true', () => {
    const findUserDto: FindUserDto = { credentials: true };
    const filter = createFindFilter(findUserDto);

    expect(filter.include.credentials).toBe(true);
  });

  it('should add updated_since filter when updated_since is provided', () => {
    const updatedSinceDate = new Date('2023-01-01');
    const findUserDto: FindUserDto = { updated_since: updatedSinceDate };
    const filter = createFindFilter(findUserDto);

    expect(filter.where.updatedAt).toEqual({ gte: updatedSinceDate });
  });
});
