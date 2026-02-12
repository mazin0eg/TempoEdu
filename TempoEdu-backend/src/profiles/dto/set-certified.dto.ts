import { IsBoolean } from 'class-validator';

export class SetCertifiedDto {
  @IsBoolean()
  certified: boolean;
}
