import { Table, Column, Model, DataType, HasMany } from "sequelize-typescript";
import UserInvite from "./UserInvite";

@Table({
  tableName: "users",
  timestamps: true,
  underscored: true,
})
export default class User extends Model {
  @Column({ type: DataType.STRING, unique: true })
  number!: string;

  @Column(DataType.STRING)
  name!: string;

  @HasMany(() => UserInvite)
  invites!: UserInvite[];
}
