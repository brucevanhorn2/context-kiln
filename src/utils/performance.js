/**
 * Performance Utilities
 *
 * Helper functions for optimizing React performance:
 * - Debouncing
 * - Throttling
 * - Memoization helpers
 */

/**
 * Debounce function - delays execution until after wait milliseconds have elapsed
 * since the last time it was invoked
 *
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - ensures function is called at most once per specified time period
 *
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between allowed calls
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Batch updates - collects multiple updates and executes them together
 * Useful for streaming data that arrives rapidly
 *
 * @param {Function} callback - Function to call with batched data
 * @param {number} delay - Milliseconds to wait before flushing batch
 * @returns {Function} Function to add items to batch
 */
export function createBatcher(callback, delay = 50) {
  let batch = [];
  let timeout;

  return function addToBatch(item) {
    batch.push(item);

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (batch.length > 0) {
        callback(batch);
        batch = [];
      }
    }, delay);
  };
}

/**
 * Shallow comparison for React.memo
 * Compares two objects by their top-level properties
 *
 * @param {object} prevProps - Previous props
 * @param {object} nextProps - Next props
 * @returns {boolean} True if equal (skip re-render)
 */
export function shallowEqual(prevProps, nextProps) {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (let key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Deep comparison for complex objects
 * Use sparingly - expensive operation
 *
 * @param {*} obj1 - First object
 * @param {*} obj2 - Second object
 * @returns {boolean} True if deeply equal
 */
export function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;

  if (
    typeof obj1 !== 'object' ||
    obj1 === null ||
    typeof obj2 !== 'object' ||
    obj2 === null
  ) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}
