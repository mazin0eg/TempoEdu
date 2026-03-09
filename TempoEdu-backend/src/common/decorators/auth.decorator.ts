import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Role, Roles } from './roles.decorator';

/**
 * Secures a route with JWT auth + optional role check.
 *
 * @example
 *   @Auth()            // any authenticated user
 *   @Auth(Role.ADMIN)  // admin only
 */
export function Auth(...roles: Role[]) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] = [
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
  ];

  if (roles.length > 0) {
    decorators.push(Roles(...roles));
  }

  return applyDecorators(...decorators);
}
