import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto, LoginDto } from './dto';
import { CreditsService } from '../credits/credits.service';
import { Role } from '../../common/decorators/roles.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly creditsService: CreditsService,
  ) {}

  async ensureAdminFromEnv(): Promise<void> {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!email) {
      return;
    }

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      if (existingUser.role !== Role.ADMIN) {
        existingUser.role = Role.ADMIN;
        await existingUser.save();
        this.logger.warn(`Promoted existing user to admin: ${email}`);
      } else {
        this.logger.log(`Admin user already configured: ${email}`);
      }
      return;
    }

    const password = process.env.ADMIN_PASSWORD?.trim();
    if (!password) {
      this.logger.warn(
        `ADMIN_EMAIL is set (${email}) but no user exists and ADMIN_PASSWORD is missing. Skipping admin creation.`,
      );
      return;
    }

    if (password.length < 8) {
      this.logger.warn(
        `ADMIN_PASSWORD is too short (minimum 8 characters). Skipping admin creation.`,
      );
      return;
    }

    const firstName = process.env.ADMIN_FIRST_NAME?.trim() || 'System';
    const lastName = process.env.ADMIN_LAST_NAME?.trim() || 'Admin';
    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await this.userModel.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: Role.ADMIN,
    });

    await this.creditsService.grantInitialCredits(admin._id.toString());
    this.logger.log(`Created admin user from env: ${email}`);
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: UserDocument; accessToken: string }> {
    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.userModel.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Grant initial credits
    await this.creditsService.grantInitialCredits(user._id.toString());

    const accessToken = this.generateToken(user);

    return { user, accessToken };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: UserDocument; accessToken: string }> {
    const user = await this.userModel
      .findOne({ email: loginDto.email })
      .select('+password');

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Account is suspended');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = this.generateToken(user);

    return { user, accessToken };
  }

  async getProfile(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private generateToken(user: UserDocument): string {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
