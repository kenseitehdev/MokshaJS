
// crossPlatform.js

const platform = (() => {
  const userAgent = navigator.userAgent;

  if (/win/i.test(userAgent)) {
    return 'windows';
  } else if (/mac/i.test(userAgent)) {
    return 'mac';
  } else if (/linux/i.test(userAgent)) {
    return 'linux';
  } else if (/android/i.test(userAgent)) {
    return 'android';
  } else if (/ipad/i.test(userAgent)) {
    return 'ipad';
  } else if (/iphone/i.test(userAgent)) {
    return 'iphone';
  } else {
    return 'unknown';
  }
})();

const Global = {
  getPlatform: () => platform,

  isWindows: () => platform === 'windows',
  isMac: () => platform === 'mac',
  isLinux: () => platform === 'linux',
  isAndroid: () => platform === 'android',
  isIpad: () => platform === 'ipad',
  isIphone: () => platform === 'iphone',

  // Platform-specific file handling
  readFile: async (filePath) => {
    switch (platform) {
      case 'windows':
      case 'mac':
      case 'linux':
        // Example using Node.js File System
        const fs = await import('fs/promises');
        return await fs.readFile(filePath, 'utf-8');
      case 'android':
      case 'iphone':
        console.warn("File handling not implemented for mobile platforms yet.");
        return null;
      default:
        console.warn("Unknown platform. Cannot read file.");
        return null;
    }
  },

  writeFile: async (filePath, data) => {
    switch (platform) {
      case 'windows':
      case 'mac':
      case 'linux':
        const fs = await import('fs/promises');
        return await fs.writeFile(filePath, data);
      case 'android':
      case 'iphone':
        console.warn("File handling not implemented for mobile platforms yet.");
        return null;
      default:
        console.warn("Unknown platform. Cannot write file.");
        return null;
    }
  },

  // Notifications (simple example)
  showNotification: (message) => {
    if (platform === 'android' || platform === 'iphone') {
      // Use the Notification API or a mobile library
      console.log(`Mobile Notification: ${message}`);
    } else {
      // Desktop notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(message);
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification(message);
            }
          });
        }
      } else {
        console.warn("This browser does not support desktop notifications.");
      }
    }
  },

  // Example function to get platform-specific details
  getPlatformDetails: () => {
    switch (platform) {
      case 'windows':
        return { name: "Windows", version: "10/11" }; // Example version
      case 'mac':
        return { name: "macOS", version: "Monterey" }; // Example version
      case 'linux':
        return { name: "Linux", version: "Unknown" };
      case 'android':
        return { name: "Android", version: "Unknown" };
      case 'ipad':
        return { name: "iPad", version: "Unknown" };
      case 'iphone':
        return { name: "iPhone", version: "Unknown" };
      default:
        return { name: "Unknown", version: "Unknown" };
    }
  },

  // You can add more platform-specific methods as needed
};

// Export the crossPlatformLib object for use in other modules
export { Global };
