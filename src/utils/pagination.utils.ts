import { PAGINATION } from '../constants';

type PaginationOptions = {
  page?: number | string;
  limit?: number | string;
};

export const getPagination = (options: PaginationOptions) => {
  const page = Math.max(Number(options.page) || PAGINATION.DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(Number(options.limit) || PAGINATION.DEFAULT_LIMIT, 1),
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const getPaginationMeta = (total: number, page: number, limit: number) => ({
  page,
  limit,
  total,
  totalPage: Math.ceil(total / limit),
});
