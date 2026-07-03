// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
    private static readonly BCRYPT_SALT_ROUNDS = 10;

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(RefreshToken)
        private refreshTokenRepository: Repository<RefreshToken>,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {}

    // ---------- Public API ----------

    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        const { email, mobileNumber, password, ...rest } = registerDto;

        const existingUser = await this.userRepository.findOne({
            where: [{ email }, { mobileNumber }],
        });
        if (existingUser) {
            throw new ConflictException('Email or mobile number already exists');
        }

        const hashedPassword = await bcrypt.hash(password, AuthService.BCRYPT_SALT_ROUNDS);
        const user = this.userRepository.create({
            email,
            mobileNumber,
            password: hashedPassword,
            ...rest,
        });
        await this.userRepository.save(user);

        return this.generateAuthResponse(user);
    }

    async login(loginDto: LoginDto, deviceInfo?: string, ipAddress?: string): Promise<AuthResponseDto> {
        const { emailOrMobile, password } = loginDto;

        const user = await this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.password') // password is select:false by default, opt back in here only
            .where('user.email = :emailOrMobile OR user.mobileNumber = :emailOrMobile', { emailOrMobile })
            .getOne();

        if (!user) {
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
        await this.userRepository.update(user.id, { lastLoginAt: user.lastLoginAt });

        return this.generateAuthResponse(user, deviceInfo, ipAddress);
    }

    async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
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
        const refreshToken = await this.generateRefreshToken(user, deviceInfo, ipAddress);

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
            expiresIn: parseInt(this.configService.get<string>('JWT_ACCESS_EXPIRATION_TIME')!, 10),
        });
    }

    private async generateRefreshToken(
        user: User,
        deviceInfo?: string,
        ipAddress?: string,
    ): Promise<string> {
        const payload = { sub: user.id, type: 'refresh' };
        const expiresInSeconds = parseInt(
            this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME')!,
            10,
        );

        const token = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
            expiresIn: expiresInSeconds,
        });

        // Derive DB expiry from the same value used to sign the JWT,
        // so the two never drift out of sync.
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