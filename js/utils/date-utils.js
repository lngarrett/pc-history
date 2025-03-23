/**
 * Date utilities for PC History Tracker
 */

// Create DateUtils namespace
window.DateUtils = {
  /**
   * Format a date string based on precision
   * @param {string} dateStr - ISO date string
   * @param {string} precision - 'day', 'month', or 'year'
   * @returns {string} Formatted date string
   */
  formatDateByPrecision: function(dateStr, precision = 'day') {
    if (!dateStr) return 'Unknown Date';
    
    const date = new Date(dateStr);
    
    switch (precision) {
      case 'day':
        return date.toLocaleDateString();
      case 'month':
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
      case 'year':
        return date.getFullYear().toString();
      default:
        return 'Unknown Date';
    }
  },

  /**
   * Create an ISO date string from year, month, and day
   * @param {number} year - Year
   * @param {number} month - Month (1-12, optional)
   * @param {number} day - Day (1-31, optional)
   * @returns {string} ISO date string
   */
  createDateString: function(year, month = null, day = null) {
    if (!year) return null;
    
    // Create parts of the date
    const yearStr = year.toString().padStart(4, '0');
    const monthStr = month ? month.toString().padStart(2, '0') : '01';
    const dayStr = day ? day.toString().padStart(2, '0') : '01';
    
    return `${yearStr}-${monthStr}-${dayStr}`;
  },

  /**
   * Determine date precision from year, month, and day
   * @param {number} year - Year
   * @param {number} month - Month (1-12, optional)
   * @param {number} day - Day (1-31, optional)
   * @returns {string} 'year', 'month', or 'day'
   */
  getDatePrecision: function(year, month = null, day = null) {
    if (!year) return 'none';
    if (!month) return 'year';
    if (!day) return 'month';
    return 'day';
  },

  /**
   * Populate a year select element with years
   * @param {HTMLSelectElement} select - The select element to populate
   * @param {number} startYear - The starting year (defaults to 1980)
   * @param {number} endYear - The ending year (defaults to current year)
   */
  populateYearSelect: function(select, startYear = 1980, endYear = new Date().getFullYear()) {
    // Clear existing options except the first one
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    // Add years in descending order
    for (let year = endYear; year >= startYear; year--) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      select.appendChild(option);
    }
  },

  /**
   * Populate a day select element with days
   * @param {HTMLSelectElement} select - The select element to populate
   * @param {number} month - The month (1-12)
   * @param {number} year - The year
   */
  populateDaySelect: function(select, month, year) {
    // Clear existing options except the first one
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    // Get number of days in the month
    const daysInMonth = this.getDaysInMonth(month, year);
    
    // Add days
    for (let day = 1; day <= daysInMonth; day++) {
      const option = document.createElement('option');
      option.value = day;
      option.textContent = day;
      select.appendChild(option);
    }
  },

  /**
   * Get the number of days in a month
   * @param {number} month - The month (1-12)
   * @param {number} year - The year
   * @returns {number} The number of days in the month
   */
  getDaysInMonth: function(month, year) {
    if (!month) return 31; // Default to 31 days if no month specified
    return new Date(year, month, 0).getDate();
  }
};