import axios from "axios";

const API_URL = "https://api.openai.com/v1/chat/completions";

export const sendMessageToAI = async (message: string): Promise<string> => {
  try {
    const response = await axios.post(
      API_URL,
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
      },
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error("Invalid response from AI service");
    }
  } catch (error) {
    console.error("Error sending message to AI:", error);
    throw error;
  }
};
