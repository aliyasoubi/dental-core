// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private static readonly BCRYPT_SALT_ROUNDS = 10;
  // A fixed-cost decoy hash so a "user not found" branch takes the same
  // time as a real bcrypt.compare — prevents timing-based user enumeration.
  private static readonly DECOY_HASH =
    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8lY6xd1YQ6X5g5x5g5x5g5x5g5x5g5';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ---------- Public API ----------
  // Account creation is Admin-only via UsersService.create() / POST /users.
  // There is deliberately no public self-registration endpoint.

  async login(
    loginDto: LoginDto,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const { emailOrMobile, password } = loginDto;

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password') // password is select:false by default, opt back in here only
      .where(
        'user.email = :emailOrMobile OR user.mobileNumber = :emailOrMobile',
        { emailOrMobile },
      )
      .getOne();

    if (!user) {
      await bcrypt.compare(password, AuthService.DECOY_HASH); // constant-time decoy
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.userRepository.update(user.id, {
      lastLoginAt: user.lastLoginAt,
    });

    return this.generateAuthResponse(user, deviceInfo, ipAddress);
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: this.hashToken(refreshToken) },
      relations: ['user'],
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (tokenRecord.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    try {
      await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return { accessToken: this.generateAccessToken(tokenRecord.user) };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: this.hashToken(refreshToken), userId },
    });
    if (tokenRecord) {
      tokenRecord.isRevoked = true;
      await this.refreshTokenRepository.save(tokenRecord);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  // ---------- Private helpers ----------

  private async generateAuthResponse(
    user: User,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(
      user,
      deviceInfo,
      ipAddress,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
    };
  }

  private generateAccessToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET')!,
      expiresIn: parseInt(
        this.configService.get<string>('JWT_ACCESS_EXPIRATION_TIME')!,
        10,
      ),
    });
  }

  private async generateRefreshToken(
    user: User,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<string> {
    const expiresInSeconds = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME')!,
      10,
    );

    const token = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
        expiresIn: expiresInSeconds,
      },
    );

    // Derive DB expiry from the same value used to sign the JWT, so the two never drift out of sync.
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: this.hashToken(token), // store hash, never the raw token
      userId: user.id,
      deviceInfo,
      ipAddress,
      expiresAt,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return token;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
