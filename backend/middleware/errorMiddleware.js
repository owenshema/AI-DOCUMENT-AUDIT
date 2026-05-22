/**
 * Error Handling Middleware
 */

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      status: statusCode,
      message,
      timestamp: new Date(),
      path: req.path
    }
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      status: 404,
      message: `Route ${req.path} not found`,
      timestamp: new Date()
    }
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
