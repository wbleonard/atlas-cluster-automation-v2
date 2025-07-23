// Atlas Function: parseScheduleTag
// Utility function to parse automation:pause-schedule tag values
// Format: "days:1.2.3.4.5:hour:22:timezone:America-New_York"
// Example: "days:1.2.3.4.5:hour:22:timezone:America-New_York" 
// Note: Atlas tags don't allow commas or forward slashes

exports = function(tagValue, defaultTimezone = 'America/New_York') {
  if (!tagValue || typeof tagValue !== 'string') {
    throw new Error('Schedule tag value must be a non-empty string');
  }

  // Parse the descriptive format: days:1.2.3.4.5:hour:22:timezone:America-New_York
  const parts = tagValue.split(':');
  
  if (parts.length < 4) {
    throw new Error(`Invalid schedule format: ${tagValue}. Expected format: "days:1.2.3.4.5:hour:22:timezone:America-New_York"`);
  }

  // Validate and extract days
  if (parts[0] !== 'days') {
    throw new Error(`Invalid format: expected "days" but found "${parts[0]}"`);
  }
  
  const daysStr = parts[1].trim();
  if (!daysStr) {
    throw new Error(`Days cannot be empty. Expected format: "days:1.2.3.4.5"`);
  }

  const pauseDaysOfWeek = daysStr.split('.').map(dayStr => {
    const day = parseInt(dayStr.trim(), 10);
    if (isNaN(day) || day < 0 || day > 6) {
      throw new Error(`Invalid day value: ${dayStr.trim()}. Must be an integer between 0 (Sunday) and 6 (Saturday)`);
    }
    return day;
  });

  if (pauseDaysOfWeek.length === 0) {
    throw new Error('At least one day must be specified');
  }

  // Validate and extract hour
  if (parts[2] !== 'hour') {
    throw new Error(`Invalid format: expected "hour" but found "${parts[2]}"`);
  }
  
  const hourStr = parts[3].trim();
  const pauseHour = parseInt(hourStr, 10);
  
  if (isNaN(pauseHour) || pauseHour < 0 || pauseHour > 23) {
    throw new Error(`Invalid hour value: ${hourStr}. Must be an integer between 0 and 23`);
  }

  // Extract timezone (optional)
  let timezone = defaultTimezone;
  if (parts.length >= 6 && parts[4] === 'timezone') {
    timezone = parts[5].trim();
  }
  
  // Convert timezone format from tag-safe format back to IANA format
  // Atlas tags don't allow "/" so we use "-" as separator and convert back
  timezone = timezone.replace(/-/g, '/');
  
  if (!timezone) {
    throw new Error('Timezone cannot be empty');
  }

  // Validate timezone format (basic check for IANA timezone)
  if (!/^[A-Za-z_]+\/[A-Za-z_]+$/.test(timezone) && timezone !== 'UTC') {
    console.warn(`parseScheduleTag: Timezone '${timezone}' may not be a valid IANA timezone identifier`);
  }

  return {
    pauseHour,
    pauseDaysOfWeek,
    timezone
  };
};
