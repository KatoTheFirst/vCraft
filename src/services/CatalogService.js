const { Op } = require('sequelize');
const HttpError = require('../http/HttpError');

class CatalogService {
  constructor(repositories, models) {
    this.repositories = repositories;
    this.models = models;
  }

  // Chỉ xưởng đã duyệt, thuộc tài khoản nghệ nhân còn hoạt động được công khai.
  publicArtisan() {
    return {
      model: this.models.artisan_profiles, as: 'artisan', required: true,
      where: { approval_status: 'approved' },
      include: [{ model: this.models.users, as: 'user', attributes: [], required: true,
        where: { role: 'artisan', status: 'active' } }],
    };
  }

  async villages() {
    return this.repositories.craft_villages.list({ order: [['name', 'ASC']] });
  }

  async categories() {
    return this.repositories.categories.list({ order: [['name', 'ASC']] });
  }

  async artisans({ limit, offset, village_id, is_open }) {
    const where = { approval_status: 'approved' };
    if (village_id) where.village_id = village_id;
    if (is_open !== undefined) where.is_open = is_open;
    return this.repositories.artisan_profiles.paginate({
      where, limit, offset, order: [['workshop_name', 'ASC'], ['id', 'ASC']],
      include: this.publicArtisan().include,
    });
  }

  async artisan(slug) {
    const artisan = await this.repositories.artisan_profiles.findOne({
      where: { slug, approval_status: 'approved' },
      include: this.publicArtisan().include,
    });
    if (!artisan) throw new HttpError(404, 'Không tìm thấy xưởng.');
    return artisan;
  }

  async products({ limit, offset, artisan_id, category_id, q }) {
    const where = { status: 'published' };
    if (artisan_id) where.artisan_id = artisan_id;
    if (category_id) where.category_id = category_id;
    if (q) where.name = { [Op.like]: `%${q}%` };
    return this.repositories.products.paginate({
      where, limit, offset, order: [['created_at', 'DESC'], ['id', 'ASC']],
      include: [this.publicArtisan(), { model: this.models.categories, as: 'category' }],
    });
  }

  async product(slug) {
    const product = await this.repositories.products.findOne({
      where: { slug, status: 'published' },
      include: [this.publicArtisan(), { model: this.models.categories, as: 'category' }],
    });
    if (!product) throw new HttpError(404, 'Không tìm thấy sản phẩm.');
    return product;
  }

  async trace(code) {
    const batch = await this.repositories.production_batches.findOne({
      where: { code },
      include: [{
        model: this.models.products, as: 'product', required: true,
        where: { status: 'published' }, include: [this.publicArtisan()],
      }, { model: this.models.production_logs, as: 'logs' }],
      order: [[{ model: this.models.production_logs, as: 'logs' }, 'occurred_at', 'ASC'],
        [{ model: this.models.production_logs, as: 'logs' }, 'position', 'ASC']],
    });
    if (!batch) throw new HttpError(404, 'Không tìm thấy lô sản xuất.');
    return batch;
  }

  async news({ limit, offset, village_id }) {
    const where = { published_at: { [Op.lte]: new Date() } };
    if (village_id) where.village_id = village_id;
    return this.repositories.community_news.paginate({
      where, limit, offset, order: [['is_pinned', 'DESC'], ['published_at', 'DESC'], ['id', 'ASC']],
    });
  }
}

module.exports = CatalogService;
