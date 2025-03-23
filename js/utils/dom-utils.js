/**
 * DOM utilities for PC History Tracker
 */

// Create DOMUtils namespace
window.DOMUtils = {
  /**
   * Create an HTML element with attributes and children
   * @param {string} tag - Tag name
   * @param {Object} attributes - Element attributes
   * @param {Array|string|Node} children - Child elements or text content
   * @returns {HTMLElement} The created element
   */
  createElement: function(tag, attributes = {}, children = null) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.entries(value).forEach(([prop, val]) => {
          element.style[prop] = val;
        });
      } else if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        element.addEventListener(eventName, value);
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // Add children
    if (children !== null) {
      if (Array.isArray(children)) {
        children.forEach(child => {
          if (child) {
            this.appendToElement(element, child);
          }
        });
      } else {
        this.appendToElement(element, children);
      }
    }
    
    return element;
  },

  /**
   * Append a child to an element
   * @param {HTMLElement} parent - Parent element
   * @param {HTMLElement|string} child - Child element or text content
   */
  appendToElement: function(parent, child) {
    if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(child.toString()));
    }
  },

  /**
   * Create a button element
   * @param {string} text - Button text
   * @param {string} className - Button class name
   * @param {Function} onClick - Click event handler
   * @param {Object} attributes - Additional attributes
   * @returns {HTMLButtonElement} The created button
   */
  createButton: function(text, className, onClick, attributes = {}) {
    return this.createElement('button', {
      className,
      onClick,
      ...attributes
    }, text);
  },

  /**
   * Remove all children from an element
   * @param {HTMLElement} element - Element to clear
   */
  clearElement: function(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  },

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type ('success', 'error', 'warning')
   * @param {number} duration - Duration in milliseconds
   */
  showToast: function(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container') || this.createToastContainer();
    
    const toast = this.createElement('div', { 
      className: `toast ${type}`
    }, message);
    
    container.appendChild(toast);
    
    // Remove toast after duration
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
      
      // Remove container if empty
      if (container.children.length === 0) {
        document.body.removeChild(container);
      }
    }, duration);
  },

  /**
   * Create a toast container if it doesn't exist
   * @returns {HTMLElement} The toast container
   */
  createToastContainer: function() {
    const container = this.createElement('div', { id: 'toast-container', className: 'toast-container' });
    document.body.appendChild(container);
    return container;
  },

  /**
   * Show a modal dialog
   * @param {string} title - Modal title
   * @param {HTMLElement|string} content - Modal content
   * @param {Function} onClose - Close event handler
   * @returns {HTMLElement} The modal element
   */
  showModal: function(title, content, onClose = null) {
    // Create modal elements
    const modal = this.createElement('div', { className: 'modal', style: { display: 'block' } });
    
    const modalContent = this.createElement('div', { className: 'modal-content' });
    
    const closeBtn = this.createElement('span', { 
      className: 'close',
      onClick: () => {
        if (onClose) onClose();
        document.body.removeChild(modal);
      }
    }, '×');
    
    const titleElement = this.createElement('h2', {}, title);
    
    // Append elements
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(titleElement);
    
    if (typeof content === 'string') {
      modalContent.appendChild(this.createElement('p', {}, content));
    } else {
      modalContent.appendChild(content);
    }
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (onClose) onClose();
        document.body.removeChild(modal);
      }
    });
    
    return modal;
  },

  /**
   * Show a confirmation dialog
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Confirm event handler
   * @param {Function} onCancel - Cancel event handler
   */
  showConfirmDialog: function(message, onConfirm, onCancel = null) {
    // Create buttons
    const buttonContainer = this.createElement('div', { className: 'modal-buttons' });
    
    const confirmBtn = this.createButton('Confirm', 'primary-button', () => {
      if (onConfirm) onConfirm();
      document.body.removeChild(modal);
    });
    
    const cancelBtn = this.createButton('Cancel', 'neutral-button', () => {
      if (onCancel) onCancel();
      document.body.removeChild(modal);
    });
    
    buttonContainer.appendChild(confirmBtn);
    buttonContainer.appendChild(cancelBtn);
    
    // Create content
    const content = this.createElement('div', {}, [
      this.createElement('p', {}, message),
      buttonContainer
    ]);
    
    // Show modal
    const modal = this.showModal('Confirm', content);
    return modal;
  }
};