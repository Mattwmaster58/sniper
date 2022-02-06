const {Client, Intents, MessageEmbed} = require("discord.js");
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS,],
  partials: ["MESSAGE", "REACTION", "USER"],
});
const {token, maxHistory, dictators} = require(process.argv[2] || "../config.json");
const Paginator = require("./paginator");
const FixedFIFO = require("./queue");

const snipes = {
  "snipe": {}, "editsnipe": {}, "reactionsnipe": {},
};

const formatEmoji = (emoji) => {
  return !emoji.id || emoji.available ? emoji.toString() // bot has access or unicode emoji
    : `[:${emoji.name}:](${emoji.url})`; // bot cannot use the emoji
};

process.on("unhandledRejection", console.error); // prevent exit on error

client.on("ready", () => {
  console.log(`[sniper] :: Logged in as ${client.user.tag}.`);
});

client.on("messageDelete", async (message) => {
  if (message.partial) return; // content is null or deleted embed
  if (!snipes['snipe'][message.channel.id]) {
    snipes['snipe'][message.channel.id] = new FixedFIFO(maxHistory);
  }
  snipes['snipe'][message.channel.id].push({
    author: message.author.tag,
    content: message.content,
    embeds: message.embeds,
    attachments: [...message.attachments.values()].map((a) => a.proxyURL),
    createdAt: message.createdTimestamp,
  });
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (oldMessage.partial) return; // content is null
  let channel_snipes = snipes['editsnipe'][oldMessage.channel.id] || new FixedFIFO(maxHistory);
  channel_snipes.push({
    author: oldMessage.author.tag, content: oldMessage.content, createdAt: newMessage.editedTimestamp,
  });
  snipes['editsnipe'][oldMessage.channel.id] = channel_snipes;
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (reaction.partial) reaction = await reaction.fetch();
  let channel_snipes = snipes['reactionsnipe'][reaction.message.channel.id] || new FixedFIFO(maxHistory);
  channel_snipes.push({
    user: user.tag, emoji: reaction.emoji, messageURL: reaction.message.url, createdAt: Date.now(),
  });
  snipes['reactionsnipe'][reaction.message.channel.id] = channel_snipes;
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const channel = interaction.options.getChannel("channel") || interaction.channel;
  // only power users get to see deletes in close together

  let last = null;
  for (let i = 0; i < maxHistory; i++) {
    const snipe = snipes[interaction.commandName][channel.id]?.get(i);
    const replyMethod = (opts) => {
      return i === 0 ? interaction.reply(opts) : interaction.followUp(opts);
    };
    if (!snipe && i === 0) {
      return replyMethod("There's nothing to snipe!");
    } else if (!snipe || (i > 0 && dictators.includes(snipe.author) || last && (last.user !== snipe.user || last.createdAt - snipe.createdAt > 10 * 1000))) {
      break;
    }
    if (interaction.commandName === "snipe") {

      const type = interaction.options.getString("options");
      if (type === "embeds") {
        if (!snipe.embeds.length) return replyMethod("The message has no embeds!");
        const paginator = new Paginator(snipe.embeds.map((e) => ({embeds: [e]})));
        await paginator.start({interaction});
      } else if (type === "attachments") {
        if (!snipe.attachments.length) return replyMethod("The message has no embeds!");
        const paginator = new Paginator(snipe.attachments.map((a) => ({content: a})));
        await paginator.start({interaction});
      } else {
        const embed = new MessageEmbed()
          .setAuthor(snipe.author)
          .setFooter(`#${channel.name}`)
          .setTimestamp(snipe.createdAt);
        if (snipe.content) embed.setDescription(snipe.content);
        if (snipe.attachments.length) embed.setImage(snipe.attachments[0]);
        if (snipe.attachments.length || snipe.embeds.length) embed.addField("Extra Info", `*Message also contained \`${snipe.embeds.length}\` embeds and \`${snipe.attachments.length}\` attachments.*`);

        await replyMethod({embeds: [embed]});
      }
    }
    if (interaction.commandName === "editsnipe") {

      await replyMethod({
        embeds: [new MessageEmbed()
          .setDescription(snipe.content)
          .setAuthor(snipe.author)
          .setFooter(`#${channel.name}`)
          .setTimestamp(snipe.createdAt),],
      });
    } else if (interaction.commandName === "reactionsnipe") {

      await replyMethod({
        embeds: [new MessageEmbed()
          .setDescription(`reacted with ${formatEmoji(snipe.emoji)} on [this message](${snipe.messageURL})`)
          .setAuthor(snipe.user)
          .setFooter(`#${channel.name}`)
          .setTimestamp(snipe.createdAt),],
      });
    }
    last = snipe;
  }
});

client.login(token);
