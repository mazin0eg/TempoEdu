import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('certifications')
export class Certification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column()
  skillName: string;

  @Column({ nullable: true })
  issuer?: string;

  @Column({ type: 'date', nullable: true })
  issueDate?: string;

  @Column({ nullable: true })
  credentialId?: string;

  @Column({ nullable: true })
  fileKey?: string;

  @Column({ nullable: true })
  fileUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
