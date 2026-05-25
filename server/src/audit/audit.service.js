import { AuditLog } from '../models/AuditLog.js';

export const writeAudit = async ({ req, action, entity, entityId, before, after, metadata }) => {
  await AuditLog.create({
    companyId: req.companyId,
    actorId: req.user?._id,
    action,
    entity,
    entityId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    before,
    after,
    metadata
  });
};
