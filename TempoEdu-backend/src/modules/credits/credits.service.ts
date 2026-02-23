import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
} from './schemas/transaction.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class CreditsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async grantInitialCredits(userId: string): Promise<void> {
    const initialCredits = this.configService.get<number>(
      'INITIAL_CREDITS',
      5,
    );

    await this.userModel.findByIdAndUpdate(userId, {
      credits: initialCredits,
    });

    await this.transactionModel.create({
      user: userId,
      amount: initialCredits,
      type: TransactionType.INITIAL,
      description: 'Initial credits granted on registration',
      balanceAfter: initialCredits,
    });
  }

  async hasEnoughCredits(
    userId: string,
    amount: number,
  ): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    return user ? user.credits >= amount : false;
  }

  async transferCredits(
    fromUserId: string,
    toUserId: string,
    amount: number,
    sessionId: string,
  ): Promise<void> {
    const fromUser = await this.userModel.findById(fromUserId);
    const toUser = await this.userModel.findById(toUserId);

    if (!fromUser || !toUser) {
      throw new BadRequestException('User not found');
    }

    if (fromUser.credits < amount) {
      throw new BadRequestException('Insufficient credits');
    }

    // Debit from requester
    fromUser.credits -= amount;
    await fromUser.save();

    await this.transactionModel.create({
      user: fromUserId,
      amount: -amount,
      type: TransactionType.DEBIT,
      session: sessionId,
      description: `Credits spent for session`,
      balanceAfter: fromUser.credits,
    });

    // Credit to provider
    toUser.credits += amount;
    await toUser.save();

    await this.transactionModel.create({
      user: toUserId,
      amount: amount,
      type: TransactionType.CREDIT,
      session: sessionId,
      description: `Credits earned from session`,
      balanceAfter: toUser.credits,
    });
  }

  async getBalance(userId: string): Promise<number> {
    const user = await this.userModel.findById(userId);
    return user?.credits ?? 0;
  }

  async getTransactionHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ transactions: TransactionDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find({ user: userId })
        .populate('session', 'scheduledAt status')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.transactionModel.countDocuments({ user: userId }),
    ]);

    return { transactions, total };
  }
}
