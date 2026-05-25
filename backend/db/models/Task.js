/**
 * Task Model — Module 5: Workflow & Task Tracker
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: true   // nullable — tasks can exist without a document
    },
    workflowId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending',
      allowNull: false
    },
    priority: {
      type: DataTypes.STRING(20),
      defaultValue: 'medium',
      allowNull: false
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    comments: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: true
    },
    approvalDecision: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    decision: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    escalatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'tasks',
    timestamps: true
  });

  return Task;
};
