import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticateUserDto } from './dto/authenticate-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { FindUserDto } from './dto/find-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';
import { isAuthorized } from './user.utils';

@Controller('user')
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async find(@Query() findUserDto: FindUserDto, @Req() req: Request) {
    try {
      const user = req.user as { id: number; is_admin: boolean };
      if (user.is_admin) {
        const users = await this.usersService.find(findUserDto);
        return users;
      } else {
        const self = await this.usersService.findUnique({ id: user.id });
        return self;
      }
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findUnique(@Param('id', ParseIntPipe) id, @Req() req: Request) {
    try {
      if (isAuthorized(req.user, id)) {
        const user = await this.usersService.findUnique({ id: id });
        return user;
      }
    } catch (error) {
      throw error;
    }

    throw new UnauthorizedException('You are not authorized to perform this operation');
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto);
      return user;
    } catch (error) {
      throw error;
    }
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async update(@Body() updateUserDto: UpdateUserDto, @Req() req: Request) {
    try {
      if (isAuthorized(req.user, updateUserDto.id)) {
        const updatedUser = await this.usersService.update(updateUserDto);
        return updatedUser;
      }
    } catch (error) {
      throw error;
    }

    throw new UnauthorizedException('You are not authorized to perform this operation');
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async delete(@Body() deleteUserDto: DeleteUserDto, @Req() req: Request) {
    try {
      if (isAuthorized(req.user, deleteUserDto.id)) {
        const deletedUser = await this.usersService.delete(deleteUserDto);
        return deletedUser;
      }
    } catch (error) {
      throw error;
    }

    throw new UnauthorizedException('You are not authorized to perform this operation');
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async userValidateToken(@Req() req: Request) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decodedToken = await this.usersService.validateToken(token);
      return decodedToken;
    } catch (error) {
      throw error;
    }
  }

  @Post('authenticate')
  @HttpCode(HttpStatus.OK)
  async userAuthenticate(@Body() authenticateUserDto: AuthenticateUserDto) {
    try {
      const authentication = this.usersService.authenticate(authenticateUserDto);
      return authentication;
    } catch (error) {
      throw error;
    }
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  async userGetToken(@Body() authenticateUserDto: AuthenticateUserDto) {
    try {
      const userToken = this.usersService.authenticateAndGetJwtToken(authenticateUserDto);
      return userToken;
    } catch (error) {
      throw error;
    }
  }
}
