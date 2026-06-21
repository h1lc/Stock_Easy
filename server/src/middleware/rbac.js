const PERMISSIONS = {
  GERANT: ['products:read', 'products:write', 'products:delete', 'stock:read', 'stock:write', 'alerts:read', 'orders:read', 'orders:write', 'dashboard:read', 'users:read', 'users:write'],
  MAGASINIER: ['products:read', 'stock:read', 'stock:write', 'alerts:read', 'orders:read'],
  COMMERCIAL: ['products:read', 'stock:read', 'alerts:read'],
};

const authorize = (...permissions) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const userPermissions = PERMISSIONS[userRole] || [];
    const hasPermission = permissions.every(p => userPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({ error: 'Accès refusé : permissions insuffisantes' });
    }
    next();
  };
};

module.exports = { authorize, PERMISSIONS };
