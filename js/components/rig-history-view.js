/**
 * Rig History View Component for PC History Tracker
 * Provides a detailed timeline view of a rig's history and component evolution
 */

// Create namespace
window.RigHistoryView = (function() {
  // Private variables
  let currentMotherboardId = null;
  let currentLifecycleStartDate = null;
  
  /**
   * Generate a color from a part identifier for consistent visual identity
   * @param {string} identifier - Part identifier (usually brand+model+type)
   * @returns {string} Color in HSL format
   */
  function getColorFromPartIdentifier(identifier) {
    if (!identifier) return 'hsl(0, 0%, 75%)'; // Default gray
    
    // Simple hash function to generate a number from a string
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = ((hash << 5) - hash) + identifier.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Use hash to generate a color with good saturation and lightness
    const hue = Math.abs(hash % 360);
    const saturation = 75 + Math.abs((hash >> 8) % 15); // 75% to 90% saturation
    const lightness = 65 + Math.abs((hash >> 12) % 10); // 65% to 75% lightness
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  
  /**
   * Format a date for display in the timeline
   * @param {string} dateStr - ISO date string
   * @param {string} precision - Date precision ('day', 'month', 'year')
   * @returns {string} Formatted date string
   */
  function formatTimelineDate(dateStr, precision) {
    if (!dateStr) return 'Unknown';
    return window.DateUtils.formatDateByPrecision(dateStr, precision || 'day');
  }
  
  /**
   * Convert date string to timestamp for timeline calculations
   * @param {string} dateStr - ISO date string
   * @returns {number} Timestamp in milliseconds
   */
  function dateToTimestamp(dateStr) {
    if (!dateStr) return 0;
    return new Date(dateStr).getTime();
  }
  
  /**
   * Create a timeline scale function that maps dates to pixel positions
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   * @param {number} width - Width of timeline in pixels
   * @returns {Function} Scale function that converts timestamp to x position
   */
  function createTimeScale(startTime, endTime, width) {
    const timeRange = endTime - startTime;
    const padding = timeRange * 0.05; // 5% padding on each side
    
    // Adjust the range with padding
    const adjustedStart = startTime - padding;
    const adjustedEnd = endTime + padding;
    const adjustedRange = adjustedEnd - adjustedStart;
    
    return function(timestamp) {
      return ((timestamp - adjustedStart) / adjustedRange) * width;
    };
  }
  
  /**
   * Calculate the min and max dates from an array of events
   * @param {Array} events - Array of events with date properties
   * @returns {Object} Object with minDate and maxDate
   */
  function calculateDateRange(events) {
    if (!events || events.length === 0) {
      return { minDate: new Date(), maxDate: new Date() };
    }
    
    let minTimestamp = Infinity;
    let maxTimestamp = -Infinity;
    
    events.forEach(event => {
      // Check connected_at date
      if (event.connected_at) {
        const timestamp = dateToTimestamp(event.connected_at);
        minTimestamp = Math.min(minTimestamp, timestamp);
      }
      
      // Check disconnected_at date
      if (event.disconnected_at) {
        const timestamp = dateToTimestamp(event.disconnected_at);
        maxTimestamp = Math.max(maxTimestamp, timestamp);
      } else {
        // If still connected, use current date
        maxTimestamp = Math.max(maxTimestamp, Date.now());
      }
    });
    
    // If no valid dates found, use current date
    if (minTimestamp === Infinity) minTimestamp = Date.now();
    if (maxTimestamp === -Infinity) maxTimestamp = Date.now();
    
    return {
      minDate: new Date(minTimestamp),
      maxDate: new Date(maxTimestamp)
    };
  }
  
  /**
   * Render the timeline axis with date markers
   * @param {HTMLElement} container - Container element for the axis
   * @param {Date} startDate - Start date of the timeline
   * @param {Date} endDate - End date of the timeline
   * @param {number} width - Width of the timeline in pixels
   */
  function renderTimelineAxis(container, startDate, endDate, width) {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const timeScale = createTimeScale(startTime, endTime, width);
    
    // Create axis container
    const axisContainer = document.createElement('div');
    axisContainer.className = 'timeline-axis';
    axisContainer.style.width = `${width}px`;
    
    // Create axis line
    const axisLine = document.createElement('div');
    axisLine.className = 'timeline-axis-line';
    axisContainer.appendChild(axisLine);
    
    // Calculate appropriate number of ticks based on timeline duration
    const timeRange = endTime - startTime;
    const dayInMs = 24 * 60 * 60 * 1000;
    const monthInMs = 30 * dayInMs;
    const yearInMs = 365 * dayInMs;
    
    let tickInterval;
    let tickFormat;
    
    if (timeRange <= 7 * dayInMs) {
      // Less than a week: show daily ticks
      tickInterval = dayInMs;
      tickFormat = date => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    } else if (timeRange <= 90 * dayInMs) {
      // Less than 3 months: show weekly ticks
      tickInterval = 7 * dayInMs;
      tickFormat = date => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    } else if (timeRange <= yearInMs) {
      // Less than a year: show monthly ticks
      tickInterval = monthInMs;
      tickFormat = date => date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    } else {
      // More than a year: show quarterly ticks
      tickInterval = 3 * monthInMs;
      tickFormat = date => date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
    
    // Generate ticks
    const ticks = [];
    let currentTick = new Date(startDate);
    currentTick.setHours(0, 0, 0, 0); // Normalize to start of day
    
    while (currentTick <= endDate) {
      ticks.push(new Date(currentTick));
      currentTick = new Date(currentTick.getTime() + tickInterval);
    }
    
    // Add the end date as the last tick if it's not already included
    if (ticks.length === 0 || ticks[ticks.length - 1] < endDate) {
      ticks.push(new Date(endDate));
    }
    
    // Create tick marks
    ticks.forEach(date => {
      const tick = document.createElement('div');
      tick.className = 'timeline-tick';
      
      const xPos = timeScale(date.getTime());
      tick.style.left = `${xPos}px`;
      
      const tickLabel = document.createElement('div');
      tickLabel.className = 'timeline-tick-label';
      tickLabel.textContent = tickFormat(date);
      
      tick.appendChild(tickLabel);
      axisContainer.appendChild(tick);
    });
    
    container.appendChild(axisContainer);
    return timeScale;
  }
  
  /**
   * Render a component timeline showing when parts were connected/disconnected
   * @param {HTMLElement} container - Container element for the timeline
   * @param {Array} connectionEvents - Array of connection events
   * @param {Function} timeScale - Function that maps timestamps to x positions
   * @param {number} width - Width of the timeline in pixels
   */
  function renderComponentTimeline(container, connectionEvents, timeScale, width) {
    if (!connectionEvents || connectionEvents.length === 0) return;
    
    // Group events by part type
    const groupedByType = {};
    
    connectionEvents.forEach(event => {
      if (!groupedByType[event.part_type]) {
        groupedByType[event.part_type] = [];
      }
      groupedByType[event.part_type].push(event);
    });
    
    // Sort part types for consistent ordering (CPU, motherboard, RAM, GPU, storage, etc.)
    const partTypeOrder = {
      'motherboard': 0,
      'cpu': 1,
      'ram': 2,
      'gpu': 3,
      'storage': 4,
      'psu': 5,
      'case': 6,
      'cooling': 7,
      'peripheral': 8,
      'monitor': 9,
      'other': 10
    };
    
    const sortedTypes = Object.keys(groupedByType).sort((a, b) => {
      return (partTypeOrder[a] || 100) - (partTypeOrder[b] || 100);
    });
    
    // Create container for part type rows
    const timelineContent = document.createElement('div');
    timelineContent.className = 'timeline-content';
    timelineContent.style.width = `${width}px`;
    
    // Render each part type group
    sortedTypes.forEach(partType => {
      const typeGroup = document.createElement('div');
      typeGroup.className = 'timeline-part-type';
      
      // Add type label
      const typeLabel = document.createElement('div');
      typeLabel.className = 'timeline-type-label';
      typeLabel.textContent = partType.charAt(0).toUpperCase() + partType.slice(1);
      typeGroup.appendChild(typeLabel);
      
      // Add timeline for this type
      const typeLane = document.createElement('div');
      typeLane.className = 'timeline-type-lane';
      
      // Process connections for this type
      const connections = groupedByType[partType];
      connections.forEach(conn => {
        // Skip if connection dates are invalid
        if (!conn.connected_at) return;
        
        const startTime = dateToTimestamp(conn.connected_at);
        const endTime = conn.disconnected_at ? dateToTimestamp(conn.disconnected_at) : Date.now();
        
        // Create part bar
        const partBar = document.createElement('div');
        partBar.className = 'timeline-part-bar';
        
        // Calculate position and width based on timeScale
        const xStart = timeScale(startTime);
        const xEnd = timeScale(endTime);
        partBar.style.left = `${xStart}px`;
        partBar.style.width = `${Math.max(xEnd - xStart, 4)}px`; // Ensure minimum width
        
        // Set color based on part identity
        const partIdentifier = `${conn.part_brand}${conn.part_model}${conn.part_type}`;
        partBar.style.backgroundColor = getColorFromPartIdentifier(partIdentifier);
        
        // Add hover tooltip showing part details
        partBar.setAttribute('data-tooltip', `
          ${conn.part_brand} ${conn.part_model}
          Connected: ${formatTimelineDate(conn.connected_at, conn.connected_precision)}
          ${conn.disconnected_at ? 'Disconnected: ' + formatTimelineDate(conn.disconnected_at, conn.disconnected_precision) : 'Still connected'}
          ${conn.notes ? 'Notes: ' + conn.notes : ''}
        `);
        
        // Add click handler to view part timeline
        partBar.addEventListener('click', () => {
          window.TimelineView.showPartTimeline(conn.part_id);
        });
        
        // Add marker for the connected date
        const connectedMarker = document.createElement('div');
        connectedMarker.className = 'timeline-event-marker connected';
        connectedMarker.style.left = `${xStart}px`;
        typeLane.appendChild(connectedMarker);
        
        // Add marker for the disconnected date if applicable
        if (conn.disconnected_at) {
          const disconnectedMarker = document.createElement('div');
          disconnectedMarker.className = 'timeline-event-marker disconnected';
          disconnectedMarker.style.left = `${xEnd}px`;
          typeLane.appendChild(disconnectedMarker);
        }
        
        typeLane.appendChild(partBar);
      });
      
      typeGroup.appendChild(typeLane);
      timelineContent.appendChild(typeGroup);
    });
    
    container.appendChild(timelineContent);
  }
  
  /**
   * Get all connection events for a motherboard during a specific lifecycle period
   * @param {number} motherboardId - Motherboard ID
   * @param {string} startDate - Lifecycle start date
   * @param {string} endDate - Lifecycle end date (or null for active lifecycle)
   * @returns {Array} Array of connection events
   */
  function getConnectionEvents(motherboardId, startDate, endDate) {
    const db = window.DatabaseService.getDatabase();
    if (!db) return [];
    
    try {
      let query = `
        SELECT 
          c.id AS connection_id,
          c.part_id,
          p.brand AS part_brand,
          p.model AS part_model,
          p.type AS part_type,
          c.connected_at,
          c.connected_precision,
          c.disconnected_at,
          c.disconnected_precision,
          c.notes
        FROM connections c
        JOIN parts p ON c.part_id = p.id
        WHERE c.motherboard_id = ${motherboardId}
      `;
      
      // Add date filtering if provided
      if (startDate) {
        query += ` AND (c.disconnected_at IS NULL OR c.disconnected_at >= '${startDate}')`;
      }
      
      if (endDate) {
        query += ` AND c.connected_at <= '${endDate}'`;
      }
      
      query += ` ORDER BY c.connected_at`;
      
      const result = db.exec(query);
      if (result.length === 0) return [];
      
      // Map columns to values
      const columns = result[0].columns;
      const events = result[0].values.map(row => {
        const event = {};
        columns.forEach((column, index) => {
          event[column] = row[index];
        });
        return event;
      });
      
      return events;
    } catch (err) {
      console.error('Error getting connection events:', err);
      return [];
    }
  }
  
  /**
   * Get motherboard details
   * @param {number} motherboardId - Motherboard ID
   * @returns {Object} Motherboard details
   */
  function getMotherboardDetails(motherboardId) {
    const db = window.DatabaseService.getDatabase();
    if (!db) return null;
    
    try {
      const query = `
        SELECT id, brand, model, acquisition_date, date_precision
        FROM parts
        WHERE id = ${motherboardId} AND type = 'motherboard'
      `;
      
      const result = db.exec(query);
      if (result.length === 0 || result[0].values.length === 0) return null;
      
      // Map columns to values
      const columns = result[0].columns;
      const row = result[0].values[0];
      
      const motherboard = {};
      columns.forEach((column, index) => {
        motherboard[column] = row[index];
      });
      
      return motherboard;
    } catch (err) {
      console.error('Error getting motherboard details:', err);
      return null;
    }
  }
  
  /**
   * Render statistics summary for the rig
   * @param {HTMLElement} container - Container element for the statistics
   * @param {Array} events - Connection events 
   * @param {Object} lifecycle - Lifecycle data with start/end dates
   */
  function renderRigStatistics(container, events, lifecycle) {
    if (!events || events.length === 0) return;
    
    const statsContainer = document.createElement('div');
    statsContainer.className = 'rig-statistics';
    
    // Calculate duration
    let durationText = 'Unknown duration';
    if (lifecycle.start_date) {
      const startTime = dateToTimestamp(lifecycle.start_date);
      const endTime = lifecycle.end_date ? dateToTimestamp(lifecycle.end_date) : Date.now();
      const durationMs = endTime - startTime;
      
      // Format duration
      const days = Math.floor(durationMs / (24 * 60 * 60 * 1000));
      if (days < 30) {
        durationText = `${days} day${days !== 1 ? 's' : ''}`;
      } else if (days < 365) {
        const months = Math.floor(days / 30);
        durationText = `${months} month${months !== 1 ? 's' : ''}`;
      } else {
        const years = Math.floor(days / 365);
        const remainingMonths = Math.floor((days % 365) / 30);
        durationText = `${years} year${years !== 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}` : ''}`;
      }
      
      if (!lifecycle.end_date) {
        durationText += ' (ongoing)';
      }
    }
    
    // Count unique components by type
    const componentCounts = {};
    const uniqueComponents = new Set();
    
    events.forEach(event => {
      const type = event.part_type;
      componentCounts[type] = (componentCounts[type] || 0) + 1;
      uniqueComponents.add(event.part_id);
    });
    
    // Create statistics items
    const stats = [
      {
        label: 'Active Period',
        value: durationText
      },
      {
        label: 'Total Components',
        value: uniqueComponents.size
      }
    ];
    
    // Add counts by type
    Object.entries(componentCounts).forEach(([type, count]) => {
      stats.push({
        label: `${type.charAt(0).toUpperCase() + type.slice(1)}s`,
        value: count
      });
    });
    
    // Render statistics
    stats.forEach(stat => {
      const statItem = document.createElement('div');
      statItem.className = 'stat-item';
      
      const statLabel = document.createElement('div');
      statLabel.className = 'stat-label';
      statLabel.textContent = stat.label;
      
      const statValue = document.createElement('div');
      statValue.className = 'stat-value';
      statValue.textContent = stat.value;
      
      statItem.appendChild(statLabel);
      statItem.appendChild(statValue);
      statsContainer.appendChild(statItem);
    });
    
    container.appendChild(statsContainer);
  }
  
  /**
   * Render the component list showing all parts that were part of this rig
   * @param {HTMLElement} container - Container element for the component list
   * @param {Array} events - Connection events
   */
  function renderComponentList(container, events) {
    if (!events || events.length === 0) return;
    
    const listContainer = document.createElement('div');
    listContainer.className = 'component-list';
    
    // Group by part type
    const groupedByType = {};
    events.forEach(event => {
      const type = event.part_type;
      if (!groupedByType[type]) {
        groupedByType[type] = [];
      }
      
      // Check if this part is already in the list
      const existingIndex = groupedByType[type].findIndex(e => e.part_id === event.part_id);
      
      if (existingIndex >= 0) {
        // Update existing entry if needed
        const existing = groupedByType[type][existingIndex];
        
        // If current event is disconnected but existing isn't, update it
        if (event.disconnected_at && !existing.disconnected_at) {
          existing.disconnected_at = event.disconnected_at;
          existing.disconnected_precision = event.disconnected_precision;
        }
      } else {
        // Add as new entry
        groupedByType[type].push(event);
      }
    });
    
    // Sort and render each type
    const partTypeOrder = {
      'motherboard': 0,
      'cpu': 1,
      'ram': 2,
      'gpu': 3,
      'storage': 4,
      'psu': 5,
      'case': 6,
      'cooling': 7,
      'peripheral': 8,
      'monitor': 9,
      'other': 10
    };
    
    const sortedTypes = Object.keys(groupedByType).sort((a, b) => {
      return (partTypeOrder[a] || 100) - (partTypeOrder[b] || 100);
    });
    
    sortedTypes.forEach(type => {
      const typeContainer = document.createElement('div');
      typeContainer.className = 'component-type';
      
      const typeHeader = document.createElement('h3');
      typeHeader.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      typeContainer.appendChild(typeHeader);
      
      const components = groupedByType[type];
      
      // Sort components by connection date
      components.sort((a, b) => {
        return dateToTimestamp(a.connected_at) - dateToTimestamp(b.connected_at);
      });
      
      const componentsList = document.createElement('ul');
      componentsList.className = 'components-list';
      
      components.forEach(component => {
        const componentItem = document.createElement('li');
        componentItem.className = 'component-item';
        
        // Part details
        const partInfo = document.createElement('div');
        partInfo.className = 'part-info';
        
        // Part name with link to timeline
        const partName = document.createElement('a');
        partName.href = '#';
        partName.className = 'part-name';
        partName.textContent = `${component.part_brand} ${component.part_model}`;
        partName.addEventListener('click', (e) => {
          e.preventDefault();
          window.TimelineView.showPartTimeline(component.part_id);
        });
        
        // Timeline badge showing when the part was connected/disconnected
        const timelineBadge = document.createElement('div');
        timelineBadge.className = 'timeline-badge';
        
        const connectedDate = formatTimelineDate(component.connected_at, component.connected_precision);
        const disconnectedText = component.disconnected_at ? 
          formatTimelineDate(component.disconnected_at, component.disconnected_precision) : 
          'Present';
        
        timelineBadge.textContent = `${connectedDate} → ${disconnectedText}`;
        
        partInfo.appendChild(partName);
        partInfo.appendChild(timelineBadge);
        
        // Add notes if available
        if (component.notes) {
          const notes = document.createElement('div');
          notes.className = 'part-notes';
          notes.textContent = component.notes;
          partInfo.appendChild(notes);
        }
        
        componentItem.appendChild(partInfo);
        componentsList.appendChild(componentItem);
      });
      
      typeContainer.appendChild(componentsList);
      listContainer.appendChild(typeContainer);
    });
    
    container.appendChild(listContainer);
  }
  
  /**
   * Get all lifecycle periods for a motherboard
   * @param {number} motherboardId - Motherboard ID
   * @returns {Array} Array of lifecycle objects
   */
  function getLifecycles(motherboardId) {
    return window.RigModel.computeRigLifecycles(motherboardId);
  }
  
  /**
   * Render lifecycle navigation for a motherboard with multiple lifecycles
   * @param {HTMLElement} container - Container element for the navigation
   * @param {Array} lifecycles - Array of lifecycle objects
   * @param {string} currentStartDate - Current lifecycle start date
   */
  function renderLifecycleNavigation(container, lifecycles, currentStartDate) {
    if (!lifecycles || lifecycles.length <= 1) return;
    
    const navContainer = document.createElement('div');
    navContainer.className = 'lifecycle-navigation';
    
    const navLabel = document.createElement('div');
    navLabel.className = 'nav-label';
    navLabel.textContent = 'Rig Lifecycles:';
    navContainer.appendChild(navLabel);
    
    const navButtons = document.createElement('div');
    navButtons.className = 'nav-buttons';
    
    lifecycles.forEach(lifecycle => {
      const startDate = lifecycle.start_date;
      const button = document.createElement('button');
      button.className = 'lifecycle-button';
      
      if (startDate === currentStartDate) {
        button.classList.add('active');
      }
      
      // Format date range for button text
      const startText = formatTimelineDate(lifecycle.start_date, lifecycle.start_precision);
      const endText = lifecycle.end_date ? 
        formatTimelineDate(lifecycle.end_date, lifecycle.end_precision) : 
        'Present';
      
      button.textContent = `${startText} - ${endText}`;
      
      // Add click handler to switch lifecycle
      button.addEventListener('click', () => {
        showRigHistory(currentMotherboardId, startDate);
      });
      
      navButtons.appendChild(button);
    });
    
    navContainer.appendChild(navButtons);
    container.appendChild(navContainer);
  }
  
  /**
   * Show the rig history view for a motherboard
   * @param {number} motherboardId - Motherboard ID
   * @param {string} lifecycleStartDate - Lifecycle start date (optional, uses first lifecycle if not provided)
   */
  function showRigHistory(motherboardId, lifecycleStartDate) {
    if (!motherboardId) return;
    
    try {
      console.log('Showing rig history for motherboard ID:', motherboardId);
      currentMotherboardId = motherboardId;
      
      // Get the motherboard details
      const motherboard = getMotherboardDetails(motherboardId);
      if (!motherboard) {
        throw new Error('Motherboard not found');
      }
      
      // Get all lifecycles for this motherboard
      const lifecycles = getLifecycles(motherboardId);
      if (lifecycles.length === 0) {
        throw new Error('No lifecycles found for this motherboard');
      }
      
      // Determine which lifecycle to display
      let targetLifecycle;
      
      if (lifecycleStartDate) {
        targetLifecycle = lifecycles.find(cycle => cycle.start_date === lifecycleStartDate);
      }
      
      // If no specific lifecycle provided or not found, use the first one
      if (!targetLifecycle) {
        targetLifecycle = lifecycles[0];
      }
      
      currentLifecycleStartDate = targetLifecycle.start_date;
      
      // Get the rig name for this lifecycle
      const rigName = window.RigModel.getRigName(motherboardId, targetLifecycle.start_date);
      
      // Get connection events for this lifecycle
      const events = getConnectionEvents(
        motherboardId, 
        targetLifecycle.start_date, 
        targetLifecycle.end_date
      );
      
      // Clear and prepare the view container
      const container = document.getElementById('rig-history-view');
      window.DOMUtils.clearElement(container);
      
      // Create header with back button
      const header = document.createElement('div');
      header.className = 'view-header';
      
      const backButton = document.createElement('button');
      backButton.id = 'back-to-rigs';
      backButton.textContent = '← Back to Rigs';
      backButton.addEventListener('click', () => {
        hide();
      });
      
      header.appendChild(backButton);
      container.appendChild(header);
      
      // Create rig title
      const titleContainer = document.createElement('div');
      titleContainer.className = 'rig-history-title';
      
      const rigTitle = document.createElement('h2');
      rigTitle.id = 'rig-history-name';
      rigTitle.textContent = rigName ? rigName.name : `${motherboard.brand} ${motherboard.model} Rig`;
      
      const motherboardInfo = document.createElement('div');
      motherboardInfo.className = 'motherboard-info';
      motherboardInfo.textContent = `${motherboard.brand} ${motherboard.model}`;
      
      titleContainer.appendChild(rigTitle);
      titleContainer.appendChild(motherboardInfo);
      container.appendChild(titleContainer);
      
      // Add lifecycle navigation if multiple lifecycles
      renderLifecycleNavigation(container, lifecycles, targetLifecycle.start_date);
      
      // Create rig statistics summary
      renderRigStatistics(container, events, targetLifecycle);
      
      // Create timeline visualization container
      const timelineContainer = document.createElement('div');
      timelineContainer.className = 'rig-timeline-container';
      
      // Calculate date range for the timeline
      const dateRange = calculateDateRange(events);
      
      // Set timeline width based on container width
      const timelineWidth = Math.max(800, document.getElementById('rig-history-view').offsetWidth - 40);
      
      // Render timeline axis
      const timeScale = renderTimelineAxis(
        timelineContainer,
        dateRange.minDate,
        dateRange.maxDate,
        timelineWidth
      );
      
      // Render component timeline
      renderComponentTimeline(timelineContainer, events, timeScale, timelineWidth);
      
      container.appendChild(timelineContainer);
      
      // Add component list
      const componentListContainer = document.createElement('div');
      componentListContainer.className = 'component-list-container';
      
      const componentListTitle = document.createElement('h3');
      componentListTitle.textContent = 'Components';
      componentListContainer.appendChild(componentListTitle);
      
      renderComponentList(componentListContainer, events);
      container.appendChild(componentListContainer);
      
      // Show the rig history view
      document.getElementById('app-container').classList.add('hidden');
      document.getElementById('part-timeline-view').classList.add('hidden');
      document.getElementById('rig-history-view').classList.remove('hidden');
      
      console.log('Rig history view activated with', events.length, 'events');
    } catch (err) {
      console.error('Error showing rig history:', err);
      alert('Error showing rig history: ' + err.message);
    }
  }
  
  /**
   * Hide the rig history view
   */
  function hide() {
    document.getElementById('rig-history-view').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    currentMotherboardId = null;
    currentLifecycleStartDate = null;
  }
  
  // Public API
  return {
    init: function() {
      // Back button event
      document.getElementById('back-to-rigs').addEventListener('click', () => {
        this.hide();
      });
    },
    showRigHistory,
    hide
  };
})();