import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateDevTokenDto } from './dto/create-dev-token.dto';
import { AuthService } from './auth.service';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('dev-token')
  @HttpCode(200)
  createDevToken(@Body() payload: CreateDevTokenDto) {
    return this.authService.createDevToken(payload);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}
