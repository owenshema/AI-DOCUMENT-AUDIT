'use strict';

const os = require('os');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * Turn a User-Agent string into a short device label for activity reports.
 * Example: "Chrome on Windows (Desktop)"
 */
function parseDeviceFromUserAgent(ua) {
  if (!ua || typeof ua !== 'string') return 'Unknown device';
  const s = ua;

  let osName = 'Unknown OS';
  if (/Windows NT 10/i.test(s)) osName = 'Windows 10/11';
  else if (/Windows NT/i.test(s)) osName = 'Windows';
  else if (/Android/i.test(s)) osName = 'Android';
  else if (/iPhone|iPad|iPod/i.test(s)) osName = 'iOS';
  else if (/Mac OS X/i.test(s)) osName = 'macOS';
  else if (/CrOS/i.test(s)) osName = 'Chrome OS';
  else if (/Linux/i.test(s)) osName = 'Linux';

  let browser = 'Browser';
  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(s)) browser = 'Opera';
  else if (/Chrome\//i.test(s) && !/Edg\//i.test(s)) browser = 'Chrome';
  else if (/Safari\//i.test(s) && !/Chrome\//i.test(s)) browser = 'Safari';
  else if (/Firefox\//i.test(s)) browser = 'Firefox';
  else if (/MSIE|Trident/i.test(s)) browser = 'Internet Explorer';

  let formFactor = 'Desktop';
  if (/Mobile|Android.*Mobile|iPhone/i.test(s)) formFactor = 'Mobile';
  else if (/iPad|Tablet|Android(?!.*Mobile)/i.test(s)) formFactor = 'Tablet';

  return `${browser} on ${osName} (${formFactor})`;
}

function parseDeviceInfo(ua) {
  const label = parseDeviceFromUserAgent(ua);
  const match = label.match(/^(.+) on (.+) \((.+)\)$/);
  return {
    label,
    browser: match ? match[1] : 'Unknown',
    os: match ? match[2] : 'Unknown',
    formFactor: match ? match[3] : 'Unknown',
    userAgent: ua || null,
  };
}

function buildLoginContext(req) {
  const ipAddress = getClientIp(req);
  const host = req.get('host') || null;
  const origin = req.get('origin') || null;
  const referer = req.get('referer') || null;
  const protocol = req.protocol || 'http';
  const portalUrl = origin || (host ? `${protocol}://${host}` : null);
  const serverHostname = os.hostname();
  const userAgent = req.get('user-agent') || null;
  const device = parseDeviceInfo(userAgent);

  let accessFrom = portalUrl || host || null;
  if (!accessFrom && ipAddress) {
    accessFrom = ipAddress === '::1' || ipAddress === '127.0.0.1' ? 'localhost' : ipAddress;
  }

  return {
    ipAddress,
    userAgent,
    device,
    host,
    origin,
    referer,
    portalUrl,
    serverHostname,
    accessFrom: accessFrom || 'Unknown',
  };
}

module.exports = {
  getClientIp,
  buildLoginContext,
  parseDeviceFromUserAgent,
  parseDeviceInfo,
};
