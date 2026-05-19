import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';
import { requireAuth } from './requireAuth.js';
import { TokenPayload } from '../types/auth.js';

type RequiredPermission = string | { entity: string; action: string };

function normalizePermission(perm: RequiredPermission): string {
  return typeof perm === 'string' ? perm : `${perm.entity}:${perm.action}`;
}

/**
 * Require authenticated user and verify at least one of the given
 * permissions exists in the user's role.  Pass one permission string,
 * an array of strings, or `{ entity, action }` objects.  The admin
 * wildcard permission `"*"` bypasses every check.
 *
 * Usage:
 *   import { requirePermission } from './middleware/requirePermission.js'
 *   router.post('/orders', requireAuth, requirePermission('orders:create'), handler)
 */
export function requirePermission(
  ...required: RequiredPermission[]
): (req: Request, res: Response, next: NextFunction) => void {
  const requiredNormalized = required.map(normalizePermission);

  return (req: Request, res: Response, next: NextFunction): void => {
    (async () => {
      requireAuth(req, res, () => {});
      if (res.headersSent) return;

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      try {
        const role = await prisma.role.findUnique({
          where: { id: req.user.roleId },
          select: { permissions: true, name: true },
        });

        if (!role) {
          res.status(403).json({ error: 'Role not found' });
          return;
        }

        const permissions = JSON.parse(role.permissions) as string[];

        if (permissions.includes('*')) {
          next();
          return;
        }

        const hasAccess = requiredNormalized.some(
          (p: string) => permissions.includes(p),
        );

        if (!hasAccess) {
          res.status(403).json({
            error: 'Forbidden',
            required: requiredNormalized,
            role: role.name,
          });
          return;
        }

        next();
      } catch {
        res.status(500).json({ error: 'Failed to check permissions' });
      }
    })();
  };
}
