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
  enviteId!: number;

  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Invite)
  envite!: Invite;
}
