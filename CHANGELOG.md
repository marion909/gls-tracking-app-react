# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-09-05

### 🎉 Major Features Added

#### Customer Grouping & Sorting
- **Enhanced Package Display**: Shipments are now grouped by customer name and displayed in alphabetical order
- **Smart Numbering**: Multiple packages for the same customer show as "Customer Name (1/3)", "Customer Name (2/3)", etc.
- **Improved Organization**: All packages from the same sender appear together in the list

#### Address Management System
- **New Address Column**: Replaced "Standort" column with "Adressen" column for better clarity
- **Enhanced Data Extraction**: Improved Selenium selectors for robust address extraction from GLS portal
- **Database Migration**: Seamless migration from location to address field in database schema

#### Visual Enhancements
- **Overdue Highlighting**: Packages older than 5 days are highlighted in red for immediate attention
- **Better Status Display**: Improved status chips with appropriate colors

#### Security & UX Improvements
- **Inactivity Timeout**: Automatic logout after 5 minutes of inactivity for enhanced security
- **Session Management**: Better session handling with automatic token refresh

### 🔧 Technical Improvements

#### Backend Enhancements
- Updated all API routes to use address field instead of location
- Enhanced GLS service with new address extraction selectors:
  - Primary: `td[ng-attr-id*="displayAddress_"]`
  - Fallback selectors for robust data extraction
- Improved TypeScript interfaces throughout the application
- Database schema migration for address field

#### Frontend Improvements
- Added filtering options: "Hide Delivered", "Hide Cancelled", "Hide Overdue"
- Enhanced table sorting with German locale support
- Improved responsive design and user interface
- Better error handling and user feedback

#### Development & Quality
- Enhanced Prisma schema with proper field types
- Improved error handling across all components
- Better TypeScript type safety
- Consistent code formatting and structure

### 📊 Database Changes
- **Migration**: Renamed `location` field to `address` in TrackingInfo model
- **Data Integrity**: All existing data preserved during migration
- **Enhanced Indexing**: Better performance for address-based queries

### 🎯 Filter & Display Features
- **Smart Filtering**: Hide delivered, cancelled, or overdue shipments as needed
- **Persistent Settings**: Filter preferences saved in browser localStorage
- **Real-time Updates**: Instant filter application without page reload
- **Counter Integration**: Package numbering works correctly with all filters

### 🔒 Security Enhancements
- **Auto-logout**: Prevents unauthorized access on inactive sessions
- **Token Management**: Improved JWT token handling and validation
- **Session Timer**: Visual countdown for user awareness

## [1.0.0] - Initial Release
- Basic GLS package tracking functionality
- React frontend with Material-UI components
- Node.js backend with Express and Prisma
- Selenium-based data extraction from GLS portal
- Basic authentication and session management
