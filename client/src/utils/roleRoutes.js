export const landingPathForRole = (role) => {
  if (role === 'manager') return '/manager';
  if (role === 'finance' || role === 'cfo') return '/finance';
  if (role === 'employee') return '/expenses';
  return '/';
};
