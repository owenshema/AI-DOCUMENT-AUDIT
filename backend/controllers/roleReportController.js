'use strict';

const roleReportService = require('../services/roleReportService');

const getRoleReport = async (req, res) => {
  try {
    var reportId = req.params.reportId;
    var role = req.user?.role || 'viewer';

    if (!roleReportService.canAccessReport(reportId, role)) {
      return res.status(403).json({ error: 'You do not have access to this report.' });
    }

    var models = req.app.locals.models;
    var data = await roleReportService.buildReport(reportId, models, req.user, req.query);

    if (!data) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    res.json(data);
  } catch (error) {
    console.error('Role report error:', error);
    res.status(500).json({ error: error.message || 'Failed to load report' });
  }
};

const listCatalog = (req, res) => {
  var role = req.user?.role || 'viewer';
  var meta = roleReportService.REPORT_META;
  var ids = role === 'administrator'
    ? Object.keys(meta)
    : Object.keys(meta).filter(function (id) {
      return roleReportService.canAccessReport(id, role);
    });

  res.json({
    role: role,
    reports: ids.map(function (id) {
      return { id: id, title: meta[id].title, description: meta[id].description };
    }),
  });
};

module.exports = { getRoleReport, listCatalog };
