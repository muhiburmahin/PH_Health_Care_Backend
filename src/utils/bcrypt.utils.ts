import bcrypt from 'bcrypt';

const hashPassword = async (password: string, saltRounds = 12) => {
  return bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password: string, hashedPassword: string) => {
  return bcrypt.compare(password, hashedPassword);
};

export const bcryptUtils = {
  hashPassword,
  comparePassword,
};
