# PC History Tracker

A simple application to track the history of PC parts and how they've moved between different rigs over time.

## Features

- Track PC parts with names, models, types, and notes
- Store data in a SQLite database file for true archival persistence
- Direct file-based workflow with automatic saving to the file system

## Implementation Notes

- Uses the File System Access API for direct file access
- All operations read/write directly to the SQLite file
- Fully CRUD-capable with visual save status indicators
- Built for long-term archival integrity

## Usage

1. Open `index.html` in a modern browser (Chrome, Edge, etc.)
2. Click "Create New Database" or "Open Database" to start
3. Add, edit, and delete parts directly in the interface
4. All changes are automatically saved to the file
5. Current database file is displayed at the top of the screen

## Technologies

- Pure HTML, CSS, and JavaScript
- SQL.js for SQLite in the browser
- File System Access API for direct file manipulation

## Recent Fixes

- Fixed timeline view to display part history correctly
- Improved connect/disconnect workflow for better reliability
- Updated database query methods to use consistent parameter handling
- Added detailed logging for troubleshooting connection issues
- Enhanced error handling throughout the application