import { exec } from "child_process";
import * as net from "net";

export async function runDockerCompose(
    file: string,
    command: string,
    service: string,
  ): Promise<boolean> {
    const running = await isDockerComposeRunning(file);
    if (!running) {
      console.log(
        `Starting docker compose command: ${file} ${command} ${service}`,
      );
      return new Promise((resolve, reject) => {
        exec(
          `docker compose -f ${file} ${command} ${service}`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Error running docker compose command: ${stderr}`);
              return reject(error);
            }
            console.log(stdout);
            resolve(true);
          },
        );
      });
    } else {
      console.log(
        `Docker compose is already running: ${file} ${command} ${service}`,
      );
      return running;
    }
  }
  
  export async function stopDockerCompose(
    file: string,
    command: string,
    service: string,
  ): Promise<boolean> {
    const running = await isDockerComposeRunning(file);
    if (running) {
      console.log(
        `Stopping docker compose command: ${file} ${command} ${service}`,
      );
      return new Promise((resolve, reject) => {
        exec(
          `docker compose -f ${file} ${command} ${service}`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Error stopping docker compose command: ${stderr}`);
              return reject(error);
            }
            console.log(stdout);
            resolve(true);
          },
        );
      });
    } else {
      console.log(
        `Docker compose is already stopped: ${file} ${command} ${service}`,
      );
      return running;
    }
  }
  
  function isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(true));
      server.once("listening", () => {
        server.close(() => resolve(false));
      });
      server.listen(port);
    });
  }
  
  export async function isDockerComposeRunning(
    file: string,
    vleiServerPort: number = 7723,
    witnessPort: number = 5642,
    verifierPort: number = 7676,
    apiPort: number = 8000,
  ): Promise<boolean> {
    const ports = [
      { name: "vleiServerPort", port: vleiServerPort },
      { name: "witnessPort", port: witnessPort },
      { name: "verifierPort", port: verifierPort },
      // { name: 'filerPort', port: filerPort },
      { name: "apiPort", port: apiPort },
    ];
  
    const portsInUse = await Promise.all(
      ports.map(async ({ name, port }) => {
        const inUse = await isPortInUse(port);
        return inUse ? name : null;
      }),
    );
  
    const inUsePorts = portsInUse.filter(Boolean);
  
    if (inUsePorts.length === ports.length) {
      console.log(
        "All specified ports are in use. Skipping docker compose check.",
      );
      return true;
    } else if (inUsePorts.length > 0) {
      console.log(`The following ports are in use: ${inUsePorts.join(", ")}`);
      return true;
    }
  
    return new Promise((resolve, reject) => {
      exec(`docker compose -f ${file} ps`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error checking docker compose status: ${stderr}`);
          return reject(error);
        }
        // Check if the output contains only headers and no running services
        const lines = stdout.trim().split("\n");
        if (lines.length <= 1) {
          console.log(`docker compose status: ${lines}\n Service is not running`);
          resolve(false);
        } else {
          // Check if the service is listed as running
          const isRunning = stdout.includes("Up");
          console.log(`docker compose status: ${lines}\n Service is running`);
          resolve(isRunning);
        }
      });
    });
  }  