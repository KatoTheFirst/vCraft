const express = require('express');
const { success } = require('../http/response');
const HttpError = require('../http/HttpError');
const CatalogController = require('../controllers/CatalogController');

function createRoutes(service, database) {
  const router = express.Router();
  const controller = new CatalogController(service);
  router.get('/', (req, res) => res.render('index'));
  router.get('/artisan/:slug', (req, res) => controller.artisanPage(req, res));
  router.get('/trace/:code', (req, res) => controller.tracePage(req, res));

  const api = express.Router();
  // Một chỗ đăng ký method, tự động trả 405 và Allow cho endpoint đã tồn tại.
  const get = (path, handler) => {
    api.route(path).get(handler).all((req, res, next) => {
      res.set('Allow', 'GET, HEAD');
      next(new HttpError(405, 'Phương thức không được hỗ trợ.'));
    });
  };
  get('/health', async (req, res) => {
    try {
      await database.connect();
      await database.connection.getQueryInterface().describeTable('products');
    } catch {
      throw new HttpError(503, 'Cơ sở dữ liệu chưa sẵn sàng.');
    }
    return success(res, { service: 'vcraft', database: 'ready' });
  });
  get('/villages', async (req, res) => success(res, await service.villages()));
  get('/categories', async (req, res) => success(res, await service.categories()));
  get('/artisans', (req, res) => controller.list(req, res, 'artisans', ['village_id', 'is_open']));
  get('/artisans/:slug', async (req, res) => success(res, await service.artisan(req.params.slug)));
  get('/products', (req, res) => controller.list(req, res, 'products', ['artisan_id', 'category_id', 'q']));
  get('/products/:slug', async (req, res) => success(res, await service.product(req.params.slug)));
  get('/batches/:code', async (req, res) => success(res, await service.trace(req.params.code)));
  get('/news', (req, res) => controller.list(req, res, 'news', ['village_id']));
  router.use('/api/v1', api);
  return router;
}

module.exports = createRoutes;
