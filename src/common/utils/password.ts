import * as bcrypt from 'bcrypt';

const saltOrRounds = 10;
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, saltOrRounds);
};

export const hashPasswordSync = (password: string): string => {
  const hashedPassword = bcrypt.hashSync(password, saltOrRounds);
  return hashedPassword;
};

export const matchHashedPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
