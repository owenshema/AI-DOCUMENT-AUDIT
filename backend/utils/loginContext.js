'use strict';

const os = require('os');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

function buildLoginContext(req) {
  const ipAddress = getClientIp(req);
  const host = req.get('host') || null;
  const origin = req.get('origin') || null;
  const referer = req.get('referer') || null;
  const protocol = req.protocol || 'http';
  const portalUrl = origin || (host ? `${protocol}://${host}` : null);
  const serverHostname = os.hostname();

  let accessFrom = portalUrl || host || null;
  if (!accessFrom && ipAddress) {
    accessFrom = ipAddress === '::1' || ipAddress === '127.0.0.1' ? 'localhost' : ipAddress;
  }

  return {
    ipAddress,
    userAgent: req.get('user-agent') || null,
    host,
    origin,
    referer,
    portalUrl,
    serverHostname,
    accessFrom: accessFrom || 'Unknown',
  };
}

module.exports = { getClientIp, buildLoginContext };
