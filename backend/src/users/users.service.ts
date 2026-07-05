// backend/src/users/users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private static readonly BCRYPT_SALT_ROUNDS = 10;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: [
        { email: createUserDto.email },
        { mobileNumber: createUserDto.mobileNumber },
      ],
    });
    if (existingUser) {
      throw new ConflictException('Email or mobile number already exists');
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      UsersService.BCRYPT_SALT_ROUNDS,
    );
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingByEmail = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingByEmail) {
        throw new ConflictException('Email already in use');
      }
    }

    if (
      updateUserDto.mobileNumber &&
      updateUserDto.mobileNumber !== user.mobileNumber
    ) {
      const existingByMobile = await this.usersRepository.findOne({
        where: { mobileNumber: updateUserDto.mobileNumber },
      });
      if (existingByMobile) {
        throw new ConflictException('Mobile number already in use');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        UsersService.BCRYPT_SALT_ROUNDS,
      );
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
