const { badRequest, created, fail, notFound, ok } = require('../http/respond');

function registerCategoryRoutes(deps) {
  const { app, authMiddleware, requirePermission, normalizeCategory, relationalCategories, persistRelationalState, db } = deps;

  app.get('/api/categories', authMiddleware, (_req, res) => {
    res.json({ categories: relationalCategories() || [] });
  });

  app.post('/api/categories', authMiddleware, requirePermission('products'), (req, res) => {
    try {
      const payload = normalizeCategory(req.body || {});
      if (!payload.name) return badRequest(res, 'Category name is required');
      const exists = db.prepare('SELECT id FROM product_categories WHERE lower(name) = lower(?) AND is_active = 1').get(payload.name);
      if (exists) return badRequest(res, 'Category already exists');
      db.prepare('INSERT INTO product_categories (name, is_active) VALUES (?, 1)').run(payload.name);
      persistRelationalState();
      created(res, { ok: true, categories: relationalCategories() });
    } catch (err) {
      fail(res, err, 'Could not create category');
    }
  });

  app.put('/api/categories/:id', authMiddleware, requirePermission('products'), (req, res) => {
    try {
      const categoryId = Number(req.params.id);
      const payload = normalizeCategory(req.body || {});
      if (!payload.name) return badRequest(res, 'Category name is required');
      const existing = db.prepare('SELECT id FROM product_categories WHERE id = ? AND is_active = 1').get(categoryId);
      if (!existing) return notFound(res, 'Category not found');
      const duplicate = db.prepare('SELECT id FROM product_categories WHERE lower(name) = lower(?) AND id != ? AND is_active = 1').get(payload.name, categoryId);
      if (duplicate) return badRequest(res, 'Category already exists');
      db.prepare('UPDATE product_categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(payload.name, categoryId);
      persistRelationalState();
      ok(res, { ok: true, categories: relationalCategories() });
    } catch (err) {
      fail(res, err, 'Could not update category');
    }
  });

  app.delete('/api/categories/:id', authMiddleware, requirePermission('canDelete'), (req, res) => {
    try {
      const categoryId = Number(req.params.id);
      const inUse = db.prepare('SELECT COUNT(*) AS count FROM products WHERE category_id = ? AND is_active = 1').get(categoryId);
      if (Number(inUse.count || 0) > 0) return badRequest(res, 'Category is used by products');
      db.prepare('UPDATE product_categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(categoryId);
      persistRelationalState();
      ok(res, { ok: true, categories: relationalCategories() });
    } catch (err) {
      fail(res, err, 'Could not delete category');
    }
  });
}

module.exports = { registerCategoryRoutes };
