const { PERMISSIONS } = require('../src/middleware/rbac');

describe('RBAC Permissions', () => {
  it('GERANT should have full access', () => {
    const p = PERMISSIONS.GERANT;
    expect(p).toContain('products:write');
    expect(p).toContain('products:delete');
    expect(p).toContain('stock:write');
    expect(p).toContain('orders:write');
    expect(p).toContain('dashboard:read');
  });

  it('MAGASINIER should not have dashboard access', () => {
    expect(PERMISSIONS.MAGASINIER).not.toContain('dashboard:read');
  });

  it('MAGASINIER should have stock write access', () => {
    expect(PERMISSIONS.MAGASINIER).toContain('stock:write');
  });

  it('COMMERCIAL should have read-only access', () => {
    const p = PERMISSIONS.COMMERCIAL;
    expect(p).toContain('products:read');
    expect(p).not.toContain('products:write');
    expect(p).not.toContain('stock:write');
    expect(p).not.toContain('orders:write');
  });

  it('COMMERCIAL should not have admin permissions', () => {
    const p = PERMISSIONS.COMMERCIAL;
    expect(p).not.toContain('products:delete');
    expect(p).not.toContain('users:write');
  });
});
