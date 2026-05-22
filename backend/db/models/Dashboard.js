const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const Dashboard = sequelize.define('Dashboard', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    dashboardName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    dashboardType: {
      type: DataTypes.STRING(100),
      defaultValue: 'personal'
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    layout: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of widget configurations with positions and sizes'
    },
    widgets: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of enabled widgets with their configurations'
    },
    theme: {
      type: DataTypes.STRING(100),
      defaultValue: 'light'
    },
    customTheme: {
      type: DataTypes.JSONB,
      defaultValue: null,
      comment: 'Custom color scheme and styling'
    },
    refreshInterval: {
      type: DataTypes.INTEGER,
      defaultValue: 300,
      comment: 'Auto-refresh interval in seconds'
    },
    autoRefreshEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    timeRange: {
      type: DataTypes.JSONB,
      defaultValue: { type: 'last_7_days', custom: null },
      comment: 'Default time range for metrics'
    },
    filters: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Dashboard-level filters'
    },
    metrics: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Key metrics configuration and cached values'
    },
    bookmarks: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Bookmarked items and reports'
    },
    sharedWith: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of user/role IDs dashboard is shared with'
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Granular permissions for shared dashboard'
    },
    lastModifiedAt: {
      type: DataTypes.DATE
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastViewedAt: {
      type: DataTypes.DATE
    },
    description: {
      type: DataTypes.TEXT
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    alertsConfiguration: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Alert thresholds and notifications'
    },
    exportSettings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Export format preferences'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'dashboards',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['is_default'] },
      { fields: ['dashboard_type'] },
      { fields: ['user_id', 'is_default'] }
    ]
  });

  return Dashboard;
};
