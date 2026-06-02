const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

class PrinterService {
  constructor() {
    this.platform = os.platform();
    this.supportedPlatforms = ['win32', 'linux'];
    this.linuxDevicePaths = [
      '/dev/usb/lp0',
      '/dev/usb/lp1',
      '/dev/lp0',
      '/dev/printers/0'
    ];
  }

  async print(content, options = {}) {
    const {
      printerName = '',
      copies = 1,
      printerType = 'default',
      tempDir = os.tmpdir()
    } = options;

    if (!this.supportedPlatforms.includes(this.platform)) {
      throw new Error(`Unsupported platform: ${this.platform}`);
    }

    const tempFile = path.join(tempDir, `print-temp-${Date.now()}.txt`);
    
    try {
      fs.writeFileSync(tempFile, content, 'utf-8');
      
      if (this.platform === 'win32') {
        return await this.printWindows(printerName, tempFile, copies);
      } else {
        return await this.printLinux(printerName, tempFile, { printerType, copies });
      }
    } catch (error) {
      console.error('Print error:', error);
      throw error;
    } finally {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.warn('Failed to delete temp file:', e);
      }
    }
  }

  async printWindows(printerName, filePath, copies) {
    return new Promise((resolve, reject) => {
      // Use Notepad for printing (simple but reliable)
      const cmd = printerName 
        ? `notepad /p "${filePath}"`
        : `print /D:"${printerName}" "${filePath}"`;

      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`Windows print failed: ${stderr || err.message}`));
        } else {
          resolve({
            success: true,
            message: 'Printed successfully via Windows',
            method: 'windows'
          });
        }
      });
    });
  }

  async printLinux(printerName, filePath, options) {
    const { printerType = 'cups', copies = 1 } = options;

    try {
      if (printerType === 'usb') {
        const devicePath = this.findLinuxPrinter();
        if (devicePath) {
          return await this.printDirectLinux(devicePath, filePath, copies);
        }
        throw new Error('No USB printer found');
      }
      
      return await this.printViaCups(printerName, filePath, copies);
    } catch (error) {
      console.error('Linux print error:', error);
      throw error;
    }
  }

  findLinuxPrinter() {
    return this.linuxDevicePaths.find(devicePath => {
      try {
        fs.accessSync(devicePath, fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    });
  }

  async printDirectLinux(devicePath, filePath, copies) {
    return new Promise((resolve, reject) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const printData = new Array(copies).fill(content).join('\n\n');

      fs.writeFile(devicePath, printData, err => {
        if (err) {
          reject(new Error(`Direct print failed: ${err.message}`));
        } else {
          resolve({
            success: true,
            message: `Printed directly to ${devicePath}`,
            method: 'usb'
          });
        }
      });
    });
  }

  async printViaCups(printerName, filePath, copies) {
    return new Promise((resolve, reject) => {
      let cmd = 'lp';
      if (printerName) cmd += ` -d "${printerName}"`;
      if (copies > 1) cmd += ` -n ${copies}`;
      cmd += ` "${filePath}"`;

      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`CUPS print failed: ${stderr || err.message}`));
        } else {
          resolve({
            success: true,
            message: stdout.trim() || 'Printed via CUPS',
            method: 'cups'
          });
        }
      });
    });
  }
}

module.exports = new PrinterService();