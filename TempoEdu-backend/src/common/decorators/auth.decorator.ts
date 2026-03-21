import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Role, Roles } from './roles.decorator';


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
