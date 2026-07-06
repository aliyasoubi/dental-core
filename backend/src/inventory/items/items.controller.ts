// src/inventory/items/items.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import {
  toItemResponse,
  toItemResponseList,
} from './mappers/item-response.mapper';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Inventory Items')
@ApiBearerAuth()
@Controller('items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateItemDto) {
    // Only Admins can reach this route, so no need to mask cost here.
    return this.itemsService.create(dto);
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    const items = await this.itemsService.findAll();
    return toItemResponseList(items, user.role);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const item = await this.itemsService.findOne(id);
    return toItemResponse(item, user.role);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }
}
