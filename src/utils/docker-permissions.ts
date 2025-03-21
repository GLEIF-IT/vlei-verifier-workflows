import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';

export async function ensureDockerPermissions(): Promise<boolean> {
  // Only run on Linux platforms
  if (os.platform() !== 'linux') {
    return true;
  }

  try {
    // Check if user can run docker without sudo
    execSync('docker ps', { stdio: 'ignore' });
    console.log('✅ Docker permissions are correctly configured');
    return true;
  } catch (_error) {
    console.warn('⚠️ Docker permissions issue detected');
    
    try {
      // Check if user is in docker group
      const groups = execSync('groups').toString();
      if (!groups.includes('docker')) {
        console.log('Adding current user to docker group...');
        try {
          execSync('sudo usermod -aG docker $USER', { stdio: 'inherit' });
          console.log('User added to docker group. You may need to log out and log back in for changes to take effect.');
          console.log('Alternatively, run: newgrp docker');
          return false;
        } catch (_e) {
          console.error('Failed to add user to docker group. Please run manually:');
          console.error('sudo usermod -aG docker $USER');
          return false;
        }
      }
      
      // Check docker socket permissions
      const socketStats = fs.statSync('/var/run/docker.sock');
      const socketGroup = socketStats.gid;
      const groupInfo = execSync(`getent group ${socketGroup}`).toString();
      console.log(`Docker socket belongs to group: ${groupInfo.split(':')[0]}`);
      
      console.error('Docker permissions issue. Please try one of the following:');
      console.error('1. Log out and log back in');
      console.error('2. Run: newgrp docker');
      console.error('3. Restart Docker: sudo systemctl restart docker');
      return false;
    } catch (e) {
      console.error('Error checking Docker permissions:', e);
      return false;
    }
  }
} 