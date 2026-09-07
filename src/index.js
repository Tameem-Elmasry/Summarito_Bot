const { Telegraf, Markup } = require("telegraf");
const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const ADMIN_ID = Number(process.env.ADMIN_ID);
const NOTIFICATION_GROUP_ID = process.env.NOTIFICATION_CHAT_ID;

const addState = new Map();
const feedbackState = new Map();

const bot = new Telegraf(process.env.BOT_TOKEN);

const app = express();

app.use(express.json());

const subjects = [
    "النحو",
    "الصرف",
    "البلاغه",
    "النصوص",
    "الادب",
    "الفقه",
    "التوحيد",
    "التفسير",
    "الحديث",
    "Physics",
    "Chemistry",
    "Biology",
    "Math",
    "Others",
];

function getSummaries() {
    const filePath = path.join(__dirname, "../data/summaries.json");

    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveSummaries(summaries) {
    const filePath = path.join(__dirname, "../data/summaries.json");

    fs.writeFileSync(filePath, JSON.stringify(summaries, null, 2));
}

function getAddSubjectKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback("━━━ 📖 اللغة العربيه 📖 ━━━", "nothing")],
        [
            Markup.button.callback("النحو", "addsubject:النحو"),
            Markup.button.callback("الصرف", "addsubject:الصرف"),
            Markup.button.callback("البلاغه", "addsubject:البلاغه"),
        ],
        [
            Markup.button.callback("النصوص", "addsubject:النصوص"),
            Markup.button.callback("الادب", "addsubject:الادب"),
        ],
        [Markup.button.callback("━━━ 🕌 المواد الشرعيه 🕌 ━━━", "nothing")],
        [
            Markup.button.callback("الفقه", "addsubject:الفقه"),
            Markup.button.callback("التوحيد", "addsubject:التوحيد"),
        ],
        [
            Markup.button.callback("التفسير", "addsubject:التفسير"),
            Markup.button.callback("الحديث", "addsubject:الحديث"),
        ],
        [Markup.button.callback("━━━ 🔬 المواد العلميه 🔬 ━━━", "nothing")],
        [
            Markup.button.callback("Physics", "addsubject:Physics"),
            Markup.button.callback("Chemistry", "addsubject:Chemistry"),
        ],
        [
            Markup.button.callback("Biology", "addsubject:Biology"),
            Markup.button.callback("Math", "addsubject:Math"),
        ],
    ]);
}
function getSubjectKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback("━━━ 📖 اللغة العربيه 📖 ━━━", "nothing")],
        [
            Markup.button.callback("النحو", "subject:النحو"),
            Markup.button.callback("الصرف", "subject:الصرف"),
            Markup.button.callback("البلاغه", "subject:البلاغه"),
        ],
        [
            Markup.button.callback("النصوص", "subject:النصوص"),
            Markup.button.callback("الادب", "subject:الادب"),
        ],
        [Markup.button.callback("━━━ 🕌 المواد الشرعيه 🕌 ━━━", "nothing")],
        [
            Markup.button.callback("الفقه", "subject:الفقه"),
            Markup.button.callback("التوحيد", "subject:التوحيد"),
        ],
        [
            Markup.button.callback("التفسير", "subject:التفسير"),
            Markup.button.callback("الحديث", "subject:الحديث"),
        ],
        [Markup.button.callback("━━━ 🔬 المواد العلميه 🔬 ━━━", "nothing")],
        [
            Markup.button.callback("Physics", "subject:Physics"),
            Markup.button.callback("Chemistry", "subject:Chemistry"),
        ],
        [
            Markup.button.callback("Biology", "subject:Biology"),
            Markup.button.callback("Math", "subject:Math"),
        ],
        [Markup.button.callback("💬 قولنا رأيك", "feedback")],
    ]);
}

// ! Admin adding summary
bot.command("add", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.reply("❌ You are not authorized to use this command.");
    }

    await ctx.reply(
        "📚 Choose a subject to add a summary to:",
        getAddSubjectKeyboard(),
    );
});

