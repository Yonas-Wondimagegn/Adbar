import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@adbar/common';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: Record<string, ServiceHealth>;
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastChecked: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check(): Promise<any> {
    const health = await this.getHealthStatus();

    const httpStatus =
      health.status === 'healthy'
        ? HttpStatus.OK
        : health.status === 'degraded'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;

    return {
      statusCode: httpStatus,
      data: health,
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe' })
  async readiness(): Promise<any> {
    return {
      statusCode: HttpStatus.OK,
      data: { ready: true, timestamp: new Date().toISOString() },
    };
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe' })
  async liveness(): Promise<any> {
    return {
      statusCode: HttpStatus.OK,
      data: { alive: true, timestamp: new Date().toISOString() },
    };
  }

  private async getHealthStatus(): Promise<HealthStatus> {
    const now = Date.now();
    const uptime = now - this.startTime;

    // Check system resources
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

    // Service health checks (simplified - in production, check actual service availability)
    const services: Record<string, ServiceHealth> = {
      api: {
        status: 'up',
        responseTime: 0,
        lastChecked: new Date().toISOString(),
      },
      database: {
        status: 'up',
        responseTime: 1,
        lastChecked: new Date().toISOString(),
      },
    };

    // Determine overall status
    const serviceStatuses = Object.values(services).map((s) => s.status);
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (serviceStatuses.includes('down')) {
      status = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      services,
      system: {
        memory: {
          used: Math.round(usedMemory / 1024 / 1024),
          total: Math.round(totalMemory / 1024 / 1024),
          percentage: memoryPercentage,
        },
        cpu: {
          usage: Math.round(process.cpuUsage().user / 1000000),
        },
      },
    };
  }
}
