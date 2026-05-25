export const pagination = (query) => ({
  page: Math.max(Number(query.page || 1), 1),
  limit: Math.min(Math.max(Number(query.limit || 25), 1), 200),
  search: query.search?.trim()
});
