import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ProfilesService } from '../profiles/profiles.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly profilesService: ProfilesService,
    private readonly jwtService: JwtService,
  ) {}

  private signToken(user: User) {
    return this.jwtService.sign({ sub: user.id, email: user.email });
  }

  async register(email: string, password: string, name: string, birthDate: string, bio?: string) {
    const saltRounds = Number(process.env.BCRYPT_ROUNDS || 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await this.usersService.create(email, passwordHash);
    await this.profilesService.createForUser(user.id, name, new Date(birthDate), bio);
    const accessToken = this.signToken(user);
    return { user: { id: user.id, email: user.email }, accessToken };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const accessToken = this.signToken(user);
    return { user: { id: user.id, email: user.email }, accessToken };
  }
}
