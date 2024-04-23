require("dotenv").config();
const OpenAI = require("openai");
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});

const secretKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
    apiKey: secretKey,
});

async function askQuestion(question) {
    return new Promise((resolve, reject) => {
        readline.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    try {
        const assistant = await openai.beta.assistants.create({
            name: "Better World",
            instructions:
                "You are a personal customer assistant. Write and run code to answer customer questions.",
            tools: [{ type: "code_interpreter" }],
            model: "gpt-3.5-turbo",
        });
        console.log(
            "\nHello there, I'm Better World personal assistant.\n"
        );

        const thread = await openai.beta.threads.create();

        let keepAsking = true;
        while (keepAsking) {
            const userQuestion = await askQuestion("\nWhat is your question? ");
            // User role
            await openai.beta.threads.messages.create(thread.id, {
                role: "user",
                content: userQuestion,
            });
            // Response
            const run = await openai.beta.threads.runs.create(thread.id, {
                assistant_id: assistant.id,
            });
            let runStatus = await openai.beta.threads.runs.retrieve(
                thread.id,
                run.id
            );
            // Tuning
            while (runStatus.status !== "completed") {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            }
            // Get messages
            const messages = await openai.beta.threads.messages.list(thread.id);
            // Last message
            const lastMessageForRun = messages.data
                .filter(
                    (message) => message.run_id === run.id && message.role === "assistant"
                )
                .pop();
            if (lastMessageForRun) {
                console.log(`${lastMessageForRun.content[0].text.value} \n`);
            }
            const continueAsking = await askQuestion(
                "Do you want to ask another question? (yes/no) "
            );
            keepAsking = continueAsking.toLowerCase() === "yes";
            // End of run
            if (!keepAsking) {
                console.log("Have a nice day!\n");
            }
        }

        readline.close();
    } catch (error) {
        console.error(error);
    }
}

main();