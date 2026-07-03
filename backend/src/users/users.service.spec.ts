import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';

describe('UsersService', () => {
    let service: UsersService;
    let repo: any;

    beforeEach(async () => {
        repo = {
            findOne: jest.fn(),
            create: jest.fn((dto) => dto),
            save: jest.fn((u) => Promise.resolve({ id: 'user-1', ...u })),
            find: jest.fn(),
            remove: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [UsersService, { provide: getRepositoryToken(User), useValue: repo }],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('create', () => {
        it('hashes the password before saving — never stores it raw', async () => {
            repo.findOne.mockResolvedValue(null);

            const result = await service.create({
                email: 'a@b.com',
                mobileNumber: '09123456789',
                password: 'StrongP@ss123',
                firstName: 'A',
                lastName: 'B',
                role: UserRole.RECEPTIONIST,
            });

            expect(result.password).not.toBe('StrongP@ss123');
            const isMatch = await bcrypt.compare('StrongP@ss123', result.password);
            expect(isMatch).toBe(true);
        });

        it('throws ConflictException on duplicate email or mobile', async () => {
            repo.findOne.mockResolvedValue({ id: 'existing' });

            await expect(
                service.create({
                    email: 'a@b.com',
                    mobileNumber: '09123456789',
                    password: 'StrongP@ss123',
                    firstName: 'A',
                    lastName: 'B',
                    role: UserRole.RECEPTIONIST,
                }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('findOne', () => {
        it('throws NotFoundException when user does not exist', async () => {
            repo.findOne.mockResolvedValue(null);
            await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('hashes a new password when one is provided', async () => {
            repo.findOne.mockResolvedValue({ id: 'user-1', email: 'a@b.com', password: 'old-hash' });

            await service.update('user-1', { password: 'NewStrongP@ss123' });

            const savedArg = repo.save.mock.calls[0][0];
            expect(savedArg.password).not.toBe('NewStrongP@ss123');
            const isMatch = await bcrypt.compare('NewStrongP@ss123', savedArg.password);
            expect(isMatch).toBe(true);
        });

        it('throws ConflictException if new email is already taken by someone else', async () => {
            repo.findOne
                .mockResolvedValueOnce({ id: 'user-1', email: 'old@b.com' }) // findOne(id)
                .mockResolvedValueOnce({ id: 'user-2', email: 'taken@b.com' }); // findByEmail

            await expect(service.update('user-1', { email: 'taken@b.com' })).rejects.toThrow(ConflictException);
        });
    });
});