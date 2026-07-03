import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

describe('AuthService', () => {
    let service: AuthService;
    let userRepo: any;
    let refreshTokenRepo: any;
    let jwtService: any;
    let configService: any;
    let queryBuilderMock: any;

    beforeEach(async () => {
        queryBuilderMock = {
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn(),
        };

        userRepo = {
            findOne: jest.fn(),
            create: jest.fn((dto) => dto),
            save: jest.fn((u) => Promise.resolve({ id: 'user-1', ...u })),
            createQueryBuilder: jest.fn(() => queryBuilderMock),
        };
        refreshTokenRepo = {
            findOne: jest.fn(),
            create: jest.fn((dto) => dto),
            save: jest.fn((t) => Promise.resolve(t)),
            update: jest.fn(),
        };
        jwtService = {
            sign: jest.fn(() => 'signed.jwt.token'),
            verifyAsync: jest.fn(),
        };
        configService = {
            get: jest.fn((key: string) => {
                const map: Record<string, string> = {
                    JWT_ACCESS_SECRET: 'access-secret',
                    JWT_REFRESH_SECRET: 'refresh-secret',
                    JWT_ACCESS_EXPIRATION_TIME: '900',
                    JWT_REFRESH_EXPIRATION_TIME: '604800',
                };
                return map[key];
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: getRepositoryToken(User), useValue: userRepo },
                { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
                { provide: JwtService, useValue: jwtService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    afterEach(() => jest.clearAllMocks());

    // ---------- register ----------

    describe('register', () => {
        it('throws ConflictException if email or mobile already exists', async () => {
            userRepo.findOne.mockResolvedValue({ id: 'existing' });

            await expect(
                service.register({
                    firstName: 'A',
                    lastName: 'B',
                    email: 'a@b.com',
                    mobileNumber: '09123456789',
                    password: 'StrongP@ss123',
                } as any),
            ).rejects.toThrow(ConflictException);
        });

        it('hashes the password and returns tokens on success', async () => {
            userRepo.findOne.mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');

            const result = await service.register({
                firstName: 'A',
                lastName: 'B',
                email: 'a@b.com',
                mobileNumber: '09123456789',
                password: 'StrongP@ss123',
            } as any);

            expect(bcrypt.hash).toHaveBeenCalledWith('StrongP@ss123', 10);
            expect(result.accessToken).toBe('signed.jwt.token');
            expect(result.refreshToken).toBe('signed.jwt.token');
            expect(result.user.email).toBe('a@b.com');
        });
    });

    // ---------- login ----------

    describe('login', () => {
        const existingUser = {
            id: 'user-1',
            email: 'a@b.com',
            mobileNumber: '09123456789',
            password: 'hashed-pw',
            isActive: true,
            firstName: 'A',
            lastName: 'B',
            role: UserRole.RECEPTIONIST,
        };

        it('throws UnauthorizedException if user not found', async () => {
            queryBuilderMock.getOne.mockResolvedValue(null);

            await expect(
                service.login({ emailOrMobile: 'nope@b.com', password: 'x' } as any),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('throws UnauthorizedException if account is deactivated', async () => {
            queryBuilderMock.getOne.mockResolvedValue({ ...existingUser, isActive: false });

            await expect(
                service.login({ emailOrMobile: 'a@b.com', password: 'x' } as any),
            ).rejects.toThrow('Account is deactivated');
        });

        it('throws UnauthorizedException on wrong password', async () => {
            queryBuilderMock.getOne.mockResolvedValue(existingUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.login({ emailOrMobile: 'a@b.com', password: 'wrong' } as any),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('returns tokens and updates lastLoginAt on success', async () => {
            queryBuilderMock.getOne.mockResolvedValue(existingUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.login({ emailOrMobile: 'a@b.com', password: 'StrongP@ss123' } as any);

            expect(userRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ lastLoginAt: expect.any(Date) }),
            );
            expect(result.accessToken).toBe('signed.jwt.token');
        });

        it('passes deviceInfo and ipAddress through to the stored refresh token', async () => {
            queryBuilderMock.getOne.mockResolvedValue(existingUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            await service.login(
                { emailOrMobile: 'a@b.com', password: 'StrongP@ss123' } as any,
                'Mozilla/5.0 Test Agent',
                '127.0.0.1',
            );

            expect(refreshTokenRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    deviceInfo: 'Mozilla/5.0 Test Agent',
                    ipAddress: '127.0.0.1',
                }),
            );
        });

        it('never stores the raw refresh token — only its hash', async () => {
            queryBuilderMock.getOne.mockResolvedValue(existingUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.login({ emailOrMobile: 'a@b.com', password: 'StrongP@ss123' } as any);

            const createCall = refreshTokenRepo.create.mock.calls[0][0];
            expect(createCall.token).not.toBe(result.refreshToken);
            expect(createCall.token).toHaveLength(64);
        });
    });

    // ---------- refreshAccessToken ----------

    describe('refreshAccessToken', () => {
        it('throws if token record not found', async () => {
            refreshTokenRepo.findOne.mockResolvedValue(null);
            await expect(service.refreshAccessToken('some-token')).rejects.toThrow(UnauthorizedException);
        });

        it('throws if token is revoked', async () => {
            refreshTokenRepo.findOne.mockResolvedValue({
                isRevoked: true,
                expiresAt: new Date(Date.now() + 10000),
                user: {},
            });
            await expect(service.refreshAccessToken('some-token')).rejects.toThrow('has been revoked');
        });

        it('throws if token is expired', async () => {
            refreshTokenRepo.findOne.mockResolvedValue({
                isRevoked: false,
                expiresAt: new Date(Date.now() - 10000),
                user: {},
            });
            await expect(service.refreshAccessToken('some-token')).rejects.toThrow('has expired');
        });

        it('throws if JWT verification fails', async () => {
            refreshTokenRepo.findOne.mockResolvedValue({
                isRevoked: false,
                expiresAt: new Date(Date.now() + 10000),
                user: { id: 'user-1', email: 'a@b.com', role: UserRole.RECEPTIONIST },
            });
            jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));

            await expect(service.refreshAccessToken('some-token')).rejects.toThrow('Invalid refresh token');
        });

        it('returns a new access token on success', async () => {
            refreshTokenRepo.findOne.mockResolvedValue({
                isRevoked: false,
                expiresAt: new Date(Date.now() + 10000),
                user: { id: 'user-1', email: 'a@b.com', role: UserRole.RECEPTIONIST },
            });
            jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });

            const result = await service.refreshAccessToken('some-token');
            expect(result.accessToken).toBe('signed.jwt.token');
        });

        it('looks up the token by its hash, not the raw value', async () => {
            refreshTokenRepo.findOne.mockResolvedValue({
                isRevoked: false,
                expiresAt: new Date(Date.now() + 10000),
                user: { id: 'user-1', email: 'a@b.com', role: UserRole.RECEPTIONIST },
            });
            jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });

            await service.refreshAccessToken('raw-token-value');

            const whereArg = refreshTokenRepo.findOne.mock.calls[0][0].where;
            expect(whereArg.token).not.toBe('raw-token-value');
            expect(whereArg.token).toHaveLength(64);
        });
    });

    // ---------- logout ----------

    describe('logout', () => {
        it('marks the matching refresh token as revoked', async () => {
            const tokenRecord = { id: 'rt-1', isRevoked: false };
            refreshTokenRepo.findOne.mockResolvedValue(tokenRecord);

            await service.logout('user-1', 'some-refresh-token');

            expect(refreshTokenRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ isRevoked: true }),
            );
        });

        it('does nothing if no matching token record is found', async () => {
            refreshTokenRepo.findOne.mockResolvedValue(null);

            await service.logout('user-1', 'unknown-token');

            expect(refreshTokenRepo.save).not.toHaveBeenCalled();
        });
    });

    // ---------- logoutAll ----------

    describe('logoutAll', () => {
        it('revokes all active refresh tokens for the user', async () => {
            await service.logoutAll('user-1');
            expect(refreshTokenRepo.update).toHaveBeenCalledWith(
                { userId: 'user-1', isRevoked: false },
                { isRevoked: true },
            );
        });
    });
});