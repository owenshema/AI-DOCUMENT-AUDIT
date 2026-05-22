const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const Search = sequelize.define('Search', {
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
    searchName: {
      type: DataTypes.STRING(255),
      comment: 'User-friendly name for saved search'
    },
    searchType: {
      type: DataTypes.STRING(100),
      defaultValue: 'document_search'
    },
    isQuickSearch: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isSaved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    keywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    filters: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Advanced filters (date range, classification, status, etc)'
    },
    searchScope: {
      type: DataTypes.STRING(100),
      defaultValue: 'all_documents'
    },
    sortBy: {
      type: DataTypes.STRING(50),
      defaultValue: 'relevance'
    },
    sortOrder: {
      type: DataTypes.STRING(100),
      defaultValue: 'desc'
    },
    pageSize: {
      type: DataTypes.INTEGER,
      defaultValue: 20
    },
    resultCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    searchExecutionTime: {
      type: DataTypes.INTEGER,
      comment: 'Execution time in milliseconds'
    },
    lastExecutedAt: {
      type: DataTypes.DATE
    },
    executionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    searchHistory: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of past search modifications'
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    sharingSettings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Sharing with other users or groups'
    },
    alertsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    alertFrequency: {
      type: DataTypes.STRING(100),
      defaultValue: 'daily'
    },
    alertLastSentAt: {
      type: DataTypes.DATE
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
    tableName: 'searches',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['is_saved'] },
      { fields: ['last_executed_at'] },
      { fields: ['user_id', 'is_saved'] }
    ]
  });

  return Search;
};
