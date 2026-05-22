/**
 * Workflow Routes
 */

const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');

// Create workflow
router.post('/', workflowController.createWorkflow);

// Get all workflows
router.get('/', workflowController.getAllWorkflows);

// Get specific workflow
router.get('/:workflowId', workflowController.getWorkflowById);

// Update workflow
router.put('/:workflowId', workflowController.updateWorkflow);

// Start workflow
router.post('/:workflowId/start', workflowController.startWorkflow);

// Get task queue
router.get('/tasks/queue', workflowController.getTaskQueue);

// Complete task
router.post('/tasks/:taskId/complete', workflowController.completeTask);

// Reassign task
router.post('/tasks/:taskId/reassign', workflowController.reassignTask);

// Escalate task
router.post('/tasks/:taskId/escalate', workflowController.escalateTask);

module.exports = router;
