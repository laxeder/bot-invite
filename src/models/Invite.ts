import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  BelongsToMany,
} from "sequelize-typescript";
import User from "./User";
import UserInvite from "./UserInvite";

export enum InviteStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

@Table({
  tableName: "invites",
  timestamps: true,
  underscored: true,
})
export default class Invite extends Model {
  @Column({
    type: DataType.STRING,
    defaultValue: InviteStatus.PENDING,
  })
  status!: InviteStatus;

  @HasMany(() => UserInvite)
  userInvites!: UserInvite[];

  @BelongsToMany(() => User, () => UserInvite)
  users!: User[];
}
