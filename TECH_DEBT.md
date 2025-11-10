# Technical Debt Tracker

This file tracks technical debt items that need to be addressed in future development cycles.

## Current Technical Debt Items

### 1. Victory Native and React Native Image Module Resolution

**Description:**
There are issues with Victory Native charts and React Native's Image component resolution, requiring a workaround in metro.config.js.

**Impact:** Medium - Affects chart rendering and requires maintenance of metro.config.js workarounds.

**Potential solutions:**
- Use proper module resolution through alias configuration
- Consider alternative chart libraries if issues persist
- Follow up on React Native and Victory Native GitHub issues

**Added:** April 2025

### 2. Chart Rendering Errors in Mood History Tab

**Description:**
Victory chart components in the Mood History tab are throwing console errors related to NaN values in paths or attributes. While the charts are visually displaying correctly, these errors should be addressed for better stability and to avoid potential future rendering issues.

**Error symptoms:**
- `Error: <path> attribute d: Expected number, "M 725, NaN\n L 735, N…".`
- `Warning: Received NaN for the 'x' attribute. If this is expected, cast the value to a string.`

**Potential solutions:**
1. Further improve data preparation functions to filter out invalid data points
2. Implement more robust error handling in Victory chart components
3. Investigate if certain data types or structures need explicit conversion
4. Consider switching to a different chart library if Victory continues to have issues with web rendering

**Impact:** Low - Currently only affects console logging, not actual functionality

**Effort estimate:** Medium - Requires debugging Victory chart components and data processing

**Added:** April 2025

### 3. Expo Package Version Mismatches

**Description:**
There are some package version mismatches in the project that could lead to compatibility issues, particularly with Expo dependencies. These inconsistencies might cause unexpected behavior or breaking changes when upgrading.

**Impact:** Medium - Currently working but may cause issues during future upgrades.

**Potential solutions:**
1. Conduct a comprehensive audit of package versions
2. Update to consistent versions following Expo compatibility guidelines
3. Implement a package.json linting system to prevent future mismatches
4. Consider using Expo's managed workflow more strictly

**Effort estimate:** Medium - Requires careful testing of each dependency update

**Added:** April 2025

### 4. API Request Timeouts and Error Handling

**Description:**
Some API endpoints occasionally experience timeouts or errors, especially the analytics dashboard endpoint. While we've implemented fallback mechanisms, a more robust error handling and retry system is needed.

**Impact:** Medium - Users may occasionally see incomplete data or error states.

**Potential solutions:**
1. Implement a more comprehensive retry strategy with exponential backoff
2. Add better error boundary components for React Native
3. Improve caching of previously fetched data to show during API failures
4. Add offline support for critical features

**Effort estimate:** Medium - Requires changes across multiple components and API handlers

**Added:** April 2025

## Resolved Items

_(None yet)_