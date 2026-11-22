// SQL và chi tiết dialect được đóng gói bởi ORM. Caller truyền transaction khi cần.
class Repository {
  constructor(model) {
    this.model = model;
  }

  findById(id, options = {}) {
    return this.model.findByPk(id, options);
  }

  findOne(options = {}) {
    return this.model.findOne(options);
  }

  list(options = {}) {
    return this.model.findAll(options);
  }

  paginate(options = {}) {
    return this.model.findAndCountAll(options);
  }

  create(values, options = {}) {
    return this.model.create(values, options);
  }

  async update(id, values, options = {}) {
    const entity = await this.findById(id, options);
    if (!entity) return null;
    // Instance update kích hoạt optimistic locking trên QuoteRequest.
    return entity.update(values, options);
  }

  async delete(id, options = {}) {
    const entity = await this.findById(id, options);
    if (!entity) return false;
    await entity.destroy(options);
    return true;
  }
}

module.exports = Repository;
