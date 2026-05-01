export function stripPassword<T extends { password?: unknown }>(
  entity: T,
): Omit<T, 'password'> {
  const rest = { ...entity };
  delete rest.password;
  return rest;
}
