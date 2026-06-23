import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../guards/roles.guard';

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext): UserPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const user: UserPayload = request.user;
    return data ? user?.[data] : user;
  },
);
