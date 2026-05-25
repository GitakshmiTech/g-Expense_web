export class BaseRepository {
  constructor(Model) {
    this.Model = Model;
  }

  list(filter, options = {}) {
    const { limit = 100, page = 1, sort = { createdAt: -1 }, search, searchFields = [] } = options;
    const query = { ...filter };
    if (search && searchFields.length) {
      query.$or = searchFields.map((field) => ({ [field]: new RegExp(search, 'i') }));
    }
    return this.Model.find(query)
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
  }

  count(filter, search, searchFields = []) {
    const query = { ...filter };
    if (search && searchFields.length) {
      query.$or = searchFields.map((field) => ({ [field]: new RegExp(search, 'i') }));
    }
    return this.Model.countDocuments(query);
  }

  create(payload) {
    return this.Model.create(payload);
  }

  update(filter, payload) {
    return this.Model.findOneAndUpdate(filter, payload, { new: true, runValidators: true });
  }

  remove(filter) {
    return this.Model.findOneAndDelete(filter);
  }
}
