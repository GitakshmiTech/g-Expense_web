export class EnterpriseRepository {
  constructor(Model) {
    this.Model = Model;
  }

  async create(payload, actorId) {
    return this.Model.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  }

  async findById(companyId, id, options = {}) {
    return this.Model.findOne({ _id: id, companyId }, null, options);
  }

  async list(companyId, query = {}, options = {}) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 25), 1), 200);
    const filter = { companyId, ...(options.filter || {}) };
    if (query.status) filter.status = query.status;
    return {
      items: await this.Model.find(filter).sort(options.sort || { createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      total: await this.Model.countDocuments(filter),
      page,
      limit
    };
  }

  async update(companyId, id, payload, actorId) {
    return this.Model.findOneAndUpdate(
      { _id: id, companyId },
      { ...payload, updatedBy: actorId },
      { new: true, runValidators: true }
    );
  }

  async softDelete(companyId, id, actorId, reason) {
    return this.Model.findOneAndUpdate(
      { _id: id, companyId },
      { isDeleted: true, deletedAt: new Date(), deletedBy: actorId, deleteReason: reason },
      { new: true }
    );
  }

  aggregate(pipeline) {
    return this.Model.aggregate(pipeline);
  }
}
