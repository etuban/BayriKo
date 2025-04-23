import { User } from "@shared/schema";

/**
 * Data Transfer Object utilities for various entities
 */

export class UsersDto {
  /**
   * Convert a User DB entity to a DTO for sending to the client
   * Omits sensitive information like the password
   */
  static toUserDto(user: User) {
    if (!user) return null;
    
    // Create a new object without the password
    const { password, ...userDto } = user;
    
    return userDto;
  }
}