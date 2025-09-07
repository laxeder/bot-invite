import type { WAMessage } from "baileys";

import {
  Table,
  Column,
  Model,
  ForeignKey,
  BelongsTo,
  DataType,
} from "sequelize-typescript";
import User from "./User";
import Invite from "./Invite";

@Table({
  tableName: "user_invites",
  timestamps: true,
  underscored: true,
})
export default class UserInvite extends Model {
  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  userId!: number;

  @ForeignKey(() => Invite)
  @Column(DataType.INTEGER)
  inviteId!: number;

  @Column(DataType.STRING)
  pollId!: string;

  @Column(DataType.JSONB)
  poll!: WAMessage;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Invite)
  invite!: Invite;
}
