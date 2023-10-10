export interface JwtTokenUser {
  id: number | null;
}

export const isJwtTokenUser = (candidate: unknown): candidate is JwtTokenUser => {
  const user = candidate as JwtTokenUser;
  return user.id !== undefined;
};
