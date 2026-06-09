import React, { useState } from "react";
import { Paperclip, Download, Send } from "lucide-react";
// import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@mui/material";

const WhyAnalysisChat = () => {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);

  const handleFileUpload = (e: any) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    // メッセージ送信のロジックをここに実装
    console.log("Message:", message);
    console.log("File:", file);
    setMessage("");
    setFile(null);
  };

  const handleTemplateDownload = () => {
    const link = document.createElement("a");
    link.href = "/files/whywhytemplate.xlsx";
    link.download = "なぜなぜ分析のテンプレート.xlsx";
    link.click();
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold">5W</span>
        </div>
        <h1 className="text-2xl font-bold">なぜなぜ分析チャット</h1>
      </div>
      {/* テンプレートファイルダウンロードボタン */}
      <Button
        onClick={handleTemplateDownload}
        className="flex items-center space-x-2 mb-4 w-fit"
        variant="outline"
      >
        <Download size={20} />
        <span>テンプレートファイルをダウンロード</span>
      </Button>
      {/* チャット表示エリア */}
      <Card className="flex-grow mb-4 p-4 overflow-y-auto">{/* チャットメッセージがここに表示されます */}</Card>
      {/* 入力フォーム */}
      <form
        onSubmit={handleSubmit}
        className="flex space-x-2"
      >
        <div className="relative flex-grow">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="ここに質問や情報を入力して下さい"
            className="w-full pr-10"
          />
          <label className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer">
            <Paperclip className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
        <Button type="submit">
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};

export default WhyAnalysisChat;
