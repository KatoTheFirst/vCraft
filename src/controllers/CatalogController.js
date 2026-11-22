const { success } = require('../http/response');
const queryOptions = require('../http/query');

class CatalogController {
  constructor(service) {
    this.service = service;
  }

  async list(req, res, resource, filters = []) {
    const options = queryOptions(req.query, filters);
    const result = await this.service[resource](options);
    return success(res, {
      items: result.rows,
      pagination: { page: options.page, limit: options.limit, total: result.count,
        total_pages: Math.ceil(result.count / options.limit) },
    });
  }

  async artisanPage(req, res) {
    const artisan = await this.service.artisan(req.params.slug);
    res.render('artisan', { artisan });
  }

  async tracePage(req, res) {
    const batch = await this.service.trace(req.params.code);
    res.render('trace', { batch });
  }
}

module.exports = CatalogController;
