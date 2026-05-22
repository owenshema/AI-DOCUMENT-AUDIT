/**
 * Task Routes
 * Routes for task management endpoints
 */

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// Get all tasks for the current user
router.get('/', taskController.getTasks);

// Create a new task
router.post('/', taskController.createTask);

// Get tasks overview
router.get('/overview', taskController.getTasksOverview);

// Get tasks by workflow
router.get('/workflow/:workflowId', taskController.getTasksByWorkflow);

// Get specific task
router.get('/:taskId', taskController.getTasks); // Using getTasks with filter

// Update task
router.put('/:taskId', taskController.updateTask);

// Update task status
router.patch('/:taskId/status', taskController.updateTaskStatus);

// Assign task
router.patch('/:taskId/assign', taskController.assignTask);

// Delete task
router.delete('/:taskId', taskController.deleteTask);

module.exports = router;
