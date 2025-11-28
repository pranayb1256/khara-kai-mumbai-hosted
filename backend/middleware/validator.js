// backend/middleware/validator.js

/**
 * Validate claim submission request
 */
export const validateClaimSubmission = (req, res, next) => {
  const { text, media, original_source } = req.body;
  const errors = [];

  // Validate text
  if (!text) {
    errors.push('Text is required');
  } else if (typeof text !== 'string') {
    errors.push('Text must be a string');
  } else if (text.trim().length < 10) {
    errors.push('Text must be at least 10 characters long');
  } else if (text.length > 5000) {
    errors.push('Text must not exceed 5000 characters');
  }

  // Validate media (optional)
  if (media !== undefined) {
    if (!Array.isArray(media)) {
      errors.push('Media must be an array of URLs');
    } else if (media.length > 10) {
      errors.push('Maximum 10 media URLs allowed');
    } else {
      const invalidUrls = media.filter(url => {
        if (typeof url !== 'string') return true;
        try {
          new URL(url);
          return false;
        } catch {
          return true;
        }
      });
      if (invalidUrls.length > 0) {
        errors.push('All media items must be valid URLs');
      }
    }
  }

  // Validate original_source (optional)
  if (original_source !== undefined && original_source !== null) {
    if (typeof original_source !== 'object') {
      errors.push('original_source must be an object');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
  }

  // Sanitize text
  req.body.text = text.trim();
  
  next();
};

/**
 * Validate claim ID parameter
 */
export const validateClaimId = (req, res, next) => {
  const { id } = req.params;
  
  // UUID v4 validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!id || !uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid claim ID format',
    });
  }
  
  next();
};

/**
 * Validate query parameters for listing
 */
export const validateListParams = (req, res, next) => {
  const { limit, offset, status, search } = req.query;
  
  if (limit !== undefined) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be a number between 1 and 100',
      });
    }
    req.query.limit = parsedLimit;
  }
  
  if (offset !== undefined) {
    const parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        success: false,
        error: 'Offset must be a non-negative number',
      });
    }
    req.query.offset = parsedOffset;
  }
  
  const validStatuses = ['pending', 'verified', 'debunked', 'uncertain', 'in_progress', 'confirmed', 'contradicted', 'unconfirmed'];
  if (status !== undefined && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Status must be one of: ${validStatuses.join(', ')}`,
    });
  }
  
  if (search !== undefined && typeof search === 'string' && search.length > 200) {
    return res.status(400).json({
      success: false,
      error: 'Search query must not exceed 200 characters',
    });
  }
  
  next();
};
