/**
 * Workflow Routes
 */

const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const { verifyRole } = require('../middleware/authMiddleware');

router.use(verifyRole(['administrator', 'auditor', 'document_manager', 'viewer']));

// Get task queue must be registered before /:workflowId
router.get('/tasks/queue', workflowController.getTaskQueue);

// Complete task
router.post('/tasks/:taskId/complete', verifyRole(['administrator', 'auditor']), workflowController.completeTask);

// Reassign task
router.post('/tasks/:taskId/reassign', verifyRole(['administrator', 'auditor']), workflowController.reassignTask);

// Escalate task
router.post('/tasks/:taskId/escalate', verifyRole(['administrator', 'auditor']), workflowController.escalateTask);

// Create workflow
router.post('/', verifyRole(['administrator', 'auditor']), workflowController.createWorkflow);

// Get all workflows
router.get('/', workflowController.getAllWorkflows);

// Get specific workflow
router.get('/:workflowId', workflowController.getWorkflowById);

// Update workflow
router.put('/:workflowId', verifyRole(['administrator', 'auditor']), workflowController.updateWorkflow);

// Start workflow
router.post('/:workflowId/start', verifyRole(['administrator', 'auditor']), workflowController.startWorkflow);

module.exports = router;