bot.action(/^addsubject:(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.answerCbQuery("Not authorized.");
    }

    const subject = ctx.match[1];

    addState.set(ctx.from.id, {
        subject,
        chatId: ctx.chat.id,
        promptMessageId: ctx.callbackQuery.message.message_id,
    });

    await ctx.answerCbQuery();

    await ctx.editMessageText(
        `📚 Subject: ${subject}\n\n📎 Send me the summary file now.`,
        Markup.inlineKeyboard([
            [Markup.button.callback("❌ Cancel", "cancel:add")],
        ]),
    );
});

bot.action("cancel:add", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return ctx.answerCbQuery("Not authorized.");
    }

    addState.delete(ctx.from.id);

    await ctx.answerCbQuery();

    await ctx.editMessageText("❌ Adding summary cancelled.");
});

bot.on("document", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return;
    }

    const state = addState.get(ctx.from.id);

    if (!state) {
        return;
    }

    const file = ctx.message.document;

    const fileName = file.file_name;
    const lessonName = ctx.message.caption;

    if (!lessonName) {
        return ctx.reply(
            "❌ Please send the file again with the lesson name as its caption.",
        );
    }

    const summaries = getSummaries();

    if (!summaries[state.subject]) {
        summaries[state.subject] = [];
    }

    summaries[state.subject].push({
        name: lessonName,
        fileId: file.file_id,
        type: "document",
    });

    saveSummaries(summaries);

    addState.delete(ctx.from.id);

    await bot.telegram.deleteMessage(state.chatId, state.promptMessageId);

    console.log("Received document:", file);

    await bot.telegram.sendMessage(
        NOTIFICATION_GROUP_ID,
        `📥 New Summary #added!\n\n` +
            `📚 Subject: ${state.subject}\n` +
            `📖 Summary: ${lessonName}`,
    );

    await ctx.reply(
        `✅ Summary added!\n\n📚 Subject: ${state.subject}\n📖 Lesson: ${lessonName}`,
        Markup.inlineKeyboard([
            Markup.button.callback(
                "Add another summary",
                "addAnotherSubject:add",
            ),
            Markup.button.callback("Get summaries", "getSummary:add"),
        ]),
    );
});

bot.on("photo", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        return;
    }

    const state = addState.get(ctx.from.id);

    if (!state) {
        return;
    }

    const photos = ctx.message.photo;
    const file = photos[photos.length - 1];

    const lessonName = ctx.message.caption;

    if (!lessonName) {
        return ctx.reply(
            "❌ Please send the photo again with the lesson name as its caption.",
        );
    }

    const summaries = getSummaries();

    if (!summaries[state.subject]) {
        summaries[state.subject] = [];
    }

    summaries[state.subject].push({
        name: lessonName,
        fileId: file.file_id,
        type: "photo",
    });

    saveSummaries(summaries);

    addState.delete(ctx.from.id);

    await bot.telegram.deleteMessage(state.chatId, state.promptMessageId);

    await bot.telegram.sendMessage(
        NOTIFICATION_GROUP_ID,
        `📥 New Summary #added!\n\n` +
            `📚 Subject: ${state.subject}\n` +
            `📖 Summary: ${lessonName}`,
    );

    await ctx.reply(
        `✅ Summary added!\n\n📚 Subject: ${state.subject}\n📖 Lesson: ${lessonName}`,
        Markup.inlineKeyboard([
            Markup.button.callback(
                "Add another summary",
                "addAnotherSubject:add",
            ),
            Markup.button.callback("Get summaries", "getSummary:add"),
        ]),
    );
});

bot.action("addAnotherSubject:add", async (ctx) => {
    await ctx.answerCbQuery();

    await ctx.reply(
        "📚 Choose a subject to add a summary to:",
        getAddSubjectKeyboard(),
    );
});

bot.action("getSummary:add", async (ctx) => {
    await ctx.answerCbQuery();

    await ctx.reply(
        "📚 Choose a subject to get it's summaries:",
        getSubjectKeyboard(),
    );
});

// ! Users Getting summary
bot.start((ctx) => {
    ctx.reply(
        "📚 Choose a subject to get it's summaries :",
        getSubjectKeyboard(),
    );
});

