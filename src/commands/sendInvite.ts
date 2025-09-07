import moment from "moment";

import User from "../models/User";
import UserInvite from "../models/UserInvite";
import Invite, { InviteStatus } from "../models/Invite";

import { botConfig } from "../config/bot";
import BotController from "../controllers/BotController";

export async function sendInviteToAlls(bot: BotController) {
  try {
    const users = await User.findAll();

    if (!users.length) {
      await bot.sendText(
        botConfig.owner,
        "Nenhum usuario disponível para enviar o convite"
      );
      return;
    }

    await bot.sendText(
      botConfig.owner,
      `Enviando convite para ${users.length} usuarios`
    );

    let delay: number = 0;

    for (const user of users) {
      sendInvite(bot, user, delay);
      delay += 30000;
    }
  } catch (error) {
    console.error(`Erro ao enviar convites: ${error.message}\n${error.stack}`);
    await bot.sendText(
      botConfig.owner,
      `Erro ao enviar convites: ${error.message}`
    );
  }
}

export async function sendInvite(
  bot: BotController,
  user: User,
  delay: number = 0
) {
  try {
    const sendAt = moment().add(delay, "seconds").format("HH:mm:ss");
    console.info(`Enviando convite para "${user.name}" em ${sendAt}...`);
    await new Promise((resolve) => setTimeout(resolve, delay));

    const options = ["Sim", "Não"];

    const pendingUserInvite = await Invite.findAll({
      where: { status: InviteStatus.PENDING },
      include: [
        {
          model: UserInvite,
          where: { userId: user.id },
          required: true,
        },
      ],
    });

    if (pendingUserInvite.length) {
      await Invite.update(
        { status: InviteStatus.NOT_RESPONDED },
        { where: { id: pendingUserInvite.map((i) => i.id) } }
      );
    }

    const invite = await Invite.create({
      status: InviteStatus.PENDING,
    });

    const pollInvite = await UserInvite.create({
      userId: user.id,
      inviteId: invite.id,
    });

    const pollMsg = await bot.sendPoll(
      user.number,
      "Convite para casamento",
      options
    );

    const pollId = pollMsg.key.id;

    await pollInvite.update({ pollId, poll: pollMsg });
  } catch (error) {
    console.error(
      `Erro ao enviar convite para "${user.name}": ${error.message}\n${error.stack}`
    );
  }
}
