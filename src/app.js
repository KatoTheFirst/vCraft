const express = require('express');
const path = require('node:path');
const Database = require('./database/connection');
const createModels = require('./models');
const Repository = require('./repositories/Repository');
const CatalogService = require('./services/CatalogService');
const createRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const HttpError = require('./http/HttpError');

function createContext(database = new Database()) {
  const models = createModels(database.connection);
  const repositories = Object.fromEntries(Object.entries(models).map(([name, model]) => [name, new Repository(model)]));
  return { database, models, repositories, service: new CatalogService(repositories, models) };
}

function createApp(context) {
  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'self'; style-src 'self'; frame-ancestors 'none'");
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(createRoutes(context.service, context.database));
  app.use((req, res, next) => next(new HttpError(404, 'Không tìm thấy đường dẫn.')));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp, createContext };