bot.action(/^subject:(.+)$/, async (ctx) => {
    const subject = ctx.match[1];

    const summaries = getSummaries();

    const subjectSummaries = summaries[subject] || [];

    if (subjectSummaries.length === 0) {
        await ctx.answerCbQuery();

        return ctx.editMessageText(
            `📚 ${subject}\n\nThere are no summaries here yet. \n`,
            Markup.inlineKeyboard([
                [Markup.button.callback("🔙 Back", "back:start")],
            ]),
        );
    }

    const buttons = subjectSummaries.map((summary, index) => [
        Markup.button.callback(
            `📄 ${summary.name}`,
            `summary:${subject}:${index}`,
        ),
    ]);

    buttons.push([Markup.button.callback("🔙 Back", "back:start")]);

    await ctx.answerCbQuery();

    await ctx.editMessageText(
        `📚 ${subject}\n\nChoose the summary you want: \n اختار الملخص الي انت عايزه 👇`,
        Markup.inlineKeyboard(buttons),
    );
});

// ! Send Summary handler
bot.action(/^summary:(.+):(\d+)$/, async (ctx) => {
    const subject = ctx.match[1];
    const index = Number(ctx.match[2]);

    const summaries = getSummaries();
    const subjectSummaries = summaries[subject] || [];

    const summary = subjectSummaries[index];

    if (!summary) {
        return ctx.answerCbQuery("❌ Summary not found.");
    }

    await bot.telegram.sendMessage(
        NOTIFICATION_GROUP_ID,
        `📥 New #Summary accessed!\n\n` +
            `👤 Name: ${ctx.from.first_name || "Unknown"}\n` +
            `🔹 Username: ${ctx.from.username ? "@" + ctx.from.username : "No username"}\n` +
            `🆔 User ID: ${ctx.from.id}\n` +
            `📚 Subject: ${subject}\n` +
            `📖 Summary: ${summary.name}`,
    );

    await ctx.answerCbQuery();

    if (summary.type === "document") {
        await ctx.reply(`👇 Sent: ${summary.name}`);
        await ctx.replyWithDocument(summary.fileId);
    } else if (summary.type === "photo") {
        await ctx.reply(`👇 Sent: ${summary.name}`);
        await ctx.replyWithPhoto(summary.fileId);
    }
});

// ! Back to start
bot.action("back:start", async (ctx) => {
    await ctx.answerCbQuery();

    await ctx.editMessageText(
        "📚 Choose a subject to get it's summaries :",
        getSubjectKeyboard(),
    );
});

// ! Handle Feedback
bot.action("feedback", async (ctx) => {
    await ctx.answerCbQuery();

    const promptMessage = await ctx.reply(
        "💬 Please send your message here. \n اكتب الي عايز تقوله هنا وابعت👇",
        Markup.inlineKeyboard([
            [Markup.button.callback("❌ Cancel", "cancel:feedback")],
        ]),
    );

    feedbackState.set(ctx.from.id, promptMessage.message_id);
});

bot.action("cancel:feedback", async (ctx) => {
    feedbackState.delete(ctx.from.id);

    await ctx.answerCbQuery();

    await ctx.editMessageText("❌ Feedback cancelled.");
});

bot.on("text", async (ctx) => {
    const promptMessageId = feedbackState.get(ctx.from.id);

    if (!promptMessageId) {
        return;
    }

    const feedback = ctx.message.text;

    await bot.telegram.sendMessage(
        NOTIFICATION_GROUP_ID,
        `💬 New #Feedback!\n\n` +
            `👤 Name: ${ctx.from.first_name || "Unknown"}\n` +
            `🔹 Username: ${ctx.from.username ? "@" + ctx.from.username : "No username"}\n` +
            `🆔 User ID: ${ctx.from.id}\n\n` +
            `📝 Message:\n${feedback}`,
    );

    feedbackState.delete(ctx.from.id);

    await bot.telegram.editMessageText(
        ctx.chat.id,
        promptMessageId,
        undefined,
        "✅ Message sent. Thank you! \n شكرا علي رسالتك ❤️",
    );
});

bot.action("nothing", async (ctx) => {
    await ctx.answerCbQuery();
});

// ! Starting Bot Server

bot.launch();

// const PORT = process.env.PORT || 3000;

// app.get("/", (req, res) => {
//     res.send("Summarito Bot is running!");
// });

// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });
